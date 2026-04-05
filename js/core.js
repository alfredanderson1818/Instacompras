// ═══ CORE — State, Navigation, Build, Utils ═══
// Dependencies: config.js, firebase.js, data.js

// ═══ STATE ═══
let cart=[],curProd=null,curStream=null,hist=['home'],selPay=0,qty=1,curSz='',wish=new Set(),following=new Set(),likes=0,chatIv=null,viewIv=null;


// ═══ BUILD ═══
function buildLiveStrip(){
  const el=document.getElementById('live-strip');
  if(!el)return;
  // Sort: sellers with product photos first, then the rest
  const ordered=[...SELLER_ORDER].sort((a,b)=>{
    const aHasImg=PRODS.some(p=>p.s===a&&p.img&&!p.img.startsWith('data:'));
    const bHasImg=PRODS.some(p=>p.s===b&&p.img&&!p.img.startsWith('data:'));
    if(aHasImg&&!bHasImg)return -1;
    if(!aHasImg&&bHasImg)return 1;
    return 0;
  });
  el.innerHTML=ordered.map(i=>{
    const s=SELLERS[i];
    const prod=PRODS.find(p=>p.s===i&&p.img&&!p.img.startsWith('data:'));
    const avHtml=s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover">`:`<span>${s.e}</span>`;
    return `
    <div class="lcard" onclick="openStream(${i})">
      <div class="lcard-img">
        ${prod?`<img src="${prod.img}" onerror="this.style.display='none'" loading="lazy">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;background:var(--dk4)">${s.e}</div>`}
        <div class="lcard-live"><div class="lbadge" style="font-size:8px;padding:2px 7px">LIVE</div></div>
        <div class="lcard-viewers">👁 ${s.v}</div>
        <div class="lcard-av">${avHtml}</div>
        <div class="lcard-name">${s.n}</div>
        <div class="lcard-price">$${s.p}</div>
      </div>
    </div>`;
  }).join('');
}
function buildCats(){
  document.getElementById('cat-strip').innerHTML=CATS.map((c,i)=>`<div class="cat ${i===0?'on':''}" onclick="filterCat(this)">${c}</div>`).join('');
}
function buildGrid(list){
  if(!list){
    // One product per seller, photo sellers first
    const seen=new Set();
    const withPhoto=[], noPhoto=[];
    SELLER_ORDER.forEach(si=>{
      const prod=PRODS.find(p=>p.s===si&&p.img&&!p.img.startsWith('data:'));
      if(prod&&!seen.has(si)){seen.add(si);withPhoto.push(prod);}
    });
    SELLER_ORDER.forEach(si=>{
      if(!seen.has(si)){
        const prod=PRODS.find(p=>p.s===si);
        if(prod){seen.add(si);noPhoto.push(prod);}
      }
    });
    list=[...withPhoto,...noPhoto];
  }
  const grid=document.getElementById('pgrid');
  if(!grid)return;
  const first=list.slice(0,8);
  const rest=list.slice(8);
  grid.innerHTML=first.map((p,i)=>prodCard(p,i,list)).join('');
  if(rest.length){
    requestAnimationFrame(()=>{
      grid.innerHTML+=rest.map((p,i)=>prodCard(p,i+8,list)).join('');
    });
  }
}
function prodCard(p,i,list){
  const idx=PRODS.indexOf(p);
  const disc=Math.round((1-p.p/p.op)*100);
  const s=SELLERS[p.s];
  return `<div class="pcard" onclick="openProd(${idx})">
    <div class="pcard-img ${BG[i%4]}">
      <img src="${p.img}" onerror="this.style.display='none'" loading="lazy">
      <div class="pcard-disc">-${disc}%</div>
      ${p.live?`<div class="pcard-live-dot"><div class="lbadge" style="font-size:7px;padding:2px 5px">LIVE</div></div>`:''}
      ${s.logo?`<div style="position:absolute;bottom:8px;left:8px;z-index:3;width:32px;height:32px;border-radius:8px;overflow:hidden;border:1.5px solid rgba(255,255,255,.25);box-shadow:0 2px 8px rgba(0,0,0,.5)"><img src="${s.logo}" style="width:100%;height:100%;object-fit:cover"></div>`:''}
      <button class="pcard-qadd" onclick="event.stopPropagation();quickAdd(${idx})">🛒</button>
    </div>
    <div class="pcard-body">
      <div class="pcard-name">${p.n}</div>
      <div class="pcard-seller-row">
        <div class="pcard-seller-dot" style="${s.logo?'overflow:hidden;background:#000;':''}">${s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover">`:s.e}</div>
        <div class="pcard-seller-name">${s.n}</div>
      </div>
      <div class="pcard-price-row">
        <div class="pcard-price">$${p.p}</div>
        <div class="pcard-old">$${p.op}</div>
      </div>
    </div>
  </div>`;
}
function buildExpScreen(){
  const EXP_CATS=['🔥 Todo','👟 Calzado','📱 Tech','👗 Ropa','💄 Belleza','🏠 Hogar','⚽ Deportes','💍 Joyería','🎮 Gaming','☕ Comida','🎸 Música'];
  const catBar=document.getElementById('exp-cats');
  if(catBar) catBar.innerHTML=EXP_CATS.map((c,i)=>`<div class="exp-cat ${i===0?'on':''}" onclick="expFilterCat(this,'${c}')">${c}</div>`).join('');
  expActiveCat='🔥 Todo';
  renderExpSections(SELLER_ORDER.map(i=>({s:SELLERS[i],i})));
}

function expGetBestImg(si,skip=0){
  const imgs=PRODS.filter(p=>p.s===si&&p.img&&!p.img.startsWith('data:')).map(p=>p.img);
  return imgs[skip]||imgs[0]||'';
}

function renderExpSections(list){
  // ── EN VIVO strip ──
  const liveEl=document.getElementById('exp-live-strip');
  if(liveEl){
    liveEl.innerHTML=list.slice(0,10).map(({s,i})=>{
      const img=expGetBestImg(i);
      const avHtml=s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:14px">${s.e}</span>`;
      return `<div class="exp-lc" onclick="openSeller(${i})">
        ${img?`<img class="exp-lc-img" src="${img}" loading="lazy" onerror="this.style.display='none'">`:`<div class="exp-lc-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:var(--dk4)">${s.e}</div>`}
        <div class="exp-lc-grad"></div>
        <div class="exp-lc-top">
          <div class="exp-lc-live"><div class="exp-lc-live-dot"></div>LIVE</div>
          <div class="exp-lc-v">👁 ${s.v}</div>
        </div>
        <div class="exp-lc-bottom">
          <div class="exp-lc-av">${avHtml}</div>
          <div class="exp-lc-name">${s.n}</div>
          <div class="exp-lc-price">desde $${s.p}</div>
        </div>
      </div>`;
    }).join('');
  }
  // ── FEATURED GRID ──
  const featEl=document.getElementById('exp-featured-grid');
  if(featEl){
    featEl.innerHTML=list.slice(0,6).map(({s,i})=>{
      const img=expGetBestImg(i);
      const img2=expGetBestImg(i,1);
      const avHtml=s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:20px">${s.e}</span>`;
      return `<div class="exp-fc" onclick="openSeller(${i})">
        ${img?`<img class="exp-fc-img" src="${img}" loading="lazy" onerror="this.style.background='var(--dk4)'">`:`<div class="exp-fc-img" style="display:flex;align-items:center;justify-content:center;font-size:44px;background:var(--dk4)">${s.e}</div>`}
        <div class="exp-fc-grad"></div>
        <div class="exp-fc-live"></div>
        <div class="exp-fc-vbadge">👁 ${s.v}</div>
        <div class="exp-fc-av" style="${s.logo?'background:#000;':'background:var(--dk4);'}">${avHtml}</div>
        <div class="exp-fc-body">
          <div class="exp-fc-name">${s.n}${s.verified?` <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--y)" stroke="none"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`:''}</div>
          <div class="exp-fc-cat">${s.cat}</div>
          <div class="exp-fc-bottom">
            <div class="exp-fc-fol">${s.f} seguidores</div>
            <div class="exp-fc-price">$${s.p}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  // ── ALL SELLERS list ──
  const allEl=document.getElementById('exp-all-list');
  const countEl=document.getElementById('exp-count');
  if(countEl) countEl.textContent=list.length+' tiendas';
  if(allEl){
    allEl.innerHTML=list.map(({s,i})=>{
      const imgs=[expGetBestImg(i,0),expGetBestImg(i,1),expGetBestImg(i,2)].filter(Boolean);
      const avHtml=s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:11px">`:`<span style="font-size:22px">${s.e}</span>`;
      const thumbs=imgs.slice(0,3).map(u=>`<img class="exp-ar-thumb" src="${u}" loading="lazy" onerror="this.style.display='none'">`).join('');
      return `<div class="exp-ar" onclick="openSeller(${i})">
        <div class="exp-ar-av" style="${s.logo?'background:#000;':'background:var(--dk4);'}">${avHtml}</div>
        ${imgs.length>=2?`<div class="exp-ar-imgs">${thumbs}</div>`:''}
        <div class="exp-ar-info">
          <div class="exp-ar-name">${s.n}${s.verified?`<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--y)" stroke="none"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`:''}</div>
          <div class="exp-ar-sub">${s.cat} · ${s.f} seg.</div>
        </div>
        <div class="exp-ar-right">
          <div class="exp-ar-price">$${s.p}</div>
          <div class="exp-ar-vw"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${s.v}</div>
        </div>
      </div>`;
    }).join('');
  }
}

let expActiveCat='🔥 Todo';
function expFilterCat(el,cat){
  document.querySelectorAll('.exp-cat').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');expActiveCat=cat;
  expSearch(document.getElementById('exp-search-inp')?.value||'');
}
function expSearch(q){
  const ordered=SELLER_ORDER.map(i=>({s:SELLERS[i],i}));
  let list=ordered;
  if(q) list=list.filter(({s})=>s.n.toLowerCase().includes(q.toLowerCase())||s.cat.toLowerCase().includes(q.toLowerCase())||PRODS.some(p=>p.s===s&&p.n.toLowerCase().includes(q.toLowerCase())));
  if(expActiveCat&&expActiveCat!=='🔥 Todo'){
    const ck=expActiveCat.replace(/^\S+ /,'').toLowerCase();
    list=list.filter(({s})=>s.cat.toLowerCase().includes(ck));
  }
  const isFiltered=q||(expActiveCat&&expActiveCat!=='🔥 Todo');
  // Show/hide hero sections
  ['exp-sh-live','exp-sh-feat','exp-live-strip','exp-featured-grid'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display=isFiltered?'none':'';
  });
  if(document.getElementById('exp-featured-grid')) document.getElementById('exp-featured-grid').style.display=isFiltered?'none':'grid';
  if(document.getElementById('exp-live-strip')) document.getElementById('exp-live-strip').style.display=isFiltered?'none':'flex';
  const countEl=document.getElementById('exp-count');
  if(countEl) countEl.textContent=list.length+' tiendas';
  const allEl=document.getElementById('exp-all-list');
  if(allEl){
    allEl.innerHTML=list.map(({s,i})=>{
      const imgs=[expGetBestImg(i,0),expGetBestImg(i,1),expGetBestImg(i,2)].filter(Boolean);
      const avHtml=s.logo?`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:11px">`:`<span style="font-size:22px">${s.e}</span>`;
      const thumbs=imgs.slice(0,3).map(u=>`<img class="exp-ar-thumb" src="${u}" loading="lazy" onerror="this.style.display='none'">`).join('');
      return `<div class="exp-ar" onclick="openSeller(${i})">
        <div class="exp-ar-av" style="${s.logo?'background:#000;':'background:var(--dk4);'}">${avHtml}</div>
        ${imgs.length>=2?`<div class="exp-ar-imgs">${thumbs}</div>`:''}
        <div class="exp-ar-info">
          <div class="exp-ar-name">${s.n}${s.verified?`<svg width="12" height="12" viewBox="0 0 24 24" fill="var(--y)" stroke="none"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`:''}</div>
          <div class="exp-ar-sub">${s.cat} · ${s.f} seg.</div>
        </div>
        <div class="exp-ar-right">
          <div class="exp-ar-price">$${s.p}</div>
          <div class="exp-ar-vw"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${s.v}</div>
        </div>
      </div>`;
    }).join('');
  }
}

function buildSellers(q){buildExpScreen();}
function filterS(q){expSearch(q);}


function buildCoPays(){
  const hints=['Transferencia bancaria móvil','Envío directo a cuenta USA','Pago cripto instantáneo','Dólares digitales estables','Efectivo en la entrega'];
  document.getElementById('co-pays').innerHTML=PAYOPTS.map((o,i)=>`
    <div class="popt ${i===selPay?'on':''}" onclick="setSPay(${i})">
      <div class="popt-ic">${o.i}</div>
      <div class="popt-info"><div class="popt-n">${o.n}</div><div class="popt-hint">${hints[i]}</div></div>
      <div class="prad ${i===selPay?'on':''}"></div>
    </div>`).join('');
}


// ═══ NAV ═══
function go(id,push=true){
  const cur=document.querySelector('.scr.on');
  if(cur){cur.classList.remove('on');cur.classList.add('out');setTimeout(()=>cur.classList.remove('out'),300);}
  const next=document.getElementById('s-'+id);
  if(next){next.classList.add('on');}
  if(push&&hist[hist.length-1]!==id)hist.push(id);
  const hide=['stream','co','ok','onboard','register','seller','wallet','deposit','dash','notif','track'].includes(id);
  document.getElementById('nav').className='nav'+(hide?' hide':'');
  ['home','exp','cart','prof'].forEach(n=>document.getElementById('ni-'+n)?.classList.toggle('on',n===id));
}
function nav(id){
  hist=[id];stopChat();
  addNavRipple(id);
  if(id==='prof') loadProfData();
  if(id==='exp') buildExpScreen();
  go(id,false);
}

function addNavRipple(id){
  const el=document.getElementById('ni-'+id);
  if(!el)return;
  const r=document.createElement('div');
  r.className='ni-ripple';
  el.appendChild(r);
  setTimeout(()=>r.remove(),520);
}
function goBack(){
  if(hist.length>1){
    const leaving=hist[hist.length-1];
    hist.pop();stopChat();
    // Leave Agora if we were watching a stream
    if(leaving==='stream'){leaveAgoraChannel();}
    const prev=hist[hist.length-1];
    go(prev,false);
    // Si volvemos a prod y el producto es live, reanudar simulador
    if(prev==='prod'&&curProd!==null&&PRODS[curProd]?.live){
      startPdLiveSim(SELLERS[PRODS[curProd].s]);
    }
  }else goHome();
}
function goHome(){
  hist=['home'];
  stopChat();
  const ob=document.getElementById('s-onboard');
  if(ob){ob.classList.remove('on');ob.style.display='none';}
  // Pre-build grid before transition so home is ready
  setTimeout(()=>buildGrid(),0);
  go('home',false);
}


// ═══ FILTERS ═══
function filterCat(el){
  document.querySelectorAll('.cat').forEach(c=>c.classList.remove('on'));el.classList.add('on');
  const t=el.textContent.trim();
  if(t==='🔥 Todo'){buildGrid();return;}
  const k=t.split(' ').slice(1).join('').toLowerCase();
  buildGrid(PRODS.filter(p=>SELLERS[p.s].cat.toLowerCase().includes(k)||p.n.toLowerCase().includes(k)));
}
function filterS(q){buildSellers(q);}
function homeSearch(q){
  if(!q){buildGrid();return;}
  buildGrid(PRODS.filter(p=>p.n.toLowerCase().includes(q.toLowerCase())||SELLERS[p.s].n.toLowerCase().includes(q.toLowerCase())));
}

// ═══ GUEST MODE ═══
window.isGuest=false;

function enterAsGuest(){
  window.isGuest=true;
  const ob=document.getElementById('s-onboard');
  if(ob){ob.classList.remove('on');ob.style.display='none';}
  buildLiveStrip();buildGrid();go('home',false);
}

function requireAccount(emoji,title,desc){
  if(!window.isGuest)return false; // logged in, allow
  const wall=document.getElementById('guest-wall');
  document.getElementById('guest-wall-emoji').textContent=emoji||'🔐';
  document.getElementById('guest-wall-title').textContent=title||'Necesitas una cuenta';
  document.getElementById('guest-wall-desc').textContent=desc||'Crea tu cuenta gratis y accede a todo.';
  wall.style.display='flex';
  return true; // blocked
}

function closeGuestWall(goRegister){
  document.getElementById('guest-wall').style.display='none';
  if(goRegister){window.isGuest=false;go('register');}
}
function closeWinOverlay(){
  const ov=document.getElementById('win-overlay');
  const card=document.getElementById('win-card');
  card.style.transform='translate(-50%,-50%) scale(0)';
  setTimeout(()=>{ov.style.display='none';},350);
  openTrack(0);
}

function showWinCelebration(itemName,price){
  const ov=document.getElementById('win-overlay');
  const card=document.getElementById('win-card');
  const canvas=document.getElementById('win-canvas');
  document.getElementById('win-item').textContent=itemName;
  document.getElementById('win-price').textContent='$'+price;
  ov.style.display='block';
  ov.style.pointerEvents='all';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    card.style.transform='translate(-50%,-50%) scale(1)';
  }));
  // Confetti burst
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||360;
  canvas.height=canvas.offsetHeight||700;
  const W=canvas.width,H=canvas.height;
  const COLORS=['#FFD000','#FF3B3B','#00C896','#4A90FF','#FF6B35','#fff','#c084fc','#34d399'];
  const SHAPES=['rect','circle','ribbon'];
  const pieces=Array.from({length:140},()=>({
    x:W/2+(Math.random()-.5)*80,
    y:H*0.42,
    vx:(Math.random()-.5)*18,
    vy:-(Math.random()*22+10),
    rot:Math.random()*360,
    rotV:(Math.random()-.5)*12,
    size:Math.random()*10+5,
    color:COLORS[~~(Math.random()*COLORS.length)],
    shape:SHAPES[~~(Math.random()*SHAPES.length)],
    gravity:.55+Math.random()*.2,
    opacity:1,
    delay:Math.random()*300
  }));
  let start=null;
  function draw(ts){
    if(!start)start=ts;
    const elapsed=ts-start;
    ctx.clearRect(0,0,W,H);
    let alive=false;
    pieces.forEach(p=>{
      if(elapsed<p.delay)return;
      p.vy+=p.gravity;p.x+=p.vx;p.y+=p.vy;
      p.rot+=p.rotV;p.vx*=.99;
      if(p.y>H+20)return;
      if(p.y>H*.65)p.opacity=Math.max(0,p.opacity-.03);
      alive=true;
      ctx.save();ctx.globalAlpha=p.opacity;ctx.fillStyle=p.color;
      ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      if(p.shape==='rect'){ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);}
      else if(p.shape==='circle'){ctx.beginPath();ctx.arc(0,0,p.size/2.5,0,Math.PI*2);ctx.fill();}
      else{ctx.beginPath();ctx.moveTo(0,-p.size/2);ctx.lineTo(p.size/5,p.size/2);ctx.lineTo(-p.size/5,p.size/2);ctx.closePath();ctx.fill();}
      ctx.restore();
    });
    if(alive)requestAnimationFrame(draw);else ctx.clearRect(0,0,W,H);
  }
  requestAnimationFrame(draw);
  setTimeout(()=>{if(ov.style.display!=='none')closeWinOverlay();},6000);
}


