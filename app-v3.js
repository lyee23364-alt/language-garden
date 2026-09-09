(function () {
  'use strict';

  var cloudClient = null;
  var activeAccount = null;
  var syncTimer = null;
  var stages = ['words', 'listening', 'patterns', 'reading', 'speaking'];
  var stageLabels = { words: '单词记忆', listening: '听力跟读', patterns: '词汇造句', reading: '读写输出', speaking: '口语表达' };
  var MODE_CONFIG = {
    normal: { words: 5, listening: 3, patterns: 2, readingTarget: 30, speakingSeconds: 60, speakingTarget: 22, summary: '5 词 · 3 句听力 · 2 次造句 · 完整读写 · 60 秒口语' },
    busy: { words: 3, listening: 2, patterns: 1, readingTarget: 18, speakingSeconds: 30, speakingTarget: 14, summary: '3 词 · 2 句听力 · 1 次造句 · 短读写 · 30 秒口语' },
    overtime: { words: 2, listening: 1, patterns: 1, readingTarget: 8, speakingSeconds: 15, speakingTarget: 7, summary: '2 词 · 1 句听力跟读 · 写 1 句 · 15 秒口语' }
  };
  NAMES.listening = '听力';
  function modeConfig() { return MODE_CONFIG[state.mode] || MODE_CONFIG.normal; }
  var topicVersion = 2;
  SCENES.study = '学习成长';
  SCENE_CONTENT.english.study = {
    words: [['retain','/rɪˈteɪn/','记住；保留','Using a new word helps me retain it.'],['review','/rɪˈvjuː/','复习；回顾','I review difficult words the next day.'],['focus','/ˈfəʊkəs/','专注','I can focus better in a quiet place.'],['progress','/ˈprəʊɡres/','进步；进展','Small steps still create real progress.'],['challenging','/ˈtʃælɪndʒɪŋ/','有挑战性的','Speaking is challenging, but it gets easier.']],
    patterns: [['One thing that helps me learn is ___.','对我学习有帮助的一件事是……','One thing that helps me learn is using new words in a diary.','联系你的真实学习习惯写完整表达。'],['I find ___ challenging, so I ___.','我觉得……有挑战，所以我……','I find speaking challenging, so I practise for one minute every day.','说明一个困难以及你的解决办法。']],
    reading: ['Why using a word matters','Seeing a new word once is rarely enough. We remember it more clearly when we retrieve it, connect it with something familiar, and use it in our own sentence. Short reviews over several days are usually more effective than one long study session.','只看一次新单词通常不够。当我们主动回忆、把它和熟悉的事物联系起来，并用它造出自己的句子时，记忆会更清晰。分散在几天内的短复习通常比一次长时间学习更有效。','用自己的话说明你会怎样记住今天的单词，并至少使用两个当日词汇。'],
    speaking: ['How you learn something difficult',['What are you learning now?','What is challenging?','How do you review and notice progress?'],'Right now, I am learning ... The most challenging part is ...']
  };
  SCENE_CONTENT.german.study = {
    words: [['üben','[ˈyːbn̩]','练习','Ich übe jeden Tag zehn Minuten.'],['verstehen','[fɛɐ̯ˈʃteːən]','理解','Jetzt verstehe ich den Satz besser.'],['merken','[ˈmɛʁkn̩]','记住；察觉','Ich merke mir neue Wörter mit Beispielen.'],['die Aufgabe','[ˈaʊ̯fˌɡaːbə]','任务；练习题','Die Aufgabe ist kurz, aber hilfreich.'],['der Fortschritt','[ˈfɔʁtˌʃʁɪt]','进步','Ich sehe jeden Monat einen Fortschritt.']],
    patterns: [['Beim Lernen hilft mir ___.','学习时……对我有帮助','Beim Lernen hilft mir eine kurze tägliche Wiederholung.','联系你的真实学习方法写完整句子。'],['___ ist für mich schwierig, deshalb ___.','……对我很难，所以……','Sprechen ist für mich schwierig, deshalb übe ich jeden Morgen.','说明一个学习困难和解决办法。']],
    reading: ['Neue Wörter aktiv lernen','Ein neues Wort nur zu lesen reicht oft nicht. Ich spreche es laut, schreibe einen eigenen Satz und wiederhole es am nächsten Tag. So verstehe ich das Wort besser und kann es später aktiv benutzen.','只阅读一个新单词通常不够。我会把它大声读出来、写一个自己的句子，并在第二天复习。这样我能更好地理解它，以后也能主动使用。','写 5–7 句德语，介绍你记忆新单词的方法，并使用两个当日词汇。'],
    speaking: ['So lerne ich eine Sprache',['Was lernst du gerade?','Was ist schwierig?','Wie übst du und siehst deinen Fortschritt?'],'Zurzeit lerne ich ... Für mich ist ... schwierig.']
  };
  var WORD_EXPANSIONS = {
    english: {
      daily: [['organize','/ˈɔːɡənaɪz/','整理；安排','I organize tomorrow before I go to bed.'],['rely','/rɪˈlaɪ/','依靠；信赖','I rely on a simple checklist every morning.'],['unwind','/ˌʌnˈwaɪnd/','放松','Music helps me unwind after a long day.']],
      travel: [['accommodation','/əˌkɒməˈdeɪʃn/','住宿','Our accommodation is close to the station.'],['landmark','/ˈlændmɑːk/','地标','The tower is the city\'s best-known landmark.'],['flexible','/ˈfleksəbəl/','灵活的','We kept our travel plans flexible.']],
      social: [['approachable','/əˈprəʊtʃəbəl/','平易近人的','Her smile makes her seem approachable.'],['considerate','/kənˈsɪdərət/','体贴的','It was considerate of him to call first.'],['reconnect','/ˌriːkəˈnekt/','重新联系','I hope to reconnect with an old friend.']],
      ideas: [['insight','/ˈɪnsaɪt/','见解；洞察','The discussion gave me a new insight.'],['debate','/dɪˈbeɪt/','讨论；辩论','We had a friendly debate about the film.'],['appreciate','/əˈpriːʃieɪt/','欣赏；理解','I appreciate stories with complex characters.']],
      work: [['prioritize','/praɪˈɒrətaɪz/','确定优先顺序','I prioritize the most urgent task first.'],['clarify','/ˈklærəfaɪ/','澄清','Could you clarify the final requirement?'],['deadline','/ˈdedlaɪn/','截止日期','The deadline is Friday afternoon.']],
      study: [['recall','/rɪˈkɔːl/','回忆；记起','I can recall the word after using it twice.'],['concentrate','/ˈkɒnsntreɪt/','集中注意力','I concentrate better with my phone away.'],['improve','/ɪmˈpruːv/','提高；改善','Short daily practice can improve my speaking.']]
    },
    german: {
      daily: [['erledigen','[ɛɐ̯ˈleːdɪɡn̩]','完成；处理','Ich erledige kleine Aufgaben am Morgen.'],['bequem','[bəˈkveːm]','舒适的；方便的','Der Sessel ist sehr bequem.'],['sich erholen','[zɪç ɛɐ̯ˈhoːlən]','休息；恢复','Am Wochenende erhole ich mich zu Hause.']],
      travel: [['die Unterkunft','[ˈʊntɐˌkʊnft]','住宿','Unsere Unterkunft liegt im Stadtzentrum.'],['die Sehenswürdigkeit','[ˈzeːənsˌvʏʁdɪçkaɪ̯t]','景点','Diese Sehenswürdigkeit öffnet um neun Uhr.'],['flexibel','[flɛksiˈbəl]','灵活的','Auf Reisen bleibe ich gern flexibel.']],
      social: [['aufmerksam','[ˈaʊ̯fˌmɛʁkzaːm]','专注的；体贴的','Sie hört aufmerksam zu.'],['offen','[ˈɔfn̩]','开放的；坦率的','Er ist offen und spricht gern mit neuen Leuten.'],['sich verabreden','[zɪç fɛɐ̯ˈʔaːpʁeːdn̩]','约见','Wir verabreden uns für Samstag.']],
      ideas: [['spannend','[ˈʃpanənt]','有趣的；精彩的','Ich finde das Thema sehr spannend.'],['diskutieren','[dɪskuˈtiːʁən]','讨论','Wir diskutieren über den neuen Film.'],['schätzen','[ˈʃɛtsn̩]','欣赏；珍惜','Ich schätze ihre ehrliche Meinung.']],
      work: [['priorisieren','[pʁioʁiˈziːʁən]','确定优先顺序','Ich priorisiere heute drei wichtige Aufgaben.'],['erklären','[ɛɐ̯ˈklɛːʁən]','解释','Können Sie den nächsten Schritt erklären?'],['die Frist','[fʁɪst]','期限','Die Frist endet am Freitag.']],
      study: [['sich erinnern','[zɪç ɛɐ̯ˈʔɪnɐn]','想起；记得','Ich kann mich gut an das Beispiel erinnern.'],['sich konzentrieren','[zɪç kɔntsɛnˈtʁiːʁən]','集中注意力','Ich konzentriere mich besser ohne Handy.'],['verbessern','[fɛɐ̯ˈbɛsɐn]','改善；提高','Ich möchte meine Aussprache verbessern.']]
    }
  };
  Object.keys(WORD_EXPANSIONS).forEach(function (language) {
    Object.keys(WORD_EXPANSIONS[language]).forEach(function (scene) {
      SCENE_CONTENT[language][scene].words = SCENE_CONTENT[language][scene].words.concat(WORD_EXPANSIONS[language][scene]);
    });
  });
  var activeSeconds = { words: 0, listening: 0, patterns: 0, reading: 0, speaking: 0 };
  var lastInteractionAt = Date.now();
  if (!state.timerId) state.timer = modeConfig().speakingSeconds;

  ['pointerdown', 'keydown', 'input', 'touchstart'].forEach(function (eventName) {
    document.addEventListener(eventName, function () { lastInteractionAt = Date.now(); }, { passive: true });
  });
  setInterval(function () {
    if (!document.hidden && stages.indexOf(state.module) >= 0 && Date.now() - lastInteractionAt < 60000) {
      activeSeconds[state.module] += 1;
    }
  }, 1000);

  function takeActiveSeconds(module) {
    var seconds = Math.max(1, Math.round(activeSeconds[module] || 0));
    activeSeconds[module] = 0;
    return seconds;
  }
  function formatDuration(seconds) {
    seconds = Math.max(0, Math.round(seconds || 0));
    if (seconds < 60) return seconds + ' 秒';
    var minutes = Math.floor(seconds / 60); var rest = seconds % 60;
    return rest ? minutes + ' 分 ' + rest + ' 秒' : minutes + ' 分钟';
  }

  function blankProgress() { return { sessions: [], reviews: [], daily: {} }; }
  function normalizeProgress(value) {
    var data = value && typeof value === 'object' ? value : blankProgress();
    if (!Array.isArray(data.sessions)) data.sessions = [];
    if (!Array.isArray(data.reviews)) data.reviews = [];
    if (!data.daily || typeof data.daily !== 'object') data.daily = {};
    return data;
  }
  function userKey() { return activeAccount ? activeAccount.id : 'guest'; }
  function storageKey() { return 'yg-progress:' + userKey(); }

  if (!localStorage.getItem('yg-progress:guest') && localStorage.getItem('yg-progress')) {
    localStorage.setItem('yg-progress:guest', localStorage.getItem('yg-progress'));
  }

  readStore = function () {
    try { return normalizeProgress(JSON.parse(localStorage.getItem(storageKey()) || 'null')); }
    catch (_) { return blankProgress(); }
  };
  writeStore = function (data) {
    data = normalizeProgress(data);
    localStorage.setItem(storageKey(), JSON.stringify(data));
    if (activeAccount && cloudClient) scheduleCloudSave(data);
  };

  function scheduleCloudSave(data) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async function () {
      var result = await cloudClient.from('learning_progress').upsert({
        user_id: activeAccount.id,
        payload: data,
        updated_at: new Date().toISOString()
      });
      if (result.error) toast('云端同步失败：' + result.error.message);
      else setSyncText('已同步到个人账号');
    }, 350);
  }

  function localDateKey() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }
  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffledIndexes(length, random) {
    var values = Array.from({ length: length }, function (_, i) { return i; });
    for (var i = values.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)); var x = values[i]; values[i] = values[j]; values[j] = x; }
    return values;
  }
  function planKey() { return localDateKey() + ':' + state.language; }
  function getPlan() {
    var data = readStore();
    var key = planKey();
    if (!data.daily[key] || data.daily[key].topicVersion !== topicVersion) {
      var random = rng(hash(key + ':' + userKey()));
      var sceneKeys = Object.keys(SCENES);
      var selectedScene = sceneKeys[Math.floor(random() * sceneKeys.length)];
      var deck = SCENE_CONTENT[state.language][selectedScene].words;
      data.daily[key] = {
        date: localDateKey(), language: state.language, scene: selectedScene, topicVersion: topicVersion,
        wordOrder: shuffledIndexes(deck.length, random), wordPos: 0, wordExtensionTarget: 0,
        stage: 'words', listeningPos: 0, patternStep: 0, completed: []
      };
      writeStore(data);
    }
    var plan = data.daily[key];
    if (!plan.activeStage || stages.indexOf(plan.activeStage) < 0) {
      plan.activeStage = stages.indexOf(plan.stage) >= 0 ? plan.stage : 'words';
      plan.stage = plan.activeStage;
      writeStore(data);
    }
    if (!Number.isFinite(plan.listeningPos)) { plan.listeningPos = 0; writeStore(data); }
    if (!Array.isArray(plan.listeningScores)) { plan.listeningScores = []; writeStore(data); }
    if (!Array.isArray(plan.wordOrder)) plan.wordOrder = [];
    var currentDeck = SCENE_CONTENT[state.language][plan.scene].words;
    if (plan.wordOrder.length < currentDeck.length) {
      var existing = new Set(plan.wordOrder);
      shuffledIndexes(currentDeck.length, rng(hash(key + ':' + userKey() + ':extra-words'))).forEach(function (index) {
        if (!existing.has(index)) { plan.wordOrder.push(index); existing.add(index); }
      });
      writeStore(data);
    }
    if (!Number.isFinite(plan.wordExtensionTarget)) { plan.wordExtensionTarget = 0; writeStore(data); }
    return plan;
  }
  function savePlan(plan) {
    var data = readStore(); data.daily[planKey()] = plan; writeStore(data);
  }
  function todayWords(plan) {
    var deck = SCENE_CONTENT[state.language][plan.scene].words;
    return plan.wordOrder.map(function (i) { return deck[i]; });
  }
  function dailyWordGoal(plan) {
    return Math.min(plan.wordOrder.length, Math.max(modeConfig().words, Number(plan.wordExtensionTarget) || 0));
  }
  function setDailyState() {
    var plan = getPlan();
    state.scene = plan.scene; state.module = plan.activeStage; state.wordsDone = plan.wordPos;
    state.word = plan.wordOrder[Math.min(plan.wordPos, plan.wordOrder.length - 1)] || 0;
    state.pattern = plan.patternStep; state.groupDone = false;
    return plan;
  }

  function chooseStage(stage, shouldScroll) {
    var plan = getPlan(); plan.activeStage = stage; plan.stage = stage; savePlan(plan);
    state.revealed = false; setDailyState(); renderDaily();
    if (shouldScroll) document.querySelector('#practice').scrollIntoView({ behavior: 'smooth' });
  }

  function renderRoadmap(plan) {
    var config = modeConfig();
    document.querySelector('#moduleCards').className = 'daily-roadmap';
    document.querySelector('#moduleCards').innerHTML = stages.map(function (item, index) {
      var status = plan.completed.indexOf(item) >= 0 ? 'done' : (item === plan.activeStage ? 'current' : '');
      var notes = [config.words + ' 个当日词汇', config.listening + ' 句盲听跟读', config.patterns + ' 次主动造句', '1 次主题输出', config.speakingSeconds + ' 秒表达'];
      var label = status === 'done' ? 'DONE' : status === 'current' ? 'OPEN' : 'CHOOSE';
      return '<button class="daily-step ' + status + '" data-choose-stage="' + item + '"><small>0' + (index + 1) + ' · ' + label + '</small><strong>' + stageLabels[item] + '</strong><span>' + notes[index] + '</span></button>';
    }).join('');
    document.querySelector('#practiceNav').innerHTML = stages.map(function (item) {
      var status = plan.completed.indexOf(item) >= 0 ? 'done' : (item === plan.activeStage ? 'current' : '');
      return '<button class="daily-nav-item ' + status + '" data-choose-stage="' + item + '">' + stageLabels[item] + '</button>';
    }).join('');
    document.querySelectorAll('[data-choose-stage]').forEach(function (button) { button.onclick = function () { chooseStage(button.dataset.chooseStage, button.closest('#moduleCards') !== null); }; });
    document.querySelector('#practiceTitle').textContent = stageLabels[plan.activeStage];
    document.querySelector('.section-title h2').textContent = '今日主题：' + SCENES[plan.scene];
    document.querySelector('#levelLabel').innerHTML = DATA[state.language].level + '<br><span class="scene-caption">今日随机主题：' + SCENES[plan.scene] + '</span>';
  }

  function saveSessionOnce(module, note, score) {
    var data = readStore();
    var marker = planKey() + ':' + module;
    if (data.sessions.some(function (item) { return item.marker === marker; })) return;
    var seconds = takeActiveSeconds(module);
    data.sessions.unshift({ id: Date.now(), marker: marker, date: new Date().toISOString(), language: state.language, module: module, mode: state.mode, targetMinutes: MODES[state.mode][0], durationSeconds: seconds, duration: seconds / 60, note: note || '', score: score == null ? null : score });
    writeStore(data); updateStats();
  }
  saveSession = function (module, note, score) {
    var data = readStore();
    var seconds = takeActiveSeconds(module);
    data.sessions.unshift({ id: Date.now(), date: new Date().toISOString(), language: state.language, module: module, mode: state.mode, targetMinutes: MODES[state.mode][0], durationSeconds: seconds, duration: seconds / 60, note: note || '', score: score == null ? null : score });
    writeStore(data); toast(activeAccount ? '已保存，正在同步' : '已保存到访客设备'); updateStats();
  };
  function finishStage(plan, stage) {
    if (plan.completed.indexOf(stage) < 0) plan.completed.push(stage);
    plan.activeStage = stage; plan.stage = stage; savePlan(plan); setDailyState(); renderDaily(); updateStats();
  }
  function addReviewAndAdvance(word, rating) {
    var data = readStore(); var now = Date.now(); var days = rating === 'easy' ? 7 : rating === 'hard' ? 1 : 0;
    var key = state.language + ':' + getPlan().scene + ':' + word[0];
    var item = { key: key, prompt: word[0], answer: word[2] + ' · ' + word[3], module: 'words', language: state.language, due: now + days * 86400000 };
    var found = data.reviews.find(function (x) { return x.key === key; }); if (found) Object.assign(found, item); else data.reviews.push(item);
    writeStore(data);
    var plan = getPlan(); plan.wordPos += 1;
    state.revealed = false;
    var wordGoal = dailyWordGoal(plan);
    if (plan.wordPos >= wordGoal) { saveSessionOnce('words', SCENES[plan.scene] + ' · 完成 ' + wordGoal + ' 个当日单词', null); finishStage(plan, 'words'); }
    else { savePlan(plan); setDailyState(); renderDaily(); updateStats(); }
  }

  function termToken(term) { return term.toLowerCase().replace(/^(der|die|das)\s+/, '').trim(); }
  function includesTerm(text, term) { return text.toLowerCase().indexOf(termToken(term)) >= 0; }
  function scoreWithVocabulary(text, required, target) {
    var clean = text.trim(); if (!clean) return { score: 0, tips: '先写出你的完整表达。', used: [] };
    var tokens = clean.split(/\s+/).filter(Boolean); var used = required.filter(function (word) { return includesTerm(clean, word[0]); });
    var lengthPoints = Math.min(35, Math.round(tokens.length / target * 35));
    var sentencePoints = /[.!?。！？]$/.test(clean) ? 15 : 8;
    var languagePoints = /[A-Za-zÄÖÜäöüß]/.test(clean) ? 10 : 0;
    var vocabularyPoints = Math.round(40 * used.length / required.length);
    var score = lengthPoints + sentencePoints + languagePoints + vocabularyPoints;
    var missed = required.filter(function (word) { return used.indexOf(word) < 0; }).map(function (word) { return word[0]; });
    var tips = [];
    if (missed.length) tips.push('再自然地加入：' + missed.join('、'));
    if (tokens.length < target) tips.push('补充一个具体的人、时间或原因');
    if (!/[.!?。！？]$/.test(clean)) tips.push('用句号、问号或感叹号结束完整句子');
    if (!tips.length) tips.push('当日词汇使用完整，表达已经形成主动记忆');
    return {
      score: Math.min(100, score), tips: tips.join('；'), used: used,
      breakdown: [
        ['内容长度', lengthPoints, 35, tokens.length + ' 个词，目标约 ' + target + ' 个词'],
        ['句子完整', sentencePoints, 15, sentencePoints === 15 ? '有完整的句末标点' : '有内容，但缺少句末标点'],
        ['目标语言', languagePoints, 10, languagePoints ? '检测到英语或德语文字' : '未检测到英语或德语文字'],
        ['今日词汇', vocabularyPoints, 40, '使用 ' + used.length + ' / ' + required.length + ' 个指定词汇']
      ]
    };
  }
  function scoringRubricHtml(target, note) {
    return '<div class="score-rubric"><strong>评分标准</strong><span>内容长度 35 分（目标约 ' + target + ' 词）</span><span>完整句子 15 分</span><span>目标语言 10 分</span><span>今日词汇 40 分</span><small>' + (note || '评分在浏览器本机按上述规则完成，不进行 AI 语法判断。') + '</small></div>';
  }
  function showVocabularyScore(root, text, required, target) {
    var result = scoreWithVocabulary(text, required, target); var box = root.querySelector('.score-result');
    box.classList.remove('hidden');
    if (!text.trim()) { box.innerHTML = '<strong>尚未评分</strong><br><span>' + result.tips + '</span>'; return result; }
    box.innerHTML = '<div class="score-heading"><strong>' + result.score + '</strong><span>/ 100 · 本机规则评分</span></div><div class="score-breakdown">' + result.breakdown.map(function (part) { return '<div><b>' + part[0] + '</b><span>' + part[1] + ' / ' + part[2] + '</span><small>' + escapeHtml(part[3]) + '</small></div>'; }).join('') + '</div><p class="score-reason"><b>改进建议：</b>' + escapeHtml(result.tips) + '</p>';
    root.querySelectorAll('.vocab-chip').forEach(function (chip) { chip.classList.toggle('used', includesTerm(text, chip.dataset.term)); });
    return result;
  }

  function renderWords(root, plan, words) {
    var goal = dailyWordGoal(plan);
    if (plan.wordPos >= goal) { finishStage(plan, 'words'); return; }
    var w = words[plan.wordPos];
    root.innerHTML = '<article class="practice-card"><div class="card-top"><span>今日单词 ' + (plan.wordPos + 1) + ' / ' + goal + '</span><span>' + SCENES[plan.scene] + ' · ' + DATA[state.language].label + '</span></div><div class="center"><button class="sound" aria-label="朗读单词">▶</button><h3 class="big-word">' + w[0] + '</h3><p class="phonetic">' + w[1] + '</p><button class="reveal">' + (state.revealed ? '隐藏释义' : '先回忆，再看答案') + '</button>' + (state.revealed ? '<div class="answer"><strong>' + w[2] + '</strong><p>' + w[3] + '</p></div>' : '') + '</div><div class="rating"><span>这次想起来了吗？</span><div><button class="btn" data-daily-rate="again">再来</button><button class="btn" data-daily-rate="hard">有点难</button><button class="btn primary" data-daily-rate="easy">记住了</button></div></div></article>';
    root.querySelector('.sound').onclick = function () { speak(w[0]); };
    root.querySelector('.reveal').onclick = function () { state.revealed = !state.revealed; renderDaily(); };
    root.querySelectorAll('[data-daily-rate]').forEach(function (button) { button.onclick = function () { addReviewAndAdvance(w, button.dataset.dailyRate); }; });
  }
  function listeningMatchScore(heard, source) {
    var clean = function (value) { return value.toLowerCase().replace(/[^a-zäöüß0-9\s]/g, ' ').split(/\s+/).filter(Boolean); };
    var target = clean(source); var input = clean(heard);
    if (!input.length) return { score: 0, hits: 0, total: target.length };
    var hits = target.filter(function (word) { return input.indexOf(word) >= 0; }).length;
    return { score: Math.min(100, Math.round(hits / Math.max(1, target.length) * 100)), hits: hits, total: target.length };
  }
  function renderListening(root, plan, words) {
    var goal = Math.min(modeConfig().listening, words.length);
    var position = plan.listeningPos || 0;
    if (position >= goal) { finishStage(plan, 'listening'); return; }
    var sentence = words[position][3]; var checked = false;
    root.innerHTML = '<article class="practice-card listening-card"><div class="card-top"><span>盲听跟读 ' + (position + 1) + ' / ' + goal + '</span><span>' + SCENES[plan.scene] + ' · ' + DATA[state.language].label + '</span></div><div class="listening-body"><span class="eyebrow" style="color:var(--muted)">LISTEN FIRST</span><h3>先听句子，再写下你听到的内容</h3><p class="hint">可以反复播放。核对原文后，再大声跟读一遍。</p><div class="score-rubric listening-rubric"><strong>评分标准</strong><span>按照你写对的原文词汇比例计分，满分 100 分。</span><small>忽略大小写和标点，不进行 AI 发音判断。</small></div><button class="listen-play" id="playListening">▶ <span>播放句子</span></button><textarea class="response-box" id="listeningInput" placeholder="输入你听到的句子……"></textarea><div class="action-row"><button class="btn" id="showListeningText">显示原文</button><button class="btn primary" id="checkListening">核对并评分</button></div><div class="task-box hidden" id="listeningText"><small>原文</small><strong>' + escapeHtml(sentence) + '</strong></div><div class="score-result hidden" id="listeningResult"></div></div></article>';
    var input = root.querySelector('#listeningInput'); var transcript = root.querySelector('#listeningText'); var result = root.querySelector('#listeningResult'); var next = root.querySelector('#checkListening');
    root.querySelector('#playListening').onclick = function () { speak(sentence); };
    root.querySelector('#showListeningText').onclick = function () { transcript.classList.remove('hidden'); };
    next.onclick = function () {
      if (!checked) {
        if (!input.value.trim()) { result.classList.remove('hidden'); result.textContent = '先输入你听到的内容，再进行核对。'; return; }
        var match = listeningMatchScore(input.value, sentence); var score = match.score; checked = true; transcript.classList.remove('hidden'); result.classList.remove('hidden');
        result.innerHTML = '<div class="score-heading"><strong>' + score + '</strong><span>/ 100 · 听辨匹配</span></div><p class="score-reason">写对了原文中的 ' + match.hits + ' / ' + match.total + ' 个词。' + (score >= 80 ? '听辨准确，跟读一次后继续。' : score >= 50 ? '抓住了主要内容，对照原文再听一次。' : '先对照原文分段跟读，再完整听一次。') + '</p>';
        plan.listeningScores[position] = score; next.textContent = position + 1 >= goal ? '确认并完成听力' : '确认并继续下一句'; return;
      }
      plan.listeningPos = position + 1; savePlan(plan); state.revealed = false;
      if (plan.listeningPos >= goal) {
        var average = Math.round(plan.listeningScores.slice(0, goal).reduce(function (sum, score) { return sum + score; }, 0) / goal);
        saveSessionOnce('listening', SCENES[plan.scene] + ' · 完成 ' + goal + ' 句盲听跟读', average); finishStage(plan, 'listening');
      } else { setDailyState(); renderDaily(); }
    };
  }
  function renderPatterns(root, plan, words) {
    var content = SCENE_CONTENT[state.language][plan.scene]; var round = plan.patternStep || 0; var goal = modeConfig().patterns;
    if (round >= goal) { finishStage(plan, 'patterns'); return; }
    var pattern = content.patterns[round % content.patterns.length]; var required = round === 0 ? [words[0], words[1]] : [words[2], words[3]];
    root.innerHTML = '<article class="practice-card"><div class="card-top"><span>主动造句 ' + (round + 1) + ' / ' + goal + '</span><span>调用刚学过的词</span></div><div class="pattern-body"><span class="eyebrow" style="color:var(--muted)">RETRIEVE & USE</span><h3>把今天的词放进真实表达</h3><p class="hint">' + pattern[3] + ' 不需要照抄或只填空，请写一个与你有关的完整表达。</p>' + scoringRubricHtml(9) + '<div class="vocab-chips">' + required.map(function (w) { return '<span class="vocab-chip" data-term="' + w[0].replace(/"/g, '&quot;') + '">' + w[0] + ' · ' + w[2] + '</span>'; }).join('') + '</div><textarea class="response-box" id="patternInput" placeholder="写 1–3 个完整句子，并自然使用上面的当日单词……"></textarea><div class="action-row"><button class="btn" id="patternHelp">查看句型支架</button><button class="btn primary" id="scorePattern">查看评分</button></div><div class="task-box hidden" id="patternSample"><small>句型支架</small><strong style="display:block;margin-top:6px">' + pattern[0] + '</strong><p>参考表达：' + pattern[2] + '</p></div><div class="score-result hidden"></div></div></article>';
    var input = root.querySelector('#patternInput'); var scoreButton = root.querySelector('#scorePattern'); var scoredResult = null;
    root.querySelector('#patternHelp').onclick = function () { root.querySelector('#patternSample').classList.toggle('hidden'); };
    input.oninput = function () { if (scoredResult) { scoredResult = null; root.querySelector('.score-result').classList.add('hidden'); scoreButton.textContent = '查看评分'; } };
    scoreButton.onclick = function () {
      if (!scoredResult) { scoredResult = showVocabularyScore(root, input.value, required, 9); if (!input.value.trim()) { scoredResult = null; return; } scoreButton.textContent = '确认评分并继续'; return; }
      saveSession('patterns', '当日词汇造句：' + input.value, scoredResult.score); plan.patternStep = round + 1;
      state.revealed = false;
      if (plan.patternStep >= goal) finishStage(plan, 'patterns'); else { savePlan(plan); setDailyState(); renderDaily(); }
    };
  }
  function renderReading(root, plan, words) {
    var config = modeConfig(); var item = SCENE_CONTENT[state.language][plan.scene].reading;
    var required = [words[0], words[Math.max(0, config.words - 1)]].filter(function (word, index, list) { return list.indexOf(word) === index; });
    var outputHint = state.mode === 'normal' ? item[3] : state.mode === 'busy' ? '用 2–3 句概括短文，并使用一个当日词汇。' : '写 1 个包含当日词汇的完整句子。';
    root.innerHTML = '<article class="practice-card reading"><section class="article"><span class="eyebrow">' + SCENES[plan.scene] + ' · SHORT READING</span><h3>' + item[0] + '</h3><p>' + item[1] + '</p><button class="reveal" id="translate">查看中文</button><div id="translation" class="translation hidden">' + item[2] + '</div></section><section class="writing"><span class="eyebrow" style="color:var(--muted)">YOUR OUTPUT</span><h4>' + outputHint + '</h4>' + scoringRubricHtml(config.readingTarget) + '<p class="hint">尝试再次使用：</p><div class="vocab-chips">' + required.map(function (w) { return '<span class="vocab-chip" data-term="' + w[0].replace(/"/g, '&quot;') + '">' + w[0] + '</span>'; }).join('') + '</div><textarea id="draft" placeholder="在这里写下你的回答……"></textarea><div class="action-row"><small id="count">0 字符</small><button class="btn primary" id="scoreWriting">查看评分</button></div><div class="score-result hidden"></div></section></article>';
    var input = root.querySelector('#draft'); var scoreButton = root.querySelector('#scoreWriting'); var scoredResult = null;
    input.oninput = function () { root.querySelector('#count').textContent = input.value.length + ' 字符'; if (scoredResult) { scoredResult = null; root.querySelector('.score-result').classList.add('hidden'); scoreButton.textContent = '查看评分'; } };
    root.querySelector('#translate').onclick = function () { root.querySelector('#translation').classList.toggle('hidden'); };
    scoreButton.onclick = function () { if (!scoredResult) { scoredResult = showVocabularyScore(root, input.value, required, config.readingTarget); if (!input.value.trim()) { scoredResult = null; return; } scoreButton.textContent = '确认评分并完成'; return; } saveSessionOnce('reading', input.value, scoredResult.score); finishStage(plan, 'reading'); };
  }
  function resetSpeakingTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null; state.timer = modeConfig().speakingSeconds;
  }
  function toggleSpeakingTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; renderDaily(); return; }
    state.timerId = setInterval(function () {
      state.timer -= 1; var value = document.querySelector('#timerValue'); if (value) value.textContent = state.timer;
      if (state.timer <= 0) { clearInterval(state.timerId); state.timerId = null; toast(modeConfig().speakingSeconds + ' 秒完成！'); renderDaily(); }
    }, 1000);
    renderDaily();
  }
  function renderSpeaking(root, plan, words) {
    var config = modeConfig(); var item = SCENE_CONTENT[state.language][plan.scene].speaking;
    var required = [words[0], words[Math.max(0, config.words - 1)]].filter(function (word, index, list) { return list.indexOf(word) === index; });
    root.innerHTML = '<article class="practice-card speaking"><section class="speaking-body"><span class="eyebrow" style="color:var(--muted)">' + SCENES[plan.scene] + ' · ' + config.speakingSeconds + '-SECOND SPEAKING</span><h3>' + item[0] + '</h3><ul>' + item[1].slice(0, state.mode === 'normal' ? 3 : state.mode === 'busy' ? 2 : 1).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' + scoringRubricHtml(config.speakingTarget, '口语按语音转写后的文字进行本机规则评分，不判断发音准确度。') + '<p class="hint">尽量说出今天的词：</p><div class="vocab-chips">' + required.map(function (w) { return '<span class="vocab-chip" data-term="' + w[0].replace(/"/g, '&quot;') + '">' + w[0] + '</span>'; }).join('') + '</div><textarea class="response-box" id="speechText" placeholder="可输入或使用语音转写……"></textarea><div class="action-row"><button class="btn" id="dictate">🎙 语音转写</button><button class="btn primary" id="scoreSpeaking">查看评分</button><span class="mic-status" id="micStatus"></span></div><div class="score-result hidden"></div></section><aside class="timer ' + (state.timerId ? 'running' : '') + '"><strong id="timerValue">' + state.timer + '</strong><small>秒</small><div class="timer-controls"><button id="timerToggle">' + (state.timerId ? 'Ⅱ' : '▶') + '</button><button id="timerReset">↺</button></div></aside></article>';
    var input = root.querySelector('#speechText'); var scoreButton = root.querySelector('#scoreSpeaking'); var scoredResult = null;
    input.oninput = function () { if (scoredResult) { scoredResult = null; root.querySelector('.score-result').classList.add('hidden'); scoreButton.textContent = '查看评分'; } };
    root.querySelector('#timerToggle').onclick = toggleSpeakingTimer; root.querySelector('#timerReset').onclick = function () { resetSpeakingTimer(); renderDaily(); }; root.querySelector('#dictate').onclick = function () { startDictation(root); };
    scoreButton.onclick = function () { if (!scoredResult) { scoredResult = showVocabularyScore(root, input.value, required, config.speakingTarget); if (!input.value.trim()) { scoredResult = null; return; } scoreButton.textContent = '确认评分并完成'; return; } saveSessionOnce('speaking', input.value, scoredResult.score); finishStage(plan, 'speaking'); if (plan.completed.length === stages.length) toast('今天五项练习已全部完成'); };
  }
  function renderModuleComplete(root, plan) {
    var remaining = stages.filter(function (item) { return plan.completed.indexOf(item) < 0; });
    var wordsLeft = plan.activeStage === 'words' ? Math.max(0, plan.wordOrder.length - plan.wordPos) : 0;
    var moreWords = wordsLeft ? '<div class="continue-words"><p>今天状态不错？本主题还有 ' + wordsLeft + ' 个单词，可以自由加学。</p><div class="action-row"><button class="btn" data-more-words="1">再学 1 个</button><button class="btn primary" data-more-words="3">再学 3 个</button></div></div>' : (plan.activeStage === 'words' ? '<p class="deck-finished">本主题的 ' + plan.wordOrder.length + ' 个单词今天已全部完成。</p>' : '');
    root.innerHTML = '<article class="practice-card"><div class="daily-complete"><span class="finish-mark">✓</span><h3>' + stageLabels[plan.activeStage] + '已完成</h3><p>' + (remaining.length ? '你可以自由选择其他练习，不需要按固定顺序进行。' : '今天五项练习已全部完成，明天会生成新的主题内容。') + '</p>' + moreWords + '<div class="action-row">' + remaining.map(function (item) { return '<button class="btn" data-next-choice="' + item + '">' + stageLabels[item] + '</button>'; }).join('') + '<button class="btn primary" id="openHistory">查看记录</button></div></div></article>';
    root.querySelector('#openHistory').onclick = function () { showPanel('history'); };
    root.querySelectorAll('[data-next-choice]').forEach(function (button) { button.onclick = function () { chooseStage(button.dataset.nextChoice, false); }; });
    root.querySelectorAll('[data-more-words]').forEach(function (button) {
      button.onclick = function () {
        var count = Number(button.dataset.moreWords) || 1;
        plan.wordExtensionTarget = Math.min(plan.wordOrder.length, plan.wordPos + count);
        plan.completed = plan.completed.filter(function (item) { return item !== 'words'; });
        plan.activeStage = 'words'; plan.stage = 'words'; savePlan(plan); setDailyState(); renderDaily();
      };
    });
  }
  function renderDaily() {
    var plan = setDailyState(); var root = document.querySelector('#practiceContent'); var words = todayWords(plan);
    renderRoadmap(plan);
    if (plan.completed.indexOf(plan.activeStage) >= 0) renderModuleComplete(root, plan);
    else if (plan.activeStage === 'words') renderWords(root, plan, words);
    else if (plan.activeStage === 'listening') renderListening(root, plan, words);
    else if (plan.activeStage === 'patterns') renderPatterns(root, plan, words);
    else if (plan.activeStage === 'reading') renderReading(root, plan, words);
    else renderSpeaking(root, plan, words);
  }

  function setSyncText(text, error) {
    var box = document.querySelector('#accountState'); if (!box) return; box.textContent = text; box.classList.toggle('error', !!error);
  }
  function authErrorMessage(error) {
    var message = error && error.message ? error.message : String(error || '未知错误');
    if (/failed to fetch|network|load failed/i.test(message)) return '浏览器无法连接账号服务器。请先强制刷新页面；若仍失败，请检查当前网络是否能直接访问 Supabase。';
    return message;
  }
  function updateAccountButton() {
    var button = document.querySelector('#accountButton');
    button.textContent = activeAccount ? activeAccount.email : '登录同步';
    button.classList.toggle('online', !!activeAccount);
  }
  function showAccountDialog() { document.querySelector('#accountOverlay').classList.remove('hidden'); }
  function hideAccountDialog() { document.querySelector('#accountOverlay').classList.add('hidden'); }
  async function loadAccount(user) {
    activeAccount = user || null; updateAccountButton();
    if (!user || !cloudClient) { setSyncText('当前为访客模式，进度仅保存在这台设备。'); renderDaily(); updateStats(); return; }
    setSyncText('正在读取你的云端进度…');
    var result = await cloudClient.from('learning_progress').select('payload').eq('user_id', user.id).maybeSingle();
    if (result.error) { setSyncText('读取失败：' + authErrorMessage(result.error), true); renderDaily(); return; }
    if (result.data && result.data.payload) localStorage.setItem(storageKey(), JSON.stringify(normalizeProgress(result.data.payload)));
    else {
      var guest = normalizeProgress(JSON.parse(localStorage.getItem('yg-progress:guest') || 'null'));
      localStorage.setItem(storageKey(), JSON.stringify(guest)); scheduleCloudSave(guest);
    }
    setSyncText('已登录，进度会自动同步到此账号。'); renderDaily(); updateStats();
  }
  async function initAccount() {
    var config = window.YG_SUPABASE || {};
    var ready = /^https:\/\/.+\.supabase\.co$/.test(config.url || '') && !!config.publishableKey && window.supabase;
    if (!ready) {
      document.querySelectorAll('#accountForm input, #accountForm button').forEach(function (el) { el.disabled = true; });
      setSyncText('账号服务尚未连接。完成 Supabase 配置后即可注册和跨设备同步。', true); return;
    }
    cloudClient = window.supabase.createClient(config.url, config.publishableKey);
    document.querySelector('#accountForm').addEventListener('submit', async function (event) {
      event.preventDefault(); var email = document.querySelector('#accountEmail').value.trim(); var password = document.querySelector('#accountPassword').value;
      setSyncText('正在登录…'); var result = await cloudClient.auth.signInWithPassword({ email: email, password: password });
      if (result.error) setSyncText(authErrorMessage(result.error), true); else setSyncText('登录成功，正在同步进度…');
    });
    document.querySelector('#signUpButton').onclick = async function () {
      var email = document.querySelector('#accountEmail').value.trim(); var password = document.querySelector('#accountPassword').value;
      if (!email || password.length < 6) { setSyncText('请输入邮箱和至少 6 位密码。', true); return; }
      setSyncText('正在创建账号…'); var result = await cloudClient.auth.signUp({ email: email, password: password });
      if (result.error) setSyncText(authErrorMessage(result.error), true); else setSyncText(result.data.session ? '注册成功，正在同步。' : '注册成功，请先查看邮箱完成验证。');
    };
    document.querySelector('#signOutButton').onclick = async function () { await cloudClient.auth.signOut(); hideAccountDialog(); };
    cloudClient.auth.onAuthStateChange(function (_, session) { setTimeout(function () { loadAccount(session ? session.user : null); }, 0); });
    var sessionResult = await cloudClient.auth.getSession(); await loadAccount(sessionResult.data.session ? sessionResult.data.session.user : null);
  }

  var headerRight = document.querySelector('.header-right');
  headerRight.insertAdjacentHTML('afterbegin', '<button class="account-btn" id="accountButton">登录同步</button>');
  document.body.insertAdjacentHTML('beforeend', '<div class="account-overlay hidden" id="accountOverlay" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><section class="account-dialog"><button class="account-close" id="accountClose" aria-label="关闭">×</button><span class="eyebrow" style="color:var(--muted)">PERSONAL PROGRESS</span><h2 id="accountTitle">个人账号与云同步</h2><p>登录后，学习进度、评分和复习记录会跟随账号，可在其他设备继续。</p><div class="account-state" id="accountState">正在连接账号服务…</div><form class="account-form" id="accountForm"><label>邮箱<input id="accountEmail" type="email" autocomplete="email" required></label><label>密码<input id="accountPassword" type="password" autocomplete="current-password" minlength="6" required></label><div class="account-actions"><button class="btn primary" type="submit">登录</button><button class="btn" type="button" id="signUpButton">注册新账号</button></div><button class="btn" type="button" id="signOutButton">退出当前账号</button></form><div class="sync-note">仅保存学习数据，不上传录音。语音转写和评分仍在浏览器内完成。</div></section></div>');
  document.querySelector('#accountButton').onclick = showAccountDialog; document.querySelector('#accountClose').onclick = hideAccountDialog;
  document.querySelector('#accountOverlay').onclick = function (event) { if (event.target.id === 'accountOverlay') hideAccountDialog(); };
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') hideAccountDialog(); });

  var scenePicker = document.querySelector('#scene'); if (scenePicker) scenePicker.remove();
  var backToModules = document.querySelector('#backToModules'); if (backToModules) backToModules.remove();
  document.querySelector('.section-title span').textContent = "TODAY'S TOPIC";
  document.querySelector('.section-title h2').textContent = '正在生成今日主题…';
  document.querySelector('.section-title p').textContent = '主题每天随机更新，五项练习可自由选择；模式会改变题量。';
  document.querySelector('.privacy').textContent = '登录后进度会保存到个人账号并跨设备同步；访客模式只保存在当前设备。正常、忙碌、加班模式会实际调整单词、听力、造句、读写和口语任务量。';
  var originalSyncHeader = syncHeader;
  syncHeader = function () {
    originalSyncHeader(); var config = modeConfig();
    document.querySelector('#modeMinutes').textContent = MODES[state.mode][0];
    document.querySelector('#modeNote').textContent = config.summary;
  };
  document.querySelector('#language').onchange = function (event) { state.language = event.target.value; localStorage.setItem('yg-language', state.language); resetSpeakingTimer(); syncHeader(); renderDaily(); updateStats(); };
  document.querySelectorAll('[data-mode]').forEach(function (button) {
    button.onclick = function () {
      state.mode = button.dataset.mode; localStorage.setItem('yg-mode', state.mode);
      resetSpeakingTimer(); syncHeader(); renderDaily();
      toast('已切换为' + button.textContent + '模式，题量已更新');
    };
  });

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; });
  }
  function reviewTimingLabel(due) {
    var remaining = Number(due) - Date.now();
    if (remaining <= 0) return '现在可以复习';
    var days = Math.ceil(remaining / 86400000);
    return days === 1 ? '明天复习' : days + ' 天后复习';
  }
  function rescheduleReview(key, rating) {
    var data = readStore();
    var item = data.reviews.find(function (entry) { return entry.key === key; });
    if (!item) return;
    var days = rating === 'easy' ? 7 : rating === 'hard' ? 1 : 0;
    item.due = Date.now() + days * 86400000;
    item.reviewCount = (Number(item.reviewCount) || 0) + 1;
    item.lastReviewedAt = new Date().toISOString();
    writeStore(data);
    toast(days ? '已安排 ' + days + ' 天后复习' : '已保留在今日复习');
    updateStats();
  }
  function speakReviewWord(item) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { toast('当前浏览器不支持朗读'); return; }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(item.prompt);
    utterance.lang = DATA[item.language] ? DATA[item.language].locale : DATA[state.language].locale;
    utterance.rate = .86;
    window.speechSynthesis.speak(utterance);
  }
  updateStats = function () {
    var data = readStore(); var sessions = data.sessions;
    var reviews = data.reviews.slice().sort(function (a, b) { return Number(a.due) - Number(b.due); });
    var due = reviews.filter(function (item) { return item.due <= Date.now(); });
    var totalSeconds = sessions.reduce(function (sum, item) { return sum + (Number.isFinite(item.durationSeconds) ? item.durationSeconds : (Number(item.duration) || 0) * 60); }, 0);
    var days = new Set(sessions.map(function (item) { return item.date.slice(0, 10); })).size;
    document.querySelector('#streak').textContent = days;
    document.querySelector('#dueBadge').textContent = reviews.length;
    document.querySelector('#dueBadge').parentElement.title = reviews.length + ' 个单词已进入复习计划，其中 ' + due.length + ' 个现在到期';
    document.querySelector('#weekLabel').textContent = formatDuration(totalSeconds) + ' / 180 分钟';
    document.querySelector('#weekBar').style.width = Math.min(100, totalSeconds / (180 * 60) * 100) + '%';
    document.querySelector('#totalMinutes').textContent = totalSeconds < 60 ? '<1' : Math.round(totalSeconds / 60);
    document.querySelector('#studyDays').textContent = days;
    document.querySelector('#sessionCount').textContent = sessions.length;
    document.querySelector('#reviewList').innerHTML = reviews.length ? reviews.map(function (item) {
      var encodedKey = encodeURIComponent(item.key);
      var status = reviewTimingLabel(item.due);
      return '<article class="review-item ' + (item.due <= Date.now() ? 'is-due' : 'is-upcoming') + '" data-review-card="' + encodedKey + '"><div class="review-copy"><strong>' + escapeHtml(item.prompt) + '</strong><span class="review-schedule">' + escapeHtml(DATA[item.language] ? DATA[item.language].label : '') + ' · ' + status + '</span><small class="review-answer hidden">' + escapeHtml(item.answer) + '</small></div><div class="review-actions"><div class="review-main-actions"><button class="btn review-audio" data-review-speak="' + encodedKey + '">🔊 发音</button><button class="btn" data-review-reveal>查看答案</button></div><div class="review-rating hidden"><button class="btn" data-review-rate="again" data-review-key="' + encodedKey + '">再来</button><button class="btn" data-review-rate="hard" data-review-key="' + encodedKey + '">有点难</button><button class="btn primary" data-review-rate="easy" data-review-key="' + encodedKey + '">记住了</button></div></div></article>';
    }).join('') : '<div class="empty">暂无复习内容。完成单词练习后，单词会立即出现在这里。</div>';
    document.querySelectorAll('[data-review-reveal]').forEach(function (button) {
      button.onclick = function () {
        var card = button.closest('[data-review-card]');
        var answer = card.querySelector('.review-answer');
        var rating = card.querySelector('.review-rating');
        var willShow = answer.classList.contains('hidden');
        answer.classList.toggle('hidden', !willShow); rating.classList.toggle('hidden', !willShow);
        button.textContent = willShow ? '隐藏答案' : '查看答案';
      };
    });
    document.querySelectorAll('[data-review-rate]').forEach(function (button) {
      button.onclick = function () { rescheduleReview(decodeURIComponent(button.dataset.reviewKey), button.dataset.reviewRate); };
    });
    document.querySelectorAll('[data-review-speak]').forEach(function (button) {
      button.onclick = function () {
        var key = decodeURIComponent(button.dataset.reviewSpeak);
        var item = readStore().reviews.find(function (entry) { return entry.key === key; });
        if (item) speakReviewWord(item);
      };
    });
    document.querySelector('#historyList').innerHTML = sessions.length ? sessions.map(function (item) {
      var seconds = Number.isFinite(item.durationSeconds) ? item.durationSeconds : (Number(item.duration) || 0) * 60;
      var timeLabel = formatDuration(seconds) + (Number.isFinite(item.durationSeconds) ? '' : ' · 旧版估算');
      return '<article><div><strong>' + DATA[item.language].label + ' · ' + NAMES[item.module] + (item.score ? ' · ' + item.score + ' 分' : '') + '</strong><small>' + escapeHtml(item.note || MODES[item.mode][1]) + '</small></div><time>' + new Date(item.date).toLocaleString('zh-CN') + ' · ' + timeLabel + '</time></article>';
    }).join('') : '<div class="empty">完成第一次练习后，记录会保存在这里。</div>';
  };

  renderPractice = renderDaily;
  syncHeader();
  setDailyState(); renderDaily(); updateStats(); initAccount();
})();

