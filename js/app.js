/* ═══════════════════════════════════════════════════════
   neetminds — app.js  v3
   Handles: Practice page + Units page
   Mock test engine is self-contained in mock.html
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONSTANTS ── */
  var CACHE_VERSION  = 'v13';
  var CACHE_TTL      = 24 * 60 * 60 * 1000; // 24 hours
  var MAX_ATTEMPTS   = 2000;
  var PAGE_SIZE      = 1; // one question at a time on practice page

  var SUBJECTS = ['Biology', 'Chemistry', 'Physics'];
  var DATA_FILES = {
    Biology:   'api_biology.json',
    Chemistry: 'api_chemistry.json',
    Physics:   'api_physics.json'
  };

  var PATTERN_LABELS = {
    memory_test:     '🎯 Memory Test',
    negative_charge: '⚡ Negative Charge',
    concept_guru:    '🌀 Concept Guru',
    diagram_dhamaka: '🖼️ Diagram Dhamaka',
    speed_breaker:   '⛔ Speed Breaker',
    best_choice:     '🔽 Best Choice'
  };

  /* ── CACHE HELPERS ── */
  function cacheGet(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  }
  function cacheSet(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  }

  // Clear old cache if version changed
  (function migrateCacheVersion() {
    try {
      if (localStorage.getItem('neeto_cache_version') !== CACHE_VERSION) {
        SUBJECTS.forEach(function(s) {
          localStorage.removeItem('neeto_q_cache_' + s);
          localStorage.removeItem('neeto_q_ts_'    + s);
        });
        localStorage.setItem('neeto_cache_version', CACHE_VERSION);
      }
    } catch(e) {}
  })();

  /* ── DATA LOADING ── */
  var _cache = {};

  function loadSubject(subject) {
    if (_cache[subject]) return Promise.resolve(_cache[subject]);

    // Check localStorage cache
    var tsKey    = 'neeto_q_ts_' + subject;
    var dataKey  = 'neeto_q_cache_' + subject;
    var ts       = parseInt(cacheGet(tsKey) || '0', 10);
    var now      = Date.now();

    if ((now - ts) < CACHE_TTL) {
      var raw = cacheGet(dataKey);
      if (raw) {
        try {
          var qs = JSON.parse(raw);
          _cache[subject] = qs;
          return Promise.resolve(qs);
        } catch(e) {}
      }
    }

    // Fetch fresh
    return fetch(DATA_FILES[subject] + '?v=' + CACHE_VERSION)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var qs = Array.isArray(data) ? data : (data.questions || []);
        _cache[subject] = qs;
        try {
          cacheSet(dataKey, JSON.stringify(qs));
          cacheSet(tsKey,   String(Date.now()));
        } catch(e) {}
        return qs;
      })
      .catch(function(e) {
        console.error('Failed to load', subject, e);
        showLoadError();
        return [];
      });
  }

  function loadAll() {
    return Promise.all(SUBJECTS.map(loadSubject))
      .then(function(arrays) {
        return [].concat.apply([], arrays);
      });
  }

  function showLoadError() {
    var el = document.getElementById('questions-container');
    if (el) el.innerHTML = [
      '<div style="text-align:center;padding:60px 20px;">',
      '<p style="color:#B91C1C;font-size:1rem;margin-bottom:16px;font-weight:600;">⚠️ Failed to load questions. Check your connection.</p>',
      '<button onclick="location.reload()" style="background:#FF6B1A;color:white;border:none;',
      'padding:10px 24px;border-radius:100px;font-size:0.9rem;cursor:pointer;',
      'font-family:inherit;font-weight:700;">↺ Retry</button>',
      '</div>'
    ].join('');
  }

  /* ── SHUFFLE ── */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── ATTEMPTS TRACKING ── */
  function saveAttempt(obj) {
    try {
      var attempts = JSON.parse(cacheGet('neeto_attempts') || '[]');
      attempts.push(obj);
      if (attempts.length > MAX_ATTEMPTS) attempts = attempts.slice(-MAX_ATTEMPTS);
      cacheSet('neeto_attempts', JSON.stringify(attempts));
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════════
     PRACTICE PAGE
  ══════════════════════════════════════════════════ */
  function initPracticePage() {
    var subjectEl = document.getElementById('filter-subject');
    var patternEl = document.getElementById('filter-pattern');
    var diffEl    = document.getElementById('filter-diff');
    var countEl   = document.getElementById('q-count');
    var container = document.getElementById('questions-container');

    if (!container) return; // not on practice page

    // Read URL params
    var params  = new URLSearchParams(window.location.search);
    var urlSubj = params.get('subject') || '';
    var urlUnit = params.get('unit') || '';
    var urlPatt = params.get('pattern') || '';

    if (subjectEl && urlSubj) subjectEl.value = urlSubj;
    if (patternEl && urlPatt) patternEl.value = urlPatt;

    var allQuestions = [];
    var filtered     = [];
    var currentIndex = 0;
    var answered     = false;
    var sessionStart = Date.now();

    /* ── FILTER LOGIC ── */
    function applyFilters() {
      var subj = subjectEl ? subjectEl.value : urlSubj;
      var patt = patternEl ? patternEl.value : urlPatt;
      var diff = diffEl    ? diffEl.value    : '';

      filtered = allQuestions.filter(function(q) {
        if (subj && q.subject !== subj) return false;
        if (patt && q.pattern !== patt) return false;
        if (diff && q.difficulty !== diff) return false;
        if (urlUnit && q.unit_code !== urlUnit && q.chapter !== urlUnit) return false;
        return true;
      });

      filtered = shuffle(filtered);
      currentIndex = 0;
      answered = false;

      if (countEl) {
        var label = filtered.length + ' question' + (filtered.length !== 1 ? 's' : '');
        var parts = [];
        if (subj) parts.push(subj);
        if (patt && PATTERN_LABELS[patt]) parts.push(PATTERN_LABELS[patt]);
        if (diff) parts.push(diff);
        if (urlUnit) parts.push('this unit');
        countEl.textContent = label + (parts.length ? ' · ' + parts.join(', ') : ' · All subjects');
      }

      renderQuestion();
    }

    /* ── RENDER ONE QUESTION ── */
    /* ── Diagram image / placeholder renderer ───────────── */
    function buildDiagHtml(q) {
      if (q.pattern !== 'diagram_dhamaka') return '';

      if (q.image_url) {
        /*
         * Use a unique wrapper ID.
         * onerror calls a self-invoking function that gets the wrapper by ID
         * and replaces it — zero quote-nesting issues.
         */
        var wid = 'dw' + Math.random().toString(36).slice(2, 8);
        return '<div id="' + wid + '" style="margin:0.75rem 0 1.2rem;text-align:center;">'
          + '<img src="' + q.image_url + '" alt="Diagram"'
          + ' style="max-width:100%;max-height:340px;object-fit:contain;border-radius:10px;'
          + 'border:1.5px solid #F0E8DE;background:#fff;padding:10px;display:block;margin:0 auto;"'
          + ' onerror="window.__diagErr=function(id){var w=document.getElementById(id);'
          + 'if(w)w.innerHTML=\'<div style="display:flex;align-items:center;gap:10px;'
          + 'background:#FFF8F3;border:1.5px dashed #F0E8DE;border-radius:10px;padding:14px 16px;">'
          + '<span style=\\"font-size:1.3rem;\\">🖼️</span>'
          + '<div style=\\"font-size:0.76rem;color:#6B5C45;\\">Image could not load — refer to your NCERT book for this diagram.</div>'
          + "</div>';};window.__diagErr('" + wid + "')\""
          + '></div>';
      }

      /* No image stored — informational placeholder */
      return '<div style="display:flex;align-items:center;gap:10px;margin:0.75rem 0 1.2rem;'
        + 'background:#FFF8F3;border:1.5px dashed #F0E8DE;border-radius:10px;padding:14px 16px;">'
        + '<span style="font-size:1.4rem;flex-shrink:0;">🖼️</span>'
        + '<div><div style="font-size:0.78rem;font-weight:700;color:#CC3300;'
        + 'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Figure referenced</div>'
        + '<div style="font-size:0.76rem;color:var(--c-ink-muted,#6B5C45);line-height:1.5;">'
        + 'Refer to your NCERT book or past NEET paper for this diagram.</div></div></div>';
    }

    /* ── Match-table renderer ──────────────────────────── */
    function matchTableHTML(mt) {
      if (!mt || !mt.col1 || !mt.col2) return '';
      var c1keys = Object.keys(mt.col1);
      var c2keys = Object.keys(mt.col2);
      var rows   = Math.max(c1keys.length, c2keys.length);
      var html   = '<div class="match-table-wrap">';
      html += '<div class="match-table-head"><span>Column I</span><span>Column II</span></div>';
      for (var i = 0; i < rows; i++) {
        var k1 = c1keys[i] || '';
        var v1 = k1 ? escHtml(mt.col1[k1]) : '';
        var k2 = c2keys[i] || '';
        var v2 = k2 ? escHtml(mt.col2[k2]) : '';
        html += '<div class="match-table-row">';
        html += '<div class="match-cell"><span class="match-key">' + escHtml(k1) + '</span>' + v1 + '</div>';
        html += '<div class="match-cell"><span class="match-key">' + escHtml(k2) + '</span>' + v2 + '</div>';
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    function renderQuestion() {
      if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
          '<p style="color:var(--c-ink-muted,#6B5C45);font-size:1rem;">No questions match your filters.</p></div>';
        return;
      }

      var q   = filtered[currentIndex];
      var num = currentIndex + 1;
      var tot = filtered.length;
      answered = false;
      var qStart = Date.now();

      /* progress bar */
      var pct = Math.round((num / tot) * 100);

      var optKeys = ['A','B','C','D'];
      var optsHtml = optKeys.map(function(k) {
        var val = (q.options && q.options[k]) ? q.options[k] : '';
        if (!val) return '';
        return '<button class="neeto-opt" data-key="' + k + '" onclick="window._neetAnswer(this)">' +
          '<span class="opt-label">' + k + '</span> ' + escHtml(val) + '</button>';
      }).join('');

      var patternTag = '';
      if (q.pattern && PATTERN_LABELS[q.pattern]) {
        patternTag = '<span style="display:inline-block;font-size:0.72rem;font-weight:700;' +
          'background:#FFF0E6;color:#E85500;padding:3px 10px;border-radius:100px;margin-bottom:10px;">' +
          PATTERN_LABELS[q.pattern] + '</span>';
      }

      var yearTag = q.year ? '<span style="font-size:0.72rem;color:#6B5C45;margin-left:8px;">NEET ' + q.year + '</span>' : '';

      container.innerHTML = [
        /* Progress */
        '<div style="margin-bottom:16px;">',
        '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">',
        '    <span style="font-size:0.78rem;color:var(--c-ink-muted,#6B5C45);font-weight:500;">Question ' + num + ' of ' + tot + '</span>',
        '    <span style="font-size:0.78rem;color:#6B5C45;">' + pct + '%</span>',
        '  </div>',
        '  <div style="height:4px;background:#F0E8DE;border-radius:100px;overflow:hidden;">',
        '    <div style="height:100%;width:' + pct + '%;background:#FF6B1A;border-radius:100px;transition:width 0.3s;"></div>',
        '  </div>',
        '</div>',

        /* Question card */
        '<div class="q-card" style="padding:1.6rem;margin-bottom:1rem;">',
        '  ' + patternTag + yearTag,
        '  <p style="font-size:0.72rem;font-weight:600;color:var(--c-ink-muted,#6B5C45);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">' +
          escHtml(q.subject || '') + ' · ' + escHtml(q.chapter || '') + '</p>',
        '  <p style="font-size:1rem;font-weight:500;line-height:1.65;color:var(--c-ink,#1A1208);margin-bottom:' + (q.match_table ? '0.8rem' : '1.4rem') + ';">' + escHtml(q.question || '') + '</p>',
        (q.match_table ? matchTableHTML(q.match_table) : ''),
        buildDiagHtml(q),
        '  <div id="options-wrap">' + optsHtml + '</div>',
        '  <div id="explanation-wrap"></div>',
        '</div>',

        /* Nav buttons */
        '<div style="display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;">',
        '  <button class="skip-btn" onclick="window._neetSkip()">Skip →</button>',
        '  <span style="font-size:0.78rem;color:var(--c-ink-muted,#6B5C45);">' +
          (q.difficulty === 'L1' ? '🟢 Easy' : q.difficulty === 'L2' ? '🟡 Medium' : '🔴 Hard') +
          '</span>',
        '</div>'
      ].join('\n');

      /* expose answer handler */
      window._neetAnswer = function(btn) {
        if (answered) return;
        answered = true;
        var chosen  = btn.getAttribute('data-key');
        var correct = (q.correct_answer || '').toUpperCase();
        var isRight = chosen === correct;
        var elapsed = Date.now() - qStart;

        /* colour options */
        var wrap = document.getElementById('options-wrap');
        if (wrap) {
          var btns = wrap.querySelectorAll('.neeto-opt');
          btns.forEach(function(b) {
            var k = b.getAttribute('data-key');
            if (k === correct) {
              b.classList.add('neeto-correct');
            } else if (k === chosen) {
              b.classList.add('neeto-wrong');
            } else {
              b.classList.add('neeto-dim');
            }
          });
        }

        /* explanation */
        var expWrap = document.getElementById('explanation-wrap');
        if (expWrap && q.explanation) {
          expWrap.innerHTML = '<div class="explanation" style="margin-top:1rem;padding:1rem 1.2rem;">' +
            '<p style="font-size:0.78rem;font-weight:700;color:#E85500;margin-bottom:6px;">💡 Explanation</p>' +
            '<p style="font-size:0.88rem;line-height:1.6;color:var(--c-ink,#1A1208);">' + escHtml(q.explanation) + '</p>' +
            (q.ncert_ref ? '<p style="font-size:0.72rem;color:var(--c-ink-muted,#6B5C45);margin-top:8px;">📖 ' + escHtml(q.ncert_ref) + '</p>' : '') +
            '</div>' +
            '<div style="margin-top:12px;text-align:center;">' +
            '<button onclick="window._neetNext()" style="background:#FF6B1A;color:#fff;border:none;' +
            'padding:10px 32px;border-radius:100px;font-size:0.9rem;font-weight:700;cursor:pointer;' +
            'font-family:inherit;box-shadow:0 4px 14px rgba(255,107,26,0.3);">Next Question →</button>' +
            '</div>';
        } else if (expWrap) {
          expWrap.innerHTML = '<div style="margin-top:12px;text-align:center;">' +
            '<button onclick="window._neetNext()" style="background:#FF6B1A;color:#fff;border:none;' +
            'padding:10px 32px;border-radius:100px;font-size:0.9rem;font-weight:700;cursor:pointer;' +
            'font-family:inherit;box-shadow:0 4px 14px rgba(255,107,26,0.3);">Next Question →</button>' +
            '</div>';
        }

        /* save attempt */
        saveAttempt({
          type: 'practice',
          questionId: q.id || '',
          subject: q.subject || '',
          chapter: q.unit_code || '',
          chapterName: q.chapter || '',
          pattern: q.pattern || '',
          difficulty: q.difficulty || '',
          userAnswer: chosen,
          correctAnswer: correct,
          isCorrect: isRight,
          timeSpentMs: elapsed,
          year: q.year || '',
          ts: Date.now()
        });
      };

      window._neetSkip = function() {
        if (!answered) {
          saveAttempt({
            type: 'practice',
            questionId: q.id || '',
            subject: q.subject || '',
            chapter: q.unit_code || '',
            chapterName: q.chapter || '',
            pattern: q.pattern || '',
            difficulty: q.difficulty || '',
            userAnswer: null,
            correctAnswer: (q.correct_answer || '').toUpperCase(),
            isCorrect: false,
            timeSpentMs: Date.now() - qStart,
            year: q.year || '',
            ts: Date.now()
          });
        }
        window._neetNext();
      };

      window._neetNext = function() {
        currentIndex++;
        if (currentIndex >= filtered.length) {
          /* End of filtered set — reshuffle and restart */
          filtered = shuffle(filtered);
          currentIndex = 0;
          container.innerHTML = [
            '<div style="text-align:center;padding:40px 20px;background:#F0FDF4;border-radius:18px;border:1.5px solid #22C55E;margin-bottom:20px;">',
            '<p style="font-size:1.5rem;margin-bottom:8px;">🎉</p>',
            '<p style="font-family:\'Fraunces\',serif;font-size:1.2rem;font-weight:900;color:#15803D;margin-bottom:6px;">You finished this set!</p>',
            '<p style="font-size:0.88rem;color:#6B5C45;margin-bottom:16px;">Starting again with a fresh shuffle...</p>',
            '<button onclick="window._neetNext()" style="background:#FF6B1A;color:#fff;border:none;',
            'padding:10px 28px;border-radius:100px;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:inherit;">Continue →</button>',
            '</div>'
          ].join('');
          /* Don't call renderQuestion yet — let the button trigger it */
          window._neetNext = function() { renderQuestion(); };
          return;
        }
        renderQuestion();
      };
    }

    /* ── BIND FILTERS ── */
    [subjectEl, patternEl, diffEl].forEach(function(el) {
      if (el) el.addEventListener('change', applyFilters);
    });

    /* ── LOAD DATA ── */
    var subjectToLoad = urlSubj || '';
    if (subjectToLoad) {
      loadSubject(subjectToLoad).then(function(qs) {
        allQuestions = qs;
        applyFilters();
      });
    } else {
      loadAll().then(function(qs) {
        allQuestions = qs;
        applyFilters();
      });
    }
  }

  /* ══════════════════════════════════════════════════
     UNITS PAGE
  ══════════════════════════════════════════════════ */
  function initUnitsPage() {
    var grid = document.getElementById('units-grid');
    if (!grid) return;

    loadAll().then(function(allQs) {
      /* Build unit map */
      var unitMap = {};
      allQs.forEach(function(q) {
        var key = q.unit_code || 'UNIT_GENERAL';
        if (!unitMap[key]) {
          unitMap[key] = {
            unit_code: key,
            chapter: q.chapter || key,
            subject: q.subject || '',
            count: 0
          };
        }
        unitMap[key].count++;
      });

      /* Sort: by subject then chapter */
      var units = Object.values(unitMap).sort(function(a, b) {
        if (a.subject < b.subject) return -1;
        if (a.subject > b.subject) return 1;
        return (a.chapter || '').localeCompare(b.chapter || '');
      });

      /* Render cards */
      grid.innerHTML = units.map(function(u) {
        var subjClass = u.subject === 'Biology'   ? 'unit-subject-bio'  :
                        u.subject === 'Chemistry' ? 'unit-subject-chem' :
                        u.subject === 'Physics'   ? 'unit-subject-phys' : '';
        var url = 'practice.html?subject=' + encodeURIComponent(u.subject) +
                  '&unit=' + encodeURIComponent(u.unit_code);
        return [
          '<a class="unit-card" href="' + url + '">',
          '  <span class="unit-subject ' + subjClass + '">' + escHtml(u.subject) + '</span>',
          '  <div class="unit-name">' + escHtml(u.chapter) + '</div>',
          '  <div class="unit-count">' + u.count + ' question' + (u.count !== 1 ? 's' : '') + '</div>',
          '</a>'
        ].join('\n');
      }).join('\n');

      /* Subject filter (units page) */
      var filterEl = document.getElementById('filter-subject');
      if (filterEl) {
        filterEl.addEventListener('change', function() {
          var val = this.value;
          document.querySelectorAll('.unit-card').forEach(function(card) {
            var subj = card.querySelector('.unit-subject');
            var match = !val || (subj && subj.textContent.trim() === val);
            card.style.display = match ? '' : 'none';
          });
        });
      }
    });
  }

  /* ── ESCAPE HTML ── */
  /* ── LaTeX → readable-text sanitiser ──────────────── */
  function sanitiseLatex(str) {
    if (!str || str.indexOf('\\') === -1) return str;
    return str
      // Arrows
      .replace(/\\longrightarrow|\\rightarrow|\\to\b/g, ' → ')
      .replace(/\\longleftarrow|\\leftarrow/g, ' ← ')
      .replace(/\\xrightarrow\{([^}]*)\}/g, function(_,a){ return ' →(' + a.replace(/~/g,' ') + ')→ '; })
      .replace(/\\xleftarrow\{([^}]*)\}/g, function(_,a){ return ' ←(' + a.replace(/~/g,' ') + ')← '; })
      // Fractions used as reaction-condition notation: \frac{label}{\rightarrow ...}
      .replace(/\\frac\{([^}]*)\}\{\\rightarrow/g, ' →($1)→ ')
      .replace(/\\frac\{([^}]*)\}\{/g, '($1)/( ')
      // Super/subscripts
      .replace(/\^\{([^}]*)\}/g, function(_,a){ return toSuperscript(a); })
      .replace(/_{([^}]*)}/g, function(_,a){ return toSubscript(a); })
      .replace(/\^(-?\d+)/g, function(_,a){ return toSuperscript(a); })
      .replace(/_(-?\d+)/g, function(_,a){ return toSubscript(a); })
      // Greek letters
      .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ')
      .replace(/\\delta/g,'δ').replace(/\\Delta/g,'Δ').replace(/\\epsilon/g,'ε')
      .replace(/\\lambda/g,'λ').replace(/\\mu/g,'μ').replace(/\\nu/g,'ν')
      .replace(/\\pi/g,'π').replace(/\\sigma/g,'σ').replace(/\\omega/g,'ω')
      .replace(/\\Omega/g,'Ω').replace(/\\theta/g,'θ').replace(/\\phi/g,'φ')
      // Math operators
      .replace(/\\times/g,'×').replace(/\\div/g,'÷').replace(/\\pm/g,'±')
      .replace(/\\cdot/g,'·').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥')
      .replace(/\\neq/g,'≠').replace(/\\approx/g,'≈').replace(/\\infty/g,'∞')
      // Formatting
      .replace(/\\text\{([^}]*)\}/g,'$1')
      .replace(/\\mathrm\{([^}]*)\}/g,'$1')
      .replace(/\\mathbf\{([^}]*)\}/g,'$1')
      .replace(/\\left[\(\[{|]/g,'').replace(/\\right[\)\]}|]/g,'')
      // Inline $ delimiters
      .replace(/\$([^$]+)\$/g,'$1')
      // Clean up stray backslashes and double-spaces
      .replace(/\\\s*/g,' ')
      .replace(/\s{2,}/g,' ')
      .trim();
  }

  var SUPER = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ'};
  var SUB   = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋'};
  function toSuperscript(s){ return s.split('').map(function(c){ return SUPER[c]||c; }).join(''); }
  function toSubscript(s)  { return s.split('').map(function(c){ return SUB[c]  ||c; }).join(''); }

  function escHtml(str) {
    var s = sanitiseLatex(String(str || ''));
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── INIT ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initPracticePage();
      initUnitsPage();
    });
  } else {
    initPracticePage();
    initUnitsPage();
  }

})();

