import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function getOrCreateToken(userId: string): Promise<string> {
  const rows = await db.execute(
    sql`SELECT token FROM public.calendar_tokens WHERE user_id = ${userId}`
  );
  if (rows.rows.length > 0) {
    return rows.rows[0].token as string;
  }
  const token = generateToken();
  await db.execute(
    sql`INSERT INTO public.calendar_tokens (user_id, token, created_at, updated_at)
        VALUES (${userId}, ${token}, NOW(), NOW())`
  );
  return token;
}

router.get("/calendar/token", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const token = await getOrCreateToken(userId);
    const baseUrl = process.env.RENDER_EXTERNAL_URL ?? `${req.protocol}://${req.get("host")}`;
    const icsUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;
    res.json({ token, icsUrl });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calendar/feed/reset", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const token = generateToken();
    await db.execute(
      sql`INSERT INTO public.calendar_tokens (user_id, token, created_at, updated_at)
          VALUES (${userId}, ${token}, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET token = ${token}, updated_at = NOW()`
    );
    const baseUrl = process.env.RENDER_EXTERNAL_URL ?? `${req.protocol}://${req.get("host")}`;
    const icsUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;
    res.json({ token, icsUrl });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calendar/feed/:tokenFile", async (req, res) => {
  try {
    const tokenFile = req.params.tokenFile;
    const token = tokenFile.endsWith(".ics") ? tokenFile.slice(0, -4) : tokenFile;

    const tokenRows = await db.execute(
      sql`SELECT user_id FROM public.calendar_tokens WHERE token = ${token}`
    );
    if (tokenRows.rows.length === 0) {
      res.status(404).send("Calendar feed not found");
      return;
    }
    const userId = tokenRows.rows[0].user_id as string;

    const [userRows, apptRows, medRows] = await Promise.all([
      db.execute(sql`SELECT email, first_name FROM public.users WHERE id = ${userId}`),
      db.execute(
        sql`SELECT id, person, doctor, specialty, appointment_date, notes, location
            FROM public.health_appointments WHERE user_id = ${userId} ORDER BY appointment_date ASC LIMIT 200`
      ),
      db.execute(
        sql`SELECT id, name, refill_date FROM public.medications
            WHERE user_id = ${userId} AND refill_date IS NOT NULL ORDER BY refill_date ASC LIMIT 100`
      ),
    ]);

    const userEmail = (userRows.rows[0]?.email as string | undefined) ?? "";
    const userName = (userRows.rows[0]?.first_name as string | undefined) ?? "User";

    const now = new Date();
    const stamp = formatDt(now);

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Latter House Life Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Latter House Life",
      "X-WR-CALDESC:Your health appointments and medication reminders",
      "X-PUBLISHED-TTL:PT1H",
    ];

    for (const row of apptRows.rows) {
      const appt = row as { id: number; person: string; doctor: string; specialty?: string; appointment_date: string; notes?: string; location?: string };
      const dtStart = parseDateToIcs(appt.appointment_date);
      if (!dtStart) continue;
      const summary = `${appt.person} — ${appt.doctor}${appt.specialty ? ` (${appt.specialty})` : ""}`;
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:appt-${appt.id}@latterhouse.life`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${addHour(dtStart)}`);
      lines.push(`SUMMARY:${escapeIcs(summary)}`);
      if (appt.location) lines.push(`LOCATION:${escapeIcs(appt.location)}`);
      if (appt.notes) lines.push(`DESCRIPTION:${escapeIcs(appt.notes)}`);
      lines.push("END:VEVENT");
    }

    for (const row of medRows.rows) {
      const med = row as { id: number; name: string; refill_date: string };
      const dt = med.refill_date.slice(0, 10).replace(/-/g, "");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:refill-${med.id}@latterhouse.life`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`DTEND;VALUE=DATE:${dt}`);
      lines.push(`SUMMARY:${escapeIcs(`Refill: ${med.name}`)}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="lhl-planner.ics"`);
    res.send(lines.join("\r\n"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating calendar feed");
  }
});

function formatDt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function parseDateToIcs(dateStr: string): string | null {
  try {
    const clean = dateStr.slice(0, 16);
    if (clean.includes("T") || clean.includes(" ")) {
      const d = new Date(clean.includes("T") ? clean : clean.replace(" ", "T"));
      if (isNaN(d.getTime())) return null;
      return formatDt(d);
    }
    const d = new Date(dateStr.slice(0, 10) + "T09:00:00");
    if (isNaN(d.getTime())) return null;
    return formatDt(d);
  } catch { return null; }
}

function addHour(dtStr: string): string {
  const d = new Date(
    dtStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z")
  );
  d.setHours(d.getHours() + 1);
  return formatDt(d);
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export default router;
