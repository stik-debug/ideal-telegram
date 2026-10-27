/* Skillora Learning Hub: streaks, spaced-repetition reviews, Practice Lab, cohorts, outcomes, SMS reminders,
   offline library, data saver, Swahili interface, public results and M-Pesa checkout UI.
   Loaded after app.js (uses its globals: me, api, esc, $, setView, auth, course, header). */
(function () {
  'use strict';
  const LS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }, del(k) { try { localStorage.removeItem(k); } catch { } } };
  const el = (s, r = document) => r.querySelector(s);
  const T = (en) => (lang === 'sw' && SW[en]) || en;
  let lang = LS.get('skillora.lang') === 'sw' ? 'sw' : 'en';

  // ================= Swahili interface (static site text and navigation; course lessons remain in English) =================
  const SW = {
    'Skip to content': 'Ruka hadi maudhui', 'Programs': 'Kozi', 'How it works': 'Jinsi inavyofanya kazi', 'Why Skillora': 'Kwa nini Skillora', 'FAQs': 'Maswali',
    'Careers': 'Kazi', 'Freelance': 'Kazi za kujitegemea', 'Plans': 'Mipango', 'Sign in': 'Ingia', 'Get started': 'Anza sasa', 'Sign out': 'Toka', 'My learning': 'Masomo yangu', 'Control Center': 'Kituo cha Udhibiti', 'Learning Hub': 'Kituo cha Kujifunza',
    'YOUR NEXT CHAPTER STARTS HERE': 'HATUA YAKO IJAYO INAANZIA HAPA', 'Skills that move you': 'Ujuzi unaokusukuma', 'forward.': 'mbele.',
    'Practical tech and AI skills, built around real projects—not just videos. Learn at your pace, from wherever you are in Kenya.': 'Ujuzi wa vitendo wa teknolojia na AI, unaojengwa kwa miradi halisi—si video tu. Jifunze kwa kasi yako, popote ulipo nchini Kenya.',
    'Explore courses': 'Tazama kozi', 'Start learning free': 'Anza kujifunza bure', 'Beginner-friendly': 'Rafiki kwa wanaoanza', 'Learn at your pace': 'Jifunze kwa kasi yako', 'Prices in KSh': 'Bei kwa KSh',
    'Your next step is ready.': 'Hatua yako ijayo iko tayari.', 'Learn by doing': 'Jifunze kwa vitendo', 'Projects over theory': 'Miradi kuliko nadharia', 'Made for real life': 'Imetengenezwa kwa maisha halisi', 'Skills you can use': 'Ujuzi unaoweza kutumia',
    'LEARN A SKILL': 'JIFUNZE UJUZI', 'BUILD SOMETHING REAL': 'JENGA KITU HALISI', 'OPEN NEW DOORS': 'FUNGUA MILANGO MIPYA',
    'Practical-first lessons': 'Masomo ya vitendo kwanza', 'Transparent KSh pricing': 'Bei wazi kwa KSh', 'Learn on your schedule': 'Jifunze kwa ratiba yako', 'Skills for the digital economy': 'Ujuzi kwa uchumi wa kidijitali',
    'FIND YOUR STARTING POINT': 'PATA PA KUANZIA', 'Choose a skill.': 'Chagua ujuzi.', 'Change your direction.': 'Badilisha mwelekeo wako.', 'Explore our available courses and preview a lesson before you commit.': 'Tazama kozi zetu na uone somo la mfano kabla ya kujiunga.',
    'Clear pricing': 'Bei wazi', 'No hidden subscription fee': 'Hakuna ada fiche ya usajili', 'Category': 'Kategoria', 'All categories': 'Kategoria zote', 'AI & Automation': 'AI na Uendeshaji Kiotomatiki', 'Software & Web': 'Programu na Wavuti', 'Data & Analytics': 'Data na Uchambuzi', 'Business & Freelancing': 'Biashara na Kujitegemea', 'Design & Content': 'Usanifu na Maudhui', 'Career Skills': 'Ujuzi wa Kazi', 'Other skills': 'Ujuzi mwingine',
    'Sort by': 'Panga kwa', 'Recommended': 'Zinazopendekezwa', 'Name A–Z': 'Jina A–Z', 'Price: low to high': 'Bei: chini hadi juu', 'Price: high to low': 'Bei: juu hadi chini', 'Most lessons': 'Masomo mengi zaidi', 'Saved courses': 'Kozi zilizohifadhiwa', 'Loading courses…': 'Inapakia kozi…',
    'YOUR NEXT SMALL WIN': 'USHINDI WAKO MDOGO UJAO', 'Build a learning rhythm that fits your life': 'Jenga mazoea ya kujifunza yanayolingana na maisha yako', 'Today’s focus': 'Lengo la leo', 'Complete one lesson': 'Maliza somo moja', 'Practise for 15 minutes': 'Fanya mazoezi kwa dakika 15', 'Make one small project improvement': 'Boresha mradi wako kidogo', 'Review yesterday’s notes': 'Pitia madokezo ya jana', 'Complete today’s check-in': 'Kamilisha ukaguzi wa leo',
    'YOUR LEARNING JOURNEY': 'SAFARI YAKO YA KUJIFUNZA', 'Small steps.': 'Hatua ndogo.', 'Real progress.': 'Maendeleo halisi.', 'A simple, supportive path from curious beginner to confident builder.': 'Njia rahisi na ya kusaidia kutoka kwa mwanzishi mdadisi hadi mjenzi mwenye ujasiri.',
    'Pick your path': 'Chagua njia yako', 'Choose a topic that matches your goals. Start with a free lesson to see if it feels right.': 'Chagua mada inayolingana na malengo yako. Anza na somo la bure uone kama linakufaa.', 'Learn by building': 'Jifunze kwa kutengeneza', 'Work through clear lessons, practice questions and examples that connect to real tasks.': 'Fuata masomo yaliyo wazi, maswali ya mazoezi na mifano inayohusiana na kazi halisi.', 'Track your growth': 'Fuatilia ukuaji wako', 'Keep track of completed lessons and work steadily toward finishing your course.': 'Fuatilia masomo uliyomaliza na endelea taratibu hadi umalize kozi yako.',
    'BUILT FOR YOUR REALITY': 'IMEJENGWA KWA HALI YAKO HALISI', 'out of reach.': 'kuwa mbali na uwezo wako.', 'Find your first course': 'Tafuta kozi yako ya kwanza', 'Kenya-first pricing': 'Bei kwa Kenya kwanza', 'See course prices in Kenyan shillings before you make a decision.': 'Ona bei za kozi kwa shilingi za Kenya kabla ya kuamua.', 'Learn around your life': 'Jifunze kulingana na maisha yako', 'Practice, not just theory': 'Mazoezi, si nadharia tu', 'Progress you can see': 'Maendeleo unayoyaona',
    'YOUR FUTURE IS WORTH INVESTING IN': 'MUSTAKABALI WAKO UNASTAHILI KUWEKEZA', 'Start with one lesson.': 'Anza na somo moja.', 'Build from there.': 'Jenga kutoka hapo.', 'Explore the course catalogue and take your first step today.': 'Tazama orodha ya kozi na uchukue hatua yako ya kwanza leo.',
    'GOOD QUESTIONS': 'MASWALI MAZURI', 'Before you': 'Kabla ya', 'get started.': 'kuanza.', 'Can I try a lesson before paying?': 'Naweza kujaribu somo kabla ya kulipa?', 'Yes. Courses can include a free preview lesson. Open a course to see which lessons are available before enrolment.': 'Ndiyo. Kozi zinaweza kuwa na somo la bure la mfano. Fungua kozi uone masomo yanayopatikana kabla ya kujiandikisha.',
    'How much do courses cost?': 'Kozi zinagharimu kiasi gani?', 'Do I need experience to start?': 'Je, ninahitaji uzoefu ili kuanza?', 'Start with a beginner-friendly course and follow the lessons in order. Each course description explains what you will learn.': 'Anza na kozi rafiki kwa wanaoanza na ufuate masomo kwa mpangilio. Maelezo ya kila kozi yanaeleza utakachojifunza.',
    'Can I study on my phone?': 'Naweza kusoma kwa simu yangu?', 'How do payments work?': 'Malipo yanafanyaje kazi?', 'Do not pay outside the official checkout or share your M-Pesa PIN with anyone.': 'Usilipe nje ya mfumo rasmi wa malipo wala kumpa mtu yeyote PIN yako ya M-Pesa.', 'Will I get a certificate or a job?': 'Je, nitapata cheti au kazi?',
    'Learn. Build. Get Hired.': 'Jifunze. Jenga. Ajiriwa.', 'Practical digital skills for your next chapter.': 'Ujuzi wa kidijitali wa vitendo kwa hatua yako ijayo.', 'Courses': 'Kozi', 'Student sign in': 'Mwanafunzi ingia', 'Built for learners. Rooted in possibility.': 'Imejengwa kwa wanafunzi. Imesimikwa kwenye fursa.',
    // Learning Hub + results
    'Today': 'Leo', 'Reviews': 'Marudio', 'Practice': 'Mazoezi', 'Cohorts': 'Makundi', 'My results': 'Matokeo yangu', 'Settings': 'Mipangilio',
    'Day streak': 'Siku mfululizo', 'Best streak': 'Rekodi bora', 'Study days': 'Siku za kusoma', 'Check in for today': 'Jiandikishe leo', 'You are checked in for today.': 'Umejiandikisha leo.', 'Start reviewing': 'Anza marudio', 'Next question': 'Swali lijalo', 'Run my code': 'Endesha msimbo wangu', 'Join cohort': 'Jiunge na kundi', 'Leave': 'Ondoka', 'Full': 'Limejaa', 'Save for offline': 'Hifadhi kwa matumizi bila mtandao', 'Remove offline copy': 'Futa nakala ya nje ya mtandao', 'Data saver': 'Kiokoa data', 'Language': 'Lugha', 'Send code': 'Tuma msimbo', 'Verify': 'Thibitisha', 'Stop reminders': 'Acha vikumbusho',
    'Our results, published honestly': 'Matokeo yetu, yanayochapishwa kwa uwazi', 'Learners': 'Wanafunzi', 'Lessons completed': 'Masomo yaliyokamilika', 'Certificates issued': 'Vyeti vilivyotolewa', 'Send M-Pesa request': 'Tuma ombi la M-Pesa'
  };
  const SW_ATTR = { 'Search by skill, topic, or course...': 'Tafuta kwa ujuzi, mada, au kozi...', 'Search courses by title, topic, or skill': 'Tafuta kozi kwa jina, mada, au ujuzi', 'Toggle navigation': 'Fungua/funga menyu' };
  const SW_FAQ = { 'Each course displays its price in Kenyan shillings on the course card and course page. Check the current listing before making a payment.': 'Kila kozi inaonyesha bei yake kwa shilingi za Kenya kwenye kadi na ukurasa wa kozi. Angalia orodha ya sasa kabla ya kulipa.', 'The website is designed to adapt to mobile, tablet and desktop screens. A stable internet connection is recommended.': 'Tovuti imeundwa kufanya kazi kwenye simu, tablet na kompyuta. Mtandao thabiti unapendekezwa.', 'Certificate features depend on course completion and platform availability. Completing a course does not guarantee employment, income or a job placement.': 'Cheti kinategemea kukamilisha kozi. Kukamilisha kozi hakuhakikishi ajira, kipato wala nafasi ya kazi.', 'Payment options shown by the platform depend on what has been configured by the academy. Do not pay outside the official checkout or share your M-Pesa PIN with anyone.': 'Njia za malipo zinazoonyeshwa zinategemea mipangilio ya akademia. Usilipe nje ya mfumo rasmi wa malipo wala kumpa mtu yeyote PIN yako ya M-Pesa.' };
  Object.assign(SW, SW_FAQ);
  let translating = false;
  function translate(root) {
    if (lang !== 'sw') return; translating = true;
    try {
      const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      for (const n of nodes) { const t = n.nodeValue.trim(); if (t && SW[t]) n.nodeValue = n.nodeValue.replace(t, SW[t]); }
      (root && root.querySelectorAll ? root : document).querySelectorAll('[placeholder],[aria-label]').forEach(e => { for (const a of ['placeholder', 'aria-label']) { const v = e.getAttribute(a); if (v && SW_ATTR[v]) e.setAttribute(a, SW_ATTR[v]); } });
    } finally { translating = false; }
  }
  function startLanguage() {
    document.documentElement.lang = lang === 'sw' ? 'sw' : 'en'; if (lang !== 'sw') return; translate(document.body);
    new MutationObserver(ms => { if (translating) return; for (const m of ms) m.addedNodes.forEach(n => translate(n.nodeType === 1 ? n : n.parentNode)); }).observe(document.body, { childList: true, subtree: true });
  }
  function setLang(l) { LS.set('skillora.lang', l); location.reload(); }

  // ================= Data saver =================
  const saveData = () => LS.get('skillora.datasaver') === '1' || (navigator.connection && navigator.connection.saveData);
  const applyDataSaver = () => document.documentElement.classList.toggle('data-saver', !!saveData());

  // ================= Offline library =================
  const OFF = 'skillora.off.';
  const offIndex = () => { try { return JSON.parse(LS.get(OFF + 'index') || '[]'); } catch { return []; } };
  const baseApi = window.api;
  let offlineBanner = false;
  window.api = async function (p, method, body) {
    method = method || 'GET';
    try {
      const r = await baseApi.call(this, p, method, body);
      if (method === 'GET') { const m = /^\/courses\/([^/?]+)$/.exec(p); if (m && offIndex().includes(decodeURIComponent(m[1]))) LS.set(OFF + 'course.' + decodeURIComponent(m[1]), JSON.stringify(r)); if (p === '/me' && offIndex().length && r) LS.set(OFF + 'me', JSON.stringify(r)); }
      if (p === '/logout') clearOffline();
      return r;
    } catch (e) {
      if (method === 'GET' && !e.status) {
        const m = /^\/courses\/([^/?]+)$/.exec(p); const hit = p === '/me' ? LS.get(OFF + 'me') : m ? LS.get(OFF + 'course.' + decodeURIComponent(m[1])) : null;
        if (hit) { if (!offlineBanner) { offlineBanner = true; showOfflineBanner(); } try { return JSON.parse(hit); } catch { } }
      }
      throw e;
    }
  };
  function showOfflineBanner() { const b = document.createElement('div'); b.className = 'announce announce-warning'; b.setAttribute('role', 'status'); b.textContent = 'You are offline. Showing lessons saved on this device — progress and quizzes need a connection.'; document.body.insertBefore(b, document.body.firstChild); }
  function clearOffline() { offIndex().forEach(s => LS.del(OFF + 'course.' + s)); LS.del(OFF + 'index'); LS.del(OFF + 'me'); }
  async function saveCourseOffline(slug) { const c = await baseApi('/courses/' + encodeURIComponent(slug)); if (!LS.set(OFF + 'course.' + slug, JSON.stringify(c))) throw new Error('Not enough storage space on this device.'); const idx = offIndex(); if (!idx.includes(slug)) idx.push(slug); LS.set(OFF + 'index', JSON.stringify(idx)); try { LS.set(OFF + 'me', JSON.stringify(await baseApi('/me'))); } catch { } }
  function removeCourseOffline(slug) { LS.del(OFF + 'course.' + slug); LS.set(OFF + 'index', JSON.stringify(offIndex().filter(s => s !== slug))); }

  // ================= Navigation hooks =================
  const baseHeader = window.header;
  window.header = function () {
    baseHeader.apply(this, arguments); const nav = el('#nav'); if (!nav) return;
    if (me) { const b = document.createElement('button'); b.className = 'nav-btn'; b.id = 'nav-hub'; b.textContent = 'Learning Hub'; b.onclick = () => hub('today'); const d = el('#nav-dashboard'); nav.insertBefore(b, d || nav.firstChild); }
    const l = document.createElement('button'); l.className = 'nav-btn lang-btn'; l.id = 'nav-lang'; l.setAttribute('aria-label', lang === 'sw' ? 'Switch to English' : 'Badilisha kwa Kiswahili'); l.textContent = lang === 'sw' ? 'EN' : 'SW'; l.onclick = () => setLang(lang === 'sw' ? 'en' : 'sw'); nav.appendChild(l);
  };

  // ================= Learning Hub =================
  const TABS = [['today', 'Today'], ['review', 'Reviews'], ['practice', 'Practice'], ['cohorts', 'Cohorts'], ['results', 'My results'], ['settings', 'Settings']];
  const shell = (active, inner) => setView(`<section class="view-shell hub"><div class="view-head"><p class="eyebrow dark">SKILLORA</p><h1>Learning Hub</h1></div><nav class="cc-jump hub-tabs" aria-label="Learning Hub sections">${TABS.map(t => `<button type="button" class="hub-tab${t[0] === active ? ' on' : ''}" data-tab="${t[0]}" ${t[0] === active ? 'aria-current="page"' : ''}>${T(t[1])}</button>`).join('')}</nav><div id="hub-body">${inner}</div></section>`);
  function bindTabs() { document.querySelectorAll('.hub-tab').forEach(b => b.onclick = () => hub(b.dataset.tab)); }
  async function hub(tab) {
    if (!me) return auth();
    try { await ({ today, review, practice, cohorts, results, settings }[tab] || today)(); } catch (e) { shell(tab, `<p class="notice">${esc(e.message)}</p>`); bindTabs(); }
  }
  window.openLearningHub = hub;
  const msg = (id, text, bad) => { const m = el(id); if (m) { m.textContent = text; m.className = 'cc-toast' + (bad ? ' bad' : ''); } };

  async function today() {
    const s = await api('/streak');
    shell('today', `<div class="cc-tiles"><div class="cc-tile has"><b>🔥 ${s.current}</b><span>${T('Day streak')}</span></div><div class="cc-tile"><b>${s.longest}</b><span>${T('Best streak')}</span></div><div class="cc-tile"><b>${s.total_active_days}</b><span>${T('Study days')}</span></div><div class="cc-tile ${s.due_reviews ? 'has' : ''}"><b>${s.due_reviews}</b><span>Reviews ready</span></div></div>
      <div class="hub-dots" role="img" aria-label="Last 14 days of activity">${s.last14.map(d => `<i class="${d.active ? 'on' : ''}" title="${d.day}"></i>`).join('')}</div>
      <section class="panel"><h2>${s.active_today ? T('You are checked in for today.') : 'What will you do today?'}</h2><p class="muted">Finishing a lesson, answering reviews or completing a practice exercise also counts toward your streak.</p>
      <div class="cc-btns"><button class="btn-solid" id="hub-checkin" ${s.active_today ? 'disabled' : ''}>${T('Check in for today')}</button><button class="course-open" id="hub-go-review">${T('Start reviewing')}</button><button class="course-open" id="hub-go-practice">${T('Practice')}</button></div><p id="hub-msg" class="cc-toast" role="status"></p></section>`);
    bindTabs(); el('#hub-checkin').onclick = async () => { try { await api('/checkin', 'POST', { focus: 'lesson' }); today(); } catch (e) { msg('#hub-msg', e.message, true); } };
    el('#hub-go-review').onclick = () => hub('review'); el('#hub-go-practice').onclick = () => hub('practice');
  }

  async function review() {
    const q = await api('/review/queue'); let i = 0, right = 0;
    const draw = () => {
      if (!q.cards.length) { shell('review', `<section class="panel"><h2>No reviews waiting 🎉</h2><p class="muted">Reviews come from quiz questions in lessons you have completed. Finish a lesson and its questions will appear here at spaced intervals so they stick.</p><p class="muted">Cards learned: ${q.total_cards} · Mastered: ${q.mastered}</p></section>`); return bindTabs(); }
      if (i >= q.cards.length) { shell('review', `<section class="panel"><h2>Session complete</h2><p>You answered ${right} of ${q.cards.length} correctly. Wrong answers will come back tomorrow.</p><button class="btn-solid" id="rv-done">Back to Today</button></section>`); bindTabs(); return el('#rv-done').onclick = () => hub('today'); }
      const c = q.cards[i];
      shell('review', `<section class="panel"><p class="muted">Question ${i + 1} of ${q.cards.length} · ${esc(c.course)} › ${esc(c.lesson)}</p><h2 id="rv-q">${esc(c.question)}</h2><div class="rv-opts" role="group" aria-labelledby="rv-q">${c.options.map((o, k) => `<button type="button" class="course-open rv-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div><div id="rv-fb" role="status" aria-live="polite"></div></section>`); bindTabs();
      document.querySelectorAll('.rv-opt').forEach(b => b.onclick = async () => {
        document.querySelectorAll('.rv-opt').forEach(x => x.disabled = true);
        try { const r = await api('/review/answer', 'POST', { quiz_id: c.id, choice: Number(b.dataset.k) }); if (r.correct) right++;
          document.querySelectorAll('.rv-opt')[r.correct_index].classList.add('right'); if (!r.correct) b.classList.add('wrong');
          el('#rv-fb').innerHTML = `<p class="${r.correct ? 'ok' : 'bad'}"><b>${r.correct ? 'Correct!' : 'Not quite.'}</b> ${esc(r.explanation)}</p><p class="muted">Next review: ${esc(r.next_due)}</p><button class="btn-solid" id="rv-next">${T('Next question')}</button>`; el('#rv-next').onclick = () => { i++; draw(); }; el('#rv-next').focus();
        } catch (e) { el('#rv-fb').innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
      });
    };
    draw();
  }

  // ---------- Practice Lab ----------
  let sbx = null, reqId = 0; const pending = {};
  window.addEventListener('message', e => { if (!sbx || e.source !== sbx.contentWindow || !e.data) return; if (e.data.ready) { sbx.dataset.ready = '1'; return; } const f = pending[e.data.id]; if (f) { delete pending[e.data.id]; f(e.data); } });
  function runInSandbox(payload) {
    return new Promise((resolve) => {
      const send = () => { const id = ++reqId; pending[id] = resolve; sbx.contentWindow.postMessage({ ...payload, id }, '*'); setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ error: 'The code runner did not respond.' }); } }, 6000); };
      if (!sbx || !document.body.contains(sbx)) { sbx = document.createElement('iframe'); sbx.src = '/sandbox.html'; sbx.setAttribute('sandbox', 'allow-scripts'); sbx.title = 'Code runner'; sbx.hidden = true; sbx.onload = () => setTimeout(send, 50); document.body.appendChild(sbx); } else send();
    });
  }
  async function practice() {
    const list = await api('/exercises'), done = list.filter(e => e.completed).length;
    shell('practice', `<p class="muted">Write real code and get instant feedback. Your code runs privately in your browser. ${done} of ${list.length} completed. Practice is for learning and builds your streak; certificates still come from course lessons and reviewed projects.</p><div class="cc-grid">${list.map(e => `<article class="cc-card"><h3>${e.completed ? '✅ ' : ''}${esc(e.title)}</h3><p class="muted">${esc(e.track)} · ${esc(e.level)}</p><button class="course-open" data-ex="${esc(e.key)}">${e.completed ? 'Practise again' : 'Start'}</button></article>`).join('')}</div>`); bindTabs();
    document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => exercise(list.find(x => x.key === b.dataset.ex), list));
  }
  function exercise(ex, list) {
    shell('practice', `<button class="back-link" id="ex-back">← All exercises</button><section class="panel"><h2>${esc(ex.title)}</h2><p>${esc(ex.prompt)}</p><label class="sr-only" for="ex-code">Your code</label><textarea id="ex-code" class="hub-code" spellcheck="false" autocapitalize="off" autocomplete="off" rows="10">${esc(ex.starter)}</textarea>
      ${ex.type === 'html' ? '<p class="muted">Live preview (scripts are disabled):</p><iframe id="ex-preview" class="hub-preview" sandbox="" title="Preview of your HTML"></iframe>' : ''}
      <div class="cc-btns"><button class="btn-solid" id="ex-run">${T('Run my code')}</button><button class="course-open" id="ex-reset">Reset</button></div><div id="ex-out" role="status" aria-live="polite"></div><details><summary>Need a hint?</summary><p>${esc(ex.hint)}</p></details></section>`); bindTabs();
    const ta = el('#ex-code'), prev = el('#ex-preview'); const sync = () => { if (prev) prev.srcdoc = ta.value.slice(0, 50000); }; sync(); ta.addEventListener('input', sync);
    ta.addEventListener('keydown', e => { if (e.key === 'Tab' && !e.shiftKey && e.altKey === false && e.ctrlKey === false) { /* keep Tab for keyboard navigation (accessibility) */ } });
    el('#ex-back').onclick = practice; el('#ex-reset').onclick = () => { ta.value = ex.starter; sync(); };
    el('#ex-run').onclick = async () => {
      const out = el('#ex-out'); out.innerHTML = '<p class="muted">Running…</p>';
      const r = await runInSandbox({ type: ex.type, code: ta.value, fn: ex.fn, tests: ex.tests });
      if (r.error) { out.innerHTML = `<p class="bad"><b>Problem:</b> ${esc(r.error)}</p>`; return; }
      const ok = r.results.every(x => x.ok);
      out.innerHTML = `<ul class="cc-checks">${r.results.map((x, i) => { const t = ex.tests[i]; const label = ex.type === 'html' ? t.label : `${ex.fn}(${t.args.map(a => JSON.stringify(a)).join(', ')}) should give ${JSON.stringify(t.expect)}`; return `<li class="${x.ok ? 'ok' : 'warn'}"><span aria-hidden="true">${x.ok ? '✓' : '✗'}</span><div>${esc(label)}${x.ok ? '' : `<small>${ex.type === 'html' ? esc(x.got) : 'Your code gave ' + esc(x.got)}</small>`}</div></li>`; }).join('')}</ul>${ok ? '<p class="ok"><b>All tests passed — well done! 🎉</b></p>' : '<p class="muted">Not yet — read the failing line and try again.</p>'}`;
      if (ok && !ex.completed) { ex.completed = true; try { await api('/exercises/' + encodeURIComponent(ex.key) + '/complete', 'POST'); } catch { } }
    };
  }

  async function cohorts() {
    const list = await api('/cohorts');
    shell('cohorts', `<p class="muted">Learn alongside others. Join a cohort to start on a fixed date with a group, share progress and stay accountable.</p>${list.length ? `<div class="cc-grid">${list.map(c => `<article class="cc-card"><h3>${esc(c.title)}</h3><p class="muted">${esc(c.course || 'Open topic')} · ${esc(c.starts_on)} → ${esc(c.ends_on)}</p><p>${esc(c.description)}</p><p class="muted">${c.members} / ${c.capacity} joined</p>${c.joined ? `<button class="course-open" data-leave="${c.id}">${T('Leave')}</button>` : c.members >= c.capacity || c.status !== 'open' ? `<button class="course-open" disabled>${T('Full')}</button>` : `<button class="btn-solid" data-join="${c.id}">${T('Join cohort')}</button>`}</article>`).join('')}</div>` : '<section class="panel"><p>No cohorts are open right now. New cohorts are announced here and in the site banner.</p></section>'}<p id="hub-msg" class="cc-toast" role="status"></p>`); bindTabs();
    document.querySelectorAll('[data-join]').forEach(b => b.onclick = async () => { try { await api('/cohorts/' + b.dataset.join + '/join', 'POST'); cohorts(); } catch (e) { msg('#hub-msg', e.message, true); } });
    document.querySelectorAll('[data-leave]').forEach(b => b.onclick = async () => { await api('/cohorts/' + b.dataset.leave + '/leave', 'POST'); cohorts(); });
  }

  const KINDS = { first_client: 'Got my first paying client', job_interview: 'Got a job interview', job_offer: 'Received a job offer', new_job: 'Started a new job', business_started: 'Started or grew a business', income_increase: 'Increased my income' };
  async function results() {
    const mine = await api('/outcomes/mine');
    shell('results', `<p class="muted">Did Skillora help you move forward? Tell us. After our team checks your report, it is counted in our public results (never with your name).</p>
      <section class="panel"><form id="oc-form"><label>What happened<select name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label>Tell us a little (optional)<textarea name="note" maxlength="500" rows="3"></textarea></label><label>Link that shows it (optional, https://)<input name="evidence_url" type="url" placeholder="https://"></label><button class="btn-solid" type="submit">Submit for checking</button><p id="hub-msg" class="cc-toast" role="status"></p></form></section>
      <section class="panel"><h2>Your reports</h2>${mine.length ? `<ul class="cc-checks">${mine.map(m => `<li class="${m.status === 'verified' ? 'ok' : 'warn'}"><span aria-hidden="true">${m.status === 'verified' ? '✓' : m.status === 'rejected' ? '✗' : '…'}</span><div><b>${esc(m.label)}</b><small>${esc(m.status)} · ${esc(String(m.created).slice(0, 10))}</small></div></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</section>`); bindTabs();
    el('#oc-form').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { const r = await api('/outcomes', 'POST', { kind: f.get('kind'), note: f.get('note'), evidence_url: f.get('evidence_url') }); msg('#hub-msg', r.message); setTimeout(results, 1500); } catch (x) { msg('#hub-msg', x.message, true); } };
  }

  async function settings() {
    const [rem, home] = await Promise.all([api('/reminders'), api('/learner/home').catch(() => ({ courses: [] }))]); const idx = offIndex(), courses = (home.courses || []);
    shell('settings', `<div class="cc-grid">
      <article class="cc-card"><h3>SMS study reminders</h3>${!rem.sms_available ? '<p class="muted">SMS reminders are not switched on for this academy yet.</p>' : rem.verified && rem.sms_opt_in ? `<p>Reminders go to <b>${esc(rem.phone)}</b> at ${esc(rem.reminder_time)}.</p><button class="course-open" id="sms-stop">${T('Stop reminders')}</button>` : `<p class="muted">We text you once a day only if you have not studied. Verify your number to turn it on.</p><form id="sms-form"><label>Safaricom / Airtel number<input name="phone" type="tel" placeholder="0712345678" autocomplete="tel" required></label><button class="btn-solid" type="submit">${T('Send code')}</button></form><form id="sms-verify" hidden><label>6-digit code<input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label><button class="btn-solid" type="submit">${T('Verify')}</button></form>`}<p id="sms-msg" class="cc-toast" role="status"></p></article>
      <article class="cc-card"><h3>Offline library</h3><p class="muted">Save a course on this device to read its lessons without internet. Remove it any time; it is cleared when you sign out.</p>${courses.length ? courses.map(c => `<p><b>${esc(c.title)}</b><br>${idx.includes(c.slug) ? `<button class="course-open" data-rm="${esc(c.slug)}">${T('Remove offline copy')}</button>` : `<button class="course-open" data-sv="${esc(c.slug)}">${T('Save for offline')}</button>`}</p>`).join('') : '<p class="muted">Enrol in a course to save it for offline study.</p>'}<p id="off-msg" class="cc-toast" role="status"></p></article>
      <article class="cc-card"><h3>${T('Data saver')}</h3><p class="muted">Turns off decorative animation and effects to use less data and battery.</p><label class="cc-check"><input type="checkbox" id="ds-toggle" ${saveData() ? 'checked' : ''}> ${T('Data saver')}</label><h3 style="margin-top:18px">${T('Language')}</h3><div class="cc-btns"><button class="course-open" id="lang-en" ${lang === 'en' ? 'disabled' : ''}>English</button><button class="course-open" id="lang-sw" ${lang === 'sw' ? 'disabled' : ''}>Kiswahili</button></div><p class="muted">Menus and the home page are translated. Course lessons are in English.</p></article></div>`); bindTabs();
    if (el('#sms-form')) { el('#sms-form').onsubmit = async e => { e.preventDefault(); try { await api('/reminders/phone', 'POST', { phone: new FormData(e.target).get('phone') }); el('#sms-verify').hidden = false; msg('#sms-msg', 'Code sent. Enter it below.'); } catch (x) { msg('#sms-msg', x.message, true); } }; el('#sms-verify').onsubmit = async e => { e.preventDefault(); try { await api('/reminders/verify', 'POST', { code: new FormData(e.target).get('code') }); settings(); } catch (x) { msg('#sms-msg', x.message, true); } }; }
    if (el('#sms-stop')) el('#sms-stop').onclick = async () => { await api('/reminders/stop', 'POST'); settings(); };
    document.querySelectorAll('[data-sv]').forEach(b => b.onclick = async () => { b.disabled = true; try { await saveCourseOffline(b.dataset.sv); settings(); } catch (e) { msg('#off-msg', e.message, true); b.disabled = false; } });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { removeCourseOffline(b.dataset.rm); settings(); });
    el('#ds-toggle').onchange = e => { LS.set('skillora.datasaver', e.target.checked ? '1' : '0'); applyDataSaver(); };
    el('#lang-en').onclick = () => setLang('en'); el('#lang-sw').onclick = () => setLang('sw');
  }

  // ================= M-Pesa checkout (replaces the placeholder buy handler) =================
  window.startMpesaCheckout = function (c, box) {
    box.innerHTML = `<form id="mp-form" class="cc-card"><p><b>Pay KSh ${esc(c.price_kes)} with M-Pesa</b></p><label>M-Pesa phone number<input name="phone" type="tel" inputmode="tel" placeholder="0712345678" autocomplete="tel" required></label><button class="btn-solid" type="submit">${T('Send M-Pesa request')}</button><p class="muted">You will get a prompt on your phone. Enter your M-Pesa PIN only on that prompt — never share it with anyone.</p><p id="mp-msg" role="status" aria-live="polite"></p></form>`;
    const say = (t, bad) => { const m = el('#mp-msg'); m.textContent = t; m.className = bad ? 'bad' : ''; };
    el('#mp-form').onsubmit = async e => {
      e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; say('Sending request…');
      try {
        const r = await api('/checkout', 'POST', { courseId: c.id, provider: 'mpesa', phone: new FormData(e.target).get('phone') });
        if (r.live_payments_enabled === false) { say(r.message || 'Live payments are not enabled yet. You were not charged.', true); btn.disabled = false; return; }
        say(r.message || 'Check your phone and enter your M-Pesa PIN.'); let tries = 0;
        const poll = setInterval(async () => { tries++; try { const s = await api('/payments/' + encodeURIComponent(r.ref) + '/status'); if (s.status === 'successful') { clearInterval(poll); say('Payment received. You are enrolled! Opening your course…'); setTimeout(() => course(c.slug), 1200); } else if (['failed', 'cancelled'].includes(s.status)) { clearInterval(poll); say(s.status === 'cancelled' ? 'The payment was cancelled. You were not charged. You can try again.' : 'The payment did not go through. You were not charged. You can try again.', true); btn.disabled = false; } else if (tries > 30) { clearInterval(poll); say('Still waiting. If money left your account, your access appears automatically within a few minutes. Reference: ' + r.ref); } } catch { } }, 4000);
      } catch (x) { say(x.message + (x.j && x.j.ref ? ' Reference: ' + x.j.ref : ''), true); btn.disabled = false; }
    };
  };

  // ================= Public results on the home page =================
  async function homeResults() {
    const strip = el('.stats-strip'); if (!strip || el('#results-section')) return;
    try {
      const r = await fetch('/api/results').then(x => x.json()); const o = r.verified_outcomes_total;
      const sec = document.createElement('section'); sec.className = 'results-section'; sec.id = 'results-section'; sec.setAttribute('aria-labelledby', 'results-h');
      sec.innerHTML = `<h2 id="results-h">${T('Our results, published honestly')}</h2><div class="cc-tiles"><div class="cc-tile"><b>${Number(r.learners).toLocaleString()}</b><span>${T('Learners')}</span></div><div class="cc-tile"><b>${Number(r.lessons_completed).toLocaleString()}</b><span>${T('Lessons completed')}</span></div><div class="cc-tile"><b>${Number(r.certificates_issued).toLocaleString()}</b><span>${T('Certificates issued')}</span></div>${r.completion_rate_percent !== null ? `<div class="cc-tile"><b>${r.completion_rate_percent}%</b><span>of enrolled learners completed a course</span></div>` : ''}</div><p class="muted">${o ? `${o} verified learner outcome${o === 1 ? '' : 's'}: ${Object.values(r.verified_outcomes).map(x => `${x.count} × ${esc(x.label.toLowerCase())}`).join(', ')}.` : 'We will publish verified learner outcomes here (first clients, interviews, jobs) as learners report them and our team checks them.'} ${esc(r.note)}</p>`;
      strip.insertAdjacentElement('afterend', sec); translate(sec);
    } catch { /* optional */ }
  }

  applyDataSaver(); startLanguage(); homeResults();
  window.header(); // re-run so the Learning Hub button and language switch appear
})();
