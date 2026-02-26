// NEETO — Main App JS

let ALL_QUESTIONS = [];

const UNIT_NAMES = {
  "UNIT1_DiversityLivingWorld":             "Diversity in Living World",
  "UNIT2_StructuralOrganisation":           "Structural Organisation",
  "UNIT3_CellStructureFunction":            "Cell Structure & Function",
  "UNIT4_PlantPhysiology":                  "Plant Physiology",
  "UNIT5_HumanPhysiology":                  "Human Physiology",
  "UNIT6_Reproduction":                     "Reproduction",
  "UNIT7_GeneticsEvolution":                "Genetics & Evolution",
  "UNIT8_BiologyHumanWelfare":              "Biology & Human Welfare",
  "UNIT9_BiotechnologyApplications":        "Biotechnology",
  "UNIT10_EcologyEnvironment":              "Ecology & Environment",
  "UNIT1_PhysicsWorld":                     "Physical World & Kinematics",
  "UNIT2_KinematicsLaws":                   "Laws of Motion",
  "UNIT3_WorkEnergyPower":                  "Work, Energy & Power",
  "UNIT4_RotationalMotion":                 "Rotational Motion",
  "UNIT5_Gravitation":                      "Gravitation",
  "UNIT6_PropertiesMatter":                 "Properties of Matter",
  "UNIT7_ThermalProperties":                "Thermal Properties",
  "UNIT8_Thermodynamics":                   "Thermodynamics",
  "UNIT9_KineticTheory":                    "Kinetic Theory",
  "UNIT10_Oscillations":                    "Oscillations & Waves",
  "UNIT11_Electrostatics":                  "Electrostatics",
  "UNIT12_CurrentElectricity":              "Current Electricity",
  "UNIT13_MagnetismCurrents":               "Magnetism & EMI",
  "UNIT14_AlternatingCurrent":              "Alternating Current",
  "UNIT15_ElectromagneticWaves":            "Electromagnetic Waves",
  "UNIT16_Optics":                          "Optics",
  "UNIT17_DualNature":                      "Dual Nature of Radiation",
  "UNIT18_AtomsNuclei":                     "Atoms & Nuclei",
  "UNIT19_Semiconductors":                  "Semiconductors",
  "UNIT2_AtomicStructure":                  "Atomic Structure",
  "UNIT3_ChemicalBondingMolecularStructure":"Chemical Bonding",
  "UNIT4_ChemicalThermodynamics":           "Thermodynamics (Chem)",
  "UNIT5_Solutions":                        "Solutions",
  "UNIT6_Equilibrium":                      "Equilibrium",
  "UNIT7_RedoxElectrochemistry":            "Electrochemistry",
  "UNIT8_ChemicalKinetics":                 "Chemical Kinetics",
  "UNIT9_ClassificationElementsPeriodicity":"Periodic Table",
  "UNIT10_pBlockElements":                  "p-Block Elements",
  "UNIT11_dAndFBlockElements":              "d & f-Block Elements",
  "UNIT12_CoordinationCompounds":           "Coordination Compounds",
  "UNIT13_PurificationCharacterisation":    "Organic Analysis",
  "UNIT14_BasicPrinciplesOrganicChemistry": "Basic Organic Chemistry",
  "UNIT15_Hydrocarbons":                    "Hydrocarbons",
  "UNIT16_OrganicHalogens":                 "Haloalkanes & Haloarenes",
  "UNIT17_OrganicOxygen":                   "Alcohols, Phenols & Carbonyls",
  "UNIT18_OrganicNitrogen":                 "Amines",
  "UNIT19_Biomolecules":                    "Biomolecules",
  "UNIT20_Polymers":                        "Polymers",
};

function subjectFromUnit(unit_code, fallback) {
  if (!unit_code || unit_code === "UNCLASSIFIED") return fallback;
  const bioStarts  = ["UNIT1_D","UNIT2_S","UNIT3_C","UNIT4_P","UNIT5_H",
                      "UNIT6_R","UNIT7_G","UNIT8_B","UNIT9_B","UNIT10_E"];
  const chemStarts = ["UNIT2_A","UNIT3_Ch","UNIT4_Ch","UNIT5_S","UNIT6_E",
                      "UNIT7_R","UNIT8_K","UNIT9_C","UNIT10_p","UNIT11_d",
                      "UNIT12_Co","UNIT13_P","UNIT14_B","UNIT15_H",
                      "UNIT16_O","UNIT17_O","UNIT18_O","UNIT19_B","UNIT20_P"];
  for (const p of bioStarts)  if (unit_code.startsWith(p)) return "Biology";
  for (const p of chemStarts) if (unit_code.startsWith(p)) return "Chemistry";
  return fallback || "Physics";
}

