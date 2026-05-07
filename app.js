/* ============================================================
   AUREON — App Logic
   ============================================================ */

// ── State ─────────────────────────────────────────────────
const state = {
  // Flashcards
  flashCards: [],
  flashIndex: 0,
  flashCat: 'all',

  // Quiz
  quizActive: false,
  quizPool: [],
  quizCurrent: null,
  quizScore: 0,
  quizStreak: 0,
  quizTotal: 0,
  quizCat: 'all',
  quizAnswered: false,

  // Lexicon
  lexCat: 'all',

  // Progress: track seen words by aureon key
  seenWords: new Set(JSON.parse(localStorage.getItem('aureon_seen') || '[]')),
};

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('totalWords').textContent = LEXICON.length;
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  initFlashcards();
  renderLexicon();
  updateProgress();
  setupFilterBtns();
});

// ══════════════════════════════════════════════════════════
// FLASHCARDS
// ══════════════════════════════════════════════════════════
function initFlashcards(cat = 'all') {
  state.flashCat = cat;
  state.flashCards = cat === 'all'
    ? shuffle([...LEXICON])
    : shuffle(LEXICON.filter(w => w.pos === cat));
  state.flashIndex = 0;
  showCard();
}

function showCard() {
  const word = state.flashCards[state.flashIndex];
  if (!word) return;
  // Reset flip
  document.getElementById('cardInner').classList.remove('flipped');
  document.getElementById('cardAureon').textContent = word.aureon;
  document.getElementById('cardMeaning').textContent = word.meaning;
  document.getElementById('cardCat').textContent = word.pos;
  document.getElementById('cardCatBack').textContent = word.pos;
  document.getElementById('cardIndex').textContent = state.flashIndex + 1;
  document.getElementById('cardTotal').textContent = state.flashCards.length;
  // Mark as seen
  state.seenWords.add(word.aureon);
  saveProgress();
  updateProgress();
}

function flipCard() {
  document.getElementById('cardInner').classList.toggle('flipped');
}

function nextCard() {
  state.flashIndex = (state.flashIndex + 1) % state.flashCards.length;
  showCard();
}

function prevCard() {
  state.flashIndex = (state.flashIndex - 1 + state.flashCards.length) % state.flashCards.length;
  showCard();
}

function shuffleCards() {
  state.flashCards = shuffle([...state.flashCards]);
  state.flashIndex = 0;
  showCard();
}

function setupFilterBtns() {
  document.querySelectorAll('#flashcards .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#flashcards .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initFlashcards(btn.dataset.cat);
    });
  });
}

// ══════════════════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════════════════
function startQuiz() {
  state.quizCat = document.getElementById('quizCatSelect').value;
  const pool = state.quizCat === 'all' ? LEXICON : LEXICON.filter(w => w.pos === state.quizCat);
  if (pool.length < 4) { alert('Not enough words in this category for a quiz.'); return; }
  state.quizPool = shuffle([...pool]);
  state.quizScore = 0;
  state.quizStreak = 0;
  state.quizTotal = 0;
  state.quizAnswered = false;
  updateQuizHUD();
  document.getElementById('quizStartBtn').textContent = 'Restart Quiz';
  nextQuestion();
}

function nextQuestion() {
  if (state.quizPool.length === 0) {
    state.quizPool = shuffle([...LEXICON.filter(w => state.quizCat === 'all' || w.pos === state.quizCat)]);
  }
  state.quizCurrent = state.quizPool.pop();
  state.quizAnswered = false;

  document.getElementById('quizWord').textContent = state.quizCurrent.aureon;
  document.getElementById('quizPos').textContent = state.quizCurrent.pos;
  document.getElementById('quizFeedback').textContent = '';

  // Build wrong answers
  const others = shuffle(
    LEXICON.filter(w => w.aureon !== state.quizCurrent.aureon && w.meaning !== state.quizCurrent.meaning)
  ).slice(0, 3);
  const options = shuffle([state.quizCurrent, ...others]);

  const container = document.getElementById('quizOptions');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt.meaning;
    btn.onclick = () => handleAnswer(btn, opt.meaning === state.quizCurrent.meaning);
    container.appendChild(btn);
  });

  // Mark word as seen
  state.seenWords.add(state.quizCurrent.aureon);
  saveProgress();
  updateProgress();
}

function handleAnswer(btn, isCorrect) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;
  state.quizTotal++;

  // Disable all options & highlight
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.disabled = true;
    if (b.textContent === state.quizCurrent.meaning) b.classList.add('correct');
  });

  const feedback = document.getElementById('quizFeedback');
  if (isCorrect) {
    btn.classList.add('correct');
    state.quizScore++;
    state.quizStreak++;
    const streak = state.quizStreak;
    const msgs = ['Correct!', 'Excellent!', 'Voraen! (Bright!)', 'Solmerith! (Courage!)', 'Drenvithael! (Strong!)'];
    feedback.style.color = '#7dcc8a';
    feedback.textContent = streak >= 3 ? `🔥 ${streak} in a row! ${msgs[Math.min(streak-1,4)]}` : msgs[Math.min(streak-1,4)];
  } else {
    btn.classList.add('wrong');
    state.quizStreak = 0;
    feedback.style.color = '#cc7a6a';
    feedback.textContent = `The correct answer was: ${state.quizCurrent.meaning}`;
  }

  updateQuizHUD();
  setTimeout(nextQuestion, 1800);
}

