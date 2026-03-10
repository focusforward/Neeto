/* ═══════════════════════════════════════════════════════
   neetminds — app.js  v16
   Handles: Practice page + Units page
   Question renderers:
     - Assertion (A) / Reason (R)  → styled blocks
     - Statement I / Statement II  → styled blocks (any preamble)
     - Numbered I. II. III. IV.    → numbered list with stem/trailer
     - Match table {rows:[]}       → two-column table
     - Plain text                  → paragraph
═══════════════════════════════════════════════════════ */
(function(){
'use strict';

var CACHE_VERSION='v16';
var CACHE_TTL=24*60*60*1000;
var MAX_ATTEMPTS=2000;
var SUBJECTS=['Biology','Chemistry','Physics'];
var DATA_FILES={Biology:'api_biology.json',Chemistry:'api_chemistry.json',Physics:'api_physics.json'};
var PATTERN_LABELS={memory_test:'🎯 Memory Test',negative_charge:'⚡ Negative Charge',concept_guru:'🌀 Concept Guru',diagram_dhamaka:'🖼️ Diagram Dhamaka',speed_breaker:'⛔ Speed Breaker',best_choice:'🔽 Best Choice'};

function cacheGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function cacheSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}

(function migrateCache(){
  try{
    if(localStorage.getItem('neeto_cache_version')!==CACHE_VERSION){
      SUBJECTS.forEach(function(s){localStorage.removeItem('neeto_q_cache_'+s);localStorage.removeItem('neeto_q_ts_'+s);});
      localStorage.setItem('neeto_cache_version',CACHE_VERSION);
    }
  }catch(e){}
})();

var _cache={};
function loadSubject(subject){
  if(_cache[subject])return Promise.resolve(_cache[subject]);
  var tsKey='neeto_q_ts_'+subject,dataKey='neeto_q_cache_'+subject;
  var ts=parseInt(cacheGet(tsKey)||'0',10);
  if(Date.now()-ts<CACHE_TTL){var raw=cacheGet(dataKey);if(raw){try{var qs=JSON.parse(raw);_cache[subject]=qs;return Promise.resolve(qs);}catch(e){}}}
  return fetch(DATA_FILES[subject]+'?v='+CACHE_VERSION)
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(data){
      var qs=Array.isArray(data)?data:(data.questions||[]);
      _cache[subject]=qs;
      try{cacheSet(dataKey,JSON.stringify(qs));cacheSet(tsKey,String(Date.now()));}catch(e){}
      return qs;
    })
    .catch(function(e){console.error('Load failed',subject,e);showLoadError();return[];});
}
function loadAll(){return Promise.all(SUBJECTS.map(loadSubject)).then(function(arrs){return[].concat.apply([],arrs);});}
function showLoadError(){var el=document.getElementById('questions-container');if(el)el.innerHTML='<div style="text-align:center;padding:60px 20px;"><p style="color:#B91C1C;font-size:1rem;margin-bottom:16px;font-weight:600;">⚠️ Failed to load questions. Check your connection.</p><button onclick="location.reload()" style="background:#FF6B1A;color:#fff;border:none;padding:10px 24px;border-radius:100px;font-size:0.9rem;cursor:pointer;font-family:inherit;font-weight:700;">↺ Retry</button></div>';}
function shuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function saveAttempt(obj){try{var list=JSON.parse(cacheGet('neeto_attempts')||'[]');list.push(obj);if(list.length>MAX_ATTEMPTS)list=list.slice(-MAX_ATTEMPTS);cacheSet('neeto_attempts',JSON.stringify(list));}catch(e){}}

