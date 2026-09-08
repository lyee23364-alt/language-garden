export type Language = "english" | "german";
export type ModuleId = "words" | "patterns" | "reading" | "speaking";
export type StudyMode = "normal" | "busy" | "overtime";

export const studyContent = {
  english: {
    label: "英语",
    locale: "en-US",
    level: "四级基础 · 向主动表达过渡",
    words: [
      { key: "en-sustain", word: "sustain", phonetic: "/səˈsteɪn/", meaning: "维持；使持续", example: "A small routine is easier to sustain." },
      { key: "en-workload", word: "workload", phonetic: "/ˈwɜːkləʊd/", meaning: "工作量", example: "My workload is heavier at the end of the month." },
      { key: "en-adjust", word: "adjust", phonetic: "/əˈdʒʌst/", meaning: "调整；适应", example: "I adjust my plan when I need to work late." },
      { key: "en-consistent", word: "consistent", phonetic: "/kənˈsɪstənt/", meaning: "持续稳定的", example: "Being consistent matters more than being perfect." },
      { key: "en-worthwhile", word: "worthwhile", phonetic: "/ˌwɜːθˈwaɪl/", meaning: "值得投入的", example: "Ten focused minutes can still be worthwhile." },
    ],
    patterns: [
      { key: "en-p1", title: "用于调整计划", pattern: "If I ___, I will ___ instead.", hint: "如果我……，我会改为……", answer: "If I work late, I will review five words instead.", task: "把 work late 换成你最近真实遇到的情况。" },
      { key: "en-p2", title: "用于表达重点", pattern: "What matters most is ___.", hint: "最重要的是……", answer: "What matters most is keeping the routine alive.", task: "写下你学习语言时最看重的一件事。" },
      { key: "en-p3", title: "用于回顾进步", pattern: "I used to ___, but now I ___.", hint: "我过去……，但现在……", answer: "I used to avoid speaking, but now I practise for one minute.", task: "用这个句型说出一个真实变化。" },
    ],
    reading: {
      title: "Small routines survive busy weeks",
      text: "A sustainable learning plan does not depend on perfect evenings. On busy days, a short review keeps the memory active. On normal days, deeper practice builds confidence. The goal is not to study as much as possible, but to return often enough that the language remains familiar.",
      translation: "可持续的学习计划并不依赖每一个完美的夜晚。忙碌时，短暂复习可以保持记忆活跃；正常时，更深入的练习会建立信心。目标不是尽可能学得多，而是足够频繁地回来，让语言始终保持熟悉。",
      prompt: "请用 5 句英语概括短文，并写出你下次加班时会怎样调整。",
    },
    speaking: {
      topic: "Describe your weekday learning routine",
      guide: ["When do you usually study?", "What do you do on a busy day?", "Why are you learning English?"],
      starter: "On weekdays, I usually study before work. When I am busy, I...",
    },
  },
  german: {
    label: "德语",
    locale: "de-DE",
    level: "A1 起步 · 日常表达优先",
    words: [
      { key: "de-alltag", word: "der Alltag", phonetic: "[ˈalˌtaːk]", meaning: "日常生活", example: "Deutsch gehört langsam zu meinem Alltag." },
      { key: "de-dennoch", word: "dennoch", phonetic: "[ˈdɛnɔx]", meaning: "尽管如此；仍然", example: "Ich bin müde, dennoch lerne ich fünf Minuten." },
      { key: "de-schaffen", word: "schaffen", phonetic: "[ˈʃafn̩]", meaning: "完成；做到", example: "Heute schaffe ich eine kurze Übung." },
      { key: "de-wiederholen", word: "wiederholen", phonetic: "[viːdɐˈhoːlən]", meaning: "复习；重复", example: "Ich wiederhole die neuen Wörter." },
      { key: "de-gewohnheit", word: "die Gewohnheit", phonetic: "[ɡəˈvoːnhaɪ̯t]", meaning: "习惯", example: "Lernen wird zu einer Gewohnheit." },
    ],
    patterns: [
      { key: "de-p1", title: "介绍日常安排", pattern: "Normalerweise ___ ich um ___.", hint: "我通常在……做……", answer: "Normalerweise lerne ich um Viertel vor zehn.", task: "填入你的真实学习时间。" },
      { key: "de-p2", title: "表达忙碌与替代方案", pattern: "Wenn ich viel Arbeit habe, ___.", hint: "当我工作很多时……", answer: "Wenn ich viel Arbeit habe, wiederhole ich nur fünf Wörter.", task: "说出你加班时的保底动作。" },
      { key: "de-p3", title: "表达学习原因", pattern: "Ich lerne Deutsch, weil ___.", hint: "我学德语，因为……", answer: "Ich lerne Deutsch, weil ich in Deutschland leben möchte.", task: "补全你自己的真实原因。" },
    ],
    reading: {
      title: "Fünf Minuten sind genug",
      text: "An einem langen Arbeitstag habe ich wenig Zeit. Trotzdem lerne ich fünf Minuten Deutsch. Ich höre drei Sätze, spreche sie nach und schreibe einen eigenen Satz. So bleibt Deutsch ein Teil meines Alltags.",
      translation: "在漫长的工作日里，我时间很少。尽管如此，我仍学习五分钟德语。我听三个句子，跟读它们，再写一个自己的句子。这样，德语依旧是我日常生活的一部分。",
      prompt: "请仿照短文，用 5–8 句德语描述你的工作日学习安排。",
    },
    speaking: {
      topic: "Mein Lerntag",
      guide: ["Wann lernst du?", "Was machst du, wenn du müde bist?", "Warum lernst du Deutsch?"],
      starter: "An einem normalen Tag lerne ich vor der Arbeit. Wenn ich müde bin, ...",
    },
  },
} as const;
