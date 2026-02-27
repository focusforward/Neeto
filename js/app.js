// NEETO — Main App JS (split-file version)

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
  if (el) el.innerHTML = `<div style="text-align:center;padding:60px;color:#7c6af7;font-size:1.1rem;">⏳ ${msg || 'Loading...'}</div>`;
}

// Load a single subject file (cached)
async function loadSubject(subject) {
  if (LOADED_SUBJECTS[subject]) return LOADED_SUBJECTS[subject];
  const file = `data/api_${subject.toLowerCase()}.json`;
  try {
    const res  = await fetch(file);
    const data = await res.json();
    LOADED_SUBJECTS[subject] = data.questions || [];
    return LOADED_SUBJECTS[subject];
  } catch(e) {
    console.error('Failed to load', file, e);
    return [];
  }
}

// Load all 3 subjects (for units page and mock)
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

  // Load only the subject needed, or all if no filter
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
        loadSubject(sel).then(qs => {
          ALL_QUESTIONS = qs;
          renderFiltered();
        });
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
    if (sf) filtered = filtered.filter(q => q.subject  === sf);
    if (pf) filtered = filtered.filter(q => q.pattern  === pf);
    if (df) filtered = filtered.filter(q => q.difficulty === df);

    if (countEl) countEl.textContent = `${filtered.length} questions`;
    renderQuestions(filtered.slice(0, 50)); // render max 50 at a time
  }
}

function renderQuestions(qs) {
  const container = document.getElementById('questions-container');
  if (!container) return;
  if (!qs.length) { container.innerHTML = '<p style="color:#888;padding:40px;text-align:center;">No questions match your filters.</p>'; return; }

  container.innerHTML = qs.map((q, i) => `
    <div class="q-card" id="qc-${i}">
      <div class="q-meta">
        <span class="tag tag-subject">${q.subject}</span>
        <span class="tag tag-pattern">${q.pattern || ''}</span>
        <span class="tag tag-diff">${q.difficulty || ''}</span>
        ${q.year ? `<span class="tag">NEET ${q.year}</span>` : ''}
      </div>
      <div class="q-text">${q.question}</div>
      <div class="options" data-index="${i}">
        ${['A','B','C','D'].map(k => `
          <button class="option" data-key="${k}" data-index="${i}" onclick="selectOption(${i},'${k}')">${k}. ${(q.options && q.options[k]) || ''}</button>
        `).join('')}
      </div>
      <button class="show-btn" onclick="revealAnswer(${i})">Show Answer</button>
      <div class="explanation" id="exp-${i}" style="display:none;">
        <strong>✅ Correct Answer: ${q.correct_answer}</strong><br/>
        ${q.explanation || ''}
        ${cleanNcert(q)}
      </div>
    </div>`).join('');

  // Store questions for reveal
  window._currentQs = qs;
}

function selectOption(idx, key) {
  const q = window._currentQs[idx];
  if (!q) return;

  // Prevent re-answering
  const card = document.getElementById('qc-' + idx);
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';

  const correctKey = q.correct_answer;

  document.querySelectorAll(`[data-index="${idx}"].option`).forEach(btn => {
    const k = btn.dataset.key;
    btn.style.pointerEvents = 'none';
    btn.style.cursor        = 'default';
    btn.style.transition    = 'all 0.18s';

    if (k === correctKey) {
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else if (k === key) {
      btn.style.background = '#FEF2F2';
      btn.style.border     = '2px solid #EF4444';
      btn.style.color      = '#B91C1C';
      btn.style.opacity    = '1';
    } else {
      btn.style.background = '#ffffff';
      btn.style.border     = '1.5px solid #F0E8DE';
      btn.style.color      = '#1A1208';
      btn.style.opacity    = '0.4';
    }
  });

  // Show explanation
  const exp = document.getElementById('exp-' + idx);
  if (exp) exp.style.display = 'block';

  // Hide "Show Answer" button
  if (card) {
    const sb = card.querySelector('.show-btn');
    if (sb) sb.style.display = 'none';
  }
}

function revealAnswer(idx) {
  const q = window._currentQs[idx];
  if (!q) return;
  const card = document.getElementById('qc-' + idx);
  if (card && card.dataset.done) return;
  if (card) card.dataset.done = '1';

  document.querySelectorAll(`[data-index="${idx}"].option`).forEach(btn => {
    const k = btn.dataset.key;
    btn.style.pointerEvents = 'none';
    btn.style.cursor        = 'default';
    btn.style.transition    = 'all 0.18s';

    if (k === q.correct_answer) {
      btn.style.background = '#F0FDF4';
      btn.style.border     = '2px solid #22C55E';
      btn.style.color      = '#15803D';
      btn.style.fontWeight = '600';
      btn.style.opacity    = '1';
    } else {
      btn.style.background = '#ffffff';
      btn.style.border     = '1.5px solid #F0E8DE';
      btn.style.color      = '#1A1208';
      btn.style.opacity    = '0.4';
    }
  });

  const exp = document.getElementById('exp-' + idx);
  if (exp) exp.style.display = 'block';
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
      const filtered = sf ? qs.filter(q => q.subject === sf) : qs;
      renderUnits(filtered);
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

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initPractice();
  initUnits();
});