async function loadQuestions() {
  const res  = await fetch('data/api_bank.json');
  const data = await res.json();
  ALL_QUESTIONS = data.questions;
  return ALL_QUESTIONS;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── PRACTICE PAGE ─────────────────────────────────────────────────────
function initPractice() {
  if (!document.getElementById('questions-container')) return;
  loadQuestions().then(qs => {
    const subjectFilter = document.getElementById('filter-subject');
    const patternFilter = document.getElementById('filter-pattern');
    const diffFilter    = document.getElementById('filter-diff');
    const countEl       = document.getElementById('q-count');

    const urlSubject = getParam('subject');
    const urlUnit    = getParam('unit');
    if (urlSubject) subjectFilter.value = urlSubject;

    function render() {
      let filtered = qs.filter(q => !q.diagram_required);
      if (subjectFilter.value) filtered = filtered.filter(q => q.subject   === subjectFilter.value);
      if (patternFilter.value) filtered = filtered.filter(q => q.pattern   === patternFilter.value);
      if (diffFilter.value)    filtered = filtered.filter(q => q.difficulty === diffFilter.value);
      if (urlUnit)             filtered = filtered.filter(q => q.unit_code  === urlUnit);

      countEl.textContent = `Showing ${filtered.length} questions`;
      const container = document.getElementById('questions-container');
      container.innerHTML = '';
      filtered.forEach((q, i) => { container.innerHTML += buildQCard(q, i); });

      document.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', handleOptionClick));
      document.querySelectorAll('.show-answer-btn').forEach(btn => btn.addEventListener('click', handleShowAnswer));
    }

    subjectFilter.addEventListener('change', render);
    patternFilter.addEventListener('change', render);
    diffFilter.addEventListener('change', render);
    render();
  });
}

function buildQCard(q, i) {
  const yearTag = q.year ? `<span class="tag tag-year">NEET ${q.year}</span>` : `<span class="tag tag-year">Generated</span>`;
  return `
  <div class="q-card" id="qcard-${i}">
    <div class="q-meta">
      <span class="tag tag-subject">${q.subject}</span>
      <span class="tag tag-pattern">${q.pattern}</span>
      ${yearTag}
      <span class="tag tag-diff">${q.difficulty}</span>
    </div>
    <div class="q-text">${q.question}</div>
    <div class="options" data-correct="${q.correct_answer}" data-index="${i}">
      ${['A','B','C','D'].map(k => `
        <button class="option" data-key="${k}">${k}. ${q.options[k] || ''}</button>
      `).join('')}
    </div>
    <button class="show-answer-btn" data-index="${i}">Show Answer</button>
    <div class="explanation" id="exp-${i}">
      <strong>Correct answer: ${q.correct_answer}</strong><br/>
      ${q.explanation || ''}
      ${q.ncert_line ? `<div class="ncert-line">📖 ${q.ncert_ref}<br/><em>${q.ncert_line.substring(0,200)}...</em></div>` : ''}
    </div>
  </div>`;
}

function handleOptionClick(e) {
  const btn     = e.currentTarget;
  const options = btn.closest('.options');
  if (options.dataset.answered) return;
  const correct = options.dataset.correct;
  const chosen  = btn.dataset.key;
  const idx     = options.dataset.index;
  options.dataset.answered = '1';
  options.querySelectorAll('.option').forEach(b => {
    if (b.dataset.key === correct) b.classList.add('correct');
    else if (b.dataset.key === chosen) b.classList.add('wrong');
  });
  document.getElementById(`exp-${idx}`).classList.add('visible');
}

function handleShowAnswer(e) {
  const idx     = e.currentTarget.dataset.index;
  const qcard   = document.getElementById(`qcard-${idx}`);
  const options = qcard.querySelector('.options');
  const correct = options.dataset.correct;
  options.dataset.answered = '1';
  options.querySelectorAll('.option').forEach(b => {
    if (b.dataset.key === correct) b.classList.add('reveal');
  });
  document.getElementById(`exp-${idx}`).classList.add('visible');
}

// ── UNITS PAGE ────────────────────────────────────────────────────────
function initUnits() {
  if (!document.getElementById('units-grid')) return;
  loadQuestions().then(qs => {
    const byUnit = {};
    qs.forEach(q => {
      const code = q.unit_code || 'UNCLASSIFIED';
      if (code === 'UNCLASSIFIED') return;
      if (!byUnit[code]) {
        byUnit[code] = {
          name:    UNIT_NAMES[code] || code,
          subject: q.subject,
          count:   0
        };
      }
      byUnit[code].count++;
    });

    const max  = Math.max(...Object.values(byUnit).map(u => u.count));
    const grid = document.getElementById('units-grid');
    grid.innerHTML = '';

    Object.entries(byUnit)
      .sort((a,b) => b[1].count - a[1].count)
      .forEach(([code, u]) => {
        const pct = Math.round(u.count / max * 100);
        grid.innerHTML += `
        <a class="unit-card" href="practice.html?unit=${encodeURIComponent(code)}" data-subject="${u.subject}">
          <div class="unit-subject">${u.subject}</div>
          <div class="unit-name">${u.name}</div>
          <div class="unit-count">${u.count} questions</div>
          <div class="unit-bar"><div class="unit-bar-fill" style="width:${pct}%"></div></div>
        </a>`;
      });

    const sf = document.getElementById('filter-subject');
    if (sf) {
      sf.addEventListener('change', function() {
        document.querySelectorAll('.unit-card').forEach(card => {
          card.style.display = (!this.value || card.dataset.subject === this.value) ? 'block' : 'none';
        });
      });
    }
  });
}

// ── ROUTER ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPractice();
  initUnits();
});