// ═══ UTILS ═══
function toast(msg){const t=document.getElementById('toast-el');t.textContent=msg;t.classList.add('on');clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.remove('on'),2300);}
function fmt(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}

// ═══ MOBILE VIEWPORT FIX ═══
function setAppHeight(){
  const h=window.innerHeight;
  document.documentElement.style.setProperty('--app-h',h+'px');
  document.getElementById('app').style.height=h+'px';
}
setAppHeight();
window.addEventListener('resize',setAppHeight);
// Also fix on orientation change
window.addEventListener('orientationchange',()=>setTimeout(setAppHeight,150));


// ═══ INIT ═══
// Reorder PRODS for maximum visual impact (investor demo)
const _ORDER=[0,1,16,29,40,41,42,43,44,45,11,6,35,31,34,10,3,36,22,4,37,18,2,5,7,8,9,12,13,14,15,17,19,20,21,23,24,25,26,27,28,30,32,33,38,39];
const _origProds=[...PRODS];
_ORDER.forEach((idx,i)=>{if(i<PRODS.length&&idx<_origProds.length)PRODS[i]=_origProds[idx];});



// ═══ AUCTION COUNTDOWN TIMER ═══
let _auctionTiv=null;
function startAuctionTimer(){
  clearInterval(_auctionTiv);
  let secs=180; // 3 minutos
  const el=document.getElementById('pd-auction-timer');
  if(!el)return;
  function tick(){
    if(secs<=0){
      clearInterval(_auctionTiv);
      if(el)el.textContent='0:00';
      return;
    }
    secs--;
    const m=~~(secs/60);
    const s=String(secs%60).padStart(2,'0');
    if(el)el.textContent=m+':'+s;
    // Rojo pulsante cuando queda menos de 30s
    const btn=document.getElementById('pd-auction-btn');
    if(btn&&secs<30){btn.style.borderColor='rgba(255,59,59,.9)';}
  }
  tick();
  _auctionTiv=setInterval(tick,1000);
}

