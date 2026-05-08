/* === AUREON APP === */
'use strict';

// State
const state = {
  currentPage: 'home',
  xp: parseInt(localStorage.getItem('aureon_xp') || '0'),
  learned: JSON.parse(localStorage.getItem('aureon_learned') || '[]'),
  favorites: JSON.parse(localStorage.getItem('aureon_favorites') || '[]'),
  streak: parseInt(localStorage.getItem('aureon_streak') || '0'),
  recent: JSON.parse(localStorage.getItem('aureon_recent') || '[]'),
  fc: { deck: [], index: 0, correct: 0, wrong: 0 },
  quiz: { questions: [], index: 0, score: 0, wrongList: [] },
};

const CATEGORY_ICONS = {
  Nature: '🌿', Time: '⏳', Animals: '🐺', People: '👤',
  Combat: '⚔️', Royalty: '👑', Places: '🏛️', Abstract: '✨',
  Emotions: '🌊', Materials: '💎', Body: '🫀', Food: '🍞',
  Objects: '📜', Numbers: '🔢', Colors: '🎨', Adjectives: '📖', Verbs: '⚡'
};

// Unique categories
const CATEGORIES = [...new Set(AUREON_LEXICON.map(w => w.category))].sort();

/* === INIT === */
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNav();
  initHome();
  initLexicon();
  initFlashcards();
  initQuiz();
  initTranslate();
  updateXPDisplay();
});

/* === PARTICLES === */
function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.3 - 0.05,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(196,164,100,${p.alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* === NAVIGATION === */
function initNav() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll(`.nav-btn[data-page="${page}"]`).forEach(b => b.classList.add('active'));
  state.currentPage = page;
  window.scrollTo(0, 0);
}

/* === HOME === */
function initHome() {
  // Stats
  document.getElementById('stat-total').textContent = AUREON_LEXICON.length;
  document.getElementById('stat-learned').textContent = state.learned.length;
  document.getElementById('stat-streak').textContent = state.streak;

  // Category grid
  const grid = document.getElementById('category-grid');
  CATEGORIES.forEach(cat => {
    const count = AUREON_LEXICON.filter(w => w.category === cat).length;
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.innerHTML = `
      <div class="cat-icon">${CATEGORY_ICONS[cat] || '📚'}</div>
      <div class="cat-name">${cat}</div>
      <div class="cat-count">${count} woorden</div>
    `;
    card.addEventListener('click', () => {
      navigateTo('lexicon');
      setTimeout(() => filterLexicon('', 'All', cat), 50);
    });
    grid.appendChild(card);
  });

  // Word of the day (seed by date)
  const dayIndex = Math.floor(Date.now() / 86400000) % AUREON_LEXICON.length;
  const wotd = AUREON_LEXICON[dayIndex];
  document.getElementById('wotd').innerHTML = `
    <div class="wotd-aureon">${wotd.aureon}</div>
    <div class="wotd-details">
      <div class="wotd-english">${wotd.english}</div>
      <div class="wotd-meta">
        <span>${wotd.pos}</span>
        <span>${wotd.category}</span>
      </div>
    </div>
  `;
}

/* === LEXICON === */
let lexPOS = 'All', lexCat = 'All', lexSearch = '';

function initLexicon() {
  // Category filters
  const catRow = document.getElementById('cat-filters');
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.dataset.cat = 'All';
  allBtn.textContent = 'Alle';
  allBtn.addEventListener('click', () => { lexCat = 'All'; updateCatFilter('All'); renderLexicon(); });
  catRow.appendChild(allBtn);

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.addEventListener('click', () => { lexCat = cat; updateCatFilter(cat); renderLexicon(); });
    catRow.appendChild(btn);
  });

  document.querySelectorAll('#pos-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lexPOS = btn.dataset.pos;
      document.querySelectorAll('#pos-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLexicon();
    });
  });

  document.getElementById('search-input').addEventListener('input', e => {
    lexSearch = e.target.value.toLowerCase();
    renderLexicon();
  });

  renderLexicon();
}

