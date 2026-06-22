(function(){
  'use strict';

  var STORE = 'mihayari_stats_v1';
  var cards = (window.CARDS || []).slice();
  var view = document.getElementById('view');

  function base(){ return { byType:{}, totalCorrect:0, totalTotal:0, perCard:{} }; }
  function loadStats(){ try{ return JSON.parse(localStorage.getItem(STORE)) || base(); }catch(e){ return base(); } }
  function saveStats(s){ try{ localStorage.setItem(STORE, JSON.stringify(s)); }catch(e){} }

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }
  function shuffle(a){
    for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function cardById(id){ for(var i=0;i<cards.length;i++){ if(cards[i].id===id) return cards[i]; } return null; }

  // ---- session state ----
  var deck=[], pos=0, resolved=false, firstAttempt=true, sessionCorrect=0, sessionDone=0;

  function startSession(){
    deck = shuffle(cards.map(function(c){ return c.id; }));
    pos=0; sessionCorrect=0; sessionDone=0;
    renderQuiz();
  }

  // 文中の改変候補を <span class="pick"> に変換（出現位置順、重なりは無視）
  function buildSentence(card){
    var marks = card.targets.map(function(tg){
      return { t:tg.t, c:tg.c, idx:card.sentence.indexOf(tg.t) };
    }).filter(function(m){ return m.idx>=0; }).sort(function(a,b){ return a.idx-b.idx; });

    var html='', cur=0;
    marks.forEach(function(m){
      if(m.idx < cur) return;
      html += esc(card.sentence.slice(cur, m.idx));
      html += '<span class="pick" data-c="'+(m.c?1:0)+'">'+esc(m.t)+'</span>';
      cur = m.idx + m.t.length;
    });
    html += esc(card.sentence.slice(cur));
    return html;
  }

  function recordFirst(card, ok){
    sessionDone++; if(ok) sessionCorrect++;
    var s = loadStats();
    s.totalTotal++; if(ok) s.totalCorrect++;
    if(!s.byType[card.type]) s.byType[card.type] = { correct:0, total:0 };
    s.byType[card.type].total++; if(ok) s.byType[card.type].correct++;
    if(!s.perCard[card.id]) s.perCard[card.id] = { seen:0, correct:0 };
    s.perCard[card.id].seen++; if(ok) s.perCard[card.id].correct++;
    saveStats(s);
  }

  function renderQuiz(){
    var card = cardById(deck[pos]);
    resolved=false; firstAttempt=true;
    var pct = Math.round(pos/deck.length*100);
    view.innerHTML =
      '<div class="bar"><div class="bar-fill" style="width:'+pct+'%"></div></div>'
      + '<div class="qmeta">'
      +   '<span class="pill subj">'+esc(card.subject)+'</span>'
      +   '<span class="src">'+esc(card.source)+'</span>'
      +   '<span class="count">'+(pos+1)+' / '+deck.length+'</span>'
      + '</div>'
      + '<div class="qcard">'
      +   '<p class="sentence">'+buildSentence(card)+'</p>'
      +   '<p class="hint" id="hint">改変された語句を1つタップ</p>'
      +   '<div id="res"></div>'
      + '</div>';

    Array.prototype.forEach.call(view.querySelectorAll('.pick'), function(el){
      el.addEventListener('click', function(){ onPick(card, el); });
    });
  }

  function onPick(card, el){
    if(resolved) return;
    var correct = el.getAttribute('data-c') === '1';
    var res = document.getElementById('res');

    if(!correct){
      if(firstAttempt){ recordFirst(card, false); firstAttempt=false; }
      el.classList.add('wrong');
      res.innerHTML = '<p class="miss">ここは正しい記述。改変はほかの箇所にある。</p>';
      setTimeout(function(){
        el.classList.remove('wrong');
        if(!resolved){ res.innerHTML=''; }
      }, 1200);
      return;
    }

    if(firstAttempt){ recordFirst(card, true); firstAttempt=false; }
    resolved = true;
    el.classList.add('hit');
    var hint = document.getElementById('hint'); if(hint) hint.style.display='none';
    showExplain(card, res);
  }

  function showExplain(card, res){
    var last = pos >= deck.length-1;
    res.innerHTML =
      '<div class="explain">'
      +  '<div class="ex-h"><span class="ok-ic">&#10003;</span>正解 — ここが改変ポイント</div>'
      +  '<span class="pill type">'+esc(card.type)+'</span>'
      +  '<div class="diff"><span class="d-ng">誤）'+esc(card.wrong)+'</span><span class="d-ok">正）'+esc(card.right)+'</span></div>'
      +  '<p class="ex-body">'+esc(card.explain)+'</p>'
      +  '<p class="ex-law">根拠：'+esc(card.law)+'</p>'
      + '</div>'
      + '<button class="btn primary next" id="next">'+(last?'結果を見る':'次の問題')+'</button>';
    document.getElementById('next').addEventListener('click', function(){
      if(last){ renderResult(); } else { pos++; renderQuiz(); }
    });
  }

  function typeBars(){
    var s = loadStats();
    var keys = Object.keys(s.byType);
    if(!keys.length) return '';
    keys.sort(function(a,b){
      return (s.byType[a].correct/s.byType[a].total) - (s.byType[b].correct/s.byType[b].total);
    });
    var rows = keys.map(function(k){
      var o = s.byType[k];
      var p = Math.round(o.correct/o.total*100);
      var cls = p<50 ? 'low' : (p<80 ? 'mid' : 'high');
      return '<div class="trow">'
        + '<span class="tname">'+esc(k)+'</span>'
        + '<span class="tbar"><span class="tbar-f '+cls+'" style="width:'+p+'%"></span></span>'
        + '<span class="tpct">'+p+'%</span></div>';
    }).join('');
    return '<div class="types"><h3>改変タイプ別の正答率（弱点順）</h3>'+rows+'</div>';
  }

  function renderResult(){
    var pct = sessionDone ? Math.round(sessionCorrect/sessionDone*100) : 0;
    view.innerHTML =
      '<div class="result">'
      + '<h2>おつかれさまでした</h2>'
      + '<div class="score"><span class="big">'+pct+'%</span><span class="sub">一発正解 '+sessionCorrect+' / '+sessionDone+'</span></div>'
      + typeBars()
      + '<button class="btn primary" id="again">もう一度</button>'
      + '<button class="btn ghost" id="home2">ホーム</button>'
      + '</div>';
    document.getElementById('again').addEventListener('click', startSession);
    document.getElementById('home2').addEventListener('click', renderHome);
  }

  function renderHome(){
    var s = loadStats();
    var overall = s.totalTotal ? Math.round(s.totalCorrect/s.totalTotal*100) : null;
    var html =
      '<div class="home">'
      + '<p class="lead">誤り肢は、正しい条文を<strong>少しだけ改変</strong>して作られています。どこを変えられたかをタップで見抜く練習です。</p>'
      + '<button class="btn primary big-btn" id="start">挑戦する（'+cards.length+'問）</button>';
    if(overall!==null){
      html += '<div class="ov"><span class="ov-l">これまでの一発正解率</span><span class="ov-v">'+overall+'%</span></div>';
      html += typeBars();
      html += '<button class="btn ghost" id="reset">成績をリセット</button>';
    }
    html += '<p class="note">※ 試作版。収録は労基・安衛の鉄板論点を中心に'+cards.length+'問（根拠条文付き）。</p>';
    html += '</div>';
    view.innerHTML = html;

    document.getElementById('start').addEventListener('click', startSession);
    var rs = document.getElementById('reset');
    if(rs) rs.addEventListener('click', function(){
      if(confirm('成績を消去しますか？')){ saveStats(base()); renderHome(); }
    });
  }

  // ---- init ----
  renderHome();
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('./sw.js').catch(function(){});
    });
  }
})();
