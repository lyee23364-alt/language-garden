"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BookOpenText, Brain, Check, ChevronRight, Clock3,
  Flame, Headphones, History, MessageCircleMore, Mic2, Pause,
  Play, RotateCcw, Sparkles, Speaker, Sprout, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Language, ModuleId, StudyMode, studyContent } from "./study-data";

type Session = { id: number; language: Language; module: ModuleId; mode: StudyMode; duration: number; score: number | null; note: string; createdAt: string };
type DueItem = { id: number; itemKey: string; language: Language; module: ModuleId; prompt: string; answer: string; status: string; nextReviewAt: string };
type Panel = "learn" | "review" | "history";

const modules = [
  { id: "words", title: "单词", subtitle: "主动回忆", icon: Brain, color: "lime" },
  { id: "patterns", title: "句型", subtitle: "真实造句", icon: MessageCircleMore, color: "blue" },
  { id: "reading", title: "读写", subtitle: "输入转输出", icon: BookOpenText, color: "violet" },
  { id: "speaking", title: "口语", subtitle: "60 秒表达", icon: Mic2, color: "orange" },
] as const;

const modeInfo = {
  normal: { minutes: 35, title: "正常", note: "主语言 25 分钟 + 复习 10 分钟" },
  busy: { minutes: 15, title: "忙碌", note: "听读 10 分钟 + 输出 5 分钟" },
  overtime: { minutes: 5, title: "加班", note: "听 3 分钟 + 跟读 1 分钟 + 写 1 句" },
};

