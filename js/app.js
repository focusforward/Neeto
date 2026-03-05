/* ═══════════════════════════════════════════════════════
   NEETMINDS — app.js  v15
   Handles: Practice page + Units page

   FIXES IN v15:
   - matchTableHTML: handles rows[] schema (all 146 match questions)
   - buildDiagHtml: onerror uses _diagFallback map — no quote nesting
   - CACHE_VERSION v15 busts stale caches
   - Data loaded from root api_*.json (GitHub Pages)
   - Dark mode: var(--c-ink) everywhere
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CACHE_VERSION = 'v15';
  var CACHE_TTL     = 24 * 60 * 60 * 1000;
  var MAX_ATTEMPTS  = 2000;
  var SUBJECTS      = ['Biology', 'Chemistry', 'Physics'];

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

  /* ── CACHE ── */
  function cacheGet(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }
  function cacheSet(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }

  (function bustOld() {
    try {
      if (localStorage.getItem('neeto_cache_version') !== CACHE_VERSION) {
        SUBJECTS.forEach(function(s) {
          localStorage.removeItem('neeto_q_cache_' + s);
          localStorage.removeItem('neeto_q_ts_' + s);
        });
        localStorage.setItem('neeto_cache_version', CACHE_VERSION);
      }
    } catch(e) {}
  })();

  /* ── DATA LOADING ── */
  var _cache = {};

  function loadSubject(subject) {
    if (_cache[subject]) return Promise.resolve(_cache[subject]);
    var tsKey   = 'neeto_q_ts_' + subject;
    var dataKey = 'neeto_q_cache_' + subject;
    var ts      = parseInt(cacheGet(tsKey) || '0', 10);
    if (Date.now() - ts < CACHE_TTL) {
      var raw = cacheGet(dataKey);
      if (raw) {
        try {
          var qs = JSON.parse(raw);
          _cache[subject] = qs;
          return Promise.resolve(qs);
        } catch(e) {}
      }
    }
    return fetch(DATA_FILES[subject] + '?v=' + CACHE_VERSION)
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data) {
        var qs = Array.isArray(data) ? data : (data.questions || []);
        _cache[subject] = qs;
        try { cacheSet(dataKey, JSON.stringify(qs)); cacheSet(tsKey, String(Date.now())); } catch(e) {}
        return qs;
      })
      .catch(function(e) { console.error('Load failed', subject, e); showLoadError(); return []; });
  }

  function loadAll() {
    return Promise.all(SUBJECTS.map(loadSubject))
      .then(function(arr) { return [].concat.apply([], arr); });
  }

  function showLoadError() {
    var el = document.getElementById('questions-container');
    if (el) el.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
      + '<p style="color:#B91C1C;font-size:1rem;font-weight:600;margin-bottom:16px;">'
      + '⚠️ Failed to load questions. Check your connection.</p>'
      + '<button onclick="location.reload()" style="background:#FF6B1A;color:white;border:none;'
      + 'padding:10px 24px;border-radius:100px;font-size:0.9rem;cursor:pointer;'
      + 'font-family:inherit;font-weight:700;">↺ Retry</button></div>';
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

  /* ── ATTEMPTS ── */
  function saveAttempt(obj) {
    try {
      var attempts = JSON.parse(cacheGet('neeto_attempts') || '[]');
      attempts.push(obj);
      if (attempts.length > MAX_ATTEMPTS) attempts = attempts.slice(-MAX_ATTEMPTS);
      cacheSet('neeto_attempts', JSON.stringify(attempts));
    } catch(e) {}
  }

  /* ── LaTeX sanitiser ── */
  var SUPER = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ'};
  var SUB   = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋'};
  function toSuperscript(s) { return s.split('').map(function(c){return SUPER[c]||c;}).join(''); }
  function toSubscript(s)   { return s.split('').map(function(c){return SUB[c]||c;}).join(''); }

  function sanitiseLatex(str) {
    if (!str || str.indexOf('\\') === -1) return str;
    return str
      .replace(/\\longrightarrow|\\rightarrow|\\to\b/g, ' → ')
      .replace(/\\longleftarrow|\\leftarrow/g, ' ← ')
      .replace(/\\xrightarrow\{([^}]*)\}/g, function(_,a){ return ' →(' + a.replace(/~/g,' ') + ')→ '; })
      .replace(/\\xleftarrow\{([^}]*)\}/g,  function(_,a){ return ' ←(' + a.replace(/~/g,' ') + ')← '; })
      .replace(/\\frac\{([^}]*)\}\{\\rightarrow/g, ' →($1)→ ')
      .replace(/\\frac\{([^}]*)\}\{/g, '($1)/( ')
      .replace(/\^\{([^}]*)\}/g, function(_,a){ return toSuperscript(a); })
      .replace(/_{([^}]*)}/g,    function(_,a){ return toSubscript(a); })
      .replace(/\^(-?\d+)/g,    function(_,a){ return toSuperscript(a); })
      .replace(/_(-?\d+)/g,     function(_,a){ return toSubscript(a); })
      .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ')
      .replace(/\\delta/g,'δ').replace(/\\Delta/g,'Δ').replace(/\\epsilon/g,'ε')
      .replace(/\\lambda/g,'λ').replace(/\\mu/g,'μ').replace(/\\nu/g,'ν')
      .replace(/\\pi/g,'π').replace(/\\sigma/g,'σ').replace(/\\omega/g,'ω')
      .replace(/\\Omega/g,'Ω').replace(/\\theta/g,'θ').replace(/\\phi/g,'φ')
      .replace(/\\times/g,'×').replace(/\\div/g,'÷').replace(/\\pm/g,'±')
      .replace(/\\cdot/g,'·').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥')
      .replace(/\\neq/g,'≠').replace(/\\approx/g,'≈').replace(/\\infty/g,'∞')
      .replace(/\\text\{([^}]*)\}/g,'$1').replace(/\\mathrm\{([^}]*)\}/g,'$1').replace(/\\mathbf\{([^}]*)\}/g,'$1')
      .replace(/\\left[\(\[{|]/g,'').replace(/\\right[\)\]}|]/g,'')
      .replace(/\$([^$]+)\$/g,'$1')
      .replace(/\\\s*/g,' ').replace(/\s{2,}/g,' ').trim();
  }

  function escHtml(str) {
    var s = sanitiseLatex(String(str || ''));
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    if (!container) return;

    var params  = new URLSearchParams(window.location.search);
    var urlSubj = params.get('subject') || '';
    var urlUnit = params.get('unit')    || '';
    var urlPatt = params.get('pattern') || '';

    if (subjectEl && urlSubj) subjectEl.value = urlSubj;
    if (patternEl && urlPatt) patternEl.value = urlPatt;

    var allQuestions = [], filtered = [], currentIndex = 0, answered = false;

    /* ── FILTER ── */
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
      currentIndex = 0; answered = false;
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

    /* ══════════════════════════════════════════════════
       MATCH TABLE RENDERER
       Handles TWO schemas in the JSON:

       Schema A — ALL current questions (rows array):
         { col1_header:'Column I', col2_header:'Column II',
           rows: [{col1:'A. Object distance u', col2:'I. Negative for real object'}, ...] }

       Schema B — legacy / future imports (col1/col2 dicts):
         { col1:{A:'Object distance u',...}, col2:{I:'Negative...',...} }
    ══════════════════════════════════════════════════ */

    /* ══════════════════════════════════════════════════
       FORMAT QUESTION TEXT
       Handles Assertion-Reason, Statement I/II, lettered
       sub-lists (A. B. C. D. or 1. 2. 3.) and plain text.
    ══════════════════════════════════════════════════ */
    function formatQText(raw) {
      if (!raw) return '';
      var t = String(raw).trim();
      var arStyle = 'border-left:3px solid var(--c-brand,#FF6B1A);background:var(--c-bg,#FAFAF8);'
        + 'border-radius:0 8px 8px 0;padding:.6rem 1rem;margin-bottom:.55rem;'
        + 'font-size:.95rem;line-height:1.65;color:var(--c-ink,#1A1208);';
      var arLbl   = 'font-weight:700;color:var(--c-brand-deep,#E85500);display:block;margin-bottom:.2rem;font-size:.88rem;';
      var stemSt  = 'font-size:1rem;line-height:1.75;color:var(--c-ink,#1A1208);margin-bottom:.6rem;';
      var stKey   = 'font-weight:700;color:var(--c-brand-deep,#E85500);min-width:1.6rem;flex-shrink:0;';
      var stRow   = 'display:flex;gap:.5rem;margin-bottom:.4rem;font-size:.95rem;line-height:1.65;color:var(--c-ink,#1A1208);';
      var out = '';

      // 1. Assertion (A) / Reason (R)
      var ar = t.match(/^([\s\S]*?)\bAssertion\s*[:(（]?\s*[Aa][)）:]?\s*([\s\S]+?)\bReason\s*[:(（]?\s*[Rr][)）:]?\s*([\s\S]+)$/i);
      if (ar) {
        var pre = ar[1].trim(), ass = ar[2].trim(), rea = ar[3].trim();
        if (pre) out += '<p style="' + stemSt + '">' + escHtml(pre) + '</p>';
        out += '<div style="' + arStyle + '"><span style="' + arLbl + '">Assertion (A)</span>' + escHtml(ass) + '</div>';
        out += '<div style="' + arStyle + '"><span style="' + arLbl + '">Reason (R)</span>' + escHtml(rea) + '</div>';
        return out;
      }

      // 2. Statement I / Statement II
      var stParts = t.split(/Statement[\s\-]*(I{1,3}|[1-3])\s*[:\-]?\s*/i);
      if (stParts.length >= 5) {
        var pre2 = stParts[0].trim();
        if (pre2) out += '<p style="' + stemSt + '">' + escHtml(pre2) + '</p>';
        for (var si = 1; si < stParts.length - 1; si += 2) {
          var lbl = stParts[si].trim().toUpperCase();
          var txt = (stParts[si + 1] || '').trim();
          if (!txt) continue;
          var label = (lbl === '1' || lbl === 'I') ? 'Statement I' : (lbl === '2' || lbl === 'II') ? 'Statement II' : 'Statement III';
          out += '<div style="' + arStyle + '"><span style="' + arLbl + '">' + label + '</span>' + escHtml(txt) + '</div>';
        }
        if (out) return out;
      }

      // 3a. INLINE lettered list: "stem text: A. item; B. item; C. item"
      var inlineM = t.match(/^(.*?[.?:!])\s*A[.)]\s([\s\S]+)$/);
      if (inlineM) {
        var iStem = inlineM[1].trim();
        var iParts = inlineM[2].split(/[;,]\s*(?=[A-Ea-e][.)]\s)/);
        if (iParts.length >= 2) {
          out += '<p style="' + stemSt + '">' + escHtml(iStem) + '</p>';
          out += '<div style="margin-bottom:.9rem;">';
          var letters = ['A','B','C','D','E'];
          iParts.forEach(function(p, pi) {
            var pm = p.trim().match(/^([A-Ea-e][.)]\s*)([\s\S]+)/);
            var key = pm ? pm[1].trim() : letters[pi] + '.';
            var val = pm ? pm[2].trim() : p.trim();
            if (val) out += '<div style="' + stRow + '"><span style="' + stKey + '">' + escHtml(key) + '</span><span>' + escHtml(val) + '</span></div>';
          });
          out += '</div>';
          return out;
        }
      }

      // 3b. Newline-separated lettered list
      var lines = t.replace(/\r\n/g,'\n').split('\n');
      var itemLines = lines.filter(function(l){ return /^\s*[A-Da-d1-4][.)]\s+\S/.test(l.trim()); });
      if (itemLines.length >= 2) {
        var firstIdx = 0;
        for (var li = 0; li < lines.length; li++) {
          if (/^\s*[A-Da-d1-4][.)]\s+\S/.test(lines[li].trim())) { firstIdx = li; break; }
        }
        var stemPart = lines.slice(0, firstIdx).join(' ').trim();
        if (stemPart) out += '<p style="' + stemSt + 'margin-bottom:.5rem;">' + escHtml(stemPart) + '</p>';
        out += '<div style="margin-bottom:.9rem;">';
        lines.slice(firstIdx).forEach(function(l) {
          var lm = l.trim().match(/^([A-Da-d1-4][.)]) +([\s\S]*)/);
          if (lm) {
            out += '<div style="' + stRow + '"><span style="' + stKey + '">' + escHtml(lm[1]) + '</span><span>' + escHtml(lm[2]) + '</span></div>';
          } else if (l.trim()) {
            out += '<div style="font-size:.95rem;line-height:1.6;color:var(--c-ink,#1A1208);padding-left:2.1rem;">' + escHtml(l.trim()) + '</div>';
          }
        });
        out += '</div>';
        return out;
      }

      // 4. Plain text
      return '<p style="font-size:1rem;font-weight:500;line-height:1.65;color:var(--c-ink,#1A1208);margin-bottom:1.4rem;">' + escHtml(t) + '</p>';
    }

    function matchTableHTML(mt) {
      if (!mt) return '';
      var html = '<div class="match-table-wrap">';

      if (mt.rows && mt.rows.length) {
        var h1 = mt.col1_header || 'Column I';
        var h2 = mt.col2_header || 'Column II';
        html += '<div class="match-table-head">'
          + '<span>' + escHtml(h1) + '</span>'
          + '<span>' + escHtml(h2) + '</span>'
          + '</div>';
        for (var ri = 0; ri < mt.rows.length; ri++) {
          var row = mt.rows[ri];
          if (!row.col1 && !row.col2) continue;
          html += '<div class="match-table-row">'
            + '<div class="match-cell">' + escHtml(row.col1 || '') + '</div>'
            + '<div class="match-cell">' + escHtml(row.col2 || '') + '</div>'
            + '</div>';
        }
        return html + '</div>';
      }

      if (mt.col1 && mt.col2) {
        var c1k = Object.keys(mt.col1), c2k = Object.keys(mt.col2);
        var rowCount = Math.max(c1k.length, c2k.length);
        html += '<div class="match-table-head"><span>Column I</span><span>Column II</span></div>';
        for (var i = 0; i < rowCount; i++) {
          var k1 = c1k[i] || '', v1 = k1 ? escHtml(mt.col1[k1]) : '';
          var k2 = c2k[i] || '', v2 = k2 ? escHtml(mt.col2[k2]) : '';
          html += '<div class="match-table-row">'
            + '<div class="match-cell"><span class="match-key">' + escHtml(k1) + '</span> ' + v1 + '</div>'
            + '<div class="match-cell"><span class="match-key">' + escHtml(k2) + '</span> ' + v2 + '</div>'
            + '</div>';
        }
        return html + '</div>';
      }

      return '';
    }

    /* ══════════════════════════════════════════════════
       DIAGRAM RENDERER
       onerror strategy: register a named function in window._diagFallback
       keyed by wid. The onerror attribute just calls it by key.
       Zero nested quotes — no escaping hell.
    ══════════════════════════════════════════════════ */
    function buildDiagHtml(q) {
      if (q.pattern !== 'diagram_dhamaka') return '';

      if (q.image_url) {
        var wid = 'dw' + Math.random().toString(36).slice(2, 8);
        window._diagFallback = window._diagFallback || {};
        window._diagFallback[wid] = function() {
          var wrap = document.getElementById(wid);
          if (!wrap) return;
          wrap.innerHTML = '<div style="display:flex;align-items:center;gap:10px;'
            + 'background:#FFF8F3;border:1.5px dashed #F0E8DE;border-radius:10px;padding:14px 16px;">'
            + '<span style="font-size:1.3rem;">&#128444;&#65039;</span>'
            + '<div style="font-size:0.76rem;color:var(--c-ink-muted,#6B5C45);">'
            + 'Image could not load &#8212; refer to your NCERT book for this diagram.</div></div>';
        };
        return '<div id="' + wid + '" style="margin:0.75rem 0 1.2rem;text-align:center;">'
          + '<img src="' + q.image_url + '" alt="Diagram"'
          + ' style="max-width:100%;max-height:340px;object-fit:contain;border-radius:10px;'
          + 'border:1.5px solid #F0E8DE;background:#fff;padding:10px;display:block;margin:0 auto;"'
          + ' onerror="(function(id){var f=window._diagFallback;if(f&&f[id])f[id]();})(this.parentNode.id)"'
          + '></div>';
      }

      /* No image — placeholder */
      return '<div style="display:flex;align-items:center;gap:10px;margin:0.75rem 0 1.2rem;'
        + 'background:#FFF8F3;border:1.5px dashed #F0E8DE;border-radius:10px;padding:14px 16px;">'
        + '<span style="font-size:1.4rem;flex-shrink:0;">&#128444;&#65039;</span>'
        + '<div>'
        + '<div style="font-size:0.78rem;font-weight:700;color:#CC3300;text-transform:uppercase;'
        + 'letter-spacing:0.06em;margin-bottom:2px;">Figure Referenced</div>'
        + '<div style="font-size:0.76rem;color:var(--c-ink-muted,#6B5C45);line-height:1.5;">'
        + 'Refer to your NCERT book or past NEET paper for this diagram.</div>'
        + '</div></div>';
    }

    /* ── RENDER QUESTION ── */

    /* ── RENDER STATEMENT I / STATEMENT II — LOCKED ── */
    function renderStmtIII(q) {
      var intro = q.question_intro || '';
      var tail  = q.question_tail  || '';
      var stmts = q.statements || [];
      var html  = '';
      if (intro) html += '<p style="font-size:0.92rem;line-height:1.7;color:#1A1208;margin-bottom:14px;">' + escHtml(intro) + '</p>';
      stmts.forEach(function(s) {
        var isI = s.num === 'I' || s.num === '1';
        var color = isI ? '#4F46E5' : '#0369A1';
        var bg    = isI ? '#EEF2FF' : '#F0F9FF';
        var border= isI ? '#818CF8' : '#38BDF8';
        html += '<div style="border-radius:10px;border:1.5px solid ' + border + ';background:' + bg + ';padding:14px 16px;margin-bottom:10px;">'
          + '<span style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:' + color + ';display:block;margin-bottom:6px;">' + escHtml(s.label || ('Statement ' + s.num)) + '</span>'
          + '<p style="font-size:0.9rem;line-height:1.7;color:#1A1208;margin:0;">' + escHtml(s.text) + '</p>'
          + '</div>';
      });
      if (tail) html += '<p style="font-size:0.88rem;font-weight:600;color:#1A1208;margin-top:6px;">' + escHtml(tail) + '</p>';
      return html;
    }

    /* ── RENDER ASSERTION-REASON QUESTION ── */
    function renderARQuestion(text) {
      // Split on Assertion / Reason keywords
      var arMatch = text.match(/^([\s\S]*?)Assertion\s*[\(:]?\s*[Aa][)\:]?\s*([\s\S]+?)\s*Reason\s*[\(:]?\s*[Rr][)\:]?\s*([\s\S]+)$/i);
      if (!arMatch) return formatQText(text);
      var prefix    = arMatch[1] ? '<p style="font-size:0.92rem;line-height:1.7;margin-bottom:12px;">' + escHtml(arMatch[1].trim()) + '</p>' : '';
      var assertion = arMatch[2].trim();
      var reason    = arMatch[3].trim();
      return prefix
        + '<div style="border-radius:10px;border:1.5px solid #6366F1;background:#F5F3FF;padding:14px 16px;margin-bottom:10px;">'
        + '<span style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#6366F1;display:block;margin-bottom:6px;">Assertion (A)</span>'
        + '<p style="font-size:0.9rem;line-height:1.7;color:#1A1208;margin:0;">' + escHtml(assertion) + '</p>'
        + '</div>'
        + '<div style="border-radius:10px;border:1.5px solid #0EA5E9;background:#F0F9FF;padding:14px 16px;margin-bottom:14px;">'
        + '<span style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#0EA5E9;display:block;margin-bottom:6px;">Reason (R)</span>'
        + '<p style="font-size:0.9rem;line-height:1.7;color:#1A1208;margin:0;">' + escHtml(reason) + '</p>'
        + '</div>';
    }

        /* ── RENDER MULTI-STATEMENT QUESTION — LOCKED ── */
    function renderMSQuestion(text, q) {
      var stmtList = (q && q.statements) ? q.statements : null;
      var intro    = (q && q.question_intro) ? q.question_intro : '';
      var tailQ    = (q && q.question_tail)  ? q.question_tail  : '';

      if (!stmtList) {
        var parts = text.split('\n');
        stmtList = [];
        parts.forEach(function(p) {
          var m = p.trim().match(/^([IVX]+|[1-4])\.\s+([\s\S]+)/);
          if (m) {
            stmtList.push({ num: m[1], text: m[2].trim() });
          } else if (p.trim() && stmtList.length === 0) {
            intro += (intro ? ' ' : '') + p.trim();
          } else if (p.trim()) {
            tailQ = p.trim();
          }
        });
        if (stmtList.length > 0) {
          var last = stmtList[stmtList.length - 1];
          var tq = last.text.match(/([\s\S]+?)\s+((?:Which|Select|How many|Choose)[\s\S]+$)/i);
          if (tq) { last.text = tq[1].trim(); tailQ = tq[2].trim(); }
        }
      }

      var html = '';
      if (intro) html += '<p style="font-size:0.92rem;line-height:1.7;color:#1A1208;margin-bottom:14px;">' + escHtml(intro) + '</p>';

      if (stmtList && stmtList.length > 0) {
        html += '<div style="background:#FAFAF7;border:1.5px solid #E8DDD0;border-radius:12px;overflow:hidden;margin-bottom:14px;">';
        stmtList.forEach(function(s, i) {
          var bdr = i < stmtList.length - 1 ? 'border-bottom:1px solid #F0E8DE;' : '';
          html += '<div style="display:flex;gap:12px;padding:10px 16px;' + bdr + '">'
            + '<span style="font-weight:800;font-size:0.8rem;color:#CC3300;min-width:20px;flex-shrink:0;padding-top:2px;">' + escHtml(s.num) + '.</span>'
            + '<span style="font-size:0.9rem;line-height:1.7;color:#1A1208;">' + escHtml(s.text) + '</span>'
            + '</div>';
        });
        html += '</div>';
      }

      if (tailQ) html += '<p style="font-size:0.9rem;font-weight:600;color:#1A1208;margin-top:2px;">' + escHtml(tailQ) + '</p>';
      return html || formatQText(text);
    }

    function renderQuestion() {
      if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
          + '<p style="color:var(--c-ink-muted,#6B5C45);font-size:1rem;">'
          + 'No questions match your filters.</p></div>';
        return;
      }

      var q   = filtered[currentIndex];
      var num = currentIndex + 1, tot = filtered.length;
      answered = false;
      var qStart = Date.now();
      var pct = Math.round((num / tot) * 100);

      var optsHtml = ['A','B','C','D'].map(function(k) {
        var val = q.options && q.options[k] ? q.options[k] : '';
        if (!val) return '';
        return '<button class="neeto-opt" data-key="' + k + '" onclick="window._neetAnswer(this)">'
          + '<span class="opt-label">' + k + '.</span> ' + escHtml(val) + '</button>';
      }).join('');

      var patternTag = q.pattern && PATTERN_LABELS[q.pattern]
        ? '<span style="display:inline-block;font-size:0.72rem;font-weight:700;'
          + 'background:#FFF0E6;color:#E85500;padding:3px 10px;border-radius:100px;margin-bottom:10px;">'
          + PATTERN_LABELS[q.pattern] + '</span>'
        : '';

      var yearTag = q.year
        ? '<span style="font-size:0.72rem;color:var(--c-ink-muted,#6B5C45);margin-left:8px;">NEET ' + q.year + '</span>'
        : '';

      var hasTable  = q.match_table && (q.match_table.rows || q.match_table.col1);
      var isMatchQ  = (q.question_type === 'match') || (!hasTable && /[Cc]olumn[\s\-]I|Match\s+[Ll]ist/i.test(q.question || ''));
      var isARQ     = (q.question_type === 'assertion_reason') || /\bAssertion\s*[:(（]/i.test(q.question || '');
      var isStmtQ   = (q.question_type === 'stmt_i_ii') && q.statements && q.statements.length >= 2;
      var isMSQ     = (q.question_type === 'multi_statement') || (!isARQ && /\b(?:I|II|III|IV)\.[^\S\n]/.test(q.question || ''));
      var qMargin   = (hasTable || q.pattern === 'diagram_dhamaka') ? '0.8rem' : '1.4rem';
      var diffLabel = q.difficulty === 'L1' ? '🟢 Easy' : q.difficulty === 'L2' ? '🟡 Medium' : '🔴 Hard';

      container.innerHTML = [
        /* Progress */
        '<div style="margin-bottom:16px;">',
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">',
        '<span style="font-size:0.78rem;color:var(--c-ink-muted,#6B5C45);font-weight:500;">Question ' + num + ' of ' + tot + '</span>',
        '<span style="font-size:0.78rem;color:var(--c-ink-muted,#6B5C45);">' + pct + '%</span>',
        '</div>',
        '<div style="height:4px;background:var(--c-border,#F0E8DE);border-radius:100px;overflow:hidden;">',
        '<div style="height:100%;width:' + pct + '%;background:#FF6B1A;border-radius:100px;transition:width 0.3s;"></div>',
        '</div></div>',

        /* Card */
        '<div class="q-card" style="padding:1.6rem;margin-bottom:1rem;">',
        patternTag + yearTag,
        '<p style="font-size:0.72rem;font-weight:600;color:var(--c-ink-muted,#6B5C45);'
          + 'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">'
          + escHtml(q.subject || '') + ' · ' + escHtml(q.chapter || '') + '</p>',
        isStmtQ ? renderStmtIII(q) : (isARQ ? renderARQuestion(q.question || '') : (isMSQ ? renderMSQuestion(q.question || '', q) : formatQText(q.question || ''))),
        hasTable ? matchTableHTML(q.match_table) : (isMatchQ ? '<div class="match-notice">📋 Match the following — select the correct combination from the options below.</div>' : ''),
        buildDiagHtml(q),
        '<div id="options-wrap">' + optsHtml + '</div>',
        '<div id="explanation-wrap"></div>',
        '</div>',

        /* Nav */
        '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;">',
        '<div style="display:flex;gap:8px;">',
        (currentIndex > 0 ? '<button class="skip-btn prev-btn" onclick="window._neetPrev()">← Prev</button>' : ''),
        '<button class="skip-btn" onclick="window._neetSkip()">Skip →</button>',
        '</div>',
        '<span style="font-size:0.78rem;color:var(--c-ink-muted,#6B5C45);">' + diffLabel + '</span>',
        '</div>'
      ].join('\n');

      /* Answer handler */
      window._neetAnswer = function(btn) {
        if (answered) return;
        answered = true;
        // Hide skip button once answered — Next Question takes over
        var skipBtns = document.querySelectorAll('.skip-btn');
        skipBtns.forEach(function(b){ if(b.textContent.indexOf('Skip') > -1) b.style.display = 'none'; });
        var chosen  = btn.getAttribute('data-key');
        var correct = (q.correct_answer || '').toUpperCase();
        var isRight = chosen === correct;
        var elapsed = Date.now() - qStart;
        if (window._practiceAnswered) window._practiceAnswered(isRight);

        var wrap = document.getElementById('options-wrap');
        if (wrap) {
          wrap.querySelectorAll('.neeto-opt').forEach(function(b) {
            var k = b.getAttribute('data-key');
            if (k === correct)     b.classList.add('neeto-correct');
            else if (k === chosen) b.classList.add('neeto-wrong');
            else                   b.classList.add('neeto-dim');
          });
        }

        var expWrap = document.getElementById('explanation-wrap');
        if (expWrap) {
          var explHtml = '';
          if (q.explanation) {
            explHtml = '<div class="explanation" style="margin-top:1rem;padding:1rem 1.2rem;">'
              + '<p style="font-size:0.78rem;font-weight:700;color:#E85500;margin-bottom:6px;">💡 Explanation</p>'
              + '<p style="font-size:0.88rem;line-height:1.65;color:var(--c-ink,#1A1208);">' + escHtml(q.explanation) + '</p>'
              + (q.ncert_ref ? '<p style="font-size:0.72rem;color:var(--c-ink-muted,#6B5C45);margin-top:8px;">📖 ' + escHtml(q.ncert_ref) + '</p>' : '')
              + '</div>';
          }
          expWrap.innerHTML = explHtml
            + '<div style="margin-top:12px;text-align:center;">'
            + '<button onclick="window._neetNext()" style="background:#FF6B1A;color:#fff;border:none;'
            + 'padding:10px 32px;border-radius:100px;font-size:0.9rem;font-weight:700;cursor:pointer;'
            + 'font-family:inherit;box-shadow:0 4px 14px rgba(255,107,26,0.3);">Next Question →</button>'
            + '</div>';
        }

        saveAttempt({
          type:'practice', questionId:q.id||'', subject:q.subject||'',
          chapter:q.unit_code||'', chapterName:q.chapter||'', pattern:q.pattern||'',
          difficulty:q.difficulty||'', userAnswer:chosen, correctAnswer:correct,
          isCorrect:isRight, timeSpentMs:elapsed, year:q.year||'', ts:Date.now()
        });
      };

      window._neetSkip = function() {
        if (!answered) {
          saveAttempt({
            type:'practice', questionId:q.id||'', subject:q.subject||'',
            chapter:q.unit_code||'', chapterName:q.chapter||'', pattern:q.pattern||'',
            difficulty:q.difficulty||'', userAnswer:null,
            correctAnswer:(q.correct_answer||'').toUpperCase(),
            isCorrect:false, timeSpentMs:Date.now()-qStart, year:q.year||'', ts:Date.now()
          });
        }
        window._neetNext();
      };

      window._neetPrev = function() {
        if (currentIndex > 0) {
          currentIndex--;
          answered = false;
          renderQuestion();
        }
      };

      window._neetNext = function() {
        currentIndex++;
        if (currentIndex >= filtered.length) {
          filtered = shuffle(filtered); currentIndex = 0;
          container.innerHTML = '<div style="text-align:center;padding:40px 20px;'
            + 'background:#F0FDF4;border-radius:18px;border:1.5px solid #22C55E;margin-bottom:20px;">'
            + '<p style="font-size:1.5rem;margin-bottom:8px;">🎉</p>'
            + '<p style="font-family:\'Fraunces\',serif;font-size:1.2rem;font-weight:900;color:#15803D;margin-bottom:6px;">'
            + 'You finished this set!</p>'
            + '<p style="font-size:0.88rem;color:var(--c-ink-muted,#6B5C45);margin-bottom:16px;">'
            + 'Starting again with a fresh shuffle...</p>'
            + '<button onclick="window._neetNext()" style="background:#FF6B1A;color:#fff;border:none;'
            + 'padding:10px 28px;border-radius:100px;font-size:0.9rem;font-weight:700;cursor:pointer;'
            + 'font-family:inherit;">Continue →</button></div>';
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

    /* ── LOAD ── */
    if (urlSubj) {
      loadSubject(urlSubj).then(function(qs) { allQuestions = qs; applyFilters(); });
    } else {
      loadAll().then(function(qs) { allQuestions = qs; applyFilters(); });
    }
  }

  /* ══════════════════════════════════════════════════
     UNITS PAGE
  ══════════════════════════════════════════════════ */
  function initUnitsPage() {
    var grid = document.getElementById('units-grid');
    if (!grid) return;
    loadAll().then(function(allQs) {
      var unitMap = {};
      allQs.forEach(function(q) {
        var key = q.unit_code || 'UNIT_GENERAL';
        if (!unitMap[key]) {
          unitMap[key] = { unit_code:key, chapter:q.chapter||key, subject:q.subject||'', count:0 };
        }
        unitMap[key].count++;
      });
      var units = Object.values(unitMap).sort(function(a, b) {
        if (a.subject < b.subject) return -1;
        if (a.subject > b.subject) return 1;
        return (a.chapter||'').localeCompare(b.chapter||'');
      });
      grid.innerHTML = units.map(function(u) {
        var sc = u.subject === 'Biology'   ? 'unit-subject-bio'
               : u.subject === 'Chemistry' ? 'unit-subject-chem'
               :                             'unit-subject-phys';
        var url = 'practice.html?subject=' + encodeURIComponent(u.subject)
                + '&unit=' + encodeURIComponent(u.unit_code);
        return '<a class="unit-card" href="' + url + '">'
          + '<span class="unit-subject ' + sc + '">' + escHtml(u.subject) + '</span>'
          + '<div class="unit-name">' + escHtml(u.chapter) + '</div>'
          + '<div class="unit-count">' + u.count + ' question' + (u.count !== 1 ? 's' : '') + '</div>'
          + '</a>';
      }).join('\n');

      var filterEl = document.getElementById('filter-subject');
      if (filterEl) {
        filterEl.addEventListener('change', function() {
          var val = this.value;
          document.querySelectorAll('.unit-card').forEach(function(card) {
            var subj = card.querySelector('.unit-subject');
            card.style.display = (!val || (subj && subj.textContent.trim() === val)) ? '' : 'none';
          });
        });
      }
    });
  }

  /* ── INIT ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initPracticePage(); initUnitsPage(); });
  } else {
    initPracticePage(); initUnitsPage();
  }

})();
