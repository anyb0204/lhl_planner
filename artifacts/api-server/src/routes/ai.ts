import { Router } from "express";
import { chatWithFallback } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  BrainDumpHelpBody,
  GenerateScriptureBody,
  GenerateEncouragementBody,
  GenerateTruthBody,
  PlannerHelpBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireTier } from "../middlewares/requireTier";
import { aiRateLimit } from "../lib/aiRateLimit";
import { z } from "zod/v4";

const router = Router();

router.post("/ai/brain-dump-help", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = BrainDumpHelpBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    if (body.data.text.length > 3000) {
      res.status(400).json({ error: "Brain dump text must be 3,000 characters or fewer." });
      return;
    }

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are a compassionate planning assistant for Latter House Life — a faith-based planner for mature women reclaiming purpose. You help women take their scattered thoughts and turn them into actionable plans grounded in faith and wisdom.

When given a brain dump, you:
1. Extract and organize every task into a clear checklist
2. Identify implied tasks that weren't mentioned but are necessary for completion (e.g., if she needs to take casseroles to a friend, ask about grocery shopping)
3. Generate caring follow-up questions that help her think through logistics she may have missed
4. Offer warm, practical encouragement

Return a JSON object with:
- "tasks": array of {text: string, priority: "high"|"medium"|"low"} 
- "followUpQuestions": array of strings (2-5 thoughtful, specific questions based on what she wrote)
- "encouragement": a warm, faith-infused encouragement (1-2 sentences)`,
        },
        {
          role: "user",
          content: `Here is my brain dump for ${body.data.date}:\n\n${body.data.text}\n\nPlease organize this into tasks, identify anything I might have missed, and give me follow-up questions to make sure I cover everything.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      tasks: parsed.tasks ?? [],
      followUpQuestions: parsed.followUpQuestions ?? [],
      encouragement: parsed.encouragement ?? "You are doing a beautiful work. Keep going.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/scripture", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = GenerateScriptureBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const contextClause = body.data.context
      ? `The user is thinking about: ${body.data.context}. Select a scripture relevant to this context.`
      : "Select a scripture that would encourage and ground a woman who is rebuilding her life with purpose, faith, and intentionality.";

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a Bible scholar and spiritual guide for Latter House Life. You provide scriptures that speak directly to mature women who have walked through exile — whether through life circumstances or their own choices — and are now building something new for God's glory. ${contextClause}

Return a JSON object with:
- "reference": the scripture reference (e.g., "Haggai 2:9")
- "text": the full scripture text (NIV or ESV preferred)
- "reflection": a 2-3 sentence reflection connecting this scripture to the journey of the woman reading it — specific, warm, and encouraging

IMPORTANT: Every call should return a DIFFERENT scripture. Do not repeat common ones. Dig into the full canon — Old Testament, Psalms, Proverbs, Prophets, Epistles, Gospels.`,
        },
        {
          role: "user",
          content: "Give me a fresh scripture for today.",
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      reference: parsed.reference ?? "Haggai 2:9",
      text: parsed.text ?? "The glory of this present house will be greater than the glory of the former house.",
      reflection: parsed.reflection ?? "What you are building now is not lesser — it is greater.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/encouragement", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = GenerateEncouragementBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const contextClause = body.data.context
      ? `The user is working on her ${body.data.view ?? "day"} plan and shared this context: ${body.data.context}`
      : `The user is working on her ${body.data.view ?? "day"} planning.`;

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a warm, wise encourager for Latter House Life — a faith-based planner for mature women stepping into their latter-house season. These are women who have walked through exile, raised children, survived hard seasons, and are now ready to build something purposeful for God.

${contextClause}

Write an encouraging message that:
- Speaks directly to her season (she is NOT starting over, she is building something GREATER)
- Is grounded in scripture or faith without being preachy
- Feels like it was written specifically for her, not a generic affirmation
- Is 2-4 sentences, warm and strong

Return a JSON object with:
- "message": the encouragement text
- "scriptureReference": optional scripture reference that supports the message (can be null)`,
        },
        {
          role: "user",
          content: "Give me some encouragement for today.",
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      message: parsed.message ?? "You are not behind. You are exactly where God needs you to be, building something that will outlast this season.",
      scriptureReference: parsed.scriptureReference ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/truth-generator", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = GenerateTruthBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 700,
      messages: [
        {
          role: "system",
          content: `You are a Biblical truth counselor for Latter House Life. Your role is to identify the specific lie a woman believes about herself and counter it with the exact truth of God's Word.

The women using this tool are mature, seasoned believers who are rebuilding their lives with purpose. They don't need elementary faith — they need the full weight of scripture applied precisely to the lie they carry.

For the lie provided, return a JSON object with:
- "lie": the original lie (cleaned up but recognizable)
- "scriptureReference": the most powerful scripture reference that directly counters this lie
- "scriptureText": the full text of that scripture
- "affirmation": a present-tense, first-person declaration of truth (e.g., "I am fearfully and wonderfully made — God's work is not a mistake")
- "reflection": 2-3 sentences of insight — why this particular lie is common for women in this season and what truth replaces it permanently

Go deep. Use scriptures that are precise and powerful — not just the obvious ones. Match the scripture to the specific wound behind the lie.`,
        },
        {
          role: "user",
          content: `I believe this lie about myself: "${body.data.lie}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      lie: parsed.lie ?? body.data.lie,
      scriptureReference: parsed.scriptureReference ?? "Psalm 139:14",
      scriptureText: parsed.scriptureText ?? "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.",
      affirmation: parsed.affirmation ?? "I am fearfully and wonderfully made.",
      reflection: parsed.reflection ?? "God does not make mistakes. You are His intentional creation.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/planner-help", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = PlannerHelpBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const entriesClause = body.data.currentEntries
      ? `\n\nHere is what she has planned so far:\n${body.data.currentEntries}`
      : "";

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 900,
      messages: [
        {
          role: "system",
          content: `You are a wise planning companion for Latter House Life, helping a mature woman plan her ${body.data.view} with intention and faith. She is in a season of building — not rebuilding what was lost, but constructing something new and purposeful.

She shared this context: "${body.data.context}"${entriesClause}

Provide:
1. 3-5 practical, specific suggestions for her ${body.data.view} — based on what she's shared
2. A 2-3 sentence insight about how she might approach this ${body.data.view} with greater intentionality
3. Optionally, a prayer focus or scripture anchor for the ${body.data.view}

Return a JSON object with:
- "suggestions": array of specific, actionable suggestion strings
- "insights": a paragraph of wisdom for this ${body.data.view}
- "prayerFocus": a brief prayer focus or scripture anchor (can be null)`,
        },
        {
          role: "user",
          content: `Help me plan my ${body.data.view}.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      suggestions: parsed.suggestions ?? [],
      insights: parsed.insights ?? "Every intentional step forward is an act of faith.",
      prayerFocus: parsed.prayerFocus ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/get-back-on-track", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = z.object({ daysAway: z.number().int().nullable().optional() }).safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const daysClause = body.data.daysAway && body.data.daysAway > 0
      ? `She has been away for about ${body.data.daysAway} day${body.data.daysAway === 1 ? "" : "s"}.`
      : "She has been away for a little while.";

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are Reginald — a warm, wise, grandfatherly presence inside Latter House Life, a faith-based planner for mature women. You carry the energy of a trusted elder who never shames, only encourages. ${daysClause}

Your job is to gently welcome her back and give her exactly 2 tiny, immediately doable habits to restart with. These should feel effortless — 5 minutes or less each. No guilt. Pure grace.

Return a JSON object with:
- "greeting": a 2-3 sentence warm welcome from Reginald (use "beloved" or "dear one" naturally, not robotically). Acknowledge the pause without judgment. Let her know she is not behind — she is right on time.
- "habits": exactly 2 objects, each with { "name": string (the habit, short — under 8 words), "why": string (one sentence of gentle encouragement for this specific habit) }
- "scripture": { "reference": string, "text": string } — a scripture of grace, new beginnings, or restoration. Choose something specific and fresh — not Lamentations 3:22-23 or Isaiah 43:19 (those are overused).
- "encouragement": one final sentence Reginald speaks over her — a blessing or declaration of faith in who she is.`,
        },
        {
          role: "user",
          content: "Help me get back on track.",
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      greeting: parsed.greeting ?? "Welcome back, beloved. Every step forward is a step of faith, no matter how small.",
      habits: Array.isArray(parsed.habits) ? parsed.habits.slice(0, 2) : [
        { name: "5 minutes of morning prayer", why: "Reconnecting with God first sets the tone for everything else." },
        { name: "Write one thing you're grateful for", why: "Gratitude shifts your atmosphere before anything else does." },
      ],
      scripture: parsed.scripture ?? { reference: "Joel 2:25", text: "I will restore to you the years that the swarming locust has eaten." },
      encouragement: parsed.encouragement ?? "You are not behind — you are right on time.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const TaskBreakdownBody = z.object({ task: z.string().min(1).max(500) });

router.post("/ai/task-breakdown", requireAuth, aiRateLimit("regular-ai", 20), async (req, res) => {
  try {
    const body = TaskBreakdownBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const response = await chatWithFallback({
      model: "gpt-4o-mini",
      max_completion_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `You are Reginald — a warm, wise, grandfatherly presence inside Latter House Life, a faith-based planner for mature women. You help women break down overwhelming tasks into manageable, realistic steps so they know exactly where to start.

When given a task, you:
1. Break it into 4-7 concrete, actionable steps with honest, realistic time estimates in minutes
2. Choose a scripture that speaks to the spirit of this work — discipline, patience, service, courage, or faithfulness. Make it specific and fitting, not generic.
3. Offer one sentence of warm Reginald-voiced encouragement to help her begin

Return a JSON object with:
- "steps": array of { "text": string (clear, specific action — begin with a verb), "estimatedMinutes": number (realistic minutes for this step only) }
- "scripture": { "reference": string, "text": string }
- "encouragement": string — one sentence from Reginald, warm and specific to this task`,
        },
        {
          role: "user",
          content: `Please break down this task for me: "${body.data.task}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    res.json({
      steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 7).map((s: Record<string, unknown>) => ({
        text: typeof s.text === "string" ? s.text : "Complete this step",
        estimatedMinutes: typeof s.estimatedMinutes === "number" ? s.estimatedMinutes : 10,
      })) : [
        { text: "Review what needs to be done", estimatedMinutes: 5 },
        { text: "Gather any materials needed", estimatedMinutes: 10 },
        { text: "Complete the main work", estimatedMinutes: 30 },
      ],
      scripture: parsed.scripture ?? { reference: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
      encouragement: parsed.encouragement ?? "You have everything you need to take this one step at a time, beloved.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Premium AI endpoints ────────────────────────────────────────────────────

const WeeklyPlanBody = z.object({ goals: z.string().optional(), recentTasks: z.string().optional() });
const HealthSummaryBody = z.object({ conditions: z.string().optional(), medications: z.string().optional() });
const FinancialCoachingBody = z.object({ entries: z.string().optional(), month: z.string().optional() });
const DevotionalBody = z.object({ goals: z.string().optional() });

router.post("/ai/weekly-plan", requireAuth, requireTier("premium"), aiRateLimit("premium-ai", 10), async (req, res) => {
  try {
    const body = WeeklyPlanBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const goalsCtx = body.data.goals ? `Her current goals: ${body.data.goals}` : "";
    const tasksCtx = body.data.recentTasks ? `Recent tasks she's been working on: ${body.data.recentTasks}` : "";

    const response = await chatWithFallback({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a strategic planning coach for Latter House Life — a faith-based planner for mature women building purposeful lives. You help create weekly plans that balance practical responsibilities with intentional progress toward goals.

${goalsCtx}
${tasksCtx}

Create a structured weekly plan (Monday–Sunday) that:
- Balances rest, faith, family, health, and purpose-work across the week
- Connects daily focus areas to her stated goals
- Includes a theme scripture for the week
- Provides a daily rhythm suggestion (morning, midday, evening anchors)

Return a JSON object with:
- "weekTheme": a short inspiring theme for the week (1 sentence)
- "themeScripture": { reference, text } — a scripture anchoring the week's theme
- "days": array of 7 objects { day: "Monday"…"Sunday", focus: string, keyTasks: string[], eveningReflection: string }
- "weeklyIntention": a 2-3 sentence statement of what a successful week looks like
- "prayerAnchor": a brief faith-based encouragement for the week`,
        },
        { role: "user", content: "Create my weekly plan." },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    res.json({
      weekTheme: parsed.weekTheme ?? "A week of faithful, intentional steps.",
      themeScripture: parsed.themeScripture ?? { reference: "Haggai 2:9", text: "The glory of this present house will be greater than the former." },
      days: parsed.days ?? [],
      weeklyIntention: parsed.weeklyIntention ?? "This week I will move forward with purpose.",
      prayerAnchor: parsed.prayerAnchor ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/health-summary", requireAuth, requireTier("premium"), aiRateLimit("premium-ai", 10), async (req, res) => {
  try {
    const body = HealthSummaryBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const condCtx = body.data.conditions ? `Health conditions: ${body.data.conditions}` : "No health conditions recorded.";
    const medCtx = body.data.medications ? `Current medications: ${body.data.medications}` : "No medications recorded.";

    const response = await chatWithFallback({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a compassionate health organizer for Latter House Life. You help women prepare clear, plain-language health summaries they can share with their medical team. You do NOT provide medical advice.

${condCtx}
${medCtx}

Create a clear health summary that:
- Organizes conditions by status (active, managed, resolved)
- Lists medications in a clear table-like format with doses and timing
- Highlights questions a doctor might find important
- Includes a reminder to verify all information before sharing

Return a JSON object with:
- "conditionsSummary": array of { name, status, notes } objects
- "medicationsSummary": array of { name, dose, timing, notes } objects
- "questionsForDoctor": array of suggested questions based on the health picture
- "importantReminders": array of practical self-care reminders
- "disclaimer": standard "this is not medical advice" disclaimer`,
        },
        { role: "user", content: "Create my health summary." },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    res.json({
      conditionsSummary: parsed.conditionsSummary ?? [],
      medicationsSummary: parsed.medicationsSummary ?? [],
      questionsForDoctor: parsed.questionsForDoctor ?? [],
      importantReminders: parsed.importantReminders ?? [],
      disclaimer: parsed.disclaimer ?? "This summary is for organizational purposes only and does not constitute medical advice. Always verify with your healthcare provider.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/financial-coaching", requireAuth, requireTier("premium"), aiRateLimit("premium-ai", 10), async (req, res) => {
  try {
    const body = FinancialCoachingBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const entriesCtx = body.data.entries ? `Financial entries for ${body.data.month ?? "this month"}: ${body.data.entries}` : "No financial entries recorded yet.";

    const response = await chatWithFallback({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a faith-based financial coach for Latter House Life — a wise, encouraging guide who helps mature women steward their resources with intentionality and biblical principles. You do NOT provide financial advice in the professional/legal sense.

${entriesCtx}

Provide coaching that:
- Affirms the spiritual principle of stewardship (not scarcity)
- Celebrates giving/tithing as an act of faith, not obligation
- Identifies patterns in spending with gentle, non-judgmental observations
- Offers 3-5 practical, faith-grounded suggestions for the next month
- Includes a relevant scripture about provision, generosity, or stewardship

Return a JSON object with:
- "summary": 2-3 sentences on the overall picture for the month
- "strengths": array of 2-3 things she is doing well (giving, saving, etc.)
- "opportunities": array of 2-3 gentle, specific improvement suggestions
- "nextMonthGoals": array of 3 concrete, achievable goals for next month
- "scriptureEncouragement": { reference, text, application } — scripture on stewardship/provision with a brief application note
- "coachingMessage": a warm, faith-based closing paragraph`,
        },
        { role: "user", content: "Give me financial coaching for this month." },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    res.json({
      summary: parsed.summary ?? "Your financial stewardship reflects your values.",
      strengths: parsed.strengths ?? [],
      opportunities: parsed.opportunities ?? [],
      nextMonthGoals: parsed.nextMonthGoals ?? [],
      scriptureEncouragement: parsed.scriptureEncouragement ?? { reference: "Proverbs 3:9", text: "Honor the Lord with your wealth.", application: "Stewardship begins with the first fruits." },
      coachingMessage: parsed.coachingMessage ?? "You are a faithful steward. Every decision made with intention honors God.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/devotional", requireAuth, requireTier("premium"), aiRateLimit("premium-ai", 10), async (req, res) => {
  try {
    const body = DevotionalBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const goalsCtx = body.data.goals
      ? `Her current life goals and season: ${body.data.goals}`
      : "She is a mature woman building her latter-house season with purpose and faith.";

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const response = await chatWithFallback({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a devotional writer for Latter House Life — a faith-based planner for mature women in their latter-house season. You write deeply personal, scripture-rooted morning devotionals that feel written specifically for the woman reading them.

Today is ${today}.
${goalsCtx}

Write a morning devotional that:
- Begins with a meaningful scripture (not Haggai 2:9 — choose something fresh and fitting)
- Includes a 3-4 paragraph reflection connecting the scripture to her specific season of building
- Ends with a declaration she can speak aloud over her day
- Closes with a prayer (2-3 sentences, first-person, conversational)

Return a JSON object with:
- "date": today's date in readable format
- "scripture": { reference, text } — the anchor verse
- "title": a short title for today's devotional (5-8 words)
- "reflection": the 3-4 paragraph devotional text (plain text, paragraphs separated by \\n\\n)
- "declaration": a bold, present-tense declaration she speaks aloud
- "prayer": the closing prayer text`,
        },
        { role: "user", content: "Write my morning devotional." },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    res.json({
      date: parsed.date ?? today,
      scripture: parsed.scripture ?? { reference: "Isaiah 43:19", text: "See, I am doing a new thing! Now it springs up; do you not perceive it?" },
      title: parsed.title ?? "A New Thing Springs Up",
      reflection: parsed.reflection ?? "God is doing something new in your life today.",
      declaration: parsed.declaration ?? "I am positioned for newness. God is working in me today.",
      prayer: parsed.prayer ?? "Lord, open my eyes to see what You are doing. Guide my steps today.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch user context for premium AI (used internally by Premium pages via dedicated endpoints above)
router.get("/ai/premium-context", requireAuth, requireTier("premium"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const [goals, conditions, medications, financials] = await Promise.all([
      db.execute(sql`SELECT title, category, progress FROM public.goals WHERE user_id = ${userId} AND completed = false ORDER BY created_at DESC LIMIT 10`),
      db.execute(sql`SELECT name, status, notes FROM public.health_conditions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 20`),
      db.execute(sql`SELECT name, dose, times, notes FROM public.medications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 20`),
      db.execute(sql`SELECT type, amount, description, category, date FROM public.financial_entries WHERE user_id = ${userId} AND date >= date_trunc('month', CURRENT_DATE)::text ORDER BY date DESC LIMIT 50`),
    ]);
    res.json({
      goals: goals.rows,
      conditions: conditions.rows,
      medications: medications.rows,
      financials: financials.rows,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