const moduleNames: Record<ModuleId, string> = { words: "单词", patterns: "句型", reading: "读写", speaking: "口语" };

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("english");
  const [mode, setMode] = useState<StudyMode>("normal");
  const [module, setModule] = useState<ModuleId>("words");
  const [panel, setPanel] = useState<Panel>("learn");
  const [wordIndex, setWordIndex] = useState(0);
  const [patternIndex, setPatternIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [timer, setTimer] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [due, setDue] = useState<DueItem[]>([]);
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const practiceRef = useRef<HTMLElement>(null);
  const data = studyContent[language];
  const word = data.words[wordIndex % data.words.length];
  const pattern = data.patterns[patternIndex % data.patterns.length];

  const refreshProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/progress", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { sessions?: Session[]; due?: DueItem[] };
      setSessions(result.sessions ?? []);
      setDue(result.due ?? []);
    } catch { /* Preview can still be used while the database starts. */ }
  }, []);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("yuban-language") as Language | null;
    const savedMode = window.localStorage.getItem("yuban-mode") as StudyMode | null;
    queueMicrotask(() => {
      if (savedLanguage === "english" || savedLanguage === "german") setLanguage(savedLanguage);
      if (savedMode && modeInfo[savedMode]) setMode(savedMode);
    });
    queueMicrotask(() => void refreshProgress());
  }, [refreshProgress]);

  useEffect(() => { window.localStorage.setItem("yuban-language", language); }, [language]);
  useEffect(() => { window.localStorage.setItem("yuban-mode", mode); }, [mode]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setTimeout(() => setTimer((value) => {
      if (value <= 1) {
        setTimerRunning(false);
        setNotice("60 秒完成！给自己一个诚实的评分。");
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearTimeout(id);
  }, [timer, timerRunning]);

  const startModule = useCallback((nextModule: ModuleId, nextLanguage = language, nextMode = mode) => {
    setLanguage(nextLanguage); setMode(nextMode); setModule(nextModule); setPanel("learn"); setRevealed(false);
    window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [language, mode]);

  const saveSession = useCallback(async (input: { module: ModuleId; duration: number; score?: number; note?: string; language?: Language; mode?: StudyMode }) => {
    setSyncing(true);
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "session", language: input.language ?? language, module: input.module, mode: input.mode ?? mode, duration: input.duration, score: input.score, note: input.note ?? "" }) });
      if (!response.ok) throw new Error();
      setNotice("已保存到学习记录");
      await refreshProgress();
    } catch { setNotice("暂时未能同步，请稍后再试"); }
    finally { setSyncing(false); }
  }, [language, mode, refreshProgress]);

  const rateReview = useCallback(async (item: { key: string; prompt: string; answer: string }, rating: "easy" | "hard" | "again", itemModule: ModuleId) => {
    setSyncing(true);
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review", language, module: itemModule, itemKey: item.key, prompt: item.prompt, answer: item.answer, rating }) });
      if (!response.ok) throw new Error();
      setNotice(rating === "easy" ? "很好，7 天后再见" : rating === "hard" ? "已加入明日复习" : "已放回本次队列");
      setRevealed(false);
      if (itemModule === "words") setWordIndex((value) => (value + 1) % data.words.length);
      if (itemModule === "patterns") setPatternIndex((value) => (value + 1) % data.patterns.length);
      await refreshProgress();
    } catch { setNotice("保存失败，请稍后再试"); }
    finally { setSyncing(false); }
  }, [data.patterns.length, data.words.length, language, refreshProgress]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) { setNotice("当前浏览器不支持朗读"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = data.locale; utterance.rate = .86;
    window.speechSynthesis.speak(utterance);
  }, [data.locale]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "start_study_module", title: "开始语言练习", description: "切换语言、学习强度与模块，并在页面中打开对应练习。",
        inputSchema: { type: "object", properties: { language: { type: "string", enum: ["english", "german"] }, module: { type: "string", enum: ["words", "patterns", "reading", "speaking"] }, mode: { type: "string", enum: ["normal", "busy", "overtime"] } }, required: ["language", "module", "mode"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const value = input as { language?: Language; module?: ModuleId; mode?: StudyMode };
          if (!value.language || !value.module || !value.mode || !studyContent[value.language] || !moduleNames[value.module] || !modeInfo[value.mode]) throw new Error("Invalid study selection");
          startModule(value.module, value.language, value.mode);
          return { status: "ready", language: value.language, module: value.module, mode: value.mode };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "complete_study_session", title: "记录完成的学习", description: "保存一次已完成的语言学习记录。",
        inputSchema: { type: "object", properties: { language: { type: "string", enum: ["english", "german"] }, module: { type: "string", enum: ["words", "patterns", "reading", "speaking"] }, mode: { type: "string", enum: ["normal", "busy", "overtime"] }, duration: { type: "number", minimum: 0, maximum: 180 }, score: { type: "number", minimum: 1, maximum: 3 }, note: { type: "string", maxLength: 2000 } }, required: ["language", "module", "mode", "duration"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          const value = input as { language: Language; module: ModuleId; mode: StudyMode; duration: number; score?: number; note?: string };
          if (!studyContent[value.language] || !moduleNames[value.module] || !modeInfo[value.mode] || !Number.isFinite(value.duration)) throw new Error("Invalid study session");
          await saveSession(value);
          return { status: "saved", duration: value.duration, module: value.module };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [saveSession, startModule]);

  const weekMinutes = sessions.reduce((sum, item) => sum + item.duration, 0);
  const completedDays = new Set(sessions.map((item) => item.createdAt.slice(0, 10))).size;
  const streak = Math.max(1, completedDays);
  const weeklyPercent = Math.min(100, Math.round((weekMinutes / 180) * 100));
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date()), []);

  return (
    <main className="study-shell">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="语伴首页"><span><Sprout /></span><strong>语伴</strong></a>
        <nav className="main-nav" aria-label="主要页面">
          <button className={panel === "learn" ? "active" : ""} onClick={() => setPanel("learn")}>学习</button>
          <button className={panel === "review" ? "active" : ""} onClick={() => setPanel("review")}>复习 <b>{due.length}</b></button>
          <button className={panel === "history" ? "active" : ""} onClick={() => setPanel("history")}>记录</button>
        </nav>
        <div className="header-controls">
          <Select value={language} onValueChange={(value) => value && setLanguage(value as Language)}>
            <SelectTrigger className="language-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="english">🇬🇧 英语</SelectItem><SelectItem value="german">🇩🇪 德语</SelectItem></SelectContent>
          </Select>
          <div className="day-streak"><Flame /><strong>{String(streak).padStart(2, "0")}</strong><span>连续天数</span></div>
        </div>
      </header>

      {panel === "learn" && <>
        <section id="top" className="today-grid">
          <div className="today-copy">
            <p className="eyebrow">{dateLabel} · {data.level}</p>
            <h1>早上好，<br /><em>今天学轻一点。</em></h1>
            <p>你的工作时间是 10:50–19:50。把主练习放在上班前，晚上只做自愿加餐。</p>
          </div>
          <div className="mode-card">
            <div><span>今天的节奏</span><b>{String(modeInfo[mode].minutes).padStart(2, "0")}<small>MIN</small></b></div>
            <Tabs value={mode} onValueChange={(value) => setMode(value as StudyMode)}>
              <TabsList className="mode-tabs"><TabsTrigger value="normal">正常</TabsTrigger><TabsTrigger value="busy">忙碌</TabsTrigger><TabsTrigger value="overtime">加班</TabsTrigger></TabsList>
              <TabsContent value={mode}><p className="mode-note">{modeInfo[mode].note}</p></TabsContent>
            </Tabs>
            <div className="weekly-bar"><div className="weekly-label"><span>本周 {weekMinutes} / 180 分钟</span><b>{weeklyPercent}%</b></div><progress max="100" value={weeklyPercent} aria-label="本周学习进度" /></div>
          </div>
        </section>

        <section className="workspace">
          <div className="section-heading"><div><span>CHOOSE YOUR FOCUS</span><h2>现在想练什么？</h2></div><p>可以自由选择，不必按顺序。</p></div>
          <div className="module-grid">
            {modules.map(({ id, title, subtitle, icon: Icon, color }, index) => (
              <button key={id} className={`module-card ${color} ${module === id ? "active" : ""}`} onClick={() => startModule(id)}>
                <span className="module-index">0{index + 1}</span><span className="module-icon"><Icon /></span><strong>{title}</strong><small>{subtitle}</small><i><ChevronRight /></i>
              </button>
            ))}
          </div>
        </section>

        <section ref={practiceRef} className="practice-section" aria-label={`${moduleNames[module]}练习`}>
          <div className="practice-side">
            <span className="practice-kicker">TODAY&apos;S PRACTICE</span>
            <h2>{moduleNames[module]}</h2>
            <p>{language === "english" ? "英语" : "德语"} · {modeInfo[mode].title}模式</p>
            <div className="practice-steps">
              {modules.map(({ id, title, icon: Icon }) => <button key={id} className={module === id ? "active" : ""} onClick={() => { setModule(id); setRevealed(false); }}><Icon /><span>{title}</span></button>)}
            </div>
            <button className="review-shortcut" onClick={() => setPanel("review")}><RotateCcw /><span><strong>{due.length} 个待复习</strong><small>先清理记忆队列</small></span><ArrowRight /></button>
          </div>
          <div className="practice-main">
            {module === "words" && <WordPractice word={word} revealed={revealed} setRevealed={setRevealed} speak={speak} syncing={syncing} onRate={(rating) => rateReview({ key: word.key, prompt: word.word, answer: `${word.meaning}｜${word.example}` }, rating, "words")} position={wordIndex + 1} total={data.words.length} />}
            {module === "patterns" && <PatternPractice pattern={pattern} revealed={revealed} setRevealed={setRevealed} syncing={syncing} onRate={(rating) => rateReview({ key: pattern.key, prompt: pattern.pattern, answer: pattern.answer }, rating, "patterns")} position={patternIndex + 1} total={data.patterns.length} />}
            {module === "reading" && <ReadingPractice reading={data.reading} draft={draft} setDraft={setDraft} showTranslation={showTranslation} setShowTranslation={setShowTranslation} syncing={syncing} onSave={() => saveSession({ module: "reading", duration: modeInfo[mode].minutes, note: draft })} />}
            {module === "speaking" && <SpeakingPractice speaking={data.speaking} timer={timer} running={timerRunning} setRunning={setTimerRunning} reset={() => { setTimer(60); setTimerRunning(false); }} speak={speak} syncing={syncing} onScore={(score) => saveSession({ module: "speaking", duration: Math.max(1, Math.ceil((60 - timer) / 60)), score, note: data.speaking.topic })} />}
          </div>
        </section>
      </>}

      {panel === "review" && <ReviewPanel due={due} onChoose={(item) => { setLanguage(item.language); setModule(item.module); setPanel("learn"); setRevealed(true); window.setTimeout(() => practiceRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }} />}
      {panel === "history" && <HistoryPanel sessions={sessions} weekMinutes={weekMinutes} completedDays={completedDays} />}
      {notice && <output className="notice" aria-live="polite"><Check />{notice}<button aria-label="关闭提示" onClick={() => setNotice("")}>×</button></output>}
    </main>
  );
}

function WordPractice({ word, revealed, setRevealed, speak, syncing, onRate, position, total }: { word: { word: string; phonetic: string; meaning: string; example: string }; revealed: boolean; setRevealed: (value: boolean) => void; speak: (text: string) => void; syncing: boolean; onRate: (rating: "easy" | "hard" | "again") => void; position: number; total: number }) {
  return <div className="practice-card word-practice"><div className="card-topline"><span>主动回忆</span><b>{position} / {total}</b></div><div className="word-center"><button className="sound-button" onClick={() => speak(`${word.word}. ${word.example}`)} aria-label="朗读单词和例句"><Volume2 /></button><h3>{word.word}</h3><p>{word.phonetic}</p>{revealed ? <div className="answer-block"><strong>{word.meaning}</strong><span>{word.example}</span></div> : <button className="reveal-button" onClick={() => setRevealed(true)}>显示释义与例句</button>}</div>{revealed && <div className="rating-row"><span>你记得多牢？</span><div><Button variant="outline" disabled={syncing} onClick={() => onRate("again")}>不认识</Button><Button variant="outline" disabled={syncing} onClick={() => onRate("hard")}>有点模糊</Button><Button disabled={syncing} onClick={() => onRate("easy")}>认识</Button></div></div>}</div>;
}

function PatternPractice({ pattern, revealed, setRevealed, syncing, onRate, position, total }: { pattern: { title: string; pattern: string; hint: string; answer: string; task: string }; revealed: boolean; setRevealed: (value: boolean) => void; syncing: boolean; onRate: (rating: "easy" | "hard" | "again") => void; position: number; total: number }) {
  return <div className="practice-card pattern-practice"><div className="card-topline"><span>{pattern.title}</span><b>{position} / {total}</b></div><div className="pattern-body"><span className="pattern-hint">{pattern.hint}</span><h3>{pattern.pattern}</h3><p>{pattern.task}</p>{revealed ? <div className="answer-block"><small>参考表达</small><strong>{pattern.answer}</strong></div> : <button className="reveal-button" onClick={() => setRevealed(true)}>想好后查看参考</button>}</div>{revealed && <div className="rating-row"><span>这个句型能独立说出吗？</span><div><Button variant="outline" disabled={syncing} onClick={() => onRate("again")}>还不能</Button><Button variant="outline" disabled={syncing} onClick={() => onRate("hard")}>需要提示</Button><Button disabled={syncing} onClick={() => onRate("easy")}>可以</Button></div></div>}</div>;
}

function ReadingPractice({ reading, draft, setDraft, showTranslation, setShowTranslation, syncing, onSave }: { reading: { title: string; text: string; translation: string; prompt: string }; draft: string; setDraft: (value: string) => void; showTranslation: boolean; setShowTranslation: (value: boolean) => void; syncing: boolean; onSave: () => void }) {
  return <div className="practice-card reading-practice"><div className="reading-layout"><article><div className="card-topline"><span>阅读材料</span><Headphones /></div><h3>{reading.title}</h3><p>{reading.text}</p><button className="text-button" onClick={() => setShowTranslation(!showTranslation)}>{showTranslation ? "隐藏中文" : "查看中文参考"}</button>{showTranslation && <blockquote>{reading.translation}</blockquote>}</article><div className="writing-zone"><span>写作输出</span><h4>{reading.prompt}</h4><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="不求复杂，先用自己的话写出来……" /><div className="writing-footer"><small>{draft.trim().length} 字符</small><Button disabled={syncing || draft.trim().length < 10} onClick={onSave}><Check />保存本次练习</Button></div></div></div></div>;
}

function SpeakingPractice({ speaking, timer, running, setRunning, reset, speak, syncing, onScore }: { speaking: { topic: string; guide: readonly string[]; starter: string }; timer: number; running: boolean; setRunning: (value: boolean) => void; reset: () => void; speak: (text: string) => void; syncing: boolean; onScore: (score: number) => void }) {
  const completed = timer < 60 && !running;
  return <div className="practice-card speaking-practice"><div className="speaking-layout"><div className="speaking-prompt"><span>今日话题</span><h3>{speaking.topic}</h3><ul>{speaking.guide.map((item) => <li key={item}>{item}</li>)}</ul><button className="starter" onClick={() => speak(speaking.starter)}><Speaker /><span><small>开头参考</small><strong>{speaking.starter}</strong></span></button></div><div className={`timer-disc ${running ? "running" : ""}`}><span>{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</span><small>{running ? "大胆说，不要停下来纠错" : timer === 60 ? "准备好后开始" : "练习结束"}</small><div><button onClick={() => setRunning(!running)} aria-label={running ? "暂停" : "开始"}>{running ? <Pause /> : <Play />}</button><button onClick={reset} aria-label="重置计时"><RotateCcw /></button></div></div></div>{completed && <div className="rating-row"><span>这次表达顺畅吗？</span><div><Button variant="outline" disabled={syncing} onClick={() => onScore(1)}>需要重来</Button><Button variant="outline" disabled={syncing} onClick={() => onScore(2)}>基本完成</Button><Button disabled={syncing} onClick={() => onScore(3)}>很顺畅</Button></div></div>}</div>;
}

function ReviewPanel({ due, onChoose }: { due: DueItem[]; onChoose: (item: DueItem) => void }) {
  return <section className="panel-page"><div className="panel-intro"><span>REVIEW QUEUE</span><h1>把模糊的，<em>变成熟悉的。</em></h1><p>只复习你标记为“不认识”或“有点模糊”的内容。</p></div>{due.length === 0 ? <div className="empty-state"><Sparkles /><h2>队列已经清空</h2><p>今天没有到期项目。去学一点新内容，或放心休息。</p></div> : <div className="review-list">{due.map((item) => <button key={item.id} onClick={() => onChoose(item)}><span className={`review-type ${item.module}`}>{moduleNames[item.module]}</span><div><strong>{item.prompt}</strong><small>{item.language === "english" ? "英语" : "德语"} · 点击开始复习</small></div><ChevronRight /></button>)}</div>}</section>;
}

function HistoryPanel({ sessions, weekMinutes, completedDays }: { sessions: Session[]; weekMinutes: number; completedDays: number }) {
  return <section className="panel-page"><div className="panel-intro"><span>YOUR RHYTHM</span><h1>关注趋势，<em>不追究断档。</em></h1><p>你的目标是每周 5 天、180–240 分钟。</p></div><div className="stats-grid"><div><Clock3 /><strong>{weekMinutes}</strong><span>本周分钟</span></div><div><Flame /><strong>{completedDays}</strong><span>完成天数</span></div><div><History /><strong>{sessions.length}</strong><span>练习次数</span></div></div><div className="history-list"><div className="history-head"><h2>最近记录</h2><span>最新在前</span></div>{sessions.length === 0 ? <div className="history-empty">完成一次练习后，记录会显示在这里。</div> : sessions.map((item) => <article key={item.id}><span className={`history-icon ${item.module}`}>{moduleNames[item.module].slice(0, 1)}</span><div><strong>{moduleNames[item.module]} · {item.language === "english" ? "英语" : "德语"}</strong><small>{item.note || `${modeInfo[item.mode].title}模式`}</small></div><b>{item.duration} 分钟</b><time>{new Date(item.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time></article>)}</div></section>;
}
