import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  medicationsTable,
  healthAppointmentsTable,
  healthConditionsTable,
  financialEntriesTable,
  goalsTable,
} from "@workspace/db";
import {
  CreateMedicationBody,
  UpdateMedicationBody,
  UpdateMedicationParams,
  DeleteMedicationParams,
  CreateHealthAppointmentBody,
  UpdateHealthAppointmentBody,
  UpdateHealthAppointmentParams,
  DeleteHealthAppointmentParams,
  CreateFinancialEntryBody,
  DeleteFinancialEntryParams,
  ListFinancialEntriesQueryParams,
  CreateGoalBody,
  UpdateGoalBody,
  UpdateGoalParams,
  DeleteGoalParams,
} from "@workspace/api-zod";
import { eq, and, like, gte, lte, ilike, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";

const router = Router();

router.use(requireAuth);
router.use(requireSubscription);

// ─── Medications ────────────────────────────────────────────────────────────

router.get("/trackers/medications", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(medicationsTable)
      .where(eq(medicationsTable.userId, req.user!.id))
      .orderBy(medicationsTable.name);
    res.json(rows.map(formatMedication));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trackers/medications", async (req, res) => {
  try {
    const body = CreateMedicationBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .insert(medicationsTable)
      .values({
        userId: req.user!.id,
        name: body.data.name,
        dose: body.data.dose ?? null,
        times: body.data.times ?? null,
        asNeeded: body.data.asNeeded ?? false,
        notes: body.data.notes ?? null,
        refillDate: body.data.refillDate ?? null,
        doctor: body.data.doctor ?? null,
      })
      .returning();
    res.status(201).json(formatMedication(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/trackers/medications/:id", async (req, res) => {
  try {
    const params = UpdateMedicationParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = UpdateMedicationBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.dose !== undefined) updates.dose = body.data.dose;
    if (body.data.times !== undefined) updates.times = body.data.times;
    if (body.data.asNeeded !== undefined) updates.asNeeded = body.data.asNeeded;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    if (body.data.refillDate !== undefined) updates.refillDate = body.data.refillDate;
    if (body.data.doctor !== undefined) updates.doctor = body.data.doctor;
    const [row] = await db
      .update(medicationsTable)
      .set(updates)
      .where(and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatMedication(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/trackers/medications/:id", async (req, res) => {
  try {
    const params = DeleteMedicationParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(medicationsTable)
      .where(and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Appointments ─────────────────────────────────────────────────────────────

router.get("/trackers/health", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(healthAppointmentsTable)
      .where(eq(healthAppointmentsTable.userId, req.user!.id))
      .orderBy(healthAppointmentsTable.appointmentDate);
    res.json(rows.map(formatAppointment));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trackers/health", async (req, res) => {
  try {
    const body = CreateHealthAppointmentBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db
      .insert(healthAppointmentsTable)
      .values({
        userId: req.user!.id,
        person: body.data.person,
        doctor: body.data.doctor,
        specialty: body.data.specialty ?? null,
        appointmentDate: body.data.appointmentDate,
        location: body.data.location ?? null,
        notes: body.data.notes ?? null,
        questions: body.data.questions ?? null,
        completed: false,
      })
      .returning();
    res.status(201).json(formatAppointment(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/trackers/health/:id", async (req, res) => {
  try {
    const params = UpdateHealthAppointmentParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateHealthAppointmentBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (body.data.person !== undefined) updates.person = body.data.person;
    if (body.data.doctor !== undefined) updates.doctor = body.data.doctor;
    if (body.data.specialty !== undefined) updates.specialty = body.data.specialty;
    if (body.data.appointmentDate !== undefined) updates.appointmentDate = body.data.appointmentDate;
    if (body.data.location !== undefined) updates.location = body.data.location;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    if (body.data.questions !== undefined) updates.questions = body.data.questions;
    if (body.data.completed !== undefined) updates.completed = body.data.completed;
    const [row] = await db
      .update(healthAppointmentsTable)
      .set(updates)
      .where(and(eq(healthAppointmentsTable.id, params.data.id), eq(healthAppointmentsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatAppointment(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/trackers/health/:id", async (req, res) => {
  try {
    const params = DeleteHealthAppointmentParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(healthAppointmentsTable)
      .where(and(eq(healthAppointmentsTable.id, params.data.id), eq(healthAppointmentsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Financial Entries ───────────────────────────────────────────────────────

router.get("/trackers/financial", async (req, res) => {
  try {
    const query = ListFinancialEntriesQueryParams.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
    const userId = req.user!.id;
    let rows;
    if (query.data.month) {
      rows = await db
        .select()
        .from(financialEntriesTable)
        .where(and(eq(financialEntriesTable.userId, userId), like(financialEntriesTable.date, `${query.data.month}%`)))
        .orderBy(financialEntriesTable.date);
    } else {
      rows = await db
        .select()
        .from(financialEntriesTable)
        .where(eq(financialEntriesTable.userId, userId))
        .orderBy(financialEntriesTable.date)
        .limit(200);
    }
    res.json(rows.map(formatFinancial));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trackers/financial", async (req, res) => {
  try {
    const body = CreateFinancialEntryBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db
      .insert(financialEntriesTable)
      .values({
        userId: req.user!.id,
        date: body.data.date,
        type: body.data.type,
        amount: body.data.amount,
        description: body.data.description,
        category: body.data.category ?? null,
      })
      .returning();
    res.status(201).json(formatFinancial(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/trackers/financial/:id", async (req, res) => {
  try {
    const params = DeleteFinancialEntryParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(financialEntriesTable)
      .where(and(eq(financialEntriesTable.id, params.data.id), eq(financialEntriesTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Goals ───────────────────────────────────────────────────────────────────

router.get("/trackers/goals", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.userId, req.user!.id))
      .orderBy(goalsTable.createdAt);
    res.json(rows.map(formatGoal));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trackers/goals", async (req, res) => {
  try {
    const body = CreateGoalBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db
      .insert(goalsTable)
      .values({
        userId: req.user!.id,
        title: body.data.title,
        description: body.data.description ?? null,
        category: body.data.category ?? null,
        targetDate: body.data.targetDate ?? null,
        progress: "0",
        completed: false,
        milestones: body.data.milestones ?? null,
      })
      .returning();
    res.status(201).json(formatGoal(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/trackers/goals/:id", async (req, res) => {
  try {
    const params = UpdateGoalParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = UpdateGoalBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.category !== undefined) updates.category = body.data.category;
    if (body.data.targetDate !== undefined) updates.targetDate = body.data.targetDate;
    if (body.data.progress !== undefined) updates.progress = body.data.progress;
    if (body.data.completed !== undefined) updates.completed = body.data.completed;
    if (body.data.milestones !== undefined) updates.milestones = body.data.milestones;
    const [row] = await db
      .update(goalsTable)
      .set(updates)
      .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatGoal(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/trackers/goals/:id", async (req, res) => {
  try {
    const params = DeleteGoalParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(goalsTable)
      .where(and(eq(goalsTable.id, params.data.id), eq(goalsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Health Conditions ───────────────────────────────────────────────────────

const ConditionBody = z.object({
  name: z.string().min(1),
  person: z.string().nullish(),
  status: z.enum(["active", "managed", "resolved"]).default("active"),
  diagnosedDate: z.string().nullish(),
  doctor: z.string().nullish(),
  severity: z.enum(["mild", "moderate", "severe"]).nullish(),
  notes: z.string().nullish(),
});
const ConditionUpdateBody = ConditionBody.partial();
const ConditionIdParam = z.object({ id: z.coerce.number() });

router.get("/trackers/conditions", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(healthConditionsTable)
      .where(eq(healthConditionsTable.userId, req.user!.id))
      .orderBy(healthConditionsTable.createdAt);
    res.json(rows.map(formatCondition));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/trackers/conditions", async (req, res) => {
  try {
    const body = ConditionBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const [row] = await db
      .insert(healthConditionsTable)
      .values({
        userId: req.user!.id,
        name: body.data.name,
        person: body.data.person ?? null,
        status: body.data.status,
        diagnosedDate: body.data.diagnosedDate ?? null,
        doctor: body.data.doctor ?? null,
        severity: body.data.severity ?? null,
        notes: body.data.notes ?? null,
      })
      .returning();
    res.status(201).json(formatCondition(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/trackers/conditions/:id", async (req, res) => {
  try {
    const params = ConditionIdParam.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = ConditionUpdateBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.person !== undefined) updates.person = body.data.person;
    if (body.data.status !== undefined) updates.status = body.data.status;
    if (body.data.diagnosedDate !== undefined) updates.diagnosedDate = body.data.diagnosedDate;
    if (body.data.doctor !== undefined) updates.doctor = body.data.doctor;
    if (body.data.severity !== undefined) updates.severity = body.data.severity;
    if (body.data.notes !== undefined) updates.notes = body.data.notes;
    const [row] = await db
      .update(healthConditionsTable)
      .set(updates)
      .where(and(eq(healthConditionsTable.id, params.data.id), eq(healthConditionsTable.userId, req.user!.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatCondition(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/trackers/conditions/:id", async (req, res) => {
  try {
    const params = ConditionIdParam.safeParse({ id: Number(req.params.id) });
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(healthConditionsTable)
      .where(and(eq(healthConditionsTable.id, params.data.id), eq(healthConditionsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Reminders ───────────────────────────────────────────────────────────────

router.get("/reminders", async (req, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const in3DaysStr = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const in7DaysStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const minus3DaysStr = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const items: Array<{
      id: string;
      type: "appointment" | "refill" | "bill";
      urgency: "high" | "medium" | "low";
      title: string;
      subtitle: string;
      href: string;
    }> = [];

    // Medications: refill date within 7 days (or up to 3 days overdue)
    const meds = await db
      .select()
      .from(medicationsTable)
      .where(and(
        eq(medicationsTable.userId, userId),
        isNotNull(medicationsTable.refillDate),
        gte(medicationsTable.refillDate, minus3DaysStr),
        lte(medicationsTable.refillDate, in7DaysStr),
      ));

    for (const med of meds) {
      const daysAway = Math.round(
        (new Date(med.refillDate!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const urgency = daysAway <= 0 ? "high" : daysAway <= 3 ? "medium" : "low";
      const whenText = daysAway < 0
        ? `Overdue by ${Math.abs(daysAway)} day${Math.abs(daysAway) !== 1 ? "s" : ""}`
        : daysAway === 0 ? "Due today"
        : daysAway === 1 ? "Due tomorrow"
        : `Due ${med.refillDate}`;
      items.push({
        id: `refill-${med.id}`,
        type: "refill",
        urgency,
        title: `Refill: ${med.name}`,
        subtitle: `${whenText}${med.dose ? ` · ${med.dose}` : ""}`,
        href: "/trackers/medications",
      });
    }

    // Appointments: within the next 3 days, not completed
    const appts = await db
      .select()
      .from(healthAppointmentsTable)
      .where(and(
        eq(healthAppointmentsTable.userId, userId),
        eq(healthAppointmentsTable.completed, false),
        gte(healthAppointmentsTable.appointmentDate, todayStr),
        lte(healthAppointmentsTable.appointmentDate, in3DaysStr),
      ));

    for (const appt of appts) {
      const daysAway = Math.round(
        (new Date(appt.appointmentDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const urgency = daysAway === 0 ? "high" : daysAway <= 1 ? "medium" : "low";
      const whenText = daysAway === 0 ? "Today"
        : daysAway === 1 ? "Tomorrow"
        : appt.appointmentDate;
      items.push({
        id: `appt-${appt.id}`,
        type: "appointment",
        urgency,
        title: `Appointment: ${appt.doctor || appt.person}`,
        subtitle: `${whenText}${appt.specialty ? ` · ${appt.specialty}` : ""}${appt.person && appt.doctor ? ` for ${appt.person}` : ""}`,
        href: "/trackers/appointments",
      });
    }

    // Bills: expense entries with category containing "bill", due within 7 days
    const bills = await db
      .select()
      .from(financialEntriesTable)
      .where(and(
        eq(financialEntriesTable.userId, userId),
        eq(financialEntriesTable.type, "expense"),
        ilike(financialEntriesTable.category!, "%bill%"),
        gte(financialEntriesTable.date, todayStr),
        lte(financialEntriesTable.date, in7DaysStr),
      ));

    for (const bill of bills) {
      const daysAway = Math.round(
        (new Date(bill.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const urgency = daysAway === 0 ? "high" : daysAway <= 2 ? "medium" : "low";
      const whenText = daysAway === 0 ? "Due today"
        : daysAway === 1 ? "Due tomorrow"
        : `Due ${bill.date}`;
      items.push({
        id: `bill-${bill.id}`,
        type: "bill",
        urgency,
        title: `Bill due: ${bill.description}`,
        subtitle: whenText,
        href: "/trackers/financial",
      });
    }

    // Sort: high urgency first
    items.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.urgency] - order[b.urgency];
    });

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatMedication(row: typeof medicationsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    times: row.times,
    asNeeded: row.asNeeded,
    notes: row.notes,
    refillDate: row.refillDate,
    doctor: row.doctor,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatAppointment(row: typeof healthAppointmentsTable.$inferSelect) {
  return {
    id: row.id,
    person: row.person,
    doctor: row.doctor,
    specialty: row.specialty,
    appointmentDate: row.appointmentDate,
    location: row.location,
    notes: row.notes,
    questions: row.questions,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatFinancial(row: typeof financialEntriesTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount,
    description: row.description,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatCondition(row: typeof healthConditionsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    person: row.person,
    status: row.status,
    diagnosedDate: row.diagnosedDate,
    doctor: row.doctor,
    severity: row.severity,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatGoal(row: typeof goalsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetDate: row.targetDate,
    progress: row.progress,
    completed: row.completed,
    milestones: row.milestones,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export default router;
