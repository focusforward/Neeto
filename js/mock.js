// NEETO — mock.js

let mockQuestions = [];
let userAnswers   = {};   // idx → chosen key
let timerInterval = null;
let timeLeft      = 200 * 60;
let testSubmitted  = false;

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
  const line = q.ncert_line && !q.ncert_line.includes('To be added') && q.ncert_line.trim()
    ? `<br/><em>${q.ncert_line.substring(0,200)}...</em>` : '';
  return `<div style="margin-top:0.6rem;font-size:0.8rem;color:#6B5C45;">📖 ${q.ncert_ref}${line}</div>`;
}

async function loadSubjectFile(subject) {
  const res  = await fetch(`data/api_${subject.toLowerCase()}.json`);
  const data = await res.json();
  return data.questions || [];
}

// ── START TEST ────────────────────────────────────────────────────────
async function startMock() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('test-screen').style.display  = 'block';
  document.getElementById('mock-questions').innerHTML =
    '<div style="text-align:center;padding:80px;color:#FF6B1A;font-size:1.2rem;">⏳ Building your test paper...</div>';

  try {
    const [bio, chem, phys] = await Promise.all([
      loadSubjectFile('Biology'), loadSubjectFile('Chemistry'), loadSubjectFile('Physics')
    ]);
    const clean = q => !q.diagram_required;
    const pSel  = shuffle(phys.filter(clean)).slice(0, 50);
    const cSel  = shuffle(chem.filter(clean)).slice(0, 50);
    const bSel  = shuffle(bio.filter(clean)).slice(0, 100);
    mockQuestions = [...pSel, ...cSel, ...bSel].map((q, i) => ({
      ...q, _num: i + 1,
      _section: (i < 35 || (i >= 50 && i < 85) || (i >= 100 && i < 170)) ? 'A' : 'B'
    }));
  } catch(e) {
    document.getElementById('mock-questions').innerHTML =
      '<div style="text-align:center;padding:60px;color:#EF4444;">⚠️ Could not load. Please refresh.</div>';
    return;
  }

  renderMockQuestions();
  buildPalette();
  startTimer();
}

// ── RENDER QUESTIONS ──────────────────────────────────────────────────
function renderMockQuestions() {
  const container = document.getElementById('mock-questions');
  container.innerHTML = '';

  const sections = [
    { label: 'Physics', start: 0,   end: 50  },
    { label: 'Chemistry', start: 50,  end: 100 },
    { label: 'Biology',  start: 100, end: 200 },
  ];

  const CHUNK = 40;
  let idx = 0;
  function renderChunk() {
    const frag = document.createDocumentFragment();

    // Section header if needed
    for (const sec of sections) {
      if (idx === sec.start) {
        const hdr = document.createElement('div');
        hdr.style.cssText = 'font-family:Fraunces,serif;font-size:1.2rem;font-weight:900;color:#1A1208;padding:1rem 0 0.5rem;letter-spacing:-0.01em;border-bottom:1.5px solid #F0E8DE;margin-bottom:1rem;';
        hdr.textContent = sec.label;
        frag.appendChild(hdr);
      }
    }

    const end = Math.min(idx + CHUNK, mockQuestions.length);
    for (let i = idx; i < end; i++) {
      const q   = mockQuestions[i];
      const div = document.createElement('div');
      div.className = 'question-card q-card';
      div.id        = `qc-${i}`;
      div.style.cssText = 'background:#fff;border:1.5px solid #F0E8DE;border-radius:18px;padding:1.6rem 1.8rem;margin-bottom:1.2rem;scroll-margin-top:130px;';

      div.innerHTML = `
        <div class="q-meta" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.9rem;">
          <span style="font-size:0.72rem;font-weight:700;padding:0.25rem 0.7rem;border-radius:100px;background:#F0E8DE;color:#6B5C45;text-transform:uppercase;letter-spacing:0.04em;">Q${q._num}</span>
          <span style="font-size:0.72rem;font-weight:700;padding:0.25rem 0.7rem;border-radius:100px;background:#FFF0E6;color:#E85500;">Sec ${q._section}</span>
        </div>
        <div class="q-text" style="font-size:0.97rem;line-height:1.7;color:#1A1208;margin-bottom:1rem;">${q.question}</div>
        <div class="q-options options" id="opts-${i}">
          ${['A','B','C','D'].map(k => `
            <button class="q-option option" data-key="${k}" data-index="${i}"
              style="background:#fff;border:1.5px solid #F0E8DE;color:#1A1208;border-radius:10px;padding:0.65rem 1rem;width:100%;text-align:left;font-size:0.9rem;cursor:pointer;font-family:inherit;display:block;margin-bottom:0.5rem;transition:all 0.15s;"
              onclick="mockSelectAnswer(${i},'${k}')"
              onmouseover="if(!window.testSubmitted && window.userAnswers[${i}]!=='${k}'){this.style.borderColor='#FF6B1A';this.style.background='#FFF0E6';this.style.color='#E85500';}"
              onmouseout="if(!window.testSubmitted && window.userAnswers[${i}]!=='${k}'){this.style.borderColor='#F0E8DE';this.style.background='#fff';this.style.color='#1A1208';}"
            ><span style="font-weight:700;color:#FF6B1A;margin-right:0.4rem;">${k}</span> ${q.options[k] || ''}</button>
          `).join('')}
        </div>
        <div id="exp-${i}" style="display:none;margin-top:1rem;background:#FFF7F0;border:1px solid rgba(255,107,26,0.2);border-radius:12px;padding:1rem 1.2rem;font-size:0.875rem;line-height:1.6;color:#1A1208;"></div>`;

      frag.appendChild(div);
    }
    container.appendChild(frag);
    idx = end;
    if (idx < mockQuestions.length) requestAnimationFrame(renderChunk);
  }
  renderChunk();
}

