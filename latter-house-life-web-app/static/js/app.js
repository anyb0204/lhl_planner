const PlannerApp = (() => {
  const state = {
    currentPage: 'today',
    todayDate: new Date(),
    weekDate: new Date(),
    monthDate: new Date(),
    yearDate: new Date(),
    trackDate: new Date(),
    currentNoteDate: null,
    defaultHTML: {},
    saveTimers: {},
    monthNotes: new Map(),
    chatMessages: [],
    saving: new Set(),
  };

  const scriptures = [
    { ref: 'Isaiah 40:31', text: 'But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.' },
    { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
    { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding.' },
    { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
    { ref: 'Lamentations 3:22-23', text: 'His mercies are new every morning; great is thy faithfulness.' },
    { ref: 'Joshua 1:9', text: 'Be strong and of a good courage; be not afraid... for the Lord thy God is with thee.' },
    { ref: 'Romans 8:28', text: 'All things work together for good to them that love God.' },
    { ref: 'Psalm 23:1', text: 'The Lord is my shepherd; I shall not want.' },
    { ref: '2 Timothy 1:7', text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
    { ref: 'Galatians 6:9', text: 'Let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
  ];

  const truthLibrary = [
    { match: /(not good enough|not enough|enough)/i, response: 'You are enough because God has called, covered, and equipped you for this day. Your worth is not measured by performance.' },
    { match: /(behind|late|too far)/i, response: 'You are not behind God. Grace still covers this season, and obedience today matters more than perfection yesterday.' },
    { match: /(alone|nobody|by myself)/i, response: 'You are not alone. The Lord goes before you, walks beside you, and sustains you in hidden places.' },
    { match: /(afraid|fear|scared|anxious)/i, response: 'Fear does not get the final word. You have been given power, love, and a sound mind for the next step.' },
    { match: /(fail|failure|mess up)/i, response: 'A hard moment is not a final identity. God is still writing your story with mercy and wisdom.' },
    { match: /.*/, response: 'What God says is truer than what fear says. You are seen, strengthened, and still being led.' },
  ];

  const yearWords = ['Abide', 'Flourish', 'Steady', 'Courage', 'Faithful', 'Overflow', 'Renewal', 'Wisdom', 'Peace', 'Restoration'];

  const dynamicTemplates = {
    tasks: () => `
      <div class="task-row check-item dynamic-row" style="grid-template-columns:auto 1fr auto;align-items:center;">
        <div class="check-dot"><div class="check-dot-inner"></div></div>
        <input type="text" class="field-input task-input" placeholder="Add a task...">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    grocery: () => `
      <div class="dynamic-row" style="grid-template-columns:1fr auto;">
        <input type="text" class="field-input" placeholder="Add item...">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    weekAppointment: () => `
      <div class="dynamic-row two-col">
        <input type="text" class="field-input" placeholder="Day & time...">
        <input type="text" class="field-input" placeholder="Who / What...">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    monthAppointment: () => `
      <div class="dynamic-row two-col">
        <input type="text" class="field-input" placeholder="Date & time...">
        <input type="text" class="field-input" placeholder="Appointment / Notes...">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    medication: () => `
      <div class="med-row dynamic-med-row" style="border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-3);margin-bottom:var(--space-3);background:var(--color-surface-2);position:relative;">
        <button type="button" class="row-remove-btn" style="position:absolute;right:10px;top:10px;">×</button>
        <div style="display:flex;gap:8px;margin-bottom:8px;padding-right:46px;">
          <input type="text" class="field-input" placeholder="Medication name..." style="flex:2;">
          <input type="text" class="field-input" placeholder="Dose..." style="flex:1;">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;"><input type="checkbox"> AM</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;"><input type="checkbox"> Noon</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;"><input type="checkbox"> PM</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;"><input type="checkbox"> Bedtime</label>
          <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;"><input type="checkbox"> As needed</label>
        </div>
        <input type="text" class="field-input" placeholder="Notes (with food, refill date, etc.)..." style="width:100%;">
      </div>`,
    healthAppointment: () => `
      <div class="labeled-row dynamic-health-appt" style="gap:8px;align-items:flex-start;flex-direction:column;position:relative;margin-top:10px;border-top:1px solid rgba(201,168,76,0.14);padding-top:10px;">
        <button type="button" class="row-remove-btn" style="position:absolute;right:0;top:10px;">×</button>
        <div style="display:flex;gap:8px;width:100%;padding-right:46px;"><input type="text" class="field-input" placeholder="Date & time..." style="width:40%;"><input type="text" class="field-input" placeholder="Doctor / Type..." style="flex:1;"></div>
        <input type="text" class="field-input" placeholder="Address / telehealth link..." style="width:100%;">
        <textarea class="field-textarea" placeholder="Questions / what to bring..." rows="2" style="width:100%;"></textarea>
      </div>`,
    symptom: () => `
      <div class="dynamic-row three-col" style="grid-template-columns:2fr 1fr 1fr auto;">
        <input type="text" class="field-input" placeholder="Symptom...">
        <input type="text" class="field-input" placeholder="Severity 1-10">
        <input type="text" class="field-input" placeholder="Time...">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    income: () => `
      <div class="dynamic-row three-col" style="grid-template-columns:1fr 2fr 1fr auto;">
        <input type="text" class="field-input" placeholder="Date">
        <input type="text" class="field-input" placeholder="Source">
        <input type="text" class="field-input amount-field" placeholder="$Amount">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    bill: () => `
      <div class="task-row check-item dynamic-row" style="grid-template-columns:auto 2fr 1fr 1fr auto;align-items:center;">
        <div class="check-dot"><div class="check-dot-inner"></div></div>
        <input type="text" class="field-input" placeholder="Bill name...">
        <input type="text" class="field-input" placeholder="Due date">
        <input type="text" class="field-input amount-field" placeholder="$Amount">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    biz: () => `
      <div class="dynamic-row three-col" style="grid-template-columns:2fr 1fr 1fr auto;">
        <input type="text" class="field-input" placeholder="Project / Product...">
        <input type="text" class="field-input amount-field" placeholder="Expense $">
        <input type="text" class="field-input amount-field" placeholder="Income $">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
    savings: () => `
      <div class="dynamic-row three-col" style="grid-template-columns:2fr 1fr 1fr auto;">
        <input type="text" class="field-input" placeholder="Goal / Dream...">
        <input type="text" class="field-input amount-field" placeholder="Target $">
        <input type="text" class="field-input amount-field" placeholder="Saved so far $">
        <button type="button" class="row-remove-btn">×</button>
      </div>`,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'same-origin',
      ...options,
    });
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }
    if (!response.ok || data.ok === false) {
      const message = data.error || 'Something went wrong.';
      throw new Error(message);
    }
    return data;
  };

  const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const slugify = (value) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pad = (value) => String(value).padStart(2, '0');
  const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const yearKey = (date) => `${date.getFullYear()}`;
  const longDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const yearLabel = (date) => date.toLocaleDateString('en-US', { year: 'numeric' });
  const shortDay = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const weekRangeLabel = (start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const left = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const right = sameMonth
      ? end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })
      : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${left} – ${right}`;
  };
  const getWeekStart = (date) => {
    const value = new Date(date);
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + diff);
    return value;
  };
  const pageEl = (page) => $(`#page-${page}`);
  const activePageEl = () => pageEl(state.currentPage);
  const scopeTypeForPage = (page) => (page === 'track' ? 'track' : page);
  const scopeKeyForPage = (page) => {
    if (page === 'today') return isoDate(state.todayDate);
    if (page === 'week') return isoDate(getWeekStart(state.weekDate));
    if (page === 'month') return monthKey(state.monthDate);
    if (page === 'year') return yearKey(state.yearDate);
    if (page === 'track') return monthKey(state.trackDate);
    return 'static';
  };

  function showFloating(message) {
    const node = $('#floating-feedback');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._hideTimer);
    node._hideTimer = setTimeout(() => node.classList.remove('show'), 1800);
  }

  function showSaveToast(message = 'Saved') {
    const toast = $('#save-toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.classList.remove('show'), 1600);
    }
    showFloating(message);
  }

  function syncFormMarkup(root) {
    if (!root) return;
    $$('input', root).forEach((input) => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) input.setAttribute('checked', 'checked');
        else input.removeAttribute('checked');
      } else {
        input.setAttribute('value', input.value || '');
      }
    });
    $$('textarea', root).forEach((textarea) => {
      textarea.textContent = textarea.value || '';
    });
    $$('select', root).forEach((select) => {
      $$('option', select).forEach((option) => {
        if (option.value === select.value) option.setAttribute('selected', 'selected');
        else option.removeAttribute('selected');
      });
    });
  }

  function previewText(root) {
    const texts = [];
    $$('input, textarea, select', root).forEach((el) => {
      let value = '';
      if (el.tagName === 'SELECT') value = el.options[el.selectedIndex]?.text || '';
      else if (el.type === 'checkbox') value = el.checked ? (el.closest('label')?.textContent || 'checked').trim() : '';
      else value = (el.value || '').trim();
      if (value) texts.push(value);
    });
    return texts.slice(0, 10).join(' • ').slice(0, 500) || 'Saved planner entry';
  }

  async function savePage(page, options = {}) {
    if (page === 'history') return;
    if (state.saving.has(page)) return;
    const root = pageEl(page);
    if (!root) return;
    syncFormMarkup(root);
    state.saving.add(page);
    try {
      const scopeType = scopeTypeForPage(page);
      const scopeKey = scopeKeyForPage(page);
      const payload = {
        state: {
          page,
          scopeKey,
          html: root.innerHTML,
          savedAt: new Date().toISOString(),
        },
      };
      await api(`/api/state/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeKey)}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (options.snapshot) {
        await api('/api/save-snapshot', {
          method: 'POST',
          body: JSON.stringify({
            entry_type: page,
            entry_key: scopeKey,
            title: options.title || `${page[0].toUpperCase()}${page.slice(1)} Snapshot`,
            preview: options.preview || previewText(root),
            snapshot: payload.state,
          }),
        });
      }

      if (options.toast) showSaveToast(options.toast);
    } finally {
      state.saving.delete(page);
    }
  }

  function queueSave(page, delay = 700) {
    if (page === 'history') return;
    clearTimeout(state.saveTimers[page]);
    state.saveTimers[page] = setTimeout(() => {
      savePage(page).catch((error) => console.error(error));
    }, delay);
  }

  async function flushCurrentPageSave() {
    clearTimeout(state.saveTimers[state.currentPage]);
    await savePage(state.currentPage).catch(() => null);
  }

  function activatePage(page) {
    state.currentPage = page;
    $$('.page').forEach((section) => section.classList.toggle('active', section.id === `page-${page}`));
    $$('.nav-tab').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restoreDefaultPage(page) {
    const root = pageEl(page);
    if (!root) return;
    root.innerHTML = state.defaultHTML[page];
    if (page === 'today') renderTodayFrame();
    if (page === 'week') renderWeekFrame();
    if (page === 'month') renderMonthFrame();
    if (page === 'year') renderYearFrame();
    if (page === 'track') initializeTrackPanel();
  }

  async function loadPage(page) {
    activatePage(page);
    if (page === 'history') {
      await renderHistory();
      return;
    }

    const scopeType = scopeTypeForPage(page);
    const scopeKey = scopeKeyForPage(page);
    const root = pageEl(page);

    try {
      const response = await api(`/api/state/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeKey)}`);
      if (response.state?.html) {
        root.innerHTML = response.state.html;
      } else {
        restoreDefaultPage(page);
      }
    } catch (error) {
      console.error(error);
      restoreDefaultPage(page);
    }

    await refreshDerivedForPage(page);
  }

  function renderTodayFrame() {
    const label = $('#today-date-display');
    if (label) label.textContent = longDate(state.todayDate);
    toggleScriptureMode('write', false);
    updateReflectionCounter();
    updateYearWordDisplay();
  }

  function renderWeekFrame() {
    const start = getWeekStart(state.weekDate);
    const label = weekRangeLabel(start);
    const header = $('#week-range-display');
    const navLabel = $('#week-range-label');
    if (header) header.textContent = label;
    if (navLabel) navLabel.textContent = label.replace(/, \d{4}$/, '');
    const grid = $('#week-day-grid');
    if (grid) {
      const days = [];
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(`
          <div class="day-col">
            <div class="day-name">${shortDay(day)}</div>
            <div class="day-num">${day.getDate()}</div>
            <textarea class="day-input" placeholder="Focus..." rows="3"></textarea>
            <input class="day-priority" type="text" placeholder="★ Priority">
          </div>
        `);
      }
      grid.innerHTML = days.join('');
    }
  }

  async function loadMonthNotes() {
    state.monthNotes = new Map();
    try {
      const response = await api(`/api/day-notes?month=${encodeURIComponent(monthKey(state.monthDate))}`);
      (response.notes || []).forEach((item) => {
        state.monthNotes.set(item.note_date, item.note_text || '');
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function renderMonthFrame() {
    const header = $('#month-display');
    const navLabel = $('#month-nav-label');
    const monthText = monthLabel(state.monthDate);
    if (header) header.textContent = monthText;
    if (navLabel) navLabel.textContent = monthText;

    await loadMonthNotes();

    const grid = $('#cal-days');
    if (!grid) return;

    const year = state.monthDate.getFullYear();
    const month = state.monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const prevLast = new Date(year, month, 0);

    const cells = [];
    const leading = first.getDay();
    for (let i = leading; i > 0; i -= 1) {
      const day = prevLast.getDate() - i + 1;
      cells.push(`<div class="cal-day other-month"><div class="cal-day-num">${day}</div></div>`);
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = isoDate(date);
      const hasNote = Boolean((state.monthNotes.get(key) || '').trim());
      const classes = ['cal-day', 'clickable'];
      if (isoDate(new Date()) === key) classes.push('today');
      cells.push(`
        <div class="${classes.join(' ')}" data-date="${key}">
          <div class="cal-day-num">${day}</div>
          ${hasNote ? '<span class="note-dot"></span>' : ''}
        </div>
      `);
    }

    const trailing = (42 - (leading + last.getDate())) % 7;
    for (let day = 1; day <= trailing; day += 1) {
      cells.push(`<div class="cal-day other-month"><div class="cal-day-num">${day}</div></div>`);
    }

    grid.innerHTML = cells.join('');
  }

  function renderYearFrame() {
    const yearText = yearLabel(state.yearDate);
    const header = $('#year-display');
    const navLabel = $('#year-nav-label');
    if (header) header.textContent = yearText;
    if (navLabel) navLabel.textContent = yearText;
    updateYearWordDisplay();
  }

  function initializeTrackPanel() {
    const activeTab = $('#tab-habits') || $('.tracker-tab.active');
    if (activeTab) setTrackerTab(activeTab.id || 'tab-habits');
    updateGoalCards();
    updateFinanceSummary();
  }

  async function refreshDerivedForPage(page) {
    if (page === 'today') {
      updateReflectionCounter();
      ensureAskDrawerSeeded();
    }
    if (page === 'month') await renderMonthNoteDots();
    if (page === 'year') updateYearWordDisplay();
    if (page === 'track') {
      initializeTrackPanel();
    }
  }

  async function renderMonthNoteDots() {
    await loadMonthNotes();
    $$('.cal-day[data-date]').forEach((day) => {
      const note = state.monthNotes.get(day.dataset.date) || '';
      let dot = $('.note-dot', day);
      if (note.trim()) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'note-dot';
          day.appendChild(dot);
        }
      } else if (dot) {
        dot.remove();
      }
    });
  }

  function toggleScriptureMode(mode, queue = true) {
    const write = $('#scrip-mode-write');
    const daily = $('#scrip-mode-daily');
    const writeArea = $('#scrip-write-area');
    const dailyArea = $('#scrip-daily-area');
    const useWrite = mode === 'write';
    if (write) write.classList.toggle('active', useWrite);
    if (daily) daily.classList.toggle('active', !useWrite);
    if (writeArea) writeArea.style.display = useWrite ? '' : 'none';
    if (dailyArea) dailyArea.style.display = useWrite ? 'none' : '';
    if (queue) queueSave('today');
  }

  function scriptureForToday() {
    const index = Math.abs(Math.floor(state.todayDate.getTime() / 86400000)) % scriptures.length;
    return scriptures[index];
  }

  function showScripture() {
    const node = $('#scripture-display');
    if (!node) return;
    const verse = scriptureForToday();
    node.innerHTML = `<strong>${verse.ref}</strong><br>${verse.text}`;
    toggleScriptureMode('daily');
    queueSave('today');
  }

  function updateReflectionCounter() {
    const textarea = $('#evening-reflection');
    const counter = $('#reflection-counter');
    if (!textarea || !counter) return;
    counter.textContent = `${(textarea.value || '').length} / 500`;
  }

  function decideToday() {
    const mustDo = ($('#must-do-input')?.value || '').trim();
    const energy = $('.energy-btn.active')?.textContent?.trim() || '☀️ Medium';
    const node = $('#decide-tip');
    if (!node) return;
    if (!mustDo) {
      node.textContent = 'Start with the one thing that would make tonight feel lighter. Write it in “My one non-negotiable today.”';
    } else {
      node.textContent = `With ${energy.toLowerCase()} energy, protect “${mustDo}” first. Then keep the rest small and grace-filled.`;
    }
    queueSave('today');
  }

  function orderMySteps() {
    const priorities = ['#priority-1', '#priority-2', '#priority-3']
      .map((selector) => $(selector)?.value?.trim())
      .filter(Boolean);
    const node = $('#steps-output');
    if (!node) return;
    if (!priorities.length) {
      node.textContent = 'Write 1–3 priorities first, then tap again for a simple step order.';
    } else {
      node.innerHTML = priorities.map((value, index) => `${index + 1}. ${value}`).join('<br>');
    }
    queueSave('today');
  }

  function sortBrainDump() {
    const dump = ($('#brain-dump')?.value || '').trim();
    const output = $('#brain-dump-output');
    if (!output) return;
    if (!dump) {
      output.innerHTML = '<div class="tip-box helper-output">Add your brain dump first, then I will sort it into small action steps.</div>';
      return;
    }
    const pieces = dump
      .split(/\n|\.|,|;|\u2022/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    output.innerHTML = `
      <div class="card" style="margin-top:10px;">
        <div class="section-label">Sorted next steps</div>
        ${pieces.map((item) => `<div class="task-row check-item" style="margin-top:8px;"><div class="check-dot"><div class="check-dot-inner"></div></div><div>${item}</div></div>`).join('')}
      </div>
    `;
    queueSave('today');
  }

  function speakTruth() {
    const lie = ($('#lie-input')?.value || '').trim();
    const node = $('#truth-output');
    if (!node) return;
    const truth = truthLibrary.find((entry) => entry.match.test(lie || ' ')) || truthLibrary[truthLibrary.length - 1];
    node.textContent = truth.response;
    queueSave('today');
  }

  function updateYearWordDisplay() {
    const input = $('#year-word');
    const display = $('#year-word-display');
    if (input && display) display.textContent = input.value || '';
  }

  function fillYearWord() {
    const input = $('#year-word');
    if (!input) return;
    const year = parseInt(yearKey(state.yearDate), 10);
    input.value = yearWords[Math.abs(year) % yearWords.length];
    updateYearWordDisplay();
    queueSave('year');
  }

  function setTrackerTab(tabId) {
    const target = tabId.replace('tab-', 'tracker-');
    $$('.tracker-tab').forEach((button) => button.classList.toggle('active', button.id === tabId));
    $$('.tracker-panel').forEach((panel) => {
      panel.style.display = panel.id === target ? '' : 'none';
    });
    queueSave('track');
  }

  function toggleTrackerSection(headerNode) {
    const section = headerNode.closest('.tracker-section');
    if (!section) return;
    section.classList.toggle('open');
    queueSave('track');
  }

  function setSingleActive(button, selector, page = 'track') {
    const siblings = $$(selector, button.parentElement || document);
    siblings.forEach((node) => node.classList.remove('active'));
    button.classList.add('active');
    queueSave(page);
  }

  function togglePill(button, page = 'track') {
    button.classList.toggle('active');
    queueSave(page);
  }

  function updateGoalCards() {
    $$('.goal-card').forEach((card) => {
      let pct = parseInt(card.dataset.progress || '0', 10);
      pct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
      card.dataset.progress = String(pct);
      const fill = $('.progress-bar-fill', card);
      const pctNode = $('.progress-pct', card);
      const status = $('.goal-status', card);
      if (fill) fill.style.width = `${pct}%`;
      if (pctNode) pctNode.textContent = `${pct}%`;
      if (status) {
        status.className = 'goal-status';
        if (pct === 0) {
          status.textContent = 'Not Started';
          status.classList.add('status-not-started');
        } else if (pct < 100) {
          status.textContent = 'In Progress';
          status.classList.add('status-in-progress');
        } else {
          status.textContent = 'Completed';
          status.classList.add('status-completed');
        }
      }
    });
  }

  function adjustGoalProgress(button) {
    const card = button.closest('.goal-card');
    if (!card) return;
    const delta = normalizeText(button.textContent) === '+' ? 10 : -10;
    const next = Math.max(0, Math.min(100, (parseInt(card.dataset.progress || '0', 10) || 0) + delta));
    card.dataset.progress = String(next);
    updateGoalCards();
    queueSave('track');
  }

  function toggleCheckDot(dot) {
    const row = dot.closest('.check-item') || dot;
    row.classList.toggle('active');
    dot.classList.toggle('active');
    queueSave(row.closest('.page')?.id?.replace('page-', '') || 'track');
  }

  function addRow(type) {
    const config = {
      tasks: ['#task-list', dynamicTemplates.tasks, 'today'],
      grocery: ['#grocery-list-container', dynamicTemplates.grocery, 'week'],
      weekAppointment: ['#week-appts-container', dynamicTemplates.weekAppointment, 'week'],
      monthAppointment: ['#month-appts-container', dynamicTemplates.monthAppointment, 'month'],
      medication: ['#meds-list', dynamicTemplates.medication, 'track'],
      healthAppointment: ['#health-appts-container', dynamicTemplates.healthAppointment, 'track'],
      symptom: ['#symptom-log', dynamicTemplates.symptom, 'track'],
      income: ['#income-log', dynamicTemplates.income, 'track'],
      bill: ['#bills-log', dynamicTemplates.bill, 'track'],
      biz: ['#biz-log', dynamicTemplates.biz, 'track'],
      savings: ['#savings-log', dynamicTemplates.savings, 'track'],
    }[type];
    if (!config) return;
    const [selector, template, page] = config;
    const container = $(selector);
    if (!container) return;
    container.insertAdjacentHTML('beforeend', template());
    queueSave(page, 300);
  }

  function parseAmount(value) {
    const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
    const number = parseFloat(cleaned);
    return Number.isFinite(number) ? number : 0;
  }

  function updateFinanceSummary() {
    const incomeTotal = $$('#income-log .amount-field, #income-log input[placeholder="$Amount"]').reduce((sum, input) => sum + parseAmount(input.value), 0);
    const billTotal = $$('#bills-log .amount-field, #bills-log input[placeholder="$Amount"]').reduce((sum, input) => sum + parseAmount(input.value), 0);
    const bizIncome = $$('#biz-log input[placeholder="Income $"]').reduce((sum, input) => sum + parseAmount(input.value), 0);
    const bizExpense = $$('#biz-log input[placeholder="Expense $"]').reduce((sum, input) => sum + parseAmount(input.value), 0);
    let summary = $('#finance-summary-helper');
    const anchor = $('#tracker-finance .card.card-gold');
    if (!anchor) return;
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'finance-summary-helper';
      summary.className = 'tip-box helper-output';
      summary.style.marginTop = '12px';
      anchor.appendChild(summary);
    }
    summary.innerHTML = `Logged income: <strong>$${incomeTotal.toFixed(2)}</strong><br>Logged bills: <strong>$${billTotal.toFixed(2)}</strong><br>Business net: <strong>$${(bizIncome - bizExpense).toFixed(2)}</strong>`;
  }

  async function renderHistory() {
    const container = $('#history-content');
    if (!container) return;
    try {
      const response = await api('/api/history?limit=60');
      const entries = response.entries || [];
      if (!entries.length) {
        container.innerHTML = `
          <div class="card" style="margin-top:12px;">
            <div class="section-label">Your story is still being written</div>
            <p style="color:var(--color-text-muted);line-height:1.6;">Save a daily, weekly, monthly, or yearly page to start building your protected planner history.</p>
          </div>`;
        return;
      }
      container.innerHTML = entries.map((entry) => `
        <div class="history-entry-card" data-entry-id="${entry.id}">
          <div class="history-entry-meta">
            <span>${entry.entry_type.toUpperCase()} · ${entry.entry_key}</span>
            <span>${new Date(entry.created_at).toLocaleString()}</span>
          </div>
          <div class="history-entry-title">${entry.title}</div>
          <div class="history-entry-preview">${entry.preview || 'Saved planner snapshot'}</div>
          <div class="history-entry-actions">
            <button class="btn btn-outline history-open-btn" type="button" data-entry-id="${entry.id}">Open Entry</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = `<div class="card"><div class="section-label">History unavailable</div><p>${error.message}</p></div>`;
    }
  }

  async function openHistoryEntry(entryId) {
    const modal = $('#entry-modal');
    const content = $('#entry-modal-content');
    if (!modal || !content) return;
    const response = await api(`/api/history/${entryId}`);
    const entry = response.entry;
    content.innerHTML = `
      <div class="history-entry-title">${entry.title}</div>
      <div class="history-entry-meta" style="margin-bottom:14px;">
        <span>${entry.entry_type.toUpperCase()} · ${entry.entry_key}</span>
        <span>${new Date(entry.created_at).toLocaleString()}</span>
      </div>
      <div class="card" style="padding:18px;">
        <div class="section-label">Saved preview</div>
        <div class="helper-output" style="color:var(--color-text-muted);line-height:1.7;">${entry.preview || 'No preview available.'}</div>
      </div>
    `;
    modal.classList.add('active');
  }

  async function openDayNote(dateString) {
    state.currentNoteDate = dateString;
    const modal = $('#day-note-modal');
    const label = $('#day-note-date-label');
    const textarea = $('#day-note-textarea');
    if (!modal || !label || !textarea) return;
    label.textContent = new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const response = await api(`/api/day-note/${encodeURIComponent(dateString)}`);
    textarea.value = response.note || '';
    modal.classList.add('active');
  }

  async function saveDayNote() {
    const textarea = $('#day-note-textarea');
    if (!textarea || !state.currentNoteDate) return;
    await api(`/api/day-note/${encodeURIComponent(state.currentNoteDate)}`, {
      method: 'POST',
      body: JSON.stringify({ note: textarea.value || '' }),
    });
    state.monthNotes.set(state.currentNoteDate, textarea.value || '');
    closeModal('#day-note-modal');
    await renderMonthNoteDots();
    showSaveToast('Day note saved');
  }

  function closeModal(selector) {
    const modal = $(selector);
    if (modal) modal.classList.remove('active');
  }

  function openChat(prefill = '') {
    const overlay = $('#ai-chat-overlay');
    const input = $('#ai-chat-input');
    if (!overlay || !input) return;
    overlay.classList.add('active');
    input.value = prefill;
    input.focus();
  }

  function ensureAskDrawerSeeded() {
    const log = $('#ai-chat-log');
    if (!log || log.dataset.seeded) return;
    addChatMessage('assistant', 'I can help you simplify priorities, sort a brain dump, suggest your next step, or summarize what is already filled in.');
    log.dataset.seeded = 'true';
  }

  function addChatMessage(role, message) {
    const log = $('#ai-chat-log');
    if (!log) return;
    const bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'ai-chat-msg user' : 'ai-chat-msg assistant';
    bubble.style.padding = '10px 12px';
    bubble.style.borderRadius = '16px';
    bubble.style.marginBottom = '10px';
    bubble.style.lineHeight = '1.5';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.background = role === 'user' ? 'rgba(201,168,76,0.15)' : 'rgba(57,43,29,0.06)';
    bubble.textContent = message;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function plannerContextSummary() {
    const summary = [];
    const mustDo = $('#must-do-input')?.value?.trim();
    if (mustDo) summary.push(`Must-do: ${mustDo}`);
    const priorities = ['#priority-1', '#priority-2', '#priority-3'].map((s) => $(s)?.value?.trim()).filter(Boolean);
    if (priorities.length) summary.push(`Priorities: ${priorities.join(', ')}`);
    const weekIntentions = ['#week-intention-1', '#week-intention-2', '#week-intention-3'].map((s) => $(s)?.value?.trim()).filter(Boolean);
    if (weekIntentions.length) summary.push(`Week intentions: ${weekIntentions.join(', ')}`);
    const monthGoals = ['#month-goal-1', '#month-goal-2', '#month-goal-3'].map((s) => $(s)?.value?.trim()).filter(Boolean);
    if (monthGoals.length) summary.push(`Month goals: ${monthGoals.join(', ')}`);
    return summary.join('\n');
  }

  function generateChatResponse(question) {
    const q = question.toLowerCase();
    if (/priority|priorities|what should i do first|first/i.test(q)) {
      const mustDo = $('#must-do-input')?.value?.trim();
      const priorities = ['#priority-1', '#priority-2', '#priority-3'].map((s) => $(s)?.value?.trim()).filter(Boolean);
      const lines = [];
      if (mustDo) lines.push(`Start with your non-negotiable: ${mustDo}.`);
      if (priorities.length) lines.push(`Then move through these in order: ${priorities.join(' → ')}.`);
      if (!lines.length) lines.push('Fill in your must-do or priorities, and I can help you sort the order more specifically.');
      return lines.join(' ');
    }
    if (/brain dump|sort|overwhelm|too much/i.test(q)) {
      const dump = ($('#brain-dump')?.value || '').trim();
      if (!dump) return 'Paste your thoughts into the brain dump box first, then I can help you reduce them into 3–5 next actions.';
      const pieces = dump.split(/\n|\.|,|;/).map((v) => v.trim()).filter(Boolean).slice(0, 5);
      return `Here is a gentler order: ${pieces.map((p, i) => `${i + 1}) ${p}`).join('  ')}`;
    }
    if (/week/i.test(q)) {
      const intentions = ['#week-intention-1', '#week-intention-2', '#week-intention-3'].map((s) => $(s)?.value?.trim()).filter(Boolean);
      return intentions.length
        ? `Your week already points in a clear direction: ${intentions.join(', ')}. Protect one of them early in the week and one near the end.`
        : 'Add a few week intentions first, and I can help turn them into a simple weekly plan.';
    }
    if (/money|finance|budget/i.test(q)) {
      updateFinanceSummary();
      return $('#finance-summary-helper')?.textContent?.trim() || 'Open the finance tracker and log income, bills, and business numbers so I can summarize them.';
    }
    const context = plannerContextSummary();
    return context
      ? `Here is what your planner is already saying:\n${context}\n\nYour best next step is to choose one thing you can complete in the next 20 minutes.`
      : 'Start by filling one small section of the planner. Once there is a little more context, I can help you prioritize and simplify it.';
  }

  function sendChat() {
    const input = $('#ai-chat-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    addChatMessage('user', message);
    const reply = generateChatResponse(message);
    addChatMessage('assistant', reply);
    input.value = '';
  }

  async function changePassword() {
    const currentPassword = $('#current-password')?.value || '';
    const newPassword = $('#new-password')?.value || '';
    const confirmPassword = $('#confirm-password')?.value || '';
    const message = $('#password-message');
    try {
      await api('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }),
      });
      if (message) message.textContent = 'Password updated successfully.';
      showSaveToast('Password updated');
      setTimeout(() => closeModal('#password-modal'), 800);
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  }

  async function logout() {
    await flushCurrentPageSave();
    window.location.href = '/logout';
  }

  async function navigatePage(nextPage) {
    if (nextPage === state.currentPage) return;
    await flushCurrentPageSave();
    await loadPage(nextPage);
  }

  async function navigatePeriod(kind, direction) {
    await flushCurrentPageSave();
    if (kind === 'week') state.weekDate.setDate(state.weekDate.getDate() + (direction * 7));
    if (kind === 'month') state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + direction, 1);
    if (kind === 'year') state.yearDate = new Date(state.yearDate.getFullYear() + direction, 0, 1);
    await loadPage(kind);
  }

  function bindGlobalEvents() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button, .tracker-header, .check-dot, .cal-day[data-date]');
      if (!button) return;

      if (button.matches('.nav-tab')) {
        event.preventDefault();
        await navigatePage(button.dataset.page);
        return;
      }

      if (button.matches('.cal-day[data-date]')) {
        event.preventDefault();
        await openDayNote(button.dataset.date);
        return;
      }

      if (button.matches('.energy-btn')) {
        setSingleActive(button, '.energy-btn', 'today');
        decideToday();
        return;
      }

      if (button.id === 'scrip-mode-write') {
        toggleScriptureMode('write');
        return;
      }
      if (button.id === 'scrip-mode-daily') {
        toggleScriptureMode('daily');
        return;
      }
      if (normalizeText(button.textContent) === 'Receive Today\'s Scripture') {
        showScripture();
        return;
      }
      if (normalizeText(button.textContent) === '✦ Help Me Decide') {
        decideToday();
        return;
      }
      if (normalizeText(button.textContent) === '✦ Order My Steps') {
        orderMySteps();
        return;
      }
      if (normalizeText(button.textContent) === '✨ Sort This Out For Me') {
        sortBrainDump();
        return;
      }
      if (normalizeText(button.textContent) === '✦ Speak Truth Over Me') {
        speakTruth();
        return;
      }
      if (normalizeText(button.textContent) === 'Save Today') {
        await savePage('today', { snapshot: true, title: `Daily Entry · ${isoDate(state.todayDate)}`, toast: 'Today saved' });
        return;
      }
      if (normalizeText(button.textContent) === 'Save This Week') {
        await savePage('week', { snapshot: true, title: `Weekly Entry · ${scopeKeyForPage('week')}`, toast: 'Week saved' });
        return;
      }
      if (normalizeText(button.textContent) === 'Save This Month') {
        await savePage('month', { snapshot: true, title: `Monthly Entry · ${scopeKeyForPage('month')}`, toast: 'Month saved' });
        return;
      }
      if (normalizeText(button.textContent) === 'Save This Year') {
        await savePage('year', { snapshot: true, title: `Yearly Entry · ${scopeKeyForPage('year')}`, toast: 'Year saved' });
        return;
      }
      if (button.matches('.nav-arrow')) {
        const label = button.getAttribute('aria-label') || '';
        if (/week/i.test(label)) await navigatePeriod('week', /next/i.test(label) ? 1 : -1);
        if (/month/i.test(label)) await navigatePeriod('month', /next/i.test(label) ? 1 : -1);
        if (/year/i.test(label)) await navigatePeriod('year', /next/i.test(label) ? 1 : -1);
        return;
      }
      if (button.matches('.tracker-tab')) {
        setTrackerTab(button.id);
        return;
      }
      if (button.matches('.tracker-header')) {
        toggleTrackerSection(button);
        return;
      }
      if (button.matches('.progress-btn')) {
        adjustGoalProgress(button);
        return;
      }
      if (button.matches('.tone-btn')) {
        setSingleActive(button, '.tone-btn', 'track');
        return;
      }
      if (button.matches('.mood-pill')) {
        setSingleActive(button, '.mood-pill', 'track');
        return;
      }
      if (button.matches('.check-dot')) {
        toggleCheckDot(button);
        return;
      }
      if (button.matches('.row-remove-btn')) {
        const row = button.closest('.dynamic-row, .dynamic-med-row, .dynamic-health-appt, .task-row, .med-row');
        row?.remove();
        updateFinanceSummary();
        queueSave(state.currentPage, 200);
        return;
      }
      if (normalizeText(button.textContent) === '+ Add Task') { addRow('tasks'); return; }
      if (normalizeText(button.textContent) === '+ Add Item') { addRow('grocery'); return; }
      if (normalizeText(button.textContent) === '+ Add Appointment') {
        if (button.closest('#page-week')) addRow('weekAppointment');
        else if (button.closest('#page-month')) addRow('monthAppointment');
        else addRow('healthAppointment');
        return;
      }
      if (normalizeText(button.textContent) === '+ Add Medication') { addRow('medication'); return; }
      if (normalizeText(button.textContent) === '+ Log Symptom') { addRow('symptom'); return; }
      if (normalizeText(button.textContent) === '+ Add Income') { addRow('income'); return; }
      if (normalizeText(button.textContent) === '+ Add Bill') { addRow('bill'); return; }
      if (normalizeText(button.textContent) === '+ Add Project') { addRow('biz'); return; }
      if (normalizeText(button.textContent) === '+ Add Goal') { addRow('savings'); return; }
      if (normalizeText(button.textContent) === 'Today') {
        state.todayDate = new Date();
        await loadPage('today');
        return;
      }
      if (normalizeText(button.textContent) === 'Help Me Find My Word') {
        fillYearWord();
        return;
      }
      if (normalizeText(button.textContent) === 'Ask' || normalizeText(button.textContent) === 'Ask for Help Deciding') {
        openChat(button.closest('.page')?.id === 'page-week' ? 'Help me simplify this week' : 'Help me decide what matters most');
        return;
      }
      if (button.matches('.btn-ask-ai')) {
        openChat('Help me make a decision based on what is already filled out');
        return;
      }
      if (button.matches('.history-open-btn')) {
        await openHistoryEntry(button.dataset.entryId);
        return;
      }
      if (button.id === 'logout-btn') { await logout(); return; }
      if (button.id === 'change-password-btn') { $('#password-modal')?.classList.add('active'); return; }
      if (button.id === 'password-save-btn') { await changePassword(); return; }
      if (button.id === 'password-modal-close' || button.id === 'password-cancel-btn') { closeModal('#password-modal'); return; }
      if (button.matches('#day-note-modal .btn-primary')) { await saveDayNote(); return; }
      if (button.matches('#day-note-modal .btn-outline') || (button.matches('#day-note-modal .modal-close'))) { closeModal('#day-note-modal'); return; }
      if (button.matches('#entry-modal .modal-close')) { closeModal('#entry-modal'); return; }
      if (button.matches('.ai-chat-close')) { $('#ai-chat-overlay')?.classList.remove('active'); return; }
      if (button.id === 'ai-chat-send') { sendChat(); return; }
      if (normalizeText(button.textContent) === 'Clear') {
        const root = pageEl('today');
        restoreDefaultPage('today');
        queueSave('today');
        showSaveToast('Daily page cleared');
        return;
      }
    });

    document.addEventListener('input', (event) => {
      const page = event.target.closest('.page')?.id?.replace('page-', '');
      if (!page) return;
      if (event.target.id === 'evening-reflection') updateReflectionCounter();
      if (event.target.id === 'year-word') updateYearWordDisplay();
      if (page === 'track') updateFinanceSummary();
      queueSave(page);
    });

    document.addEventListener('change', (event) => {
      const page = event.target.closest('.page')?.id?.replace('page-', '');
      if (!page) return;
      if (page === 'track') updateFinanceSummary();
      queueSave(page);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal('#day-note-modal');
        closeModal('#entry-modal');
        closeModal('#password-modal');
        $('#ai-chat-overlay')?.classList.remove('active');
      }
      if (event.key === 'Enter' && event.target.id === 'ai-chat-input') {
        event.preventDefault();
        sendChat();
      }
    });
  }

  async function initUser() {
    const response = await api('/api/me');
    const title = $('#auth-chip .auth-chip-title');
    if (title) title.textContent = `Protected planner · ${response.user.username}`;
  }

  async function init() {
    ['today', 'week', 'month', 'year', 'track', 'history'].forEach((page) => {
      state.defaultHTML[page] = pageEl(page)?.innerHTML || '';
    });
    state.weekDate = getWeekStart(new Date(state.todayDate));
    state.monthDate = new Date(state.todayDate.getFullYear(), state.todayDate.getMonth(), 1);
    state.yearDate = new Date(state.todayDate.getFullYear(), 0, 1);
    state.trackDate = new Date(state.todayDate.getFullYear(), state.todayDate.getMonth(), 1);

    bindGlobalEvents();
    await initUser();
    renderTodayFrame();
    await loadPage('today');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  PlannerApp.init().catch((error) => {
    console.error(error);
  });
});
