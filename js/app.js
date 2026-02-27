// NEETO — app.js  (with localStorage caching + attempt analytics)

let ALL_QUESTIONS = [];
let LOADED_SUBJECTS = {};

// ── ANALYTICS STORE ──────────────────────────────────────────────────
// All data lives in localStorage under these keys:
//   neeto_attempts   → array of attempt objects (practice + mock)
//   neeto_sessions   → array of session summaries (mock only)
//   neeto_q_cache_*  → cached JSON question files

const ANALYTICS = {
  saveAttempt(obj) {
    try {
      const arr = JSON.parse(localStorage.getItem('neeto_attempts') || '[]');
      arr.push({ ...obj, ts: Date.now() });
      // Keep last 2000 attempts to avoid storage bloat
      if (arr.length > 2000) arr.splice(0, arr.length - 2000);
      localStorage.setItem('neeto_attempts', JSON.stringify(arr));
    } catch(e) {}
  },
  saveSession(obj) {
    try {
      const arr = JSON.parse(localStorage.getItem('neeto_sessions') || '[]');
      arr.push({ ...obj, ts: Date.now() });
      if (arr.length > 50) arr.splice(0, arr.length - 50);
      localStorage.setItem('neeto_sessions', JSON.stringify(arr));
    } catch(e) {}
  },
  getAttempts()  { try { return JSON.parse(localStorage.getItem('neeto_attempts') || '[]'); } catch(e) { return []; } },
  getSessions()  { try { return JSON.parse(localStorage.getItem('neeto_sessions') || '[]'); } catch(e) { return []; } },
};

const UNIT_NAMES = {
  "UNIT1_DiversityLivingWorld":    "Diversity in Living World",
  "UNIT2_StructuralOrganisation":  "Structural Organisation",
  "UNIT3_CellStructureFunction":   "Cell Structure & Function",
  "UNIT4_PlantPhysiology":         "Plant Physiology",
  "UNIT5_HumanPhysiology":         "Human Physiology",
  "UNIT6_Reproduction":            "Reproduction",
  "UNIT7_GeneticsEvolution":       "Genetics & Evolution",
  "UNIT8_BiologyHumanWelfare":     "Biology & Human Welfare",
  "UNIT9_BiotechnologyApplications":"Biotechnology",
  "UNIT10_EcologyEnvironment":     "Ecology & Environment",
  "UNIT1_PhysicsWorld":            "Physical World & Kinematics",
  "UNIT2_KinematicsLaws":          "Laws of Motion",
  "UNIT3_WorkEnergyPower":         "Work, Energy & Power",
  "UNIT4_RotationalMotion":        "Rotational Motion",
  "UNIT5_Gravitation":             "Gravitation",
  "UNIT6_PropertiesMatter":        "Properties of Matter",
  "UNIT7_ThermalProperties":       "Thermal Properties",
  "UNIT8_Thermodynamics":          "Thermodynamics",
  "UNIT9_KineticTheory":           "Kinetic Theory",
  "UNIT10_Oscillations":           "Oscillations & Waves",
  "UNIT11_Electrostatics":         "Electrostatics",
  "UNIT12_CurrentElectricity":     "Current Electricity",
  "UNIT13_MagnetismCurrents":      "Magnetism & EMI",
  "UNIT14_AlternatingCurrent":     "Alternating Current",
  "UNIT15_ElectromagneticWaves":   "Electromagnetic Waves",
  "UNIT16_Optics":                 "Optics",
  "UNIT17_DualNature":             "Dual Nature",
  "UNIT18_AtomsNuclei":            "Atoms & Nuclei",
  "UNIT19_Semiconductors":         "Semiconductors",
  "UNIT20_CommunicationSystems":   "Communication Systems",
  "UNIT2_AtomicStructure":         "Atomic Structure",
  "UNIT3_ChemicalBondingMolecularStructure": "Chemical Bonding",
  "UNIT4_ChemicalThermodynamics":  "Thermodynamics",
  "UNIT5_Solutions":               "Solutions",
  "UNIT6_Equilibrium":             "Equilibrium",
  "UNIT7_RedoxElectrochemistry":   "Electrochemistry",
  "UNIT8_ChemicalKinetics":        "Chemical Kinetics",
  "UNIT8_sBlockElements":          "s-Block Elements",
  "UNIT9_ClassificationElementsPeriodicity": "Periodic Table",
  "UNIT10_pBlockElements":         "p-Block Elements",
  "UNIT11_dAndFBlockElements":     "d & f Block Elements",
  "UNIT12_CoordinationCompounds":  "Coordination Compounds",
  "UNIT13_OrganometallicChemistry":"Organometallics",
  "UNIT14_BasicPrinciplesOrganicChemistry": "Basic Organic Chemistry",
  "UNIT15_Hydrocarbons":           "Hydrocarbons",
  "UNIT16_OrganicHalogens":        "Haloalkanes & Haloarenes",
  "UNIT17_OrganicOxygen":          "Alcohols, Aldehydes & Acids",
  "UNIT18_OrganicNitrogen":        "Amines",
  "UNIT19_Biomolecules":           "Biomolecules",
  "UNIT20_Polymers":               "Polymers",
  "UNIT21_Chemistry_Environment":  "Chemistry in Everyday Life",
  "UNCLASSIFIED":                  "General",
};

