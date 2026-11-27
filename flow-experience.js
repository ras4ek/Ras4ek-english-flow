// Optional presentation and practice features for the static EnglishFlow site.
(() => {
  const scenes = {
    lagoon: ['Лагуна', '#c9fff4', '#8fdacc', '#072b36', '#11483f', '#29bfa6', 'waves'],
    meadow: ['Луг', '#fff6c9', '#cceeb1', '#213a2a', '#0c251f', '#75b842', 'leaves'],
    autumn: ['Осенний парк', '#fff1d6', '#ffccb0', '#40201d', '#35261c', '#ef8837', 'leaves'],
    clouds: ['Облака', '#dbf3ff', '#b7d5fe', '#17243c', '#242754', '#e5f5ff', 'clouds'],
    desert: ['Дюны', '#fff0c9', '#f8c48e', '#442b2b', '#3b2236', '#e09249', 'waves'],
    lanterns: ['Фонарики', '#ffecd9', '#fdc5cf', '#321826', '#250e28', '#f78150', 'lanterns'],
    bubbles: ['Пузырьки', '#e2edff', '#d6c2fa', '#20204e', '#26143d', '#9e82e8', 'bubbles']
  };

  function paint(ctx, key, width, height, time) {
    const [, , , , , tint, kind] = scenes[key];
    const t = time / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.fillStyle = ctx.strokeStyle = tint;
    if (kind === 'waves') {
      for (let layer = 0; layer < 4; layer++) {
        ctx.globalAlpha = .17 + layer * .075;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width + 14; x += 14) {
          const phase = x / (90 + layer * 37) + t * (key === 'desert' ? .2 : .65) + layer;
          ctx.lineTo(x, height * (.56 + layer * .1) + Math.sin(phase) * (12 + layer * 6));
        }
        ctx.lineTo(width, height);
        ctx.fill();
      }
    } else {
      const count = kind === 'clouds' ? 7 : width < 700 ? 16 : 30;
      for (let i = 0; i < count; i++) {
        const p = i * 2.39996;
        const drift = Math.sin(t * .6 + p) * 29;
        const x = ((i * 97.31 + (kind === 'clouds' ? t * 8 : drift) + width + 150) % (width + 150)) - 70;
        const speed = kind === 'leaves' ? 10 : -9;
        const period = height + 100;
        const y = kind === 'clouds' ? height * (.12 + i * .09) :
          ((i * 119.7 + t * speed) % period + period) % period - 45;
        const r = 4 + i % 8;
        ctx.globalAlpha = .24 + i % 4 * .12;
        ctx.beginPath();
        if (kind === 'clouds') {
          const cloud = ctx.createRadialGradient(x, y, 0, x, y, 70 + i * 10);
          cloud.addColorStop(0, tint);
          cloud.addColorStop(1, tint + '00');
          ctx.fillStyle = cloud;
          ctx.arc(x, y, 70 + i * 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'leaves') {
          ctx.ellipse(x, y, r * 1.5, r * .55, p + t * .4, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 'lanterns') {
          ctx.shadowColor = tint;
          ctx.shadowBlur = 16;
          ctx.roundRect(x, y, r * 1.25, r * 1.55, 3);
          ctx.fill();
        } else {
          ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  const soundGroups = {
    'Природа': {rain:'Дождь', ocean:'Морские волны', birds:'Птицы', stream:'Ручей', wind:'Ветер'},
    'Уют': {fire:'Камин', window:'Дождь за окном', train:'Поезд'},
    'Фокус': {pink:'Розовый шум', brown:'Коричневый шум'}
  };

  function makeSound(ctx, kind) {
    const length = 16, rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, rate * length, rate);
    const samples = buffer.getChannelData(0);
    let low = 0, mid = 0, pink = 0, pop = 0, phase = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate, white = Math.random() * 2 - 1;
      low += .006 * (white - low);
      mid += .07 * (white - mid);
      pink += .18 * (white - pink);
      let sample;
      switch (kind) {
        case 'rain': sample = (white - mid) * .32 + mid * .43; break;
        case 'window': sample = mid * 1.1 + low * 1.4; break;
        case 'ocean': sample = (mid * .85 + low * 2.6) * (.45 + .4 * Math.sin(t * Math.PI / 2)); break;
        case 'wind': sample = (mid * .32 + low * 3.3) * (.59 + .38 * Math.sin(t * Math.PI / 4)); break;
        case 'stream': sample = (pink - mid) * .42 + mid * .7 + .02 * Math.sin(3150 * t + 5 * Math.sin(71 * t)); break;
        case 'birds': {
          const phrase = t % 3.2, note = (phrase % .24) / .24;
          phase += 2 * Math.PI * (1850 + 970 * Math.sin(note * Math.PI)) / rate;
          sample = low * .6 + (phrase < .9 ? .12 * Math.sin(phase) * Math.sin(note * Math.PI) ** 2 : 0);
          break;
        }
        case 'fire':
          pop = (pop + (Math.random() < .0007 ? .5 : 0)) * .94;
          sample = low * 2.5 + mid * .4 + pop * white; break;
        case 'train': sample = low * 2.6 + mid * (.45 + .3 * Math.cos(t * Math.PI * 4)); break;
        case 'pink': sample = low * 1.9 + mid * .8 + pink * .35; break;
        case 'brown': sample = low * 4; break;
        default: sample = 0;
      }
      // Bring the loop gently to zero on both sides of the seam.
      samples[i] = Math.max(-.9, Math.min(.9, sample)) * Math.min(1, t * 45, (length - t) * 45);
    }
    return buffer;
  }

  function mountSound(host) {
    const saved = Storage.get('ef_ambience', {}) || {};
    const valid = Object.values(soundGroups).some(items => Object.hasOwn(items, saved.sound));
    const prefs = {
      sound: valid ? saved.sound : 'rain',
      volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, saved.volume)) : 35
    };
    host.innerHTML = '<h3>Фоновые звуки</h3><p>Выбери звук для учёбы. Он включится только по твоему нажатию.</p>'
      + '<div class="flow-controls"><label>Звук <select id="flowSound">'
      + Object.entries(soundGroups).map(([group, items]) => '<optgroup label="' + group + '">'
        + Object.entries(items).map(([id, name]) => '<option value="' + id + '">' + name + '</option>').join('')
        + '</optgroup>').join('')
      + '</select></label><button type="button" class="xo" id="flowSoundToggle">Включить звук</button></div>'
      + '<label class="flow-slider">Громкость <input type="range" id="flowSoundVolume" min="0" max="100" value="' + prefs.volume + '"></label>'
      + '<p role="status" id="flowSoundStatus"></p>';
    const select = host.querySelector('select'), volume = host.querySelector('input'), button = host.querySelector('button');
    const status = host.querySelector('[role=status]');
    select.value = prefs.sound;
    let context, source, gain, requestId = 0;
    function stopSource() {
      if (source) { source.stop(); source.disconnect(); source = null; }
    }
    function stop() {
      requestId++;
      stopSource();
      button.disabled = false;
      button.textContent = 'Включить звук';
      button.setAttribute('aria-pressed', 'false');
      status.textContent = '';
    }
    async function play() {
      const id = ++requestId;
      button.disabled = true;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        context ||= new Audio();
        await context.resume();
        if (id !== requestId) return;
        stopSource();
        gain ||= context.createGain();
        gain.disconnect();
        gain.connect(context.destination);
        gain.gain.value = prefs.volume / 100 * .55;
        source = context.createBufferSource();
        source.buffer = makeSound(context, prefs.sound);
        source.loop = true;
        source.connect(gain);
        source.start();
        button.setAttribute('aria-pressed', 'true');
        button.textContent = 'Выключить звук';
        status.textContent = 'Воспроизводится: ' + select.selectedOptions[0].textContent;
      } catch {
        if (id === requestId) { stop(); status.textContent = 'Браузер не смог включить звук. Попробуй ещё раз.'; }
      } finally {
        if (id === requestId) button.disabled = false;
      }
    }
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => source ? stop() : play();
    select.onchange = () => { prefs.sound = select.value; Storage.set('ef_ambience', prefs); if (source) play(); };
    volume.oninput = () => {
      prefs.volume = Number(volume.value);
      if (gain) gain.gain.setTargetAtTime(prefs.volume / 100 * .55, context.currentTime, .03);
      Storage.set('ef_ambience', prefs);
    };
    window.addEventListener('pagehide', stop);
    return stop;
  }

  function navigation(app) {
    const nav = document.querySelector('.nav-links');
    const menu = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    menu.setAttribute('aria-label', 'Открыть меню разделов');
    menu.setAttribute('aria-controls', sidebar.id);
    const shell = document.createElement('div');
    shell.className = 'flow-nav';
    shell.innerHTML = '<label class="flow-search-label" for="flowNavSearch">Разделы</label>'
      + '<input type="search" id="flowNavSearch" placeholder="Найти раздел…" aria-keyshortcuts="Control+K Meta+K">'
      + '<div class="flow-pins" aria-label="Закреплённые разделы"></div>';
    nav.before(shell);
    const search = shell.querySelector('input');
    const pinned = shell.querySelector('.flow-pins');
    const stored = Storage.get('ef_pinned', []);
    let ids = Array.isArray(stored) ? [...new Set(stored.filter(id => typeof id === 'string'))] : [];
    const rows = new Map();
    const empty = document.createElement('p');
    empty.className = 'flow-nav-empty';
    empty.textContent = 'Разделы не найдены';
    nav.append(empty);
    const title = link => {
      const copy = link.cloneNode(true);
      copy.querySelectorAll('.badge,.badge-new').forEach(el => el.remove());
      return copy.textContent.trim();
    };
    function refresh() {
      const active = app.currentView || 'dashboard';
      for (const [id, {link, mark}] of rows) {
        const name = title(link);
        const on = ids.includes(id);
        mark.setAttribute('aria-pressed', String(on));
        mark.setAttribute('aria-label', (on ? 'Открепить: ' : 'Закрепить: ') + name);
        mark.title = mark.getAttribute('aria-label');
        if (id === active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      menu.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
      pinned.replaceChildren();
      for (const id of ids) {
        if (!rows.has(id)) continue;
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = title(rows.get(id).link);
        if (id === active) item.setAttribute('aria-current', 'page');
        item.onclick = () => go(id);
        pinned.append(item);
      }
      pinned.hidden = !pinned.childElementCount;
    }
    function filter() {
      const query = search.value.trim().toLocaleLowerCase();
      let has = false;
      for (const {row, link} of rows.values()) {
        row.hidden = !title(link).toLocaleLowerCase().includes(query);
        has ||= !row.hidden;
      }
      empty.hidden = has;
    }
    function go(id) {
      search.value = '';
      filter();
      app.switchView(id);
      document.querySelector('.view.active .section-title')?.focus({preventScroll:true});
    }
    function addLinks() {
      let changed = false;
      for (const link of nav.querySelectorAll(':scope > .nav-link')) {
        const id = link.dataset.view;
        if (!id) continue;
        const row = document.createElement('div'), mark = document.createElement('button');
        row.className = 'flow-nav-row';
        mark.type = 'button';
        mark.className = 'flow-pin';
        mark.textContent = '★';
        mark.onclick = () => {
          ids = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
          Storage.set('ef_pinned', ids);
          refresh();
        };
        link.before(row);
        row.append(link, mark);
        rows.set(id, {row, link, mark});
        changed = true;
      }
      if (changed) { filter(); refresh(); }
    }
    addLinks();
    new MutationObserver(addLinks).observe(nav, {childList:true});
    new MutationObserver(() => {
      menu.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
    }).observe(sidebar, {attributes:true, attributeFilter:['class']});
    const original = app.switchView.bind(app);
    app.switchView = view => {
      original(view);
      const heading = document.querySelector('.view.active .section-title');
      if (heading) heading.tabIndex = -1;
      window.scrollTo(0, 0);
      refresh();
    };
    search.oninput = filter;
    search.onkeydown = e => {
      if (e.key === 'Enter') {
        const match = [...rows.entries()].find(([, data]) => !data.row.hidden);
        if (match) go(match[0]);
      }
    };
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !document.querySelector('.modal-overlay.active')) {
        e.preventDefault();
        if (menu.offsetWidth && !sidebar.classList.contains('open')) menu.click();
        search.focus();
        search.select();
      }
      if (e.key === 'Escape' && !document.querySelector('.modal-overlay.active')) {
        if (document.activeElement === search && search.value) { search.value = ''; filter(); }
        else if (sidebar.classList.contains('open')) { overlay.click(); menu.focus(); }
      }
    });
  }

  const phrases = {
    'я опаздываю': 'I’m running late.',
    'спасибо': 'Thank you.',
    'доброе утро': 'Good morning.',
    'как дела': 'How are you?',
    'пожалуйста': 'Please — в просьбе; You’re welcome — в ответ на спасибо.'
  };
  const grammar = [
    [/present perfect/i, 'Present Perfect: have/has + третья форма. I have lost my keys. Важен результат сейчас — ключей нет. Для конкретного времени в прошлом: I lost my keys yesterday.'],
    [/past simple/i, 'Past Simple: вторая форма глагола или окончание -ed. I walked home yesterday. В вопросе: Did you walk home? После did нужна начальная форма.'],
    [/present simple/i, 'Present Simple: регулярные действия и факты. I walk to school. She walks to school. В вопросе: Does she walk to school?'],
    [/present continuous/i, 'Present Continuous: am/is/are + -ing. I am reading now. Это происходит прямо сейчас.'],
    [/conditionals?|условн/i, 'Первый тип: If + Present Simple, затем will + глагол. If it rains, we’ll stay home. Возможное условие в будущем.'],
    [/артикл|articles?/i, 'A/an — один неспецифичный предмет (a book, an apple). The — предмет, который собеседник уже может определить (the book on my desk).']
  ];
  function practice(question, state, dictionary) {
    const q = question.trim().toLowerCase();
    const command = q.replace(/[?!.]+$/, '').trim();
    const ielts = /^(ielts speaking part 1:\s*задай вопрос|ielts practice|практика ielts|давай потренируем ielts)$/.test(command);
    const backToPractice = ielts || /^(давай поговорим( по-английски)?|давай начнём практику|начать (практику|разговор))$/.test(command);
    if (backToPractice) {
      const prompts = ielts ?
        ['Where do you live?', 'What do you like about your hometown?', 'What would you change about it?'] :
        ['What do you usually do after school or work?', 'What did you do yesterday?', 'What would you like to do next weekend?'];
      state.dialogue = prompts.slice(1);
      return 'Практика без ИИ. Ответь полным предложением на английском.\n\n' + prompts[0];
    }
    const rule = grammar.find(([pattern]) => pattern.test(q));
    if (rule) return rule[1] + '\n\nЕщё примеры и упражнения: [[open:grammar]]';
    const corrections = [[/\b(he|she|it) go\b/i, '$1 goes', 'после he/she/it в Present Simple добавляем -es'],
      [/\bgoed\b/i, 'went', 'у глагола go неправильная форма прошедшего времени'],
      [/\b(did(?: not|n.t)?) went\b/i, '$1 go', 'после did берём начальную форму'],
      [/\bi am agree\b/i, 'I agree', 'agree — самостоятельный глагол'],
      [/^(he|she|it)\s+have\b(?!\s+not\b)(?![^.!?]*\?$)/i, '$1 has', 'с he/she/it используется has']];
    const original = question.replace(/^(исправь|проверь|correct)\s*:?\s*/i, '');
    const fix = corrections.find(([pattern]) => pattern.test(original));
    if (fix) {
      const [pattern, change, reason] = fix;
      const prompt = state.dialogue?.shift();
      return original.replace(pattern, change) + ' — ' + reason + '.' + (prompt ? '\n\n' + prompt : '');
    }
    const query = q.replace(/^(как сказать|как будет|переведи|перевод)\s*[:–-]?\s*/i, '').replace(/^[«"' ]+|[»"'?!. ]+$/g, '');
    if (Object.hasOwn(phrases, query)) return phrases[query];
    const results = dictionary(query);
    if (results) return results;
    if (state.dialogue && /[a-z]/i.test(q) && !/[а-яё]/i.test(q)) {
      const next = state.dialogue.shift();
      if (!next) delete state.dialogue;
      return (next ? 'Ответ принят. Добавь деталь или пример, если можешь.\n\n' + next :
        'Практика завершена. Перечитай ответы вслух и проверь время глаголов. Для новой темы напиши «Давай поговорим».');
    }
    return 'Встроенная практика умеет искать в словаре, объяснять базовую грамматику и задавать вопросы по сценарию. Попробуй «Объясни Present Perfect» или «Давай поговорим». Для свободного разговора подключи источник ИИ.';
  }

  window.EFExperience = {scenes, paint, mountSound, navigation, practice};
})();
