from __future__ import annotations

import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'planner.db'

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['JSON_SORT_KEYS'] = False


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS planner_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                scope_type TEXT NOT NULL,
                scope_key TEXT NOT NULL,
                state_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, scope_type, scope_key),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS history_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                entry_type TEXT NOT NULL,
                entry_key TEXT NOT NULL,
                title TEXT NOT NULL,
                preview TEXT NOT NULL DEFAULT '',
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS day_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                note_date TEXT NOT NULL,
                note_text TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, note_date),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            '''
        )


def fetch_one(query: str, params: tuple = ()):
    with get_db() as conn:
        return conn.execute(query, params).fetchone()


def has_users() -> bool:
    row = fetch_one('SELECT COUNT(*) AS total FROM users')
    return bool(row['total'])


def current_user() -> sqlite3.Row | None:
    user_id = session.get('user_id')
    if not user_id:
        return None
    return fetch_one('SELECT id, username, created_at FROM users WHERE id = ?', (user_id,))


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return redirect(url_for('login'))
        return fn(*args, **kwargs)

    return wrapper


def api_login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({'ok': False, 'error': 'Authentication required.'}), 401
        return fn(*args, **kwargs)

    return wrapper


@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if has_users():
        return redirect(url_for('login'))

    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip() or 'owner'
        password = request.form.get('password') or ''
        confirm_password = request.form.get('confirm_password') or ''

        if len(password) < 8:
            error = 'Password must be at least 8 characters.'
        elif password != confirm_password:
            error = 'Passwords do not match.'
        else:
            with get_db() as conn:
                conn.execute(
                    'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
                    (username, generate_password_hash(password), utc_now_iso()),
                )
            return redirect(url_for('login'))

    return render_template('login.html', mode='setup', error=error)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if not has_users():
        return redirect(url_for('setup'))
    if current_user():
        return redirect(url_for('planner'))

    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = request.form.get('password') or ''
        row = fetch_one('SELECT * FROM users WHERE username = ?', (username,))
        if not row or not check_password_hash(row['password_hash'], password):
            error = 'Invalid username or password.'
        else:
            session['user_id'] = row['id']
            return redirect(url_for('planner'))

    return render_template('login.html', mode='login', error=error)


@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/')
@login_required
def planner():
    return render_template('planner.html', user=current_user())


@app.get('/api/me')
@api_login_required
def api_me():
    user = current_user()
    return jsonify({'ok': True, 'user': {'id': user['id'], 'username': user['username']}})


@app.route('/api/state/<scope_type>/<path:scope_key>', methods=['GET', 'POST'])
@api_login_required
def api_state(scope_type: str, scope_key: str):
    user = current_user()
    if request.method == 'GET':
        row = fetch_one(
            'SELECT state_json, updated_at FROM planner_state WHERE user_id = ? AND scope_type = ? AND scope_key = ?',
            (user['id'], scope_type, scope_key),
        )
        payload = json.loads(row['state_json']) if row else None
        return jsonify({'ok': True, 'state': payload, 'updated_at': row['updated_at'] if row else None})

    data = request.get_json(silent=True) or {}
    state = data.get('state') or {}
    state_json = json.dumps(state, ensure_ascii=False)
    now = utc_now_iso()
    with get_db() as conn:
        conn.execute(
            '''
            INSERT INTO planner_state (user_id, scope_type, scope_key, state_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, scope_type, scope_key)
            DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
            ''',
            (user['id'], scope_type, scope_key, state_json, now),
        )
    return jsonify({'ok': True, 'updated_at': now})


@app.post('/api/save-snapshot')
@api_login_required
def api_save_snapshot():
    user = current_user()
    data = request.get_json(silent=True) or {}
    entry_type = (data.get('entry_type') or 'entry').strip()
    entry_key = (data.get('entry_key') or '').strip()
    title = (data.get('title') or 'Planner Snapshot').strip()
    preview = (data.get('preview') or '').strip()
    snapshot = data.get('snapshot') or {}
    created_at = utc_now_iso()

    with get_db() as conn:
        cursor = conn.execute(
            '''
            INSERT INTO history_entries (user_id, entry_type, entry_key, title, preview, snapshot_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''',
            (user['id'], entry_type, entry_key, title, preview, json.dumps(snapshot, ensure_ascii=False), created_at),
        )
        entry_id = cursor.lastrowid

    return jsonify({'ok': True, 'entry_id': entry_id, 'created_at': created_at})


@app.get('/api/history')
@api_login_required
def api_history():
    user = current_user()
    limit = min(int(request.args.get('limit', 50)), 200)
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT id, entry_type, entry_key, title, preview, created_at
            FROM history_entries
            WHERE user_id = ?
            ORDER BY datetime(created_at) DESC, id DESC
            LIMIT ?
            ''',
            (user['id'], limit),
        ).fetchall()
    entries = [dict(row) for row in rows]
    return jsonify({'ok': True, 'entries': entries})


