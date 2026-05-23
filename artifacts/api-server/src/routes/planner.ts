import { Router } from "express";
import { db } from "@workspace/db";
import {
  plannerEntriesTable,
  tasksTable,
  brainDumpsTable,
  specialDatesTable,
} from "@workspace/db";
import {
  CreatePlannerEntryBody,
  UpdatePlannerEntryBody,
  ListPlannerEntriesQueryParams,
  CreateTaskBody,
  UpdateTaskBody,
  ListTasksQueryParams,
  CreateBrainDumpBody,
  GetPlannerEntryParams,
  UpdatePlannerEntryParams,
  DeletePlannerEntryParams,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { eq, and, like } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/planner/entries", async (req, res) => {
  try {
    const query = ListPlannerEntriesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const userId = req.user!.id;
    let rows;
    if (query.data.date) {
      rows = await db
        .select()
        .from(plannerEntriesTable)
        .where(and(eq(plannerEntriesTable.userId, userId), eq(plannerEntriesTable.date, query.data.date)));
    } else {
      rows = await db
        .select()
        .from(plannerEntriesTable)
        .where(eq(plannerEntriesTable.userId, userId))
        .limit(100);
    }
    res.json(rows.map(formatEntry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/planner/entries", async (req, res) => {
  try {
    const body = CreatePlannerEntryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .insert(plannerEntriesTable)
      .values({
        userId: req.user!.id,
        date: body.data.date,
        content: body.data.content,
        section: body.data.section,
        timeSlot: body.data.timeSlot ?? null,
        category: body.data.category ?? null,
      })
      .returning();
    res.status(201).json(formatEntry(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/planner/entries/:id", async (req, res) => {
  try {
    const params = GetPlannerEntryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(plannerEntriesTable)
      .where(and(eq(plannerEntriesTable.id, params.data.id), eq(plannerEntriesTable.userId, req.user!.id)));
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatEntry(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/planner/entries/:id", async (req, res) => {
  try {
    const params = UpdatePlannerEntryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdatePlannerEntryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.content !== undefined) updates.content = body.data.content;
    if (body.data.timeSlot !== undefined) updates.timeSlot = body.data.timeSlot;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.section !== undefined) updates.section = body.data.section;
    const [row] = await db
      .update(plannerEntriesTable)
      .set(updates)
      .where(and(eq(plannerEntriesTable.id, params.data.id), eq(plannerEntriesTable.userId, req.user!.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatEntry(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/planner/entries/:id", async (req, res) => {
  try {
    const params = DeletePlannerEntryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(plannerEntriesTable)
      .where(and(eq(plannerEntriesTable.id, params.data.id), eq(plannerEntriesTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/planner/tasks", async (req, res) => {
  try {
    const query = ListTasksQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const userId = req.user!.id;
    let rows;
    if (query.data.date) {
      rows = await db
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.userId, userId), eq(tasksTable.date, query.data.date)));
    } else {
      rows = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.userId, userId))
        .limit(200);
    }
    res.json(rows.map(formatTask));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/planner/tasks", async (req, res) => {
  try {
    const body = CreateTaskBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .insert(tasksTable)
      .values({
        userId: req.user!.id,
        date: body.data.date,
        text: body.data.text,
        completed: false,
        priority: body.data.priority ?? null,
        source: body.data.source ?? null,
        recurring: body.data.recurring ?? false,
        recurringFrequency: body.data.recurringFrequency ?? "none",
      })
      .returning();
    res.status(201).json(formatTask(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/planner/tasks/:id", async (req, res) => {
  try {
    const params = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateTaskBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (body.data.text !== undefined) updates.text = body.data.text;
    if (body.data.completed !== undefined) updates.completed = body.data.completed;
    if (body.data.priority !== undefined) updates.priority = body.data.priority;
    if (body.data.recurring !== undefined) updates.recurring = body.data.recurring;
    if (body.data.recurringFrequency !== undefined) updates.recurringFrequency = body.data.recurringFrequency;
    const [row] = await db
      .update(tasksTable)
      .set(updates)
      .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, req.user!.id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatTask(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/planner/tasks/:id", async (req, res) => {
  try {
    const params = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/planner/brain-dumps", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(brainDumpsTable)
      .where(eq(brainDumpsTable.userId, req.user!.id))
      .limit(50);
    res.json(rows.map(formatBrainDump));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/planner/brain-dumps", async (req, res) => {
  try {
    const body = CreateBrainDumpBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .insert(brainDumpsTable)
      .values({ userId: req.user!.id, date: body.data.date, rawText: body.data.rawText })
      .returning();
    res.status(201).json(formatBrainDump(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Special Dates ──────────────────────────────────────────────────────────────

router.get("/special-dates", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { month } = req.query as { month?: string };
    let rows;
    if (month) {
      rows = await db
        .select()
        .from(specialDatesTable)
        .where(and(eq(specialDatesTable.userId, userId), like(specialDatesTable.date, `${month}%`)));
    } else {
      rows = await db
        .select()
        .from(specialDatesTable)
        .where(eq(specialDatesTable.userId, userId))
        .limit(200);
    }
    res.json(rows.map(formatSpecialDate));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/special-dates", async (req, res) => {
  try {
    const { date, label, type, recurring } = req.body as { date: string; label: string; type: string; recurring?: boolean };
    if (!date || !label || !type) {
      res.status(400).json({ error: "date, label and type are required" });
      return;
    }
    const [row] = await db
      .insert(specialDatesTable)
      .values({ userId: req.user!.id, date, label, type, recurring: recurring ?? false })
      .returning();
    res.status(201).json(formatSpecialDate(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/special-dates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(specialDatesTable)
      .where(and(eq(specialDatesTable.id, id), eq(specialDatesTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatSpecialDate(row: typeof specialDatesTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    label: row.label,
    type: row.type,
    recurring: row.recurring,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatEntry(row: typeof plannerEntriesTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    timeSlot: row.timeSlot,
    content: row.content,
    category: row.category,
    section: row.section,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatTask(row: typeof tasksTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    text: row.text,
    completed: row.completed,
    priority: row.priority,
    source: row.source,
    recurring: row.recurring,
    recurringFrequency: row.recurringFrequency,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatBrainDump(row: typeof brainDumpsTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    rawText: row.rawText,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
