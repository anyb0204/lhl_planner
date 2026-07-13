import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/requireAuth";
import { recordAiUsage } from "../lib/aiBudget";
import { z } from "zod/v4";

const router = Router();

router.get("/memories", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await db.execute(
      sql`SELECT id, kind, content, created_at, updated_at FROM public.user_memories
          WHERE user_id = ${userId} ORDER BY updated_at DESC LIMIT 100`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/memories/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id), 10);
    await db.execute(
      sql`DELETE FROM public.user_memories WHERE id = ${id} AND user_id = ${userId}`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/memories/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id), 10);
    const { content } = z.object({ content: z.string().min(1).max(500) }).parse(req.body);
    await db.execute(
      sql`UPDATE public.user_memories SET content = ${content}, updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export async function extractAndSaveMemories(userId: string, conversationText: string, allowMemory = true): Promise<void> {
  if (!allowMemory) return;
  try {
    const model = "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `Extract durable facts worth remembering from the conversation below (goals, prayer requests, preferences, struggles, answered prayers). Return a JSON array of objects with {kind: "preference"|"goal"|"prayer_request"|"answered_prayer"|"struggle"|"fact", content: string} or [] if nothing worth saving. Keep each content under 120 characters. Do not extract health details.`,
        },
        { role: "user", content: conversationText.slice(0, 2000) },
      ],
      response_format: { type: "json_object" },
    });

    await recordAiUsage({ userId, bucket: "internal", endpoint: "memories/extract", model, usage: response.usage });

    const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    const items: Array<{ kind: string; content: string }> = Array.isArray(raw) ? raw : (Array.isArray(raw.memories) ? raw.memories : []);

    for (const item of items.slice(0, 5)) {
      if (!item.kind || !item.content) continue;
      await db.execute(
        sql`INSERT INTO public.user_memories (user_id, kind, content, created_at, updated_at)
            VALUES (${userId}, ${item.kind}, ${item.content}, NOW(), NOW())`
      );
    }
  } catch { /* best-effort */ }
}

export async function getUserMemoryContext(userId: string): Promise<string> {
  try {
    const userRows = await db.execute(
      sql`SELECT first_name FROM public.users WHERE id = ${userId}`
    );
    const firstName = (userRows.rows[0] as { first_name?: string } | undefined)?.first_name ?? "";

    const memoryRows = await db.execute(
      sql`SELECT kind, content FROM public.user_memories WHERE user_id = ${userId}
          ORDER BY updated_at DESC LIMIT 20`
    );

    const recentScriptures = await db.execute(
      sql`SELECT scripture_reference, theme FROM public.sent_encouragements
          WHERE user_id = ${userId} ORDER BY sent_at DESC LIMIT 10`
    );

    const memories = memoryRows.rows as Array<{ kind: string; content: string }>;
    const scriptures = recentScriptures.rows as Array<{ scripture_reference?: string; theme?: string }>;

    const parts: string[] = [];

    if (firstName) parts.push(`The user's name is ${firstName}.`);

    if (memories.length > 0) {
      const memList = memories.map(m => `- [${m.kind}] ${m.content}`).join("\n");
      parts.push(`What I remember about this user:\n${memList}`);
    }

    if (scriptures.length > 0) {
      const refs = scriptures.filter(s => s.scripture_reference).map(s => s.scripture_reference).join(", ");
      const themes = scriptures.filter(s => s.theme).map(s => s.theme).join(", ");
      if (refs) parts.push(`Do NOT reuse any of these recently sent scriptures: ${refs}`);
      if (themes) parts.push(`Do NOT repeat these recently used themes: ${themes}`);
    }

    return parts.join("\n\n");
  } catch { return ""; }
}

export default router;
