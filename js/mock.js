// NEETO — Mock Test Logic

let mockQuestions = [];
let userAnswers   = {};
let timerInterval = null;
let timeLeft      = 200 * 60; // 200 minutes in seconds

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function startMock() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('test-screen').style.display  = 'block';

  const qs = await loadQuestions();
  const clean = qs.filter(q => !q.diagram_required);

  const physics   = shuffle(clean.filter(q => q.subject === 'Physics')).slice(0, 50);
  const chemistry = shuffle(clean.filter(q => q.subject === 'Chemistry')).slice(0, 50);
  const biology   = shuffle(clean.filter(q => q.subject === 'Biology')).slice(0, 100);

  mockQuestions = [...physics, ...chemistry, ...biology].map((q, i) => ({
    ...q,
    num:     i + 1,
    section: (i % 50) < 35 ? 'A' : 'B'
  }));

  renderMockQuestions();
  buildPalette();
  startTimer();
}

function renderMockQuestions() {
  const container = document.getElementById('mock-questions');
  container.innerHTML = '';

  mockQuestions.forEach((q, i) => {
    const secLabel = i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology';
    container.innerHTML += `
    <div class="q-card" id="mq-${i}" style="scroll-margin-top:120px;">
      <div class="q-meta">
        <span class="tag tag-subject">${secLabel}</span>
        <span class="tag tag-diff">Q${q.num}</span>
        <span class="tag tag-pattern">Section ${q.section}</span>
      </div>
      <div class="q-text">${q.question}</div>
      <div class="options" data-index="${i}">
        ${['A','B','C','D'].map(k => `
          <button class="option mock-opt" data-key="${k}" data-index="${i}" onclick="selectAnswer(${i},'${k}')">${k}. ${q.options[k] || ''}</button>
        `).join('')}
      </div>
    </div>`;
  });
}

function selectAnswer(idx, key) {
  userAnswers[idx] = key;

  // Update option styles
  const opts = document.querySelectorAll(`[data-index="${idx}"].mock-opt`);
  opts.forEach(b => {
    b.style.borderColor = b.dataset.key === key ? '#7c6af7' : '';
    b.style.color       = b.dataset.key === key ? '#fff'    : '';
    b.style.background  = b.dataset.key === key ? '#2a1a4a' : '';
  });

  // Update palette
  const pBtn = document.getElementById(`pb-${idx}`);
  if (pBtn) pBtn.classList.add('answered');
}

function buildPalette() {
  const grid = document.getElementById('palette');
  grid.innerHTML = '';
  mockQuestions.forEach((q, i) => {
    grid.innerHTML += `<button class="p-btn" id="pb-${i}" onclick="scrollToQ(${i})">${q.num}</button>`;
  });
}

function scrollToQ(idx) {
  document.getElementById(`mq-${idx}`).scrollIntoView({ behavior: 'smooth' });
}

function startTimer() {
  const timerEl = document.getElementById('timer');
  timerInterval = setInterval(() => {
    timeLeft--;
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    timerEl.textContent = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (timeLeft <= 600) timerEl.className = 'timer warning';
    if (timeLeft <= 0)   { clearInterval(timerInterval); submitMock(); }
  }, 1000);
}

function submitMock() {
  clearInterval(timerInterval);
  document.getElementById('test-screen').style.display   = 'none';
  document.getElementById('result-screen').style.display = 'block';

  let score = 0, correct = 0, wrong = 0, skip = 0;
  const subj = { Physics: {c:0,w:0,s:0}, Chemistry: {c:0,w:0,s:0}, Biology: {c:0,w:0,s:0} };
  const wrongQs = [];

  mockQuestions.forEach((q, i) => {
    const s = i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology';
    const ans = userAnswers[i];
    if (!ans) {
      skip++; subj[s].s++;
    } else if (ans === q.correct_answer) {
      score += 4; correct++; subj[s].c++;
    } else {
      score -= 1; wrong++; subj[s].w++;
      wrongQs.push({ q, chosen: ans, idx: i });
    }
  });

  document.getElementById('result-score').textContent    = score;
  document.getElementById('r-correct').textContent       = correct;
  document.getElementById('r-wrong').textContent         = wrong;
  document.getElementById('r-skip').textContent          = skip;
  document.getElementById('r-accuracy').textContent      = correct + wrong > 0
    ? Math.round(correct / (correct + wrong) * 100) + '%' : '0%';

  // Subject breakdown
  const bd = document.getElementById('subject-breakdown');
  bd.innerHTML = ['Physics','Chemistry','Biology'].map(s => `
    <div class="result-box">
      <div class="num" style="color:#7c6af7">${subj[s].c * 4 - subj[s].w}</div>
      <div class="lbl">${s}</div>
      <div style="font-size:11px; color:#666; margin-top:4px;">✅${subj[s].c} ❌${subj[s].w} ⬜${subj[s].s}</div>
    </div>`).join('');

  // Review wrong answers
  const rc = document.getElementById('review-container');
  rc.innerHTML = wrongQs.length === 0 ? '<p style="color:#6abf6a">Perfect score on attempted questions! 🎉</p>' :
    wrongQs.map(({q, chosen}) => `
    <div class="q-card">
      <div class="q-text">${q.question}</div>
      <div class="options">
        ${['A','B','C','D'].map(k => `
          <div class="option ${k === q.correct_answer ? 'correct' : k === chosen ? 'wrong' : ''}"
               style="cursor:default">
            ${k}. ${q.options[k] || ''}
          </div>`).join('')}
      </div>
      ${q.ncert_line ? `<div class="explanation visible" style="display:block">
        📖 ${q.ncert_ref}<br/><em>${q.ncert_line.substring(0,200)}...</em>
      </div>` : ''}
    </div>`).join('');
}