// ═══ SIMULADOR LIVE STREAM (página producto) ═══
let _pdChatIv=null,_pdHeartIv=null,_pdViewIv=null;
const _PD_NAMES=['carlos.VE','luisa_mpn','el_pana99','yoli_shop','marleny07','pedro_mcs','cristivzla','rosary.ve'];
const _PD_MSGS=['¡LO QUIERO! 🔥','⚡ Comprando ahora!','¿Quedan más unidades?','✅ Ya pagué','🇻🇪 Desde Maracaibo','¿Envían a todo el país?','🙌🙌🙌','¡Me encanta! 😍','¡Qué belleza! 🔥','Llegó rapidísimo el último 📦','🇻🇪 Desde Valencia','¡Tomado! ✅','segunda unidad para mi mamá 😂','ufff se ve brutal 🔥','¡Pídanlo ya! ⚡'];
const _PD_HEARTS=['❤️','🧡','💛','💜','🤍','❤️‍🔥'];
function startPdLiveSim(seller){
  stopPdLiveSim();
  const chat=document.getElementById('pd-chat-msgs');
  const hearts=document.getElementById('pd-hearts');
  const viewers=document.getElementById('pd-viewers');
  if(!chat)return;
  // Chat msgs
  // Feed en stream: alterna entre bids y chat
  const bidsFeed=document.getElementById('pd-bids-feed');
  const chatPanel=document.getElementById('pd-chat-msgs');
  _pdChatIv=setInterval(()=>{
    const isBid=Math.random()>.45;
    const name=_PD_NAMES[~~(Math.random()*_PD_NAMES.length)];
    // Bid en stream feed
    if(bidsFeed&&isBid){
      const amt=aucCurrentBid>0?aucCurrentBid+~~(Math.random()*15+1):~~(Math.random()*50+20);
      const d=document.createElement('div');
      d.className='pd-chat-msg';
      d.innerHTML=`<div class="pd-chat-user">🔨 ${name}</div><div class="pd-chat-text" style="color:var(--y);font-weight:800">Ofertó $${amt}</div>`;
      bidsFeed.appendChild(d);
      while(bidsFeed.children.length>4)bidsFeed.removeChild(bidsFeed.firstChild);
    }
    // Chat panel debajo
    if(chatPanel){
      const msg=_PD_MSGS[~~(Math.random()*_PD_MSGS.length)];
      const d=document.createElement('div');
      d.className='pd-chat-msg';
      d.innerHTML=`<div class="pd-chat-user">${name}</div><div class="pd-chat-text">${msg}</div>`;
      chatPanel.appendChild(d);
      while(chatPanel.children.length>5)chatPanel.removeChild(chatPanel.firstChild);
    }
  },1800+~~(Math.random()*1200));
  // Hearts
  _pdHeartIv=setInterval(()=>{
    if(!hearts)return;
    const h=document.createElement('div');
    h.className='pd-heart';
    h.textContent=_PD_HEARTS[~~(Math.random()*_PD_HEARTS.length)];
    h.style.bottom=(~~(Math.random()*20))+'px';
    h.style.right=(~~(Math.random()*14))+'px';
    hearts.appendChild(h);
    setTimeout(()=>h.remove(),1900);
  },600+~~(Math.random()*400));
  // Viewers counter bump
  _pdViewIv=setInterval(()=>{
    if(!viewers)return;
    const cur=parseInt(viewers.textContent)||100;
    viewers.textContent=Math.max(10,cur+(~~(Math.random()*7)-2));
  },3000);
}
function stopPdLiveSim(){
  clearInterval(_pdChatIv);clearInterval(_pdHeartIv);clearInterval(_pdViewIv);
  _pdChatIv=_pdHeartIv=_pdViewIv=null;
  const chat=document.getElementById('pd-chat-msgs');
  if(chat)chat.innerHTML='';
  const bf=document.getElementById('pd-bids-feed');
  if(bf)bf.innerHTML='';
  const hearts=document.getElementById('pd-hearts');
  if(hearts)hearts.innerHTML='';
}
buildLiveStrip();buildCats();buildGrid();buildSellers();buildCoPays();updateCart();
// Show initial unread count
(()=>{const count=notifData.filter(n=>n.unread).length;const b=document.getElementById('notif-badge');if(b&&count){b.style.display='flex';b.textContent=count;}})();
// notif-btn onclick set inline
