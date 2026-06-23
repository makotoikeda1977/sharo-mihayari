(function(){
  'use strict';

  var KSTORE='mihayari_stats_v1';   // 改変見破り
  var CSTORE='mihayari_cloze_v1';   // 虫食い
  var KAIHEN=(window.CARDS||[]).slice();
  var CLOZE=(window.CLOZE||[]).slice();
  var view=document.getElementById('view');

  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

  // ---------- stats ----------
  function kbase(){return {byType:{},totalCorrect:0,totalTotal:0,perCard:{}};}
  function kload(){try{return JSON.parse(localStorage.getItem(KSTORE))||kbase();}catch(e){return kbase();}}
  function ksave(s){try{localStorage.setItem(KSTORE,JSON.stringify(s));}catch(e){}}
  function cbase(){return {bySubject:{},total:0,recalled:0,perCard:{}};}
  function cload(){try{return JSON.parse(localStorage.getItem(CSTORE))||cbase();}catch(e){return cbase();}}
  function csave(s){try{localStorage.setItem(CSTORE,JSON.stringify(s));}catch(e){}}

  function bars(map,getNum,title){
    var keys=Object.keys(map);if(!keys.length)return '';
    keys.sort(function(a,b){return getNum(map[a])-getNum(map[b]);});
    var rows=keys.map(function(k){var p=Math.round(getNum(map[k])*100);var cls=p<50?'low':(p<80?'mid':'high');
      return '<div class="trow"><span class="tname">'+esc(k)+'</span><span class="tbar"><span class="tbar-f '+cls+'" style="width:'+p+'%"></span></span><span class="tpct">'+p+'%</span></div>';}).join('');
    return '<div class="types"><h3>'+esc(title)+'</h3>'+rows+'</div>';
  }

  // ================= KAIHEN (改変見破り) =================
  var kDeck=[],kPos=0,kResolved=false,kFirst=true,kSC=0,kSD=0;
  function kCard(id){for(var i=0;i<KAIHEN.length;i++)if(KAIHEN[i].id===id)return KAIHEN[i];return null;}
  function startKaihen(){kDeck=shuffle(KAIHEN.map(function(c){return c.id;}));kPos=0;kSC=0;kSD=0;renderKaihen();}

  function kBuild(card){
    var marks=card.targets.map(function(tg){return {t:tg.t,c:tg.c,idx:card.sentence.indexOf(tg.t)};})
      .filter(function(m){return m.idx>=0;}).sort(function(a,b){return a.idx-b.idx;});
    var html='',cur=0;
    marks.forEach(function(m){
      if(m.idx<cur)return;
      html+=esc(card.sentence.slice(cur,m.idx));
      html+='<span class="pick" data-c="'+(m.c?1:0)+'">'+esc(m.t)+'</span>';
      cur=m.idx+m.t.length;
    });
    html+=esc(card.sentence.slice(cur));
    return html;
  }
  function kRecord(card,ok){
    kSD++;if(ok)kSC++;
    var s=kload();s.totalTotal++;if(ok)s.totalCorrect++;
    if(!s.byType[card.type])s.byType[card.type]={correct:0,total:0};
    s.byType[card.type].total++;if(ok)s.byType[card.type].correct++;
    if(!s.perCard[card.id])s.perCard[card.id]={seen:0,correct:0};
    s.perCard[card.id].seen++;if(ok)s.perCard[card.id].correct++;
    ksave(s);
  }
  function renderKaihen(){
    var card=kCard(kDeck[kPos]);kResolved=false;kFirst=true;
    view.innerHTML=
      '<div class="bar"><div class="bar-fill" style="width:'+Math.round(kPos/kDeck.length*100)+'%"></div></div>'
      +'<div class="qmeta"><span class="pill subj">'+esc(card.subject)+'</span><span class="src">'+esc(card.source)+'</span><span class="count">'+(kPos+1)+' / '+kDeck.length+'</span></div>'
      +'<div class="qcard"><p class="sentence">'+kBuild(card)+'</p><p class="hint" id="hint">改変された語句を1つタップ</p><div id="res"></div></div>'
      +'<button class="btn ghost back" id="back">← ホーム</button>';
    Array.prototype.forEach.call(view.querySelectorAll('.pick'),function(el){el.addEventListener('click',function(){kPick(card,el);});});
    document.getElementById('back').addEventListener('click',renderHome);
  }
  function kPick(card,el){
    if(kResolved)return;
    var correct=el.getAttribute('data-c')==='1';var res=document.getElementById('res');
    if(!correct){
      if(kFirst){kRecord(card,false);kFirst=false;}
      el.classList.add('wrong');res.innerHTML='<p class="miss">ここは正しい記述。改変はほかの箇所にある。</p>';
      setTimeout(function(){el.classList.remove('wrong');if(!kResolved)res.innerHTML='';},1200);return;
    }
    if(kFirst){kRecord(card,true);kFirst=false;}
    kResolved=true;el.classList.add('hit');
    var h=document.getElementById('hint');if(h)h.style.display='none';
    var last=kPos>=kDeck.length-1;
    res.innerHTML=
      '<div class="explain"><div class="ex-h"><span class="ok-ic">&#10003;</span>正解 — ここが改変ポイント</div>'
      +'<span class="pill type">'+esc(card.type)+'</span>'
      +'<div class="diff"><span class="d-ng">誤）'+esc(card.wrong)+'</span><span class="d-ok">正）'+esc(card.right)+'</span></div>'
      +'<p class="ex-body">'+esc(card.explain)+'</p>'
      +'<p class="ex-law">根拠：'+esc(card.law)+(card.horei_note?'　／　'+esc(card.horei_note):'')+'</p></div>'
      +'<button class="btn primary next" id="next">'+(last?'結果を見る':'次の問題')+'</button>';
    document.getElementById('next').addEventListener('click',function(){if(last)kResult();else{kPos++;renderKaihen();}});
  }
  function kResult(){
    var pct=kSD?Math.round(kSC/kSD*100):0;var s=kload();
    var tb=bars(s.byType,function(o){return o.correct/o.total;},'改変タイプ別の正答率（弱点順）');
    view.innerHTML='<div class="result"><h2>改変見破り — 結果</h2><div class="score"><span class="big">'+pct+'%</span><span class="sub">一発正解 '+kSC+' / '+kSD+'</span></div>'+tb
      +'<button class="btn primary" id="again">もう一度</button><button class="btn ghost" id="home2">ホーム</button></div>';
    document.getElementById('again').addEventListener('click',startKaihen);
    document.getElementById('home2').addEventListener('click',renderHome);
  }

  // ================= CLOZE (虫食い・アクティブリコール) =================
  var cDeck=[],cPos=0,cSD=0,cSR=0;
  function cCard(id){for(var i=0;i<CLOZE.length;i++)if(CLOZE[i].id===id)return CLOZE[i];return null;}
  function startCloze(){cDeck=shuffle(CLOZE.map(function(c){return c.id;}));cPos=0;cSD=0;cSR=0;renderCloze();}
  function cRecord(card,ok){
    cSD++;if(ok)cSR++;
    var s=cload();s.total++;if(ok)s.recalled++;
    if(!s.bySubject[card.subject])s.bySubject[card.subject]={recalled:0,total:0};
    s.bySubject[card.subject].total++;if(ok)s.bySubject[card.subject].recalled++;
    if(!s.perCard[card.id])s.perCard[card.id]={seen:0,recalled:0};
    s.perCard[card.id].seen++;if(ok)s.perCard[card.id].recalled++;
    csave(s);
  }
  function renderCloze(){
    var card=cCard(cDeck[cPos]);
    var html='',blanks=0;
    card.parts.forEach(function(p){
      if(p.b){blanks++;html+='<span class="blank" tabindex="0" role="button" aria-label="空欄を開く">'+esc(p.t)+'</span>';}
      else{html+=esc(p.t);}
    });
    view.innerHTML=
      '<div class="bar"><div class="bar-fill" style="width:'+Math.round(cPos/cDeck.length*100)+'%"></div></div>'
      +'<div class="qmeta"><span class="pill subj cz">'+esc(card.subject)+'</span><span class="src">'+esc(card.source)+'</span><span class="count">'+(cPos+1)+' / '+cDeck.length+'</span></div>'
      +'<div class="qcard"><p class="sentence">'+html+'</p>'
      +'<p class="hint" id="chint">赤いところを思い出してからタップ（'+blanks+'箇所）</p>'
      +(card.note?'<p class="cz-note" id="cznote" style="display:none">'+esc(card.note)+'</p>':'')
      +'<p class="ex-law" id="czlaw" style="display:none">根拠：'+esc(card.law||'')+'</p>'
      +'<div id="ceval"></div></div>'
      +'<button class="btn ghost back" id="back">← ホーム</button>';
    var last=cPos>=cDeck.length-1;
    function checkAll(){
      if(view.querySelectorAll('.blank.open').length<blanks)return;
      var n=document.getElementById('cznote');if(n)n.style.display='block';
      var lw=document.getElementById('czlaw');if(lw)lw.style.display='block';
      var h=document.getElementById('chint');if(h)h.style.display='none';
      var ev=document.getElementById('ceval');
      if(ev&&!ev.innerHTML){
        ev.innerHTML='<p class="eval-q">思い出せた？</p><div class="eval-row"><button class="btn ok-btn" id="ev-ok">思い出せた</button><button class="btn ng-btn" id="ev-ng">あやふや</button></div>';
        document.getElementById('ev-ok').addEventListener('click',function(){cRecord(card,true);nextCloze(last);});
        document.getElementById('ev-ng').addEventListener('click',function(){cRecord(card,false);nextCloze(last);});
      }
    }
    Array.prototype.forEach.call(view.querySelectorAll('.blank'),function(el){
      var open=function(){if(el.classList.contains('open'))return;el.classList.add('open');checkAll();};
      el.addEventListener('click',open);
      el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
    document.getElementById('back').addEventListener('click',renderHome);
  }
  function nextCloze(last){if(last)cResult();else{cPos++;renderCloze();}}
  function cResult(){
    var pct=cSD?Math.round(cSR/cSD*100):0;var s=cload();
    var sb=bars(s.bySubject,function(o){return o.recalled/o.total;},'科目別の想起率（弱点順）');
    view.innerHTML='<div class="result"><h2>虫食い — 結果</h2><div class="score"><span class="big">'+pct+'%</span><span class="sub">思い出せた '+cSR+' / '+cSD+'</span></div>'+sb
      +'<button class="btn primary" id="again">もう一度</button><button class="btn ghost" id="home2">ホーム</button></div>';
    document.getElementById('again').addEventListener('click',startCloze);
    document.getElementById('home2').addEventListener('click',renderHome);
  }

  // ================= HOME =================
  function renderHome(){
    var ks=kload(),cs=cload();
    var kov=ks.totalTotal?Math.round(ks.totalCorrect/ks.totalTotal*100):null;
    var cov=cs.total?Math.round(cs.recalled/cs.total*100):null;
    var html='<div class="home"><p class="lead">2つの鍛え方で、誤り肢に強くなる。</p><div class="modes">'
      +'<button class="mode-card" id="m-kaihen"><span class="mc-ic">🔍</span><span class="mc-t">改変を見破る</span><span class="mc-d">誤り肢の改変箇所をタップ（'+KAIHEN.length+'問）</span>'+(kov!==null?'<span class="mc-stat">一発正解 '+kov+'%</span>':'')+'</button>'
      +'<button class="mode-card" id="m-cloze"><span class="mc-ic">🧠</span><span class="mc-t">虫食いで思い出す</span><span class="mc-d">赤バーを開いて想起＝アクティブリコール（'+CLOZE.length+'問）</span>'+(cov!==null?'<span class="mc-stat">想起率 '+cov+'%</span>':'')+'</button>'
      +'</div>';
    if(kov!==null||cov!==null)html+='<button class="btn ghost" id="reset">成績をリセット</button>';
    html+='<p class="note">※ 試作版。過去問を現行法照合した長文カードを収録。</p></div>';
    view.innerHTML=html;
    document.getElementById('m-kaihen').addEventListener('click',function(){if(KAIHEN.length)startKaihen();});
    document.getElementById('m-cloze').addEventListener('click',function(){if(CLOZE.length)startCloze();});
    var rs=document.getElementById('reset');if(rs)rs.addEventListener('click',function(){if(confirm('改変・虫食い両方の成績を消去しますか？')){ksave(kbase());csave(cbase());renderHome();}});
  }

  // init
  renderHome();
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});}
})();
