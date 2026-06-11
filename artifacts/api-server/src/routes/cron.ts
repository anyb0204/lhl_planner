import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/notification-prefs", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db.execute(
      sql`SELECT browser_push, email_morning_summary, appointment_lead_minutes, refill_alert_days, quiet_start, quiet_end
          FROM public.notification_prefs WHERE user_id = ${userId}`
    );
    if (rows.rows.length === 0) {
      res.json({
        browserPush: false,
        emailMorningSummary: false,
        appointmentLeadMinutes: "60",
        refillAlertDays: "5",
        quietStart: "21:00",
        quietEnd: "07:00",
      });
      return;
    }
    const r = rows.rows[0] as Record<string, unknown>;
    res.json({
      browserPush: r.browser_push,
      emailMorningSummary: r.email_morning_summary,
      appointmentLeadMinutes: r.appointment_lead_minutes,
      refillAlertDays: r.refill_alert_days,
      quietStart: r.quiet_start,
      quietEnd: r.quiet_end,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notification-prefs", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      browserPush,
      emailMorningSummary,
      appointmentLeadMinutes,
      refillAlertDays,
      quietStart,
      quietEnd,
    } = req.body as Record<string, unknown>;

    await db.execute(
      sql`INSERT INTO public.notification_prefs
            (user_id, browser_push, email_morning_summary, appointment_lead_minutes, refill_alert_days, quiet_start, quiet_end, created_at, updated_at)
          VALUES (
            ${userId},
            ${browserPush ?? false},
            ${emailMorningSummary ?? false},
            ${appointmentLeadMinutes ?? "60"},
            ${refillAlertDays ?? "5"},
            ${quietStart ?? "21:00"},
            ${quietEnd ?? "07:00"},
            NOW(), NOW()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            browser_push = EXCLUDED.browser_push,
            email_morning_summary = EXCLUDED.email_morning_summary,
            appointment_lead_minutes = EXCLUDED.appointment_lead_minutes,
            refill_alert_days = EXCLUDED.refill_alert_days,
            quiet_start = EXCLUDED.quiet_start,
            quiet_end = EXCLUDED.quiet_end,
            updated_at = NOW()`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/push-subscription", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid subscription" });
      return;
    }
    await db.execute(
      sql`INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
          VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, NOW())
          ON CONFLICT (endpoint) DO UPDATE SET user_id = ${userId}, p256dh = ${keys.p256dh}, auth = ${keys.auth}`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/push-subscription", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    await db.execute(
      sql`DELETE FROM public.push_subscriptions WHERE user_id = ${userId}`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cron/tick", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.query.key !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({ ok: true, ts: new Date().toISOString() });

  setImmediate(async () => {
    try {
      await runCronTasks();
    } catch (err) {
      console.error("Cron tick error:", err);
    }
  });
});

async function runCronTasks() {
  const usersWithPush = await db.execute(
    sql`SELECT DISTINCT ps.user_id
        FROM public.push_subscriptions ps
        JOIN public.notification_prefs np ON np.user_id = ps.user_id
        WHERE np.browser_push = true`
  );

  for (const row of usersWithPush.rows) {
    const userId = row.user_id as string;
    try {
      await sendDueReminders(userId);
    } catch (err) {
      console.error(`Reminder error for user ${userId}:`, err);
    }
  }
}

async function sendDueReminders(userId: string) {
  const prefsRows = await db.execute(
    sql`SELECT appointment_lead_minutes, refill_alert_days, quiet_start, quiet_end
        FROM public.notification_prefs WHERE user_id = ${userId}`
  );
  if (!prefsRows.rows.length) return;
  const prefs = prefsRows.rows[0] as Record<string, string>;

  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const [qsH, qsM] = (prefs.quiet_start ?? "21:00").split(":").map(Number);
  const [qeH, qeM] = (prefs.quiet_end ?? "07:00").split(":").map(Number);
  const currentMins = hour * 60 + min;
  const quietStartMins = qsH * 60 + qsM;
  const quietEndMins = qeH * 60 + qeM;
  const inQuiet = quietStartMins > quietEndMins
    ? currentMins >= quietStartMins || currentMins < quietEndMins
    : currentMins >= quietStartMins && currentMins < quietEndMins;
  if (inQuiet) return;

  const leadMinutes = parseInt(prefs.appointment_lead_minutes ?? "60", 10);
  const windowStart = new Date(now.getTime());
  const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000 + 10 * 60 * 1000);

  const appts = await db.execute(
    sql`SELECT id, person, doctor, appointment_date FROM public.health_appointments
        WHERE user_id = ${userId} AND appointment_date IS NOT NULL`
  );

  for (const a of appts.rows) {
    const appt = a as { id: number; person: string; doctor: string; appointment_date: string };
    const apptTime = new Date(appt.appointment_date);
    if (apptTime >= windowStart && apptTime <= windowEnd) {
      const reminderKey = `appt-${appt.id}-${leadMinutes}m`;
      const alreadySent = await db.execute(
        sql`SELECT id FROM public.reminder_last_sent
            WHERE user_id = ${userId} AND reminder_key = ${reminderKey}
            AND last_sent_at > NOW() - INTERVAL '2 hours'`
      );
      if (alreadySent.rows.length > 0) continue;

      await sendPushToUser(userId, {
        title: "Upcoming appointment",
        body: `${appt.person} with ${appt.doctor} in ~${leadMinutes} minutes`,
      });

      await db.execute(
        sql`INSERT INTO public.reminder_last_sent (user_id, reminder_key, last_sent_at)
            VALUES (${userId}, ${reminderKey}, NOW())
            ON CONFLICT DO NOTHING`
      );
    }
  }

  const refillDays = parseInt(prefs.refill_alert_days ?? "5", 10);
  const refillCutoff = new Date();
  refillCutoff.setDate(refillCutoff.getDate() + refillDays);
  const cutoffStr = refillCutoff.toISOString().slice(0, 10);

  const meds = await db.execute(
    sql`SELECT id, name, refill_date FROM public.medications
        WHERE user_id = ${userId} AND refill_date IS NOT NULL AND refill_date <= ${cutoffStr}`
  );

  for (const m of meds.rows) {
    const med = m as { id: number; name: string; refill_date: string };
    const reminderKey = `refill-${med.id}-${med.refill_date}`;
    const alreadySent = await db.execute(
      sql`SELECT id FROM public.reminder_last_sent
          WHERE user_id = ${userId} AND reminder_key = ${reminderKey}
          AND last_sent_at > NOW() - INTERVAL '20 hours'`
    );
    if (alreadySent.rows.length > 0) continue;

    await sendPushToUser(userId, {
      title: "Medication refill reminder",
      body: `Time to refill ${med.name} (due ${med.refill_date})`,
    });

    await db.execute(
      sql`INSERT INTO public.reminder_last_sent (user_id, reminder_key, last_sent_at)
          VALUES (${userId}, ${reminderKey}, NOW())
          ON CONFLICT DO NOTHING`
    );
  }
}

async function sendPushToUser(userId: string, payload: { title: string; body: string }) {
  const subs = await db.execute(
    sql`SELECT endpoint, p256dh, auth FROM public.push_subscriptions WHERE user_id = ${userId}`
  );

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@latterhouselife.com";

  if (!vapidPublic || !vapidPrivate || subs.rows.length === 0) return;

  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  for (const row of subs.rows) {
    const sub = row as { endpoint: string; p256dh: string; auth: string };
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await db.execute(sql`DELETE FROM public.push_subscriptions WHERE endpoint = ${sub.endpoint}`);
      }
    }
  }
}

export default router;