/* ── TEXT HELPERS ── */
var SUPER={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ'};
var SUB={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋'};
function toSup(s){return s.split('').map(function(c){return SUPER[c]||c;}).join('');}
function toSub(s){return s.split('').map(function(c){return SUB[c]||c;}).join('');}
function sanitiseLatex(str){
  if(!str||str.indexOf('\\')===-1)return str;
  return str
    .replace(/\\longrightarrow|\\rightarrow|\\to\b/g,' → ').replace(/\\longleftarrow|\\leftarrow/g,' ← ')
    .replace(/\\xrightarrow\{([^}]*)\}/g,function(_,a){return' →('+a.replace(/~/g,' ')+')→ ';})
    .replace(/\\xleftarrow\{([^}]*)\}/g,function(_,a){return' ←('+a.replace(/~/g,' ')+')← ';})
    .replace(/\\frac\{([^}]*)\}\{\\rightarrow/g,' →($1)→ ').replace(/\\frac\{([^}]*)\}\{/g,'($1)/( ')
    .replace(/\^\{([^}]*)\}/g,function(_,a){return toSup(a);}).replace(/_{([^}]*)}/g,function(_,a){return toSub(a);})
    .replace(/\^(-?\d+)/g,function(_,a){return toSup(a);}).replace(/_(-?\d+)/g,function(_,a){return toSub(a);})
    .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ').replace(/\\delta/g,'δ').replace(/\\Delta/g,'Δ')
    .replace(/\\epsilon/g,'ε').replace(/\\lambda/g,'λ').replace(/\\mu/g,'μ').replace(/\\nu/g,'ν')
    .replace(/\\pi/g,'π').replace(/\\sigma/g,'σ').replace(/\\omega/g,'ω').replace(/\\Omega/g,'Ω')
    .replace(/\\theta/g,'θ').replace(/\\phi/g,'φ')
    .replace(/\\times/g,'×').replace(/\\div/g,'÷').replace(/\\pm/g,'±').replace(/\\cdot/g,'·')
    .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈').replace(/\\infty/g,'∞')
    .replace(/\\text\{([^}]*)\}/g,'$1').replace(/\\mathrm\{([^}]*)\}/g,'$1').replace(/\\mathbf\{([^}]*)\}/g,'$1')
    .replace(/\\left[\(\[{|]/g,'').replace(/\\right[\)\]}|]/g,'')
    .replace(/\$([^$]+)\$/g,'$1').replace(/\\\s*/g,' ').replace(/\s{2,}/g,' ').trim();
}
function esc(str){var s=sanitiseLatex(String(str||''));return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ── QUESTION TEXT RENDERER ── */
var AR_RE   = /^(?:[\s\S]*?[Aa]ssertion\s*(?:\(A\)|A)?\s*[:\-]\s*)([\s\S]*?)\s+[Rr]eason\s*(?:\(R\)|R)?\s*[:\-]\s*([\s\S]+)$/;
var S12_RE  = /^([\s\S]*?)Statements?[\s\-]*(I|1)\s*[:\-]\s*([\s\S]*?)\s+Statements?[\s\-]*(II|2)\s*[:\-]\s*([\s\S]+)$/i;
var NUM_RE  = /\b(I{1,3}|IV|VI{0,3}|IX)\.\s+/g;
var TRAIL_RE = /\s+(Which\b|Select\b|Choose\b|How many\b|The correct\b|Identify\b|Of the above\b|Among\b|From the above\b|Given the above\b|How\b|Find\b)/i;

function renderQText(text){
  if(!text)return'';
  var m;

  /* 1. Assertion / Reason */
  m=AR_RE.exec(text);
  if(m){
    return '<div class="q-ar-block q-a-block"><div class="q-ar-label">ASSERTION (A)</div><div class="q-ar-body">'+esc(m[1].trim())+'</div></div>'+
           '<div class="q-ar-block q-r-block"><div class="q-ar-label">REASON (R)</div><div class="q-ar-body">'+esc(m[2].trim())+'</div></div>';
  }

  /* 2. Statement I / II — any preamble */
  m=S12_RE.exec(text);
  if(m){
    var pre=m[1].trim().replace(/[\s:,\-]+$/,'').trim();
    return (pre?'<p class="q-preamble">'+esc(pre)+'</p>':'')+
      '<div class="q-stmt-block q-stmt1"><div class="q-stmt-label">STATEMENT I</div><div class="q-stmt-body">'+esc(m[3].trim())+'</div></div>'+
      '<div class="q-stmt-block q-stmt2"><div class="q-stmt-label">STATEMENT II</div><div class="q-stmt-body">'+esc(m[5].trim())+'</div></div>';
  }

  /* 3. Numbered list I. II. III. */
  var numMatches=[];
  NUM_RE.lastIndex=0;
  var nm;
  while((nm=NUM_RE.exec(text))!==null){numMatches.push({index:nm.index,numeral:nm[1],end:nm.index+nm[0].length});}

  if(numMatches.length>=2){
    var stem=text.slice(0,numMatches[0].index).trim();
    var items=[];
    var trailer='';
    for(var ni=0;ni<numMatches.length;ni++){
      var iStart=numMatches[ni].end;
      var iEnd=(ni+1<numMatches.length)?numMatches[ni+1].index:text.length;
      var iText=text.slice(iStart,iEnd).trim();
      if(ni===numMatches.length-1){var tr=TRAIL_RE.exec(iText);if(tr){trailer=iText.slice(tr.index).trim();iText=iText.slice(0,tr.index).trim();}}
      items.push({num:numMatches[ni].numeral,text:iText});
    }
    var html=(stem?'<p class="q-preamble">'+esc(stem)+'</p>':'')+'<div class="q-num-list">';
    items.forEach(function(it){html+='<div class="q-num-item"><span class="q-num-roman">'+it.num+'.</span><span class="q-num-text">'+esc(it.text)+'</span></div>';});
    html+='</div>';
    if(trailer)html+='<p class="q-trailer">'+esc(trailer)+'</p>';
    return html;
  }

  /* 4. Plain */
  return'<p class="q-text">'+esc(text)+'</p>';
}

/* ── MATCH TABLE ── */
function matchTableHTML(mt){
  if(!mt||!mt.rows||!mt.rows.length)return'';
  var h1=mt.col1_header||'Column I',h2=mt.col2_header||'Column II';
  var html='<div class="match-table"><div class="match-head"><span>'+esc(h1)+'</span><span>'+esc(h2)+'</span></div>';
  mt.rows.forEach(function(row){html+='<div class="match-row"><div class="match-cell">'+esc(row.col1||'')+'</div><div class="match-cell">'+esc(row.col2||'')+'</div></div>';});
  return html+'</div>';
}

/* ── DIAGRAM ── */
function diagHTML(q){
  if(q.pattern!=='diagram_dhamaka')return'';
  if(q.image_url){
    return'<div class="diag-wrap">'
      +'<img src="'+esc(q.image_url)+'" alt="Diagram" class="diag-img">'
      +'</div>';
  }
  return'<div class="diag-wrap"><div class="diag-missing">📐 Refer to NCERT or past paper for the diagram.</div></div>';
}

/* ══════════════════════════════════════════════════
   PRACTICE PAGE
══════════════════════════════════════════════════ */
function initPracticePage(){
  var subjectEl=document.getElementById('filter-subject');
  var patternEl=document.getElementById('filter-pattern');
  var diffEl=document.getElementById('filter-diff');
  var countEl=document.getElementById('q-count');
  var container=document.getElementById('questions-container');
  if(!container)return;

  var params=new URLSearchParams(window.location.search);
  var urlSubj=params.get('subject')||'';
  var urlUnit=params.get('unit')||'';
  var urlPatt=params.get('pattern')||'';

  if(subjectEl&&urlSubj)subjectEl.value=urlSubj;
  if(patternEl&&urlPatt)patternEl.value=urlPatt;

  var allQuestions=[],filtered=[],currentIndex=0,answered=false,history=[];

  function applyFilters(){
    var subj=subjectEl?subjectEl.value:urlSubj;
    var patt=patternEl?patternEl.value:urlPatt;
    var diff=diffEl?diffEl.value:'';
    filtered=allQuestions.filter(function(q){
      if(subj&&q.subject!==subj)return false;
      if(patt&&q.pattern!==patt)return false;
      if(diff&&q.difficulty!==diff)return false;
      if(urlUnit&&q.unit_code!==urlUnit&&q.chapter!==urlUnit)return false;
      return true;
    });
    filtered=shuffle(filtered);currentIndex=0;answered=false;history=[];
    if(countEl){
      var label=filtered.length+' question'+(filtered.length!==1?'s':'');
      var parts=[];
      if(subj)parts.push(subj);
      if(patt&&PATTERN_LABELS[patt])parts.push(PATTERN_LABELS[patt]);
      if(diff)parts.push(diff);
      if(urlUnit)parts.push('this unit');
      countEl.textContent=label+(parts.length?' · '+parts.join(', '):'· All subjects');
    }
    renderQuestion();
  }

  function renderQuestion(){
    if(!filtered.length){container.innerHTML='<div style="text-align:center;padding:60px 20px;"><p style="color:#6B5C45;font-size:1rem;">No questions match your filters.</p></div>';return;}

    var q=filtered[currentIndex],num=currentIndex+1,tot=filtered.length;
    answered=false;var qStart=Date.now();var pct=Math.round((num/tot)*100);
    var hasPrev=history.length>0;

    /* Options — opt-key + opt-val spans for flex alignment */
    var optsHtml=['A','B','C','D'].map(function(k){
      var val=q.options&&q.options[k]?q.options[k]:'';
      if(!val)return'';
      return'<button class="neeto-opt" data-key="'+k+'" onclick="window._neetAnswer(this)">'
        +'<span class="opt-key">'+k+'.</span>'
        +'<span class="opt-val">'+esc(val)+'</span>'
        +'</button>';
    }).join('');

    var patTag=q.pattern&&PATTERN_LABELS[q.pattern]?'<span class="q-pat-tag">'+PATTERN_LABELS[q.pattern]+'</span>':'';
    var yearTag=q.year?'<span class="q-year-tag">NEET '+q.year+'</span>':'';
    var hasMT=!!(q.match_table&&q.match_table.rows&&q.match_table.rows.length);
    var mtHtml=hasMT?matchTableHTML(q.match_table):'';

    container.innerHTML=
      '<div class="q-progress-wrap">'+
        '<div class="q-progress-meta"><span>Question '+num+' of '+tot+'</span><span>'+pct+'%</span></div>'+
        '<div class="q-progress-track"><div class="q-progress-fill" style="width:'+pct+'%;"></div></div>'+
      '</div>'+
      '<div class="q-card">'+
        '<div class="q-tags">'+patTag+yearTag+'</div>'+
        '<div class="q-subject-line">'+esc(q.subject||'')+(q.chapter?' · '+esc(q.chapter):'')+'</div>'+
        '<div class="q-body">'+renderQText(q.question||'')+'</div>'+
        (mtHtml?'<div class="q-match-wrap">'+mtHtml+'</div>':'')+
        diagHTML(q)+
        '<div id="options-wrap">'+optsHtml+'</div>'+
        '<div id="explanation-wrap"></div>'+
      '</div>'+
      '<div class="q-nav-row">'+
        (hasPrev?'<button onclick="window._neetPrev()" class="q-btn-skip">← Prev</button>':'<span></span>')+
        '<button onclick="window._neetSkip()" class="q-btn-skip">Skip →</button>'+
        '<span class="q-diff '+(q.difficulty==='L1'?'q-diff-easy':q.difficulty==='L2'?'q-diff-med':'q-diff-hard')+'">'+
          (q.difficulty==='L1'?'🟢 Easy':q.difficulty==='L2'?'🟡 Medium':'🔴 Hard')+
        '</span>'+
      '</div>';

    window._neetAnswer=function(btn){
      if(answered)return;answered=true;
      var chosen=btn.getAttribute('data-key');
      var correct=(q.correct_answer||'').toUpperCase();
      var elapsed=Date.now()-qStart;
      var wrap=document.getElementById('options-wrap');
      if(wrap)wrap.querySelectorAll('.neeto-opt').forEach(function(b){
        var k=b.getAttribute('data-key');
        b.classList.add(k===correct?'neeto-correct':k===chosen?'neeto-wrong':'neeto-dim');
      });
      var expWrap=document.getElementById('explanation-wrap');
      if(expWrap){
        expWrap.innerHTML=
          '<div class="q-explanation">'+
            (q.explanation?'<p class="exp-title">💡 Explanation</p><p class="exp-body">'+esc(q.explanation)+'</p>':'')+
            (q.ncert_ref?'<p class="exp-ref">📖 '+esc(q.ncert_ref)+'</p>':'')+
          '</div>'+
          '<div class="q-next-wrap"><button onclick="window._neetNext()" class="q-btn-next">Next Question →</button></div>';
      }
      saveAttempt({type:'practice',questionId:q.id||'',subject:q.subject||'',chapter:q.unit_code||'',
        chapterName:q.chapter||'',pattern:q.pattern||'',difficulty:q.difficulty||'',
        userAnswer:chosen,correctAnswer:correct,isCorrect:chosen===correct,
        timeSpentMs:elapsed,year:q.year||'',ts:Date.now()});
    };

    window._neetPrev=function(){
      if(history.length===0)return;
      currentIndex=history.pop();
      renderQuestion();
    };

    window._neetSkip=function(){
      if(!answered)saveAttempt({type:'practice',questionId:q.id||'',subject:q.subject||'',chapter:q.unit_code||'',
        chapterName:q.chapter||'',pattern:q.pattern||'',difficulty:q.difficulty||'',userAnswer:null,
        correctAnswer:(q.correct_answer||'').toUpperCase(),isCorrect:false,
        timeSpentMs:Date.now()-qStart,year:q.year||'',ts:Date.now()});
      window._neetNext();
    };

    window._neetNext=function(){
      history.push(currentIndex);
      currentIndex++;
      if(currentIndex>=filtered.length){
        filtered=shuffle(filtered);currentIndex=0;
        container.innerHTML='<div class="q-set-done"><p style="font-size:1.5rem;margin-bottom:8px;">🎉</p>'+
          '<p style="font-family:\'Fraunces\',serif;font-size:1.2rem;font-weight:900;color:#15803D;margin-bottom:6px;">You finished this set!</p>'+
          '<p style="font-size:0.88rem;color:#6B5C45;margin-bottom:16px;">Starting again with a fresh shuffle…</p>'+
          '<button onclick="window._neetNext()" class="q-btn-next">Continue →</button></div>';
        window._neetNext=function(){renderQuestion();};return;
      }
      renderQuestion();
    };
  }

  [subjectEl,patternEl,diffEl].forEach(function(el){if(el)el.addEventListener('change',applyFilters);});
  if(urlSubj){loadSubject(urlSubj).then(function(qs){allQuestions=qs;applyFilters();});}
  else{loadAll().then(function(qs){allQuestions=qs;applyFilters();});}
}

/* ══════════════════════════════════════════════════
   UNITS PAGE
══════════════════════════════════════════════════ */
function initUnitsPage(){
  var grid=document.getElementById('units-grid');
  if(!grid)return;
  loadAll().then(function(allQs){
    var unitMap={};
    allQs.forEach(function(q){var key=q.unit_code||'UNIT_GENERAL';if(!unitMap[key])unitMap[key]={unit_code:key,chapter:q.chapter||key,subject:q.subject||'',count:0};unitMap[key].count++;});
    var units=Object.values(unitMap).sort(function(a,b){return a.subject<b.subject?-1:a.subject>b.subject?1:(a.chapter||'').localeCompare(b.chapter||'');});
    grid.innerHTML=units.map(function(u){
      var sc=u.subject==='Biology'?'unit-subject-bio':u.subject==='Chemistry'?'unit-subject-chem':u.subject==='Physics'?'unit-subject-phys':'';
      var url='practice.html?subject='+encodeURIComponent(u.subject)+'&unit='+encodeURIComponent(u.unit_code);
      return'<a class="unit-card" href="'+url+'"><span class="unit-subject '+sc+'">'+esc(u.subject)+'</span><div class="unit-name">'+esc(u.chapter)+'</div><div class="unit-count">'+u.count+' question'+(u.count!==1?'s':'')+'</div></a>';
    }).join('\n');
    var filterEl=document.getElementById('filter-subject');
    if(filterEl)filterEl.addEventListener('change',function(){var val=this.value;document.querySelectorAll('.unit-card').forEach(function(card){var s=card.querySelector('.unit-subject');card.style.display=(!val||(s&&s.textContent.trim()===val))?'':'none';});});
  });
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){initPracticePage();initUnitsPage();});}
else{initPracticePage();initUnitsPage();}

})();