function subjectFromUnit(unit_code) {
  const bioStarts  = ['UNIT1_D','UNIT2_S','UNIT3_C','UNIT4_P','UNIT5_H','UNIT6_R','UNIT7_G','UNIT8_B','UNIT9_B','UNIT10_E'];
  const chemStarts = ['UNIT2_A','UNIT3_Ch','UNIT4_Ch','UNIT5_S','UNIT6_E','UNIT7_R','UNIT8_Ch','UNIT8_s','UNIT9_Cl','UNIT10_p','UNIT11_d','UNIT12_C','UNIT13_O','UNIT14_B','UNIT15_H','UNIT16_O','UNIT17_O','UNIT18_O','UNIT19_B','UNIT20_P','UNIT21_C'];
  for (const p of bioStarts)  if (unit_code.startsWith(p)) return 'Biology';
  for (const p of chemStarts) if (unit_code.startsWith(p)) return 'Chemistry';
  return 'Physics';
}

function showLoader(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div style="text-align:center;padding:60px;color:#FF6B1A;font-size:1.1rem;">⏳ ${msg || 'Loading...'}</div>`;
}

// ── QUESTION LOADING WITH localStorage CACHE ─────────────────────────
async function loadSubject(subject) {
  if (LOADED_SUBJECTS[subject]) return LOADED_SUBJECTS[subject];

  // Check localStorage cache (valid for 24 hours)
  const cacheKey = `neeto_q_cache_${subject}`;
  const tsKey    = `neeto_q_ts_${subject}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    const ts     = parseInt(localStorage.getItem(tsKey) || '0');
    if (cached && Date.now() - ts < 24 * 60 * 60 * 1000) {
      LOADED_SUBJECTS[subject] = JSON.parse(cached);
      return LOADED_SUBJECTS[subject];
    }
  } catch(e) {}

  const file = `data/api_${subject.toLowerCase()}.json`;
  try {
    const res  = await fetch(file);
    const data = await res.json();
    const qs   = data.questions || [];
    LOADED_SUBJECTS[subject] = qs;
    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(qs));
      localStorage.setItem(tsKey, String(Date.now()));
    } catch(e) {}
    return qs;
  } catch(e) {
    console.error('Failed to load', file, e);
    return [];
  }
}

