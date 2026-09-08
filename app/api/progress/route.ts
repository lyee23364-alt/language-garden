import { desc, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { reviewItems, studySessions } from "@/db/schema";

const allowedLanguages = new Set(["english", "german"]);
const allowedModules = new Set(["words", "patterns", "reading", "speaking"]);
const allowedModes = new Set(["normal", "busy", "overtime"]);

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return message.includes("no such table") ? "学习数据库尚未初始化。" : message;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function GET() {
  try {
    const db = getDb();
    const [sessions, due] = await Promise.all([
      db.select().from(studySessions).orderBy(desc(studySessions.createdAt), desc(studySessions.id)).limit(40),
      db.select().from(reviewItems).where(lte(reviewItems.nextReviewAt, new Date().toISOString())).orderBy(reviewItems.nextReviewAt).limit(30),
    ]);
    return Response.json({ sessions, due });
  } catch (error) {
    return Response.json({ error: errorMessage(error), sessions: [], due: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = textValue(payload.action);
    const language = textValue(payload.language);
    const moduleName = textValue(payload.module);
    if (!allowedLanguages.has(language) || !allowedModules.has(moduleName)) {
      return Response.json({ error: "无效的语言或学习模块。" }, { status: 400 });
    }
    const db = getDb();
    if (action === "session") {
      const mode = textValue(payload.mode, "normal");
      if (!allowedModes.has(mode)) return Response.json({ error: "无效的学习模式。" }, { status: 400 });
      const [session] = await db.insert(studySessions).values({
        language, module: moduleName, mode,
        duration: Math.max(0, Math.min(180, Number(payload.duration) || 0)),
        score: payload.score == null ? null : Math.max(1, Math.min(3, Number(payload.score) || 1)),
        note: textValue(payload.note).slice(0, 2000),
      }).returning();
      return Response.json({ session }, { status: 201 });
    }
    if (action === "review") {
      const rating = textValue(payload.rating, "again");
      const interval = rating === "easy" ? 7 : rating === "hard" ? 1 : 0;
      const next = new Date(Date.now() + interval * 86400000).toISOString();
      const itemKey = textValue(payload.itemKey).slice(0, 100);
      if (!itemKey) return Response.json({ error: "缺少复习项目。" }, { status: 400 });
      const [item] = await db.insert(reviewItems).values({
        itemKey, language, module: moduleName,
        prompt: textValue(payload.prompt).slice(0, 500),
        answer: textValue(payload.answer).slice(0, 1000),
        status: rating === "easy" ? "familiar" : "learning",
        nextReviewAt: next, intervalDays: interval, seenCount: 1,
        correctCount: rating === "easy" ? 1 : 0,
      }).onConflictDoUpdate({
        target: reviewItems.itemKey,
        set: {
          status: rating === "easy" ? "familiar" : "learning",
          nextReviewAt: next,
          intervalDays: interval,
          seenCount: sql`${reviewItems.seenCount} + 1`,
          correctCount: rating === "easy" ? sql`${reviewItems.correctCount} + 1` : reviewItems.correctCount,
          updatedAt: new Date().toISOString(),
        },
      }).returning();
      return Response.json({ item }, { status: 201 });
    }
    return Response.json({ error: "未知操作。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