// ── SELECT ANSWER (during test) ───────────────────────────────────────
function mockSelectAnswer(idx, key) {
  if (testSubmitted) return;
  key = String(key).toUpperCase();
  const prev = userAnswers[idx];
  userAnswers[idx] = key;

  document.querySelectorAll(`#opts-${idx} .option`).forEach(btn => {
    const k = btn.dataset.key;
    btn.style.background  = k === key ? '#FFF0E6' : '#ffffff';
    btn.style.borderColor = k === key ? '#FF6B1A' : '#F0E8DE';
    btn.style.color       = k === key ? '#E85500' : '#1A1208';
    btn.style.fontWeight  = k === key ? '600'    : '400';
    btn.style.opacity     = k === key ? '1'      : '0.7';
  });

  // Update palette
  updatePaletteBtn(idx, 'answered');
}

// ── PALETTE ───────────────────────────────────────────────────────────
function buildPalette() {
  const grid = document.getElementById('palette');
  if (!grid) return;
  grid.innerHTML = '';
  mockQuestions.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.className = 'pal-btn';
    btn.id        = `pb-${i}`;
    btn.textContent = q._num;
    btn.style.cssText = 'aspect-ratio:1;border-radius:8px;border:1.5px solid #F0E8DE;background:#fff;font-size:0.72rem;font-weight:600;color:#6B5C45;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all 0.15s;';
    btn.onclick = () => jumpToQuestion(i);
    grid.appendChild(btn);
  });
}

function updatePaletteBtn(idx, state) {
  const btn = document.getElementById(`pb-${idx}`);
  if (!btn) return;
  if (state === 'answered') {
    btn.style.background = '#DCFCE7';
    btn.style.borderColor = '#22C55E';
    btn.style.color = '#15803D';
  } else if (state === 'correct') {
    btn.style.background = '#DCFCE7';
    btn.style.borderColor = '#22C55E';
    btn.style.color = '#15803D';
  } else if (state === 'wrong') {
    btn.style.background = '#FEE2E2';
    btn.style.borderColor = '#EF4444';
    btn.style.color = '#B91C1C';
  } else {
    btn.style.background = '#F3F4F6';
    btn.style.borderColor = '#D1D5DB';
    btn.style.color = '#6B7280';
  }
}

