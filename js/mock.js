// NEETO — Mock Test Logic (split-file version)

let mockQuestions = [];
let userAnswers   = {};
let timerInterval = null;
let timeLeft      = 200 * 60;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanNcert(q) {
  if (!q.ncert_ref || q.ncert_ref === 'undefined') return '';
  if (!q.ncert_line || !q.ncert_line.trim() || q.ncert_line.includes('To be added')) {
    return `<div class="ncert-line">📖 ${q.ncert_ref}</div>`;
  }
  return `<div class="ncert-line">📖 ${q.ncert_ref}<br/><em>${q.ncert_line.substring(0,200)}...</em></div>`;
}

async function loadSubjectFile(subject) {
  const res  = await fetch(`data/api_${subject.toLowerCase()}.json`);
  const data = await res.json();
  return data.questions || [];
}

async function startMock() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('test-screen').style.display  = 'block';
  document.getElementById('mock-questions').innerHTML =
    '<div style="text-align:center;padding:80px;color:#7c6af7;font-size:1.2rem;">⏳ Building your test paper...</div>';

  let physics = [], chemistry = [], biology = [];
  try {
    [biology, chemistry, physics] = await Promise.all([
      loadSubjectFile('Biology'),
      loadSubjectFile('Chemistry'),
      loadSubjectFile('Physics')
    ]);
  } catch(e) {
    document.getElementById('mock-questions').innerHTML =
      '<div style="text-align:center;padding:60px;color:#e05555;">⚠️ Could not load questions. Please refresh.</div>';
    return;
  }

  const clean = q => !q.diagram_required;
  const pSel  = shuffle(physics.filter(clean)).slice(0, 50);
  const cSel  = shuffle(chemistry.filter(clean)).slice(0, 50);
  const bSel  = shuffle(biology.filter(clean)).slice(0, 100);

  mockQuestions = [...pSel, ...cSel, ...bSel].map((q, i) => ({
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

  // Render in chunks to avoid UI freeze
  const CHUNK = 50;
  let idx = 0;

  function renderChunk() {
    const frag = document.createDocumentFragment();
    const end  = Math.min(idx + CHUNK, mockQuestions.length);
    for (let i = idx; i < end; i++) {
      const q       = mockQuestions[i];
      const secLabel= i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology';
      const div     = document.createElement('div');
      div.className = 'q-card';
      div.id        = `mq-${i}`;
      div.style.scrollMarginTop = '120px';
      div.innerHTML = `
        <div class="q-meta">
          <span class="tag tag-subject">${secLabel}</span>
          <span class="tag tag-diff">Q${q.num}</span>
          <span class="tag tag-pattern">Section ${q.section}</span>
        </div>
        <div class="q-text">${q.question}</div>
        <div class="options" data-index="${i}">
          ${['A','B','C','D'].map(k => `
            <button class="option mock-opt" data-key="${k}" data-index="${i}"
              onclick="selectAnswer(${i},'${k}')">${k}. ${q.options[k] || ''}</button>
          `).join('')}
        </div>`;
      frag.appendChild(div);
    }
    container.appendChild(frag);
    idx = end;
    if (idx < mockQuestions.length) requestAnimationFrame(renderChunk);
  }

  renderChunk();
}

function selectAnswer(idx, key) {
  userAnswers[idx] = key;
  const opts = document.querySelectorAll(`[data-index="${idx}"].mock-opt`);
  opts.forEach(b => {
    const sel = b.dataset.key === key;
    b.style.borderColor = sel ? '#7c6af7' : '';
    b.style.color       = sel ? '#fff'    : '';
    b.style.background  = sel ? '#2a1a4a' : '';
  });
  const pBtn = document.getElementById(`pb-${idx}`);
  if (pBtn) pBtn.classList.add('answered');
}

function buildPalette() {
  const grid = document.getElementById('palette');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  mockQuestions.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.className = 'p-btn';
    btn.id        = `pb-${i}`;
    btn.textContent = q.num;
    btn.onclick   = () => document.getElementById(`mq-${i}`)?.scrollIntoView({ behavior: 'smooth' });
    frag.appendChild(btn);
  });
  grid.appendChild(frag);
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
  const subj  = { Physics:{c:0,w:0,s:0}, Chemistry:{c:0,w:0,s:0}, Biology:{c:0,w:0,s:0} };
  const wrongQs = [];

  mockQuestions.forEach((q, i) => {
    const s   = i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology';
    const ans = userAnswers[i];
    if (!ans)                     { skip++;  subj[s].s++; }
    else if (ans === q.correct_answer) { score += 4; correct++; subj[s].c++; }
    else                          { score -= 1; wrong++;  subj[s].w++; wrongQs.push({q, chosen: ans}); }
  });

  document.getElementById('result-score').textContent = score;
  document.getElementById('r-correct').textContent    = correct;
  document.getElementById('r-wrong').textContent      = wrong;
  document.getElementById('r-skip').textContent       = skip;
  document.getElementById('r-accuracy').textContent   = correct + wrong > 0
    ? Math.round(correct / (correct + wrong) * 100) + '%' : '0%';

  document.getElementById('subject-breakdown').innerHTML =
    ['Physics','Chemistry','Biology'].map(s => `
      <div class="result-box">
        <div class="num" style="color:#7c6af7">${subj[s].c * 4 - subj[s].w}</div>
        <div class="lbl">${s}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">✅${subj[s].c} ❌${subj[s].w} ⬜${subj[s].s}</div>
      </div>`).join('');

  const rc = document.getElementById('review-container');
  rc.innerHTML = wrongQs.length === 0
    ? '<p style="color:#6abf6a">All attempted correct! 🎉</p>'
    : wrongQs.map(({q, chosen}) => `
      <div class="q-card">
        <div class="q-text">${q.question}</div>
        <div class="options">
          ${['A','B','C','D'].map(k => `
            <div class="option ${k===q.correct_answer?'correct':k===chosen?'wrong':''}" style="cursor:default">
              ${k}. ${q.options[k]||''}
            </div>`).join('')}
        </div>
        ${cleanNcert(q)}
      </div>`).join('');
}
