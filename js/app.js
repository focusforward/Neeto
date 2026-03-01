/* ═══════════════════════════════════════════════════════
   neetminds — app.js  v3
   Handles: Practice page + Units page
   Mock test engine is self-contained in mock.html
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONSTANTS ── */
  var CACHE_VERSION  = 'v3';
  var CACHE_TTL      = 24 * 60 * 60 * 1000; // 24 hours
  var MAX_ATTEMPTS   = 2000;
  var PAGE_SIZE      = 1; // one question at a time on practice page

  var SUBJECTS = ['Biology', 'Chemistry', 'Physics'];
  var DATA_FILES = {
    Biology:   'data/api_biology.json',
    Chemistry: 'data/api_chemistry.json',
    Physics:   'data/api_physics.json'
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
    function renderQuestion() {
      if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
          '<p style="color:#6B5C45;font-size:1rem;">No questions match your filters.</p></div>';
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
        '    <span style="font-size:0.78rem;color:#6B5C45;font-weight:500;">Question ' + num + ' of ' + tot + '</span>',
        '    <span style="font-size:0.78rem;color:#6B5C45;">' + pct + '%</span>',
        '  </div>',
        '  <div style="height:4px;background:#F0E8DE;border-radius:100px;overflow:hidden;">',
        '    <div style="height:100%;width:' + pct + '%;background:#FF6B1A;border-radius:100px;transition:width 0.3s;"></div>',
        '  </div>',
        '</div>',

        /* Question card */
        '<div class="q-card" style="padding:1.6rem;margin-bottom:1rem;">',
        '  ' + patternTag + yearTag,
        '  <p style="font-size:0.72rem;font-weight:600;color:#6B5C45;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">' +
          escHtml(q.subject || '') + ' · ' + escHtml(q.chapter || '') + '</p>',
        '  <p style="font-size:1rem;font-weight:500;line-height:1.65;color:#1A1208;margin-bottom:1.4rem;">' + escHtml(q.question || '') + '</p>',
        '  <div id="options-wrap">' + optsHtml + '</div>',
        '  <div id="explanation-wrap"></div>',
        '</div>',

        /* Nav buttons */
        '<div style="display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;">',
        '  <button onclick="window._neetSkip()" style="background:#fff;border:1.5px solid #F0E8DE;color:#6B5C45;',
        '    padding:9px 22px;border-radius:100px;font-size:0.85rem;font-weight:600;cursor:pointer;',
        '    font-family:inherit;transition:all 0.15s;" onmouseover="this.style.borderColor=\'#FF6B1A\';this.style.color=\'#FF6B1A\'" ',
        '    onmouseout="this.style.borderColor=\'#F0E8DE\';this.style.color=\'#6B5C45\'">Skip →</button>',
        '  <span style="font-size:0.78rem;color:#6B5C45;">' +
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
            '<p style="font-size:0.88rem;line-height:1.6;color:#1A1208;">' + escHtml(q.explanation) + '</p>' +
            (q.ncert_ref ? '<p style="font-size:0.72rem;color:#6B5C45;margin-top:8px;">📖 ' + escHtml(q.ncert_ref) + '</p>' : '') +
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
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