function jumpToQuestion(idx) {
  const card = document.getElementById(`qc-${idx}`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Flash orange outline
  card.style.outline = '3px solid #FF6B1A';
  card.style.outlineOffset = '2px';
  setTimeout(() => { card.style.outline = ''; }, 1000);
}

// ── TIMER ─────────────────────────────────────────────────────────────
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

// ── SUBMIT ────────────────────────────────────────────────────────────
function submitMock() {
  clearInterval(timerInterval);
  testSubmitted = true;

  // Colour all questions
  mockQuestions.forEach((q, i) => {
    const chosen  = userAnswers[i] || null;
    const correct = q.correct_answer;

    document.querySelectorAll(`#opts-${i} .option`).forEach(btn => {
      const k = btn.dataset.key;
      btn.style.pointerEvents = 'none';
      btn.style.cursor        = 'default';
      btn.style.transition    = 'all 0.18s';
      btn.style.opacity       = '1';

      if (k === correct) {
        btn.style.background = '#F0FDF4';
        btn.style.borderColor = '#22C55E';
        btn.style.color      = '#15803D';
        btn.style.fontWeight = '600';
      } else if (chosen && k === chosen) {
        btn.style.background = '#FEF2F2';
        btn.style.borderColor = '#EF4444';
        btn.style.color      = '#B91C1C';
      } else {
        btn.style.background = '#ffffff';
        btn.style.borderColor = '#F0E8DE';
        btn.style.color      = '#1A1208';
        btn.style.opacity    = '0.35';
      }
    });

    // Show explanation
    const exp = document.getElementById(`exp-${i}`);
    if (exp) {
      exp.style.display = 'block';
      exp.innerHTML = `<strong style="color:#E85500;">✅ Correct: ${correct}</strong>${chosen && chosen !== correct ? `&nbsp;&nbsp;<span style="color:#B91C1C;">❌ You chose: ${chosen}</span>` : ''}<br/>${q.explanation || ''}${cleanNcert(q)}`;
    }

    // Palette colour
    if (!chosen)                  updatePaletteBtn(i, 'skip');
    else if (chosen === correct)  updatePaletteBtn(i, 'correct');
    else                          updatePaletteBtn(i, 'wrong');
  });

  // Calculate results
  let score = 0, correct = 0, wrong = 0, skip = 0;
  const subj = { Physics:{c:0,w:0,s:0}, Chemistry:{c:0,w:0,s:0}, Biology:{c:0,w:0,s:0} };
  mockQuestions.forEach((q, i) => {
    const s   = i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology';
    const ans = userAnswers[i];
    if (!ans)                     { skip++;  subj[s].s++; }
    else if (ans === q.correct_answer) { score += 4; correct++; subj[s].c++; }
    else                          { score -= 1; wrong++;  subj[s].w++; }
  });

  // ── SAVE SESSION TO ANALYTICS ──
  const sessionRecord = {
    type:      'mock',
    date:      new Date().toISOString().split('T')[0],
    score,
    maxScore:  800,
    correct,
    wrong,
    skip,
    accuracy:  correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 0,
    physics:   subj.Physics.c   * 4 - subj.Physics.w,
    chemistry: subj.Chemistry.c * 4 - subj.Chemistry.w,
    biology:   subj.Biology.c   * 4 - subj.Biology.w,
    attempts:  mockQuestions.map((q, i) => ({
      questionId:   q.id || q.question_id || `mock_${i}`,
      subject:      i < 50 ? 'Physics' : i < 100 ? 'Chemistry' : 'Biology',
      chapter:      q.unit_code || '',
      chapterName:  q.unit_code || '',
      difficulty:   q.difficulty || 'L1',
      userAnswer:   userAnswers[i] || null,
      correctAnswer: q.correct_answer,
      isCorrect:    userAnswers[i] === q.correct_answer,
      timeSpentMs:  0,  // mock.js doesn't track per-Q time yet
    })),
  };
  try {
    const ANALYTICS = window.ANALYTICS || {
      saveSession(o) {
        const arr = JSON.parse(localStorage.getItem('neeto_sessions') || '[]');
        arr.push({ ...o, ts: Date.now() });
        if (arr.length > 50) arr.splice(0, arr.length - 50);
        localStorage.setItem('neeto_sessions', JSON.stringify(arr));
      }
    };
    ANALYTICS.saveSession(sessionRecord);
  } catch(e) {}

  // Flip to result screen
  document.getElementById('test-screen').style.display   = 'none';
  document.getElementById('result-screen').style.display = 'block';

  document.getElementById('result-score').textContent = score;
  document.getElementById('r-correct').textContent    = correct;
  document.getElementById('r-wrong').textContent      = wrong;
  document.getElementById('r-skip').textContent       = skip;
  document.getElementById('r-accuracy').textContent   = correct + wrong > 0
    ? Math.round(correct / (correct + wrong) * 100) + '%' : '0%';

  document.getElementById('subject-breakdown').innerHTML =
    ['Physics','Chemistry','Biology'].map(s => `
      <div class="result-box">
        <div class="num" style="color:#FF6B1A;">${subj[s].c * 4 - subj[s].w}</div>
        <div class="lbl">${s}</div>
        <div style="font-size:11px;color:#6B5C45;margin-top:4px;">✅${subj[s].c} ❌${subj[s].w} ⬜${subj[s].s}</div>
      </div>`).join('');

  // Build review (wrong answers only, with jump links)
  const rc = document.getElementById('review-container');
  const wrongList = mockQuestions
    .map((q,i) => ({ q, i, chosen: userAnswers[i] }))
    .filter(({ q, i }) => userAnswers[i] && userAnswers[i] !== q.correct_answer);

  if (!wrongList.length) {
    rc.innerHTML = '<p style="color:#22C55E;font-weight:600;">No wrong answers — perfect! 🎉</p>';
    return;
  }

  rc.innerHTML = wrongList.map(({ q, i, chosen }) => `
    <div class="question-card q-card" style="background:#fff;border:1.5px solid #F0E8DE;border-radius:18px;padding:1.6rem 1.8rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;">
        <span style="font-size:0.72rem;font-weight:700;background:#F0E8DE;color:#6B5C45;padding:0.25rem 0.7rem;border-radius:100px;">Q${q._num}</span>
        <button onclick="goToQuestion(${i})"
          style="background:none;border:1.5px solid #FF6B1A;color:#FF6B1A;border-radius:100px;padding:0.3rem 0.85rem;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit;">
          Jump to Q${q._num} ↑
        </button>
      </div>
      <div style="font-size:0.95rem;line-height:1.65;color:#1A1208;margin-bottom:1rem;">${q.question}</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        ${['A','B','C','D'].map(k => {
          let bg = '#fff', bc = '#F0E8DE', col = '#1A1208', fw = '400', op = '0.4';
          if (k === q.correct_answer)  { bg='#F0FDF4'; bc='#22C55E'; col='#15803D'; fw='600'; op='1'; }
          else if (k === chosen)       { bg='#FEF2F2'; bc='#EF4444'; col='#B91C1C'; fw='400'; op='1'; }
          return `<div style="background:${bg};border:1.5px solid ${bc};color:${col};border-radius:10px;padding:0.6rem 1rem;font-size:0.9rem;font-weight:${fw};opacity:${op};"><span style="font-weight:700;margin-right:0.4rem;color:#FF6B1A;">${k}</span> ${q.options[k]||''}</div>`;
        }).join('')}
      </div>
      <div style="margin-top:0.9rem;background:#FFF7F0;border:1px solid rgba(255,107,26,0.2);border-radius:10px;padding:0.9rem 1.1rem;font-size:0.875rem;color:#1A1208;line-height:1.6;">
        <strong style="color:#E85500;">✅ ${q.correct_answer}</strong>
        &nbsp;<span style="color:#B91C1C;">❌ You: ${chosen}</span><br/>
        ${q.explanation || ''}
        ${cleanNcert(q)}
      </div>
    </div>`).join('');
}

// Jump from result screen back to test question
function goToQuestion(idx) {
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('test-screen').style.display   = 'block';
  setTimeout(() => jumpToQuestion(idx), 150);
}

// Expose globals needed by inline onclick
window.testSubmitted = testSubmitted;
window.userAnswers   = userAnswers;
