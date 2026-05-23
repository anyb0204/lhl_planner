import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { todoItemsTable, prayerEntriesTable, habitsTable, habitLogsTable } from "@workspace/db";
import { eq, and, like, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

// ─── Todos ────────────────────────────────────────────────────────────────────

const CreateTodoBody = z.object({
  text: z.string().min(1),
  notes: z.string().nullish(),
  dueDate: z.string().nullish(),
  priority: z.enum(["high", "medium", "low", "none"]).nullish(),
  category: z.string().nullish(),
});

const UpdateTodoBody = CreateTodoBody.extend({
  completed: z.boolean().optional(),
  completedAt: z.string().nullish(),
}).partial();

const IdParam = z.object({ id: z.coerce.number() });

router.get("/todos", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(todoItemsTable)
      .where(eq(todoItemsTable.userId, req.user!.id))
      .orderBy(todoItemsTable.createdAt);
    res.json(rows.map(formatTodo));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/todos", async (req, res) => {
  try {
    const body = CreateTodoBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(todoItemsTable).values({
      userId: req.user!.id,
      text: body.data.text,
      notes: body.data.notes ?? null,
      dueDate: body.data.dueDate ?? null,
      priority: body.data.priority ?? "none",
      category: body.data.category ?? null,
    }).returning();
    res.status(201).json(formatTodo(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/todos/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateTodoBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.text !== undefined) updates.text = body.data.text;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    if (body.data.dueDate !== undefined) updates.dueDate = body.data.dueDate;
    if (body.data.completed !== undefined) updates.completed = body.data.completed;
    if (body.data.completedAt !== undefined) updates.completedAt = body.data.completedAt;
    if (body.data.priority !== undefined) updates.priority = body.data.priority;
    if (body.data.category !== undefined) updates.category = body.data.category;
    const [row] = await db.update(todoItemsTable).set(updates)
      .where(and(eq(todoItemsTable.id, params.data.id), eq(todoItemsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatTodo(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/todos/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(todoItemsTable)
      .where(and(eq(todoItemsTable.id, params.data.id), eq(todoItemsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatTodo(row: typeof todoItemsTable.$inferSelect) {
  return {
    id: row.id,
    text: row.text,
    notes: row.notes,
    dueDate: row.dueDate,
    completed: row.completed,
    completedAt: row.completedAt,
    priority: row.priority,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Prayers ──────────────────────────────────────────────────────────────────

const CreatePrayerBody = z.object({
  date: z.string().min(1),
  title: z.string().nullish(),
  body: z.string().min(1),
  category: z.string().nullish(),
  notes: z.string().nullish(),
});

const UpdatePrayerBody = z.object({
  title: z.string().nullish(),
  body: z.string().optional(),
  category: z.string().nullish(),
  answered: z.boolean().optional(),
  answeredDate: z.string().nullish(),
  notes: z.string().nullish(),
});

router.get("/prayers", async (req, res) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    let rows;
    if (month) {
      rows = await db.select().from(prayerEntriesTable)
        .where(and(eq(prayerEntriesTable.userId, req.user!.id), like(prayerEntriesTable.date, `${month}%`)))
        .orderBy(desc(prayerEntriesTable.date));
    } else {
      rows = await db.select().from(prayerEntriesTable)
        .where(eq(prayerEntriesTable.userId, req.user!.id))
        .orderBy(desc(prayerEntriesTable.date));
    }
    res.json(rows.map(formatPrayer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prayers", async (req, res) => {
  try {
    const body = CreatePrayerBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(prayerEntriesTable).values({
      userId: req.user!.id,
      date: body.data.date,
      title: body.data.title ?? null,
      body: body.data.body,
      category: body.data.category ?? "request",
      notes: body.data.notes ?? null,
    }).returning();
    res.status(201).json(formatPrayer(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/prayers/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdatePrayerBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.body !== undefined) updates.body = body.data.body;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.answered !== undefined) updates.answered = body.data.answered;
    if (body.data.answeredDate !== undefined) updates.answeredDate = body.data.answeredDate;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    const [row] = await db.update(prayerEntriesTable).set(updates)
      .where(and(eq(prayerEntriesTable.id, params.data.id), eq(prayerEntriesTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatPrayer(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/prayers/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(prayerEntriesTable)
      .where(and(eq(prayerEntriesTable.id, params.data.id), eq(prayerEntriesTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatPrayer(row: typeof prayerEntriesTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    body: row.body,
    category: row.category,
    answered: row.answered,
    answeredDate: row.answeredDate,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Habits ───────────────────────────────────────────────────────────────────

const CreateHabitBody = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  emoji: z.string().nullish(),
  color: z.string().nullish(),
  category: z.string().nullish(),
  frequency: z.enum(["daily", "weekly"]).optional(),
});

const UpdateHabitBody = CreateHabitBody.extend({
  active: z.boolean().optional(),
}).partial();

const LogHabitBody = z.object({
  date: z.string().min(1),
  note: z.string().nullish(),
});

router.get("/habits", async (req, res) => {
  try {
    const rows = await db.select().from(habitsTable)
      .where(eq(habitsTable.userId, req.user!.id))
      .orderBy(habitsTable.createdAt);
    res.json(rows.map(formatHabit));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits", async (req, res) => {
  try {
    const body = CreateHabitBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db.insert(habitsTable).values({
      userId: req.user!.id,
      name: body.data.name,
      description: body.data.description ?? null,
      emoji: body.data.emoji ?? null,
      color: body.data.color ?? "primary",
      category: body.data.category ?? null,
      frequency: body.data.frequency ?? "daily",
    }).returning();
    res.status(201).json(formatHabit(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/habits/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateHabitBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.emoji !== undefined) updates.emoji = body.data.emoji;
    if (body.data.color !== undefined) updates.color = body.data.color;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.frequency !== undefined) updates.frequency = body.data.frequency;
    if (body.data.active !== undefined) updates.active = body.data.active;
    const [row] = await db.update(habitsTable).set(updates)
      .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatHabit(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/habits/:id", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(habitLogsTable)
      .where(and(eq(habitLogsTable.habitId, params.data.id), eq(habitLogsTable.userId, req.user!.id)));
    await db.delete(habitsTable)
      .where(and(eq(habitsTable.id, params.data.id), eq(habitsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/habits/logs", async (req, res) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    if (!month) { res.status(400).json({ error: "month query param required" }); return; }
    const rows = await db.select().from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, req.user!.id), like(habitLogsTable.date, `${month}%`)));
    res.json(rows.map(formatHabitLog));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/habits/:id/logs", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = LogHabitBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    // Upsert: delete existing log for this date first, then insert
    await db.delete(habitLogsTable)
      .where(and(
        eq(habitLogsTable.habitId, params.data.id),
        eq(habitLogsTable.userId, req.user!.id),
        eq(habitLogsTable.date, body.data.date),
      ));
    const [row] = await db.insert(habitLogsTable).values({
      userId: req.user!.id,
      habitId: params.data.id,
      date: body.data.date,
      completed: true,
      note: body.data.note ?? null,
    }).returning();
    res.status(201).json(formatHabitLog(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/habits/:id/logs/:date", async (req, res) => {
  try {
    const params = IdParam.safeParse({ id: req.params.id });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(habitLogsTable)
      .where(and(
        eq(habitLogsTable.habitId, params.data.id),
        eq(habitLogsTable.userId, req.user!.id),
        eq(habitLogsTable.date, req.params.date),
      ));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatHabit(row: typeof habitsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    color: row.color,
    category: row.category,
    frequency: row.frequency,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatHabitLog(row: typeof habitLogsTable.$inferSelect) {
  return {
    id: row.id,
    habitId: row.habitId,
    date: row.date,
    completed: row.completed,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