function updateCatFilter(active) {
  document.querySelectorAll('#cat-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === active);
  });
}

function filterLexicon(search, pos, cat) {
  lexSearch = search;
  lexPOS = pos;
  lexCat = cat;
  document.getElementById('search-input').value = search;
  document.querySelectorAll('#pos-filters .filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.pos === pos));
  updateCatFilter(cat);
  renderLexicon();
}

function renderLexicon() {
  const tbody = document.getElementById('lexicon-body');
  let words = AUREON_LEXICON.filter(w => {
    if (lexPOS !== 'All' && w.pos !== lexPOS) return false;
    if (lexCat !== 'All' && w.category !== lexCat) return false;
    if (lexSearch && !w.aureon.toLowerCase().includes(lexSearch) && !w.english.toLowerCase().includes(lexSearch)) return false;
    return true;
  });

  tbody.innerHTML = words.map(w => {
    const posClass = 'pos-' + w.pos.toLowerCase().replace(' ', '');
    const isFav = state.favorites.includes(w.aureon);
    return `<tr>
      <td class="td-aureon">${w.aureon}</td>
      <td class="td-english">${w.english}</td>
      <td class="td-pos"><span class="pos-badge ${posClass}">${w.pos}</span></td>
      <td class="td-cat">${w.category}</td>
      <td><button class="btn-fav ${isFav ? 'faved' : ''}" data-word="${w.aureon}">${isFav ? '★' : '☆'}</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-fav').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.word, btn));
  });
}

function toggleFavorite(word, btn) {
  const idx = state.favorites.indexOf(word);
  if (idx === -1) { state.favorites.push(word); btn.textContent = '★'; btn.classList.add('faved'); showToast('Toegevoegd aan favorieten'); }
  else { state.favorites.splice(idx, 1); btn.textContent = '☆'; btn.classList.remove('faved'); }
  localStorage.setItem('aureon_favorites', JSON.stringify(state.favorites));
}

/* === FLASHCARDS === */
function initFlashcards() {
  // Populate category select
  const sel = document.getElementById('fc-category');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });

  document.getElementById('fc-shuffle').addEventListener('click', buildFCDeck);
  document.getElementById('fc-category').addEventListener('change', buildFCDeck);
  document.getElementById('fc-direction').addEventListener('change', buildFCDeck);
  document.getElementById('flashcard').addEventListener('click', flipCard);
  document.getElementById('fc-prev').addEventListener('click', () => fcMove(-1));
  document.getElementById('fc-next').addEventListener('click', () => { fcMove(1); unflipCard(); });
  document.getElementById('fc-correct').addEventListener('click', () => fcMark(true));
  document.getElementById('fc-wrong').addEventListener('click', () => fcMark(false));

  buildFCDeck();
}

function buildFCDeck() {
  const cat = document.getElementById('fc-category').value;
  let words = cat === 'All' ? [...AUREON_LEXICON] : AUREON_LEXICON.filter(w => w.category === cat);
  words = shuffle(words);
  state.fc.deck = words;
  state.fc.index = 0;
  state.fc.correct = 0;
  state.fc.wrong = 0;
  updateFC();
  unflipCard();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateFC() {
  const { deck, index, correct, wrong } = state.fc;
  if (!deck.length) return;
  const w = deck[index];
  const dir = document.getElementById('fc-direction').value;

  document.getElementById('fc-current').textContent = index + 1;
  document.getElementById('fc-total').textContent = deck.length;
  document.getElementById('fc-progress-fill').style.width = ((index + 1) / deck.length * 100) + '%';
  document.getElementById('fc-s-correct').textContent = correct;
  document.getElementById('fc-s-wrong').textContent = wrong;

  if (dir === 'ae') {
    document.getElementById('fc-front-label').textContent = 'Aureon';
    document.getElementById('fc-front-word').textContent = w.aureon;
    document.getElementById('fc-back-label').textContent = 'Engels';
    document.getElementById('fc-back-word').textContent = w.english;
  } else {
    document.getElementById('fc-front-label').textContent = 'Engels';
    document.getElementById('fc-front-word').textContent = w.english;
    document.getElementById('fc-back-label').textContent = 'Aureon';
    document.getElementById('fc-back-word').textContent = w.aureon;
  }
  document.getElementById('fc-back-pos').textContent = w.pos;
  document.getElementById('fc-back-cat').textContent = w.category;
}

function flipCard() { document.getElementById('flashcard').classList.toggle('flipped'); }
function unflipCard() { document.getElementById('flashcard').classList.remove('flipped'); }

function fcMove(dir) {
  const { deck } = state.fc;
  state.fc.index = Math.max(0, Math.min(deck.length - 1, state.fc.index + dir));
  updateFC();
  unflipCard();
}

function fcMark(correct) {
  if (correct) {
    state.fc.correct++;
    addXP(5);
    const w = state.fc.deck[state.fc.index];
    if (!state.learned.includes(w.aureon)) {
      state.learned.push(w.aureon);
      localStorage.setItem('aureon_learned', JSON.stringify(state.learned));
      document.getElementById('stat-learned').textContent = state.learned.length;
    }
    showToast('+5 XP ✦');
  } else {
    state.fc.wrong++;
  }
  if (state.fc.index < state.fc.deck.length - 1) {
    fcMove(1);
  } else {
    showToast(`Klaar! ${state.fc.correct}/${state.fc.deck.length} goed`);
  }
}

/* === QUIZ === */
function initQuiz() {
  const sel = document.getElementById('quiz-category');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });

  document.getElementById('quiz-start').addEventListener('click', startQuiz);
  document.getElementById('quiz-retry').addEventListener('click', startQuiz);
  document.getElementById('quiz-back').addEventListener('click', () => {
    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-setup').style.display = 'block';
  });
}

function startQuiz() {
  const cat = document.getElementById('quiz-category').value;
  const dir = document.getElementById('quiz-direction').value;
  const countVal = document.getElementById('quiz-count').value;

  let pool = cat === 'All' ? [...AUREON_LEXICON] : AUREON_LEXICON.filter(w => w.category === cat);
  pool = shuffle(pool);

  const count = countVal === 'all' ? pool.length : Math.min(parseInt(countVal), pool.length);
  const questions = pool.slice(0, count).map(w => {
    const useDir = dir === 'random' ? (Math.random() > 0.5 ? 'ae' : 'ea') : dir;
    const question = useDir === 'ae' ? w.aureon : w.english;
    const answer = useDir === 'ae' ? w.english : w.aureon;
    // Wrong options from same pool
    const wrongPool = pool.filter(x => x !== w);
    const wrongs = shuffle(wrongPool).slice(0, 3).map(x => useDir === 'ae' ? x.english : x.aureon);
    const options = shuffle([answer, ...wrongs]);
    return { question, answer, options, dir: useDir, word: w };
  });

  state.quiz = { questions, index: 0, score: 0, wrongList: [] };

  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-active').style.display = 'block';
  document.getElementById('q-total').textContent = questions.length;
  renderQuestion();
}

function renderQuestion() {
  const { questions, index, score } = state.quiz;
  const q = questions[index];

  document.getElementById('q-current').textContent = index + 1;
  document.getElementById('q-score').textContent = score;
  document.getElementById('q-progress-fill').style.width = ((index + 1) / questions.length * 100) + '%';
  document.getElementById('q-dir-label').textContent =
    q.dir === 'ae' ? 'Wat is de Engelse betekenis van:' : 'Welk Aureon woord betekent:';
  document.getElementById('q-word').textContent = q.question;

  const optionsEl = document.getElementById('quiz-options');
  optionsEl.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => answerQuestion(opt, btn));
    optionsEl.appendChild(btn);
  });
}

function answerQuestion(chosen, btn) {
  const { questions, index } = state.quiz;
  const q = questions[index];
  const allBtns = document.querySelectorAll('.quiz-option');
  allBtns.forEach(b => {
    b.disabled = true;
    if (b.textContent === q.answer) b.classList.add('correct');
  });

  if (chosen === q.answer) {
    btn.classList.add('correct');
    state.quiz.score++;
    addXP(10);
  } else {
    btn.classList.add('wrong');
    state.quiz.wrongList.push(q);
  }

  setTimeout(() => {
    if (state.quiz.index < questions.length - 1) {
      state.quiz.index++;
      renderQuestion();
    } else {
      showQuizResult();
    }
  }, 900);
}

function showQuizResult() {
  const { questions, score, wrongList } = state.quiz;
  const total = questions.length;
  const pct = Math.round(score / total * 100);

  document.getElementById('quiz-active').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'block';

  let icon = pct >= 90 ? '🏆' : pct >= 70 ? '⚔️' : pct >= 50 ? '📜' : '💀';
  let msg = pct >= 90 ? 'Uitstekend! Je beheerst Aureon als een oude meester.' :
            pct >= 70 ? 'Goed gedaan! De taal van het rijk onthult zich voor jou.' :
            pct >= 50 ? 'Halverwege het pad. Blijf oefenen, leerling.' :
            'De oude taal is nog niet veroverd. Probeer het opnieuw.';

  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = pct >= 80 ? 'Schitterend!' : pct >= 50 ? 'Voortgang!' : 'Blijf oefenen';
  document.getElementById('result-score-big').textContent = `${score}/${total}`;
  document.getElementById('result-pct').textContent = pct + '%';
  document.getElementById('result-msg').textContent = msg;

  const wrongList = document.getElementById('result-wrong-list');
  if (state.quiz.wrongList.length) {
    wrongList.style.display = 'block';
    wrongList.innerHTML = '<div style="font-family:var(--font-heading);font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold-dim);margin-bottom:0.5rem;">Foute antwoorden</div>' +
      state.quiz.wrongList.map(q =>
        `<div class="wrong-item"><span class="ww">${q.question}</span> → <span class="wr">${q.answer}</span></div>`
      ).join('');
  } else {
    wrongList.style.display = 'none';
  }

  document.getElementById('quiz-retry').onclick = startQuiz;
}

/* === TRANSLATE === */
function initTranslate() {
  document.getElementById('en-input').addEventListener('input', e => {
    searchTranslate(e.target.value, 'en');
  });
  document.getElementById('ae-input').addEventListener('input', e => {
    searchTranslate(e.target.value, 'ae');
  });
  renderRecent();
}

function searchTranslate(query, dir) {
  const q = query.toLowerCase().trim();
  const resultsEl = document.getElementById(dir === 'en' ? 'en-results' : 'ae-results');

  if (!q) { resultsEl.innerHTML = ''; return; }

  const results = AUREON_LEXICON.filter(w => {
    if (dir === 'en') return w.english.toLowerCase().includes(q);
    return w.aureon.toLowerCase().includes(q);
  }).slice(0, 8);

  resultsEl.innerHTML = results.map(w => `
    <div class="translate-result-item">
      <div>
        <span class="tri-word">${w.aureon}</span>
        <span class="tri-eng"> — ${w.english}</span>
      </div>
      <span class="tri-meta">${w.pos} · ${w.category}</span>
    </div>
  `).join('');

  if (results.length && q.length >= 2) {
    addRecent(q);
  }
}

function addRecent(word) {
  state.recent = [word, ...state.recent.filter(w => w !== word)].slice(0, 10);
  localStorage.setItem('aureon_recent', JSON.stringify(state.recent));
  renderRecent();
}

function renderRecent() {
  const el = document.getElementById('recent-words');
  el.innerHTML = state.recent.map(w =>
    `<span class="recent-tag" data-word="${w}">${w}</span>`
  ).join('');
  el.querySelectorAll('.recent-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.getElementById('en-input').value = tag.dataset.word;
      searchTranslate(tag.dataset.word, 'en');
    });
  });
}

/* === XP & UTILS === */
function addXP(amount) {
  state.xp += amount;
  localStorage.setItem('aureon_xp', state.xp);
  updateXPDisplay();
}

function updateXPDisplay() {
  document.getElementById('xp-display').textContent = state.xp + ' XP';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