async function loadAllQuestions() {
  const [bio, chem, phys] = await Promise.all([
    loadSubject('Biology'),
    loadSubject('Chemistry'),
    loadSubject('Physics')
  ]);
  ALL_QUESTIONS = [...bio, ...chem, ...phys];
  return ALL_QUESTIONS;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function cleanNcert(q) {
  if (!q.ncert_ref || q.ncert_ref === 'undefined') return '';
  if (!q.ncert_line || !q.ncert_line.trim() || q.ncert_line.includes('To be added')) {
    return `<div class="ncert-line">📖 ${q.ncert_ref}</div>`;
  }
  return `<div class="ncert-line">📖 ${q.ncert_ref}<br/><em>${q.ncert_line.substring(0,200)}...</em></div>`;
}

// ── PRACTICE PAGE ─────────────────────────────────────────────────────
function initPractice() {
  if (!document.getElementById('questions-container')) return;

  const subjectFilter = document.getElementById('filter-subject');
  const patternFilter = document.getElementById('filter-pattern');
  const diffFilter    = document.getElementById('filter-diff');
  const countEl       = document.getElementById('q-count');

  const urlSubject = getParam('subject');
  const urlUnit    = getParam('unit');

  if (urlSubject && subjectFilter) subjectFilter.value = urlSubject;

  showLoader('questions-container', 'Loading questions...');

  const subjectToLoad = urlSubject || (subjectFilter ? subjectFilter.value : '');
  const loadPromise = subjectToLoad
    ? loadSubject(subjectToLoad).then(qs => { ALL_QUESTIONS = qs; return qs; })
    : loadAllQuestions();

  loadPromise.then(() => {
    renderFiltered();
    if (subjectFilter) subjectFilter.addEventListener('change', () => {
      const sel = subjectFilter.value;
      if (sel && !LOADED_SUBJECTS[sel]) {
        showLoader('questions-container', 'Loading...');
        loadSubject(sel).then(qs => { ALL_QUESTIONS = qs; renderFiltered(); });
      } else {
        ALL_QUESTIONS = sel ? (LOADED_SUBJECTS[sel] || []) : Object.values(LOADED_SUBJECTS).flat();
        renderFiltered();
      }
    });
    if (patternFilter) patternFilter.addEventListener('change', renderFiltered);
    if (diffFilter)    diffFilter.addEventListener('change', renderFiltered);
  });

  function renderFiltered() {
    let filtered = [...ALL_QUESTIONS];
    if (urlUnit) filtered = filtered.filter(q => q.unit_code === urlUnit);
    const sf = subjectFilter ? subjectFilter.value : '';
    const pf = patternFilter ? patternFilter.value : '';
    const df = diffFilter    ? diffFilter.value    : '';
    if (sf) filtered = filtered.filter(q => q.subject    === sf);
    if (pf) filtered = filtered.filter(q => q.pattern    === pf);
    if (df) filtered = filtered.filter(q => q.difficulty === df);
    if (countEl) countEl.textContent = `${filtered.length} questions`;
    renderQuestions(filtered.slice(0, 50));
  }
}

// ── ONE-AT-A-TIME PRACTICE ────────────────────────────────────────────
let _practiceQs   = [];
let _practiceIdx  = 0;
let _questionStart = 0;  // timestamp when current question was shown

function renderQuestions(qs) {
  _practiceQs  = qs;
  _practiceIdx = 0;
  window._currentQs = qs;
  showQuestion(0);
}

function showQuestion(idx) {
  const container = document.getElementById('questions-container');
  if (!container) return;

  if (!_practiceQs.length) {
    container.innerHTML = '<p style="padding:40px;text-align:center;color:#6B5C45;">No questions match your filters.</p>';
    return;
  }

  _practiceIdx   = idx;
  _questionStart = Date.now();
  const q        = _practiceQs[idx];
  const total    = _practiceQs.length;
  const isLast   = idx === total - 1;

  container.innerHTML = `
    <div style="max-width:680px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;">
        <div style="flex:1;height:6px;background:#F0E8DE;border-radius:100px;overflow:hidden;">
          <div style="width:${Math.round(((idx+1)/total)*100)}%;height:100%;background:#FF6B1A;border-radius:100px;transition:width 0.3s;"></div>
        </div>
        <span style="font-size:0.82rem;font-weight:600;color:#6B5C45;white-space:nowrap;">${idx+1} / ${total}</span>
      </div>

      <div class="q-card" id="qc-0" style="background:#fff;border:1.5px solid #F0E8DE;border-radius:18px;padding:2rem 2rem 1.5rem;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.2rem;">
          <span style="${tagStyle(q.subject,'subject')}">${q.subject}</span>
          ${q.difficulty ? `<span style="${tagStyle(q.difficulty,'diff')}">${q.difficulty}</span>` : ''}
          ${q.pattern    ? `<span style="${tagStyle('','pattern')}">${q.pattern}</span>` : ''}
          ${q.year       ? `<span style="${tagStyle('','year')}">NEET ${q.year}</span>` : ''}
        </div>

        <div style="font-size:1rem;line-height:1.7;color:#1A1208;font-weight:500;margin-bottom:1.4rem;">${q.question}</div>

        <div id="options-wrap" style="display:flex;flex-direction:column;gap:10px;">
          ${['A','B','C','D'].map(k => `
            <button data-key="${k}" onclick="selectOption(0,'${k}')"
              style="background:#fff;border:1.5px solid #F0E8DE;border-radius:10px;padding:0.75rem 1.1rem;
                     width:100%;text-align:left;font-size:0.95rem;font-family:inherit;cursor:pointer;
                     color:#1A1208;transition:all 0.15s;display:flex;align-items:center;gap:10px;">
              <span style="font-weight:700;color:#FF6B1A;min-width:1.1rem;">${k}.</span>
              ${(q.options && q.options[k]) || ''}
            </button>`).join('')}
        </div>

        <button id="show-ans-btn" onclick="revealAnswer(0)"
          style="margin-top:1.1rem;background:none;border:1.5px solid #F0E8DE;border-radius:100px;
                 padding:0.4rem 1rem;font-size:0.8rem;font-weight:600;color:#6B5C45;
                 cursor:pointer;font-family:inherit;">
          Show Answer
        </button>

        <div id="exp-0" style="display:none;margin-top:1rem;background:#FFF7F0;
             border:1px solid rgba(255,107,26,0.2);border-radius:12px;
             padding:1rem 1.2rem;font-size:0.875rem;color:#1A1208;line-height:1.6;">
          <strong style="color:#E85500;">✅ Correct Answer: ${(q.correct_answer||'').toString().trim().toUpperCase()}</strong><br/>
          ${q.explanation || ''}
          ${cleanNcert(q)}
        </div>

        <div id="nav-row" style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;gap:12px;">
          <button onclick="goQuestion(${idx-1})" ${idx===0?'disabled':''}
            style="background:none;border:1.5px solid #F0E8DE;border-radius:100px;
                   padding:0.55rem 1.2rem;font-size:0.875rem;font-weight:600;
                   color:${idx===0?'#D1C8BE':'#6B5C45'};cursor:${idx===0?'default':'pointer'};font-family:inherit;">
            ← Prev
          </button>
          <button id="next-btn" onclick="goQuestion(${idx+1})" ${isLast?'disabled':''}
            style="background:${isLast?'#F0E8DE':'#FF6B1A'};border:none;border-radius:100px;
                   padding:0.6rem 1.6rem;font-size:0.875rem;font-weight:700;
                   color:${isLast?'#A09080':'#fff'};cursor:${isLast?'default':'pointer'};
                   font-family:inherit;box-shadow:${isLast?'none':'0 4px 14px rgba(255,107,26,0.3)'};">
            ${isLast ? 'Last Question' : 'Next →'}
          </button>
        </div>
      </div>
    </div>`;
}

function tagStyle(val, type) {
  const base = 'display:inline-block;border-radius:100px;font-size:0.72rem;font-weight:700;padding:0.25rem 0.7rem;border:none;text-transform:uppercase;letter-spacing:0.04em;';
  if (type === 'subject') {
    if (val === 'Biology')   return base + 'background:#DCFCE7;color:#15803D;';
    if (val === 'Chemistry') return base + 'background:#DBEAFE;color:#1D4ED8;';
    return base + 'background:#FEF3C7;color:#B45309;';
  }
  if (type === 'diff') {
    if (val === 'L1') return base + 'background:#DCFCE7;color:#15803D;';
    if (val === 'L2') return base + 'background:#FEF3C7;color:#B45309;';
    if (val === 'L3') return base + 'background:#FEE2E2;color:#B91C1C;';
  }
  return base + 'background:#FFF0E6;color:#E85500;font-weight:600;text-transform:none;';
}

function goQuestion(idx) {
  if (idx < 0 || idx >= _practiceQs.length) return;
  showQuestion(idx);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const card = document.getElementById('qc-0');
    if (!card) return;
    const nav  = document.querySelector('nav') || document.querySelector('.navbar');
    const navH = nav ? nav.offsetHeight : 68;
    const cardTop = card.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: cardTop - navH - 20, behavior: 'smooth' });
  }));
}

