// NEETO — app.js

let ALL_QUESTIONS = [];
let LOADED_SUBJECTS = {};

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
  "UNCLASSIFIED": "General",
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

async function loadSubject(subject) {
  if (LOADED_SUBJECTS[subject]) return LOADED_SUBJECTS[subject];
  try {
    const res  = await fetch(`data/api_${subject.toLowerCase()}.json`);
    const data = await res.json();
    LOADED_SUBJECTS[subject] = data.questions || [];
    return LOADED_SUBJECTS[subject];
  } catch(e) { return []; }
}

async function loadAllQuestions() {
  const [bio, chem, phys] = await Promise.all([
    loadSubject('Biology'), loadSubject('Chemistry'), loadSubject('Physics')
  ]);
  ALL_QUESTIONS = [...bio, ...chem, ...phys];
  return ALL_QUESTIONS;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function cleanNcert(q) {
  if (!q.ncert_ref || q.ncert_ref === 'undefined') return '';
  if (!q.ncert_line || !q.ncert_line.trim() || q.ncert_line.includes('To be added'))
    return `<div class="ncert-line" style="margin-top:0.6rem;font-size:0.8rem;color:#6B5C45;">📖 ${q.ncert_ref}</div>`;
  return `<div class="ncert-line" style="margin-top:0.6rem;font-size:0.8rem;color:#6B5C45;">📖 ${q.ncert_ref}<br/><em>${q.ncert_line.substring(0,200)}...</em></div>`;
}

// ── COLOUR HELPERS ────────────────────────────────────────────────────
function optionBaseStyle(btn) {
  Object.assign(btn.style, {
    background:'#ffffff', border:'1.5px solid #F0E8DE', color:'#1A1208',
    borderRadius:'10px', padding:'0.65rem 1rem', width:'100%',
    textAlign:'left', fontSize:'0.9rem', cursor:'pointer',
    fontFamily:'inherit', transition:'all 0.15s', display:'block', marginBottom:'0.5rem',
    opacity:'1', fontWeight:'400'
  });
}

function applyPracticeColours(idx, chosenKey) {
  const q = (window._currentQs || [])[idx];
  if (!q) return;
  const correct = q.correct_answer;

  document.querySelectorAll(`[data-index="${idx}"].option`).forEach(btn => {
    const k = btn.dataset.key;
    optionBaseStyle(btn);
    btn.style.pointerEvents = 'none';
    btn.style.cursor = 'default';

    if (k === correct) {
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
    } else if (chosenKey && k === chosenKey) {
      btn.style.background = '#FEF2F2';
      btn.style.border     = '2px solid #EF4444';
      btn.style.color      = '#B91C1C';
    } else {
      btn.style.opacity = '0.4';
    }
  });

  // Show explanation
  const exp = document.getElementById('exp-' + idx);
  if (exp) {
    Object.assign(exp.style, {
      display:'block', background:'#FFF7F0', border:'1px solid rgba(255,107,26,0.2)',
      borderRadius:'12px', padding:'1rem 1.2rem', marginTop:'1rem',
      color:'#1A1208', fontSize:'0.875rem', lineHeight:'1.6'
    });
  }
  // Hide show-answer button
  const card = document.getElementById('qc-' + idx);
  if (card) {
    const sb = card.querySelector('.show-btn');
    if (sb) sb.style.display = 'none';
  }
}

// ── PRACTICE: selectOption + revealAnswer ─────────────────────────────
function selectOption(idx, key) {
  const card = document.getElementById('qc-' + idx);
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';
  applyPracticeColours(idx, key);
}

function revealAnswer(idx) {
  const card = document.getElementById('qc-' + idx);
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';
  applyPracticeColours(idx, null);
}

// ── RENDER QUESTIONS (practice) ───────────────────────────────────────
function renderQuestions(qs) {
  const container = document.getElementById('questions-container');
  if (!container) return;
  if (!qs.length) {
    container.innerHTML = '<p style="color:#6B5C45;padding:40px;text-align:center;">No questions match your filters.</p>';
    return;
  }

  container.innerHTML = qs.map((q, i) => {
    const subjCls = q.subject === 'Biology' ? 'tag-biology' : q.subject === 'Chemistry' ? 'tag-chemistry' : 'tag-physics';
    const diffCls = q.difficulty === 'L1' ? 'tag-l1' : q.difficulty === 'L2' ? 'tag-l2' : 'tag-l3';
    return `
    <div class="question-card q-card" id="qc-${i}">
      <div class="q-meta">
        <span class="q-tag tag-subject ${subjCls}">${q.subject}</span>
        <span class="q-tag tag-pattern">${q.pattern || ''}</span>
        <span class="q-tag tag-diff ${diffCls}">${q.difficulty || ''}</span>
        ${q.year ? `<span class="q-tag">NEET ${q.year}</span>` : ''}
      </div>
      <div class="q-text">${q.question}</div>
      <div class="q-options options">
        ${['A','B','C','D'].map(k => `
          <button class="q-option option" data-key="${k}" data-index="${i}"
            onclick="selectOption(${i},'${k}')"
            onmouseover="if(!this.closest('.q-card').dataset.done){this.style.borderColor='#FF6B1A';this.style.background='#FFF0E6';this.style.color='#E85500';}"
            onmouseout="if(!this.closest('.q-card').dataset.done){this.style.borderColor='#F0E8DE';this.style.background='#ffffff';this.style.color='#1A1208';}"
          ><span class="option-label">${k}</span> ${(q.options && q.options[k]) || ''}</button>
        `).join('')}
      </div>
      <button class="show-answer-btn show-btn" onclick="revealAnswer(${i})">Show Answer</button>
      <div class="answer-block explanation" id="exp-${i}" style="display:none;">
        <strong>✅ Correct: ${q.correct_answer}</strong><br/>
        ${q.explanation || ''}
        ${cleanNcert(q)}
      </div>
    </div>`;
  }).join('');

  window._currentQs = qs;
}

// ── PRACTICE PAGE INIT ────────────────────────────────────────────────
function initPractice() {
  if (!document.getElementById('questions-container')) return;

  const subjectFilter = document.getElementById('filter-subject');
  const patternFilter = document.getElementById('filter-pattern');
  const diffFilter    = document.getElementById('filter-diff');
  const countEl       = document.getElementById('q-count');
  const urlSubject    = getParam('subject');
  const urlUnit       = getParam('unit');

  if (urlSubject && subjectFilter) subjectFilter.value = urlSubject;
  showLoader('questions-container', 'Loading questions...');

  const subjectToLoad = urlSubject || (subjectFilter ? subjectFilter.value : '');
  const loadPromise   = subjectToLoad
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
    const name = UNIT_NAMES[code] || code;
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

document.addEventListener('DOMContentLoaded', () => {
  initPractice();
  initUnits();
});
