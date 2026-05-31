import { Router } from "express";
import { z } from "zod";
import { db, ideaValidationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

const CreateIdeaBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  targetCustomer: z.string().max(300).optional(),
  revenueModel: z.string().max(200).optional(),
  stage: z.string().max(100).optional(),
});

const ANALYSIS_SYSTEM_PROMPT = `You are a Senior Venture Capital Analyst and Market Researcher with 20 years of experience evaluating startups. You conduct rigorous, data-driven analysis without sugarcoating.

Return a single JSON object with EXACTLY this structure (no markdown, no code fences, raw JSON only):
{
  "executiveSummary": "2-3 sentence verdict on the idea's viability",
  "successProbability": <integer 0-100>,
  "confidenceScore": <integer 0-100, how saturated/researched this niche is>,
  "invisibleCompetition": {
    "headline": "string",
    "competitors": [
      { "name": "string", "type": "string", "threat": "high|medium|low", "description": "string" }
    ],
    "insight": "string"
  },
  "preMortem": {
    "headline": "string",
    "failures": [
      { "rank": 1, "title": "string", "probability": "high|medium|low", "detail": "string", "mitigation": "string" },
      { "rank": 2, "title": "string", "probability": "high|medium|low", "detail": "string", "mitigation": "string" },
      { "rank": 3, "title": "string", "probability": "high|medium|low", "detail": "string", "mitigation": "string" }
    ]
  },
  "tamAnalysis": {
    "headline": "string",
    "totalAddressableMarket": "string (e.g. '$4.2B')",
    "serviceableAddressableMarket": "string",
    "serviceableObtainableMarket": "string",
    "calculation": [
      { "step": "string", "value": "string", "assumption": "string" }
    ],
    "insight": "string"
  },
  "cacLtvProjection": {
    "headline": "string",
    "year1Summary": "string",
    "months": [
      { "month": 1, "cac": <number>, "ltv": <number>, "ratio": <number>, "cumulativeCustomers": <number> },
      { "month": 3, "cac": <number>, "ltv": <number>, "ratio": <number>, "cumulativeCustomers": <number> },
      { "month": 6, "cac": <number>, "ltv": <number>, "ratio": <number>, "cumulativeCustomers": <number> },
      { "month": 9, "cac": <number>, "ltv": <number>, "ratio": <number>, "cumulativeCustomers": <number> },
      { "month": 12, "cac": <number>, "ltv": <number>, "ratio": <number>, "cumulativeCustomers": <number> }
    ],
    "assumptions": ["string", "string", "string"]
  },
  "alternativeIdeas": [
    { "title": "string", "description": "string", "successProbability": <integer 0-100>, "whyBetter": "string" },
    { "title": "string", "description": "string", "successProbability": <integer 0-100>, "whyBetter": "string" }
  ],
  "keyRecommendations": ["string", "string", "string"]
}`;

function buildUserPrompt(data: z.infer<typeof CreateIdeaBody>): string {
  return `Analyze this business idea:

Title: ${data.title}
Description: ${data.description}
Target Customer: ${data.targetCustomer ?? "Not specified"}
Revenue Model: ${data.revenueModel ?? "Not specified"}
Stage: ${data.stage ?? "Idea stage"}

Perform a 3rd-degree VC analysis:
1. Identify non-obvious "invisible competition" — alternatives users might choose instead
2. Run a pre-mortem in today's high-interest-rate, AI-saturated environment — top 3 specific failure reasons
3. Bottom-up TAM calculation with clear assumptions
4. 12-month CAC vs LTV projection with realistic ramp-up
5. Confidence score (0-100) based on niche saturation and data availability

Be specific, cite realistic numbers, and do not hedge excessively.`;
}

function formatReport(row: typeof ideaValidationsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    targetCustomer: row.targetCustomer,
    revenueModel: row.revenueModel,
    stage: row.stage,
    status: row.status,
    report: row.report ? JSON.parse(row.report) : null,
    successProbability: row.successProbability,
    confidenceScore: row.confidenceScore,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/ideas — list all for user
router.get("/ideas", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(ideaValidationsTable)
      .where(eq(ideaValidationsTable.userId, req.user!.id))
      .orderBy(desc(ideaValidationsTable.createdAt));
    res.json(rows.map(formatReport));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ideas/:id — get single report
router.get("/ideas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const rows = await db
      .select()
      .from(ideaValidationsTable)
      .where(and(eq(ideaValidationsTable.id, id), eq(ideaValidationsTable.userId, req.user!.id)))
      .limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatReport(rows[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ideas — create + analyze
router.post("/ideas", async (req, res) => {
  try {
    const body = CreateIdeaBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    // Insert as pending
    const [row] = await db
      .insert(ideaValidationsTable)
      .values({
        userId: req.user!.id,
        title: body.data.title,
        description: body.data.description,
        targetCustomer: body.data.targetCustomer ?? null,
        revenueModel: body.data.revenueModel ?? null,
        stage: body.data.stage ?? null,
        status: "pending",
      })
      .returning();

    // Run AI analysis
    let analysisData: Record<string, unknown>;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 3000,
        temperature: 0.4,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body.data) },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      analysisData = JSON.parse(content);
    } catch (aiErr) {
      req.log.error(aiErr, "AI analysis failed");
      await db
        .update(ideaValidationsTable)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(ideaValidationsTable.id, row.id));
      res.status(500).json({ error: "AI analysis failed. Please try again." });
      return;
    }

    const successProb = typeof analysisData.successProbability === "number"
      ? Math.min(100, Math.max(0, analysisData.successProbability))
      : null;
    const confidenceScore = typeof analysisData.confidenceScore === "number"
      ? Math.min(100, Math.max(0, analysisData.confidenceScore))
      : null;

    const [updated] = await db
      .update(ideaValidationsTable)
      .set({
        status: "complete",
        report: JSON.stringify(analysisData),
        successProbability: successProb,
        confidenceScore: confidenceScore,
        updatedAt: new Date(),
      })
      .where(eq(ideaValidationsTable.id, row.id))
      .returning();

    res.status(201).json(formatReport(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/ideas/:id
router.delete("/ideas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db
      .delete(ideaValidationsTable)
      .where(and(eq(ideaValidationsTable.id, id), eq(ideaValidationsTable.userId, req.user!.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