function updateQuizHUD() {
  document.getElementById('quizScore').textContent = state.quizScore;
  document.getElementById('quizStreak').textContent = state.quizStreak;
  document.getElementById('quizTotal').textContent = state.quizTotal;
  const acc = state.quizTotal > 0 ? Math.round((state.quizScore / state.quizTotal) * 100) + '%' : '—';
  document.getElementById('quizAccuracy').textContent = acc;
}

// ══════════════════════════════════════════════════════════
// LEXICON
// optimized for 1000+ words
// ══════════════════════════════════════════════════════════

let lexCatActive = 'all';

const lexState = {
  filtered: [],
  rendered: 0,
  batchSize: 60,
  searchTimer: null
};

function setLexCat(el, cat) {
  lexCatActive = cat;
  document.querySelectorAll('.lex-filters .filter-btn')
    .forEach(b => b.classList.remove('active'));

  if (el) el.classList.add('active');

  rebuildLexicon();
}

function getLexFiltered() {
  const input = document.getElementById('lexiconSearch');
  const query = input ? input.value.toLowerCase().trim() : '';

  return LEXICON.filter(w => {
    const matchCat = lexCatActive === 'all' || w.pos === lexCatActive;
    const matchSearch =
      !query ||
      w.aureon.toLowerCase().includes(query) ||
      w.meaning.toLowerCase().includes(query);

    return matchCat && matchSearch;
  });
}

function rebuildLexicon() {
  const grid = document.getElementById('lexiconGrid');
  if (!grid) return;

  grid.innerHTML = '';

  lexState.filtered = getLexFiltered();
  lexState.rendered = 0;

  if (lexState.filtered.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--text-dim);font-style:italic;grid-column:1/-1;padding:2rem 0;">No words found.</p>';
    return;
  }

  renderNextLexBatch();
}

function renderNextLexBatch() {
  const grid = document.getElementById('lexiconGrid');
  if (!grid) return;

  if (lexState.rendered >= lexState.filtered.length) return;

  const end = Math.min(
    lexState.rendered + lexState.batchSize,
    lexState.filtered.length
  );

  const fragment = document.createDocumentFragment();

  for (let i = lexState.rendered; i < end; i++) {
    const word = lexState.filtered[i];

    const card = document.createElement('div');
    card.className = 'lex-card';

    if (!state.seenWords.has(word.aureon)) {
      card.style.opacity = '0.7';
    }

    card.innerHTML = `
      <span class="lex-pos">${word.pos}</span>
      <div class="lex-aureon">${word.aureon}</div>
      <div class="lex-meaning">${word.meaning}</div>
    `;

    fragment.appendChild(card);
  }

  grid.appendChild(fragment);
  lexState.rendered = end;
}

function handleLexScroll() {
  const nearBottom =
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 500;

  if (nearBottom) {
    renderNextLexBatch();
  }
}

function setupLexiconSearch() {
  const input = document.getElementById('lexiconSearch');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(lexState.searchTimer);

    lexState.searchTimer = setTimeout(() => {
      rebuildLexicon();
    }, 120);
  });
}

function renderLexicon() {
  setupLexiconSearch();
  rebuildLexicon();

  window.removeEventListener('scroll', handleLexScroll);
  window.addEventListener('scroll', handleLexScroll);
}

function filterLexicon() {
  rebuildLexicon();
}
// ══════════════════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════════════════
function updateProgress() {
  const total = LEXICON.length;
  const seen  = state.seenWords.size;
  const pct   = total > 0 ? Math.round((seen / total) * 100) : 0;

  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('progWords').textContent = `${seen} of ${total}`;

  // Ring
  const ring = document.getElementById('totalRing');
  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  ring.style.strokeDashoffset = offset;

  // Category bars
  const cats = ['Noun', 'Verb', 'Adjective', 'Number'];
  const container = document.getElementById('progressCats');
  container.innerHTML = '';

  cats.forEach(cat => {
    const catWords = LEXICON.filter(w => w.pos === cat);
    const catSeen  = catWords.filter(w => state.seenWords.has(w.aureon)).length;
    const catPct   = catWords.length > 0 ? Math.round((catSeen / catWords.length) * 100) : 0;

    const el = document.createElement('div');
    el.className = 'cat-bar-item';
    el.innerHTML = `
      <div class="cat-bar-label">
        <span>${cat}s</span>
        <span>${catSeen} / ${catWords.length}</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:0%"></div>
      </div>
    `;
    container.appendChild(el);
    // Animate fill
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.querySelector('.cat-bar-fill').style.width = catPct + '%';
      });
    });
  });
}

function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  state.seenWords.clear();
  saveProgress();
  updateProgress();
  filterLexicon();
}

function saveProgress() {
  localStorage.setItem('aureon_seen', JSON.stringify([...state.seenWords]));
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