function selectOption(idx, key) {
  const q = _practiceQs[idx] || (window._currentQs || [])[idx];
  if (!q) return;

  const card = document.getElementById('qc-0');
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';

  // Normalise: trim whitespace + uppercase so "a ", "A", "a" all match
  const correctKey  = (q.correct_answer || '').toString().trim().toUpperCase();
  const chosenKey   = (key || '').toString().trim().toUpperCase();
  const timeSpentMs = Date.now() - _questionStart;
  const isCorrect   = chosenKey === correctKey;

  // ── LOG ATTEMPT ──
  ANALYTICS.saveAttempt({
    type:        'practice',
    questionId:  q.id || q.question_id || `${q.subject}_${idx}`,
    subject:     q.subject,
    chapter:     q.unit_code || '',
    chapterName: UNIT_NAMES[q.unit_code] || q.unit_code || '',
    difficulty:  q.difficulty || 'L1',
    userAnswer:  chosenKey,
    correctAnswer: correctKey,
    isCorrect,
    timeSpentMs,
    year:        q.year || null,
  });

  document.querySelectorAll('#options-wrap button').forEach(btn => {
    const k = (btn.dataset.key || '').trim().toUpperCase();
    btn.style.pointerEvents = 'none';
    btn.style.cursor        = 'default';

    if (isCorrect && k === correctKey) {
      // User picked correctly — show green on their choice only
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else if (!isCorrect && k === chosenKey) {
      // User picked wrong — show red on their wrong choice
      btn.style.background = '#FEF2F2';
      btn.style.border     = '2px solid #EF4444';
      btn.style.color      = '#B91C1C';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else if (!isCorrect && k === correctKey) {
      // Reveal the correct answer in green
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else {
      // Everything else — dim
      btn.style.opacity = '0.35';
    }
  });

  const exp = document.getElementById('exp-0');
  if (exp) exp.style.display = 'block';
  const sb = document.getElementById('show-ans-btn');
  if (sb) sb.style.display = 'none';

  if (isCorrect) {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && _practiceIdx < _practiceQs.length - 1) {
      nextBtn.style.background = '#22C55E';
      nextBtn.style.boxShadow  = '0 4px 14px rgba(34,197,94,0.35)';
      nextBtn.textContent      = 'Next →';
    }
  }
}

function revealAnswer(idx) {
  const q = _practiceQs[idx] || (window._currentQs || [])[idx];
  if (!q) return;
  const card = document.getElementById('qc-0');
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';

  // Log as skipped/revealed
  ANALYTICS.saveAttempt({
    type:        'practice',
    questionId:  q.id || q.question_id || `${q.subject}_${idx}`,
    subject:     q.subject,
    chapter:     q.unit_code || '',
    chapterName: UNIT_NAMES[q.unit_code] || q.unit_code || '',
    difficulty:  q.difficulty || 'L1',
    userAnswer:  null,
    correctAnswer: (q.correct_answer || '').toString().trim().toUpperCase(),
    isCorrect:   false,
    revealed:    true,
    timeSpentMs: Date.now() - _questionStart,
  });

  const correctKey = (q.correct_answer || '').toString().trim().toUpperCase();
  document.querySelectorAll('#options-wrap button').forEach(btn => {
    btn.style.pointerEvents = 'none';
    btn.style.cursor        = 'default';
    if ((btn.dataset.key || '').trim().toUpperCase() === correctKey) {
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else {
      btn.style.opacity = '0.38';
    }
  });

  const exp = document.getElementById('exp-0');
  if (exp) exp.style.display = 'block';
  const sb = document.getElementById('show-ans-btn');
  if (sb) sb.style.display = 'none';
}

// ── UNITS PAGE ────────────────────────────────────────────────────────
function initUnits() {
  if (!document.getElementById('units-grid')) return;
  showLoader('units-grid', 'Loading units...');
  loadAllQuestions().then(qs => {
    const subjectFilter = document.getElementById('filter-subject');
    renderUnits(qs);
    if (subjectFilter) subjectFilter.addEventListener('change', () => {
      const sf = subjectFilter.value;
      renderUnits(sf ? qs.filter(q => q.subject === sf) : qs);
    });
  });
}

function renderUnits(qs) {
  const grid = document.getElementById('units-grid');
  if (!grid) return;
  const unitMap = {};
  qs.forEach(q => {
    const u = q.unit_code || 'UNCLASSIFIED';
    if (!unitMap[u]) unitMap[u] = { count: 0, subject: q.subject };
    unitMap[u].count++;
  });
  const sorted = Object.entries(unitMap).sort((a,b) => b[1].count - a[1].count);
  const max    = sorted[0]?.[1].count || 1;
  grid.innerHTML = sorted.map(([code, info]) => {
    const name = UNIT_NAMES[code] || code.replace(/^UNIT\d+_/, '').replace(/([A-Z])/g, ' $1').trim();
    const pct  = Math.round((info.count / max) * 100);
    const subj = info.subject || subjectFromUnit(code);
    const cls  = subj === 'Biology' ? 'bio' : subj === 'Chemistry' ? 'chem' : 'phys';
    return `
      <div class="unit-card ${cls}" onclick="location.href='practice.html?unit=${code}'">
        <div class="unit-name">${name}</div>
        <div class="unit-subject">${subj}</div>
        <div class="unit-bar"><div class="unit-bar-fill" style="width:${pct}%"></div></div>
        <div class="unit-count">${info.count} questions</div>
      </div>`;
  }).join('');
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initPractice();
  initUnits();
});
