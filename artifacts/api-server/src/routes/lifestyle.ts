import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  cycleLogsTable,
  cycleSettingsTable,
  moodLogsTable,
  quickNotesTable,
  visionBoardItemsTable,
} from "@workspace/db";
import { eq, and, like, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const IdParam = z.object({ id: z.coerce.number() });

// ─── Cycle Logs ───────────────────────────────────────────────────────────────

const UpsertCycleLogBody = z.object({
  flow: z.string().nullish(),
  symptoms: z.string().nullish(),
  mood: z.string().nullish(),
  notes: z.string().nullish(),
  temperature: z.string().nullish(),
});

router.get("/cycle/logs", async (req, res) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    let rows;
    if (month) {
      rows = await db.select().from(cycleLogsTable)
        .where(and(eq(cycleLogsTable.userId, req.user!.id), like(cycleLogsTable.date, `${month}%`)))
        .orderBy(desc(cycleLogsTable.date));
    } else {
      rows = await db.select().from(cycleLogsTable)
        .where(eq(cycleLogsTable.userId, req.user!.id))
        .orderBy(desc(cycleLogsTable.date));
    }
    res.json(rows.map(formatCycleLog));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cycle/logs/:date", async (req, res) => {
  try {
    const body = UpsertCycleLogBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const date = req.params.date;
    const userId = req.user!.id;

    const existing = await db.select().from(cycleLogsTable)
      .where(and(eq(cycleLogsTable.userId, userId), eq(cycleLogsTable.date, date)))
      .limit(1);

    if (existing.length > 0) {
      const [row] = await db.update(cycleLogsTable)
        .set({
          flow: body.data.flow ?? null,
          symptoms: body.data.symptoms ?? null,
          mood: body.data.mood ?? null,
          notes: body.data.notes ?? null,
          temperature: body.data.temperature ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(cycleLogsTable.userId, userId), eq(cycleLogsTable.date, date)))
        .returning();
      res.json(formatCycleLog(row));
    } else {
      const [row] = await db.insert(cycleLogsTable).values({
        userId,
        date,
        flow: body.data.flow ?? null,
        symptoms: body.data.symptoms ?? null,
        mood: body.data.mood ?? null,
        notes: body.data.notes ?? null,
        temperature: body.data.temperature ?? null,
      }).returning();
      res.json(formatCycleLog(row));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cycle/logs/:date", async (req, res) => {
  try {
    const date = req.params.date;
    await db.delete(cycleLogsTable)
      .where(and(eq(cycleLogsTable.userId, req.user!.id), eq(cycleLogsTable.date, date)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatCycleLog(row: typeof cycleLogsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    flow: row.flow,
    symptoms: row.symptoms,
    mood: row.mood,
    notes: row.notes,
    temperature: row.temperature,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Cycle Settings ───────────────────────────────────────────────────────────

const UpdateCycleSettingsBody = z.object({
  cycleLength: z.number().int().min(20).max(45),
  periodLength: z.number().int().min(2).max(10),
});

router.get("/cycle/settings", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db.select().from(cycleSettingsTable)
      .where(eq(cycleSettingsTable.userId, userId))
      .limit(1);
    if (rows.length === 0) {
      res.json({ userId, cycleLength: 28, periodLength: 5 });
    } else {
      res.json(formatCycleSettings(rows[0]));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cycle/settings", async (req, res) => {
  try {
    const body = UpdateCycleSettingsBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const userId = req.user!.id;

    const [row] = await db.insert(cycleSettingsTable)
      .values({ userId, cycleLength: body.data.cycleLength, periodLength: body.data.periodLength })
      .onConflictDoUpdate({
        target: cycleSettingsTable.userId,
        set: {
          cycleLength: body.data.cycleLength,
          periodLength: body.data.periodLength,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(formatCycleSettings(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatCycleSettings(row: typeof cycleSettingsTable.$inferSelect) {
  return {
    userId: row.userId,
    cycleLength: row.cycleLength,
    periodLength: row.periodLength,
  };
}

// ─── Mood Logs ────────────────────────────────────────────────────────────────

const UpsertMoodLogBody = z.object({
  moodIdx: z.number().int(),
  note: z.string().nullish(),
});

router.get("/mood/logs", async (req, res) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    let rows;
    if (month) {
      rows = await db.select().from(moodLogsTable)
        .where(and(eq(moodLogsTable.userId, req.user!.id), like(moodLogsTable.date, `${month}%`)))
        .orderBy(desc(moodLogsTable.date));
    } else {
      rows = await db.select().from(moodLogsTable)
        .where(eq(moodLogsTable.userId, req.user!.id))
        .orderBy(desc(moodLogsTable.date));
    }
    res.json(rows.map(formatMoodLog));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mood/logs/today", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.select().from(moodLogsTable)
      .where(and(eq(moodLogsTable.userId, req.user!.id), eq(moodLogsTable.date, today)))
      .limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "No mood log for today" });
    } else {
      res.json(formatMoodLog(rows[0]));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/mood/logs/:date", async (req, res) => {
  try {
    const body = UpsertMoodLogBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const date = req.params.date;
    const userId = req.user!.id;

    const existing = await db.select().from(moodLogsTable)
      .where(and(eq(moodLogsTable.userId, userId), eq(moodLogsTable.date, date)))
      .limit(1);

    if (existing.length > 0) {
      const [row] = await db.update(moodLogsTable)
        .set({ moodIdx: body.data.moodIdx, note: body.data.note ?? null })
        .where(and(eq(moodLogsTable.userId, userId), eq(moodLogsTable.date, date)))
        .returning();
      res.json(formatMoodLog(row));
    } else {
      const [row] = await db.insert(moodLogsTable).values({
        userId,
        date,
        moodIdx: body.data.moodIdx,
        note: body.data.note ?? null,
      }).returning();
      res.json(formatMoodLog(row));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/mood/logs/:date", async (req, res) => {
  try {
    const date = req.params.date;
    await db.delete(moodLogsTable)
      .where(and(eq(moodLogsTable.userId, req.user!.id), eq(moodLogsTable.date, date)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatMoodLog(row: typeof moodLogsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    moodIdx: row.moodIdx,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Quick Notes ──────────────────────────────────────────────────────────────

const UpdateQuickNotesBody = z.object({
  content: z.string(),
});

router.get("/notes/quick", async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db.select().from(quickNotesTable)
      .where(eq(quickNotesTable.userId, userId))
      .limit(1);
    if (rows.length === 0) {
      res.json({ userId, content: "" });
    } else {
      res.json({ userId: rows[0].userId, content: rows[0].content });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notes/quick", async (req, res) => {
  try {
    const body = UpdateQuickNotesBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const userId = req.user!.id;

    const [row] = await db.insert(quickNotesTable)
      .values({ userId, content: body.data.content })
      .onConflictDoUpdate({
        target: quickNotesTable.userId,
        set: { content: body.data.content, updatedAt: new Date() },
      })
      .returning();
    res.json({ userId: row.userId, content: row.content });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Vision Board ─────────────────────────────────────────────────────────────

const CreateVisionBoardItemBody = z.object({
  type: z.string(),
  content: z.string(),
  caption: z.string().nullish(),
  category: z.string(),
  color: z.string().nullish(),
  pinned: z.boolean().optional(),
});

const UpdateVisionBoardItemBody = z.object({
  content: z.string().optional(),
  caption: z.string().nullish(),
  category: z.string().optional(),
  color: z.string().nullish(),
  pinned: z.boolean().optional(),
});

router.get("/vision-board", async (req, res) => {
  try {
    const rows = await db.select().from(visionBoardItemsTable)
      .where(eq(visionBoardItemsTable.userId, req.user!.id))
      .orderBy(desc(visionBoardItemsTable.createdAt));
    res.json(rows.map(formatVisionBoardItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vision-board", async (req, res) => {
  try {
    const body = CreateVisionBoardItemBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(visionBoardItemsTable).values({
      userId: req.user!.id,
      type: body.data.type,
      content: body.data.content,
      caption: body.data.caption ?? null,
      category: body.data.category,
      color: body.data.color ?? null,
      pinned: body.data.pinned ?? false,
    }).returning();
    res.status(201).json(formatVisionBoardItem(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/vision-board/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateVisionBoardItemBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (body.data.content !== undefined) updates.content = body.data.content;
    if (body.data.caption !== undefined) updates.caption = body.data.caption;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.color !== undefined) updates.color = body.data.color;
    if (body.data.pinned !== undefined) updates.pinned = body.data.pinned;
    const [row] = await db.update(visionBoardItemsTable).set(updates)
      .where(and(eq(visionBoardItemsTable.id, params.data.id), eq(visionBoardItemsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatVisionBoardItem(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/vision-board/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(visionBoardItemsTable)
      .where(and(eq(visionBoardItemsTable.id, params.data.id), eq(visionBoardItemsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatVisionBoardItem(row: typeof visionBoardItemsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    content: row.content,
    caption: row.caption,
    category: row.category,
    color: row.color,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