@app.get('/api/history/<int:entry_id>')
@api_login_required
def api_history_entry(entry_id: int):
    user = current_user()
    row = fetch_one(
        '''
        SELECT id, entry_type, entry_key, title, preview, snapshot_json, created_at
        FROM history_entries
        WHERE id = ? AND user_id = ?
        ''',
        (entry_id, user['id']),
    )
    if not row:
        return jsonify({'ok': False, 'error': 'Entry not found.'}), 404
    payload = dict(row)
    payload['snapshot'] = json.loads(payload.pop('snapshot_json'))
    return jsonify({'ok': True, 'entry': payload})


@app.route('/api/day-note/<note_date>', methods=['GET', 'POST'])
@api_login_required
def api_day_note(note_date: str):
    user = current_user()
    if request.method == 'GET':
        row = fetch_one(
            'SELECT note_text, updated_at FROM day_notes WHERE user_id = ? AND note_date = ?',
            (user['id'], note_date),
        )
        return jsonify({'ok': True, 'note': row['note_text'] if row else '', 'updated_at': row['updated_at'] if row else None})

    data = request.get_json(silent=True) or {}
    note_text = (data.get('note') or '').strip()
    now = utc_now_iso()
    with get_db() as conn:
        conn.execute(
            '''
            INSERT INTO day_notes (user_id, note_date, note_text, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, note_date)
            DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at
            ''',
            (user['id'], note_date, note_text, now),
        )
    return jsonify({'ok': True, 'updated_at': now})


@app.get('/api/day-notes')
@api_login_required
def api_day_notes():
    user = current_user()
    month = (request.args.get('month') or '').strip()
    if not month:
        return jsonify({'ok': False, 'error': 'month is required'}), 400
    prefix = f'{month}-'
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT note_date, note_text, updated_at
            FROM day_notes
            WHERE user_id = ? AND note_date LIKE ?
            ORDER BY note_date ASC
            ''',
            (user['id'], f'{prefix}%'),
        ).fetchall()
    notes = [dict(row) for row in rows]
    return jsonify({'ok': True, 'notes': notes})


@app.post('/api/change-password')
@api_login_required
def api_change_password():
    user = current_user()
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''
    confirm_password = data.get('confirm_password') or ''

    full_user = fetch_one('SELECT * FROM users WHERE id = ?', (user['id'],))
    if not check_password_hash(full_user['password_hash'], current_password):
        return jsonify({'ok': False, 'error': 'Current password is incorrect.'}), 400
    if len(new_password) < 8:
        return jsonify({'ok': False, 'error': 'New password must be at least 8 characters.'}), 400
    if new_password != confirm_password:
        return jsonify({'ok': False, 'error': 'New passwords do not match.'}), 400

    with get_db() as conn:
        conn.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            (generate_password_hash(new_password), user['id']),
        )
    return jsonify({'ok': True})


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)
