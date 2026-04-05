// ═══ SOCIAL — Stream, Chat, Seller, Explore, Notifications ═══
// Dependencies: core.js

// ═══ STREAM ═══
function svTab(tab){
  document.getElementById('sv-chat-panel').style.display=tab==='chat'?'flex':'none';
  document.getElementById('sv-prods-panel').style.display=tab==='prods'?'block':'none';
  document.getElementById('sv-tab-chat').classList.toggle('on',tab==='chat');
  document.getElementById('sv-tab-prods').classList.toggle('on',tab==='prods');
}

let curStreamProd=0;
function openStream(idx){
  curStream=idx;
  const s=SELLERS[idx];
  const pi=PRODS.findIndex(p=>p.s===idx);
  const prod=pi>=0?PRODS[pi]:PRODS[0];
  curStreamProd=pi>=0?pi:0;
  document.getElementById('sv-img').src=prod.img||'';
  document.getElementById('sv-viewers').textContent=s.v;
  document.getElementById('sv-hot').textContent=~~(s.v*.03+1);
  const _svAv=document.getElementById('sv-av');const _svAvS=document.getElementById('sv-av-small');[_svAv,_svAvS].forEach(el=>{if(!el)return;if(s.logo){el.innerHTML=`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;el.style.background='#000';el.style.overflow='hidden';}else{el.textContent=s.e;el.style.background='';el.style.overflow='';}}); 
  document.getElementById('sv-name').textContent=s.n;
  document.getElementById('sv-name-mini').textContent=s.n;
  document.getElementById('sv-foll').textContent=`${s.f} seguidores`;
  const fb=document.getElementById('sv-fol');
  fb.textContent=following.has(idx)?'Siguiendo':'Seguir';
  fb.className='fol'+(following.has(idx)?' on':'');
  const th=document.getElementById('spthumb');
  th.innerHTML=prod.img?`<img src="${prod.img}" onerror="this.style.display='none'">`:`<span>${prod.e}</span>`;
  document.getElementById('spname').textContent=prod.n;
  document.getElementById('spprice').textContent=`$${prod.p}`;
  document.getElementById('spold').textContent=`$${prod.op}`;
  const disc=Math.round((1-prod.p/prod.op)*100);
  document.getElementById('sp-disc').textContent=`-${disc}%`;
  document.getElementById('spbuy').onclick=()=>quickAdd(curStreamProd);
  likes=Math.floor(s.v*6);
  document.getElementById('sv-like').childNodes[0].textContent='🤍';
  document.getElementById('sv-likes').textContent=fmt(likes);
  document.getElementById('chat-msgs').innerHTML='';
  startChat(idx);startViewers(idx);startTimer();
  // populate products panel
  const sellerProds=PRODS.filter(p=>p.s===idx);
  const gridProds=sellerProds.length?sellerProds:PRODS.slice(0,6);
  document.getElementById('sv-prods-grid').innerHTML=gridProds.map((p,i)=>`
    <div class="sv-prod-card" onclick="openProd(${PRODS.indexOf(p)})">
      <div class="sv-prod-img ${BG[i%4]}">${p.img?`<img src="${p.img}" onerror="this.style.display='none'">`:`<span>${p.e}</span>`}</div>
      <div class="sv-prod-body">
        <div class="sv-prod-name">${p.n}</div>
        <div class="sv-prod-price">$${p.p} <span style="font-family:'Nunito',sans-serif;font-size:10px;color:var(--mu)">USD</span></div>
      </div>
    </div>`).join('');
  svTab('chat');
  go('stream');
  // Join Agora channel as viewer
  joinAsAudience(getChannelForSeller(idx));
}

let timerSecs=14*60+32,timerIv=null;
function startTimer(){
  if(timerIv)clearInterval(timerIv);
  timerSecs=~~(Math.random()*900+300);
  timerIv=setInterval(()=>{
    timerSecs=Math.max(0,timerSecs-1);
    const m=String(~~(timerSecs/60)).padStart(2,'0');
    const s=String(timerSecs%60).padStart(2,'0');
    const el=document.getElementById('sv-timer-pill');
    if(el)el.textContent=`⏱ ${m}:${s}`;
    if(!timerSecs){clearInterval(timerIv);timerSecs=~~(Math.random()*900+300);}
  },1000);
}

function spawnGift(){
  const emojis=['🎁','🌟','💛','🔥','💰','👑'];
  const e=emojis[~~(Math.random()*emojis.length)];
  spawnParticle(document.getElementById('chat-in'),e);
  toast(`${e} ¡Regalo enviado al vendedor!`);
}
function toggleFollow(){
  const idx=curStream;
  following.has(idx)?following.delete(idx):following.add(idx);
  toast(following.has(idx)?`✅ Sigues a ${SELLERS[idx].n}`:`👋 Dejaste de seguir a ${SELLERS[idx].n}`);
  const fb=document.getElementById('sv-fol');
  fb.textContent=following.has(idx)?'Siguiendo':'Seguir';
  fb.className='fol'+(following.has(idx)?' on':'');
  document.getElementById('st-fol').textContent=following.size;
}
function likeStream(){
  likes++;
  const btn=document.getElementById('sv-like');
  btn.childNodes[0].textContent='❤️';
  btn.classList.remove('heart-burst');
  void btn.offsetWidth;
  btn.classList.add('heart-burst');
  document.getElementById('sv-likes').textContent=fmt(likes);
  spawnParticle(btn,'❤️');
  toast('❤️ ¡Te gustó el stream!');
}
function shareStream(){toast('🔗 Link copiado al portapapeles');}
function bcAddItem(){ bcShowItemPanel(); }
function quickAdd(pi){
  if(requireAccount('🛒','Para comprar necesitas cuenta','Crea tu cuenta gratis y compra en vivo al instante.'))return;
  addItem(pi,PRODS[pi].sz[0],1);animateCartBadge();toast(`✅ ${PRODS[pi].n} al carrito`);
}

function animateCartBadge(){
  const badge=document.getElementById('cart-nb');
  badge.classList.remove('cart-pop');
  void badge.offsetWidth;
  badge.classList.add('cart-pop');
  const cartIcon=document.getElementById('ni-cart');
  spawnParticle(cartIcon,'+1');
}

function spawnParticle(el,text){
  if(!el)return;
  const r=el.getBoundingClientRect();
  const p=document.createElement('div');
  p.className='cart-particle';
  p.textContent=text;
  p.style.left=(r.left+r.width/2-10)+'px';
  p.style.top=(r.top-10)+'px';
  document.body.appendChild(p);
  setTimeout(()=>p.remove(),800);
}


// ═══ CHAT ═══
const AVTS=['😊','🧑','👩','🧔','💁','😎','🤩','🥳','😄'];
const NAMES=['carlos.VE','luisa_mpn','andres22','yoli_shop','el_pana99','cristi_vzla','pedro_mcs','marleny07','rosmary.ve'];
const MSGS=['¡Qué precio! 🔥','¿Envían a Valencia?','A1 👌','¿Tienen más tallas?','¡Comprando ahora!','¡Chévere! 🇻🇪','¿Acepta Pago Móvil?','¡Los quiero! 😍','¿Cuánto stock?','¡Oferta increíble! 💯','¿Envían a Maracaibo?','¡Bien chulas! 🍊','¿Traen a Los Teques?','¡Dale que sí! ✅'];
function addMsg(name,text,av){
  const el=document.getElementById('chat-msgs');if(!el)return;
  const d=document.createElement('div');d.className='cmsg';
  d.innerHTML=`<div class="cav">${av}</div><div class="ccon"><div class="cu">${name}</div><div class="ct">${text}</div></div>`;
  el.appendChild(d);
  while(el.children.length>6)el.removeChild(el.firstChild);
}
function sendChat(){
  if(requireAccount('💬','Para chatear necesitas cuenta','Únete y participa en los lives.'))return;
  const inp=document.getElementById('chat-in');const v=inp.value.trim();if(!v)return;
  addMsg('Tú ✅',v,'🙋');inp.value='';
  setTimeout(()=>addMsg(NAMES[~~(Math.random()*NAMES.length)],MSGS[~~(Math.random()*MSGS.length)],AVTS[~~(Math.random()*AVTS.length)]),600+~~(Math.random()*1200));
}
function startChat(idx){
  stopChat();
  const s=SELLERS[idx];
  setTimeout(()=>addMsg(`fan_${s.n.slice(0,5).toLowerCase()}`,'¡Entrando al stream! 🔥',AVTS[0]),500);
  setTimeout(()=>addMsg(NAMES[1],'¿Cuánto cuesta el envío?',AVTS[1]),1200);
  setTimeout(()=>addMsg(NAMES[2],`¡Me encanta ${s.n}! 💛`,AVTS[2]),2000);
  chatIv=setInterval(()=>addMsg(NAMES[~~(Math.random()*NAMES.length)],MSGS[~~(Math.random()*MSGS.length)],AVTS[~~(Math.random()*AVTS.length)]),6000+~~(Math.random()*6000));
}
function startViewers(idx){
  viewIv=setInterval(()=>{
    const d=~~(Math.random()*7)-2;
    SELLERS[idx].v=Math.max(5,SELLERS[idx].v+d);
    const el=document.getElementById('sv-viewers');
    if(el)el.textContent=SELLERS[idx].v;
    // occasionally bump purchases
    const hot=document.getElementById('sv-hot');
    if(hot&&Math.random()<.15)hot.textContent=parseInt(hot.textContent)+1;
  },4000);
}
function stopChat(){
  if(chatIv){clearInterval(chatIv);chatIv=null;}
  if(viewIv){clearInterval(viewIv);viewIv=null;}
  if(timerIv){clearInterval(timerIv);timerIv=null;}
}


// ═══ SELLER PROFILE ═══
let curSeller=null;
const REVIEWS=[
  {av:'😊',name:'carlos.VE',stars:5,date:'hace 2 días',text:'¡Excelente vendedora! Las zapatillas llegaron en perfecto estado. 100% recomendada 🔥'},
  {av:'👩',name:'luisa_mpn',stars:5,date:'hace 1 semana',text:'Súper rápida respondiendo. El producto es idéntico al del stream. Volveré a comprar.'},
  {av:'🧔',name:'pedro_mcs',stars:4,date:'hace 2 semanas',text:'Buena atención, el envío tardó un poco más de lo esperado pero llegó bien.'},
  {av:'💁',name:'yoli_shop',stars:5,date:'hace 3 semanas',text:'Me encantó la experiencia! Primera vez comprando en live y fue increíble 😍'},
  {av:'😎',name:'el_pana99',stars:5,date:'hace 1 mes',text:'Legítima. Todo como se mostró en el stream. Confíen en esta vendedora.'},
];

const BIOS=[
  'Vendedora verificada con más de 2 años en la plataforma. Especialista en calzado deportivo importado. Envíos a todo Venezuela 🇻🇪',
  'Tecnología al mejor precio. Equipos nuevos y sellados. Factura incluida. Soporte post-venta garantizado. 💻',
  'Moda femenina y tendencias internacionales. Nuevas colecciones cada semana. Tallas XS-XL. 👗',
  'Gaming y electrónica. Control, consolas, accesorios. Todo original con garantía. 🎮',
  'Belleza y cuidado personal. Productos importados certificados. Asesoría personalizada incluida. 💄',
];

function openSeller(idx){
  curSeller=idx;
  const s=SELLERS[idx];
  const prod=PRODS.find(p=>p.s===idx);

  // Hero
  document.getElementById('sp-hero-img').src=prod?.img||'';
  const _spAv=document.getElementById('sp-av-emoji');if(_spAv){if(s.logo){_spAv.innerHTML=`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;_spAv.style.background='#000';_spAv.style.overflow='hidden';}else{_spAv.textContent=s.e;_spAv.style.background='';}} 

  // Live ring visibility
  document.getElementById('sp-live-ring').style.display='block';

  // Info
  document.getElementById('sp-name').textContent=s.n;
  document.getElementById('sp-handle').textContent=`@${s.n.toLowerCase().replace(/\s/g,'')}.ve`;
  document.getElementById('sp-location').innerHTML=`📍 ${['Caracas','Valencia','Maracaibo','Barquisimeto','Maturín'][idx%5]}, Venezuela`;

  // Follow btn
  const fb=document.getElementById('sp-fol-btn');
  fb.textContent=following.has(idx)?'✓ Siguiendo':'+ Seguir';
  fb.className='sp-follow-btn'+(following.has(idx)?' on':'');

  // Stats
  document.getElementById('sp-stat-v').textContent=s.v;
  document.getElementById('sp-stat-s').textContent=Math.floor(s.v*18+200);
  document.getElementById('sp-stat-f').textContent=s.f;
  const rating=(4.5+Math.random()*.5).toFixed(1);
  document.getElementById('sp-stat-r').textContent=rating;
  document.getElementById('sp-rating').textContent=rating;
  document.getElementById('sp-reviews-count').textContent=`${Math.floor(Math.random()*200+50)} reseñas`;

  // Bio
  document.getElementById('sp-bio').textContent=BIOS[idx%BIOS.length];

  // Rating bars
  document.getElementById('sp-bars').innerHTML=['5','4','3','2','1'].map((star,i)=>{
    const pct=[70,20,6,2,2][i];
    return `<div class="sp-bar-row">${star}⭐<div class="sp-bar-track"><div class="sp-bar-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>`;
  }).join('');

  // Products grid (seller's products)
  const sellerProds=PRODS.filter(p=>p.s===idx);
  const allProds=sellerProds.length?sellerProds:PRODS.slice(0,6);
  document.getElementById('sp-pgrid').innerHTML=allProds.map((p,i)=>`
    <div class="sp-pcard" onclick="openProd(${PRODS.indexOf(p)})">
      ${p.img?`<img src="${p.img}" onerror="this.style.display='none'">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px">${p.e}</div>`}
      ${p.live?`<div class="sp-pcard-live"><div class="lbadge" style="font-size:7px;padding:2px 5px">LIVE</div></div>`:''}
      <div class="sp-pcard-price">$${p.p}</div>
    </div>`).join('');

  // Reviews
  document.getElementById('sp-revs-list').innerHTML=REVIEWS.map(r=>`
    <div class="sp-review">
      <div class="sp-rev-header">
        <div class="sp-rev-av">${r.av}</div>
        <div class="sp-rev-name">${r.name}</div>
        <div class="sp-rev-stars">${'⭐'.repeat(r.stars)}</div>
        <div class="sp-rev-date">${r.date}</div>
      </div>
      <div class="sp-rev-text">${r.text}</div>
    </div>`).join('');

  // Reset to products tab
  spTab('prods');
  go('seller');
}

function spTab(tab){
  ['prods','revs','info'].forEach(t=>{
    document.getElementById('sp-tab-'+t).classList.toggle('on',t===tab);
    document.getElementById('sp-'+t+'-panel').style.display=t===tab?'':'none';
  });
}

function spToggleFollow(){
  if(curSeller===null)return;
  following.has(curSeller)?following.delete(curSeller):following.add(curSeller);
  const fb=document.getElementById('sp-fol-btn');
  fb.textContent=following.has(curSeller)?'✓ Siguiendo':'+ Seguir';
  fb.className='sp-follow-btn'+(following.has(curSeller)?' on':'');
  fb.classList.remove('heart-burst');void fb.offsetWidth;fb.classList.add('heart-burst');
  document.getElementById('st-fol').textContent=following.size;
  toast(following.has(curSeller)?`✅ Sigues a ${SELLERS[curSeller].n}`:`👋 Dejaste de seguir`);
}

function spOpenStream(){
  if(curSeller!==null)openStream(curSeller);
}

// ═══ NOTIFICATIONS ═══
let notifData=[
  {icon:'🔴',type:'live',text:'<strong>MarisolShop</strong> está en vivo ahora con ofertas de calzado',time:'Ahora',unread:true,action:()=>openStream(0)},
  {icon:'📦',type:'order',text:'Tu pedido <strong>#IC-48291</strong> fue confirmado por el vendedor',time:'Hace 5 min',unread:true,action:()=>openTrack(0)},
  {icon:'💰',type:'wallet',text:'<strong>+50 créditos</strong> acreditados a tu wallet. Saldo: 300 cr',time:'Hace 22 min',unread:true,action:()=>openWallet()},
  {icon:'🏍️',type:'order',text:'Tu pedido <strong>#IC-48291</strong> está en camino — llega hoy 3-5 PM',time:'Hace 1h',unread:false,action:()=>openTrack(0)},
  {icon:'👤',type:'follow',text:'<strong>SnkrsCulture</strong> y 3 vendedores más iniciaron un live',time:'Hace 2h',unread:false,action:()=>nav('exp')},
  {icon:'🔨',type:'auction',text:'Superaron tu oferta en la subasta de <strong>Jordan 4 Retro</strong>',time:'Hace 3h',unread:false,action:()=>openAuction(29)},
  {icon:'✅',type:'order',text:'Tu pedido <strong>#IC-47103</strong> fue entregado. ¡Deja una reseña!',time:'Ayer',unread:false,action:()=>toast('⭐ Deja tu reseña')},
  {icon:'⚡',type:'live',text:'<strong>GamingSetup</strong> tiene un descuento del 30% solo por hoy',time:'Ayer',unread:false,action:()=>openStream(35)},
];

function openNotifs(){
  renderNotifs();
  go('notif');
  // Mark all as read + clear badge
  notifData.forEach(n=>n.unread=false);
  const badge=document.getElementById('notif-badge');
  if(badge)badge.style.display='none';
}

function renderNotifs(){
  const el=document.getElementById('notif-list');
  if(!el)return;
  if(!notifData.length){
    el.innerHTML=`<div class="notif-empty"><div class="notif-empty-ico">🔔</div><div class="notif-empty-t">Sin notificaciones</div><div class="notif-empty-s">Cuando haya actividad en tu cuenta aparecerá aquí</div></div>`;
    return;
  }
  el.innerHTML=notifData.map((n,i)=>`
    <div class="notif-item ${n.unread?'unread':''}" onclick="notifTap(${i})">
      <div class="notif-icon ${n.type}">${n.icon}</div>
      <div class="notif-body">
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`).join('');
}

function notifTap(i){
  notifData[i].unread=false;
  notifData[i].action?.();
}

function clearNotifs(){
  notifData=[];
  renderNotifs();
  toast('🗑️ Notificaciones eliminadas');
}

// Push a new notification (called by live events)
function pushNotif(icon,type,text,action,showBanner=false){
  notifData.unshift({icon,type,text,time:'Ahora',unread:true,action});
  if(notifData.length>20)notifData=notifData.slice(0,20);
  const count=notifData.filter(n=>n.unread).length;
  const badge=document.getElementById('notif-badge');
  if(badge){badge.style.display=count?'flex':'none';badge.textContent=count;}
  if(document.getElementById('s-notif').classList.contains('on'))renderNotifs();
  // Only show banner for critical events (auction win, order update)
  if(showBanner)showNotifBanner(icon,text,action);
}

// ── Real-time notification engine ──
const RT_NOTIFS=[
  {icon:'🔴',type:'live',text:'<strong>ElectroMDO</strong> acaba de iniciar un stream de gaming',action:()=>openStream(3)},
  {icon:'🔴',type:'live',text:'<strong>SnkrsCulture</strong> está en vivo con Jordans exclusivos 🔥',action:()=>openStream(29)},
  {icon:'🔴',type:'live',text:'<strong>GamingSetup</strong> inició live — monitores y periféricos',action:()=>openStream(35)},
  {icon:'⚡',type:'wallet',text:'Nuevo descuento disponible en tu categoría favorita',action:()=>nav('home')},
  {icon:'🔨',type:'auction',text:'Quedan <strong>5 min</strong> para cerrar la subasta de Jordan 4',action:()=>openAuction(29)},
  {icon:'💰',type:'wallet',text:'<strong>+10 créditos</strong> de bienvenida acreditados a tu wallet',action:()=>openWallet()},
  {icon:'👤',type:'follow',text:'<strong>MarisolShop</strong> publicó 3 productos nuevos',action:()=>openSeller(0)},
  {icon:'📦',type:'order',text:'Tu pedido <strong>#IC-48291</strong> fue confirmado',action:()=>openTrack(0)},
  {icon:'⭐',type:'follow',text:'<strong>RelojesVIP</strong> tiene una oferta solo para seguidores hoy',action:()=>openStream(6)},
  {icon:'🏍️',type:'order',text:'Tu delivery está a <strong>10 minutos</strong> de tu ubicación',action:()=>openTrack(0)},
];
let rtIdx=0;

function fireRealTimeNotif(){
  const m=RT_NOTIFS[rtIdx%RT_NOTIFS.length];
  rtIdx++;
  pushNotif(m.icon,m.type,m.text,m.action);
  // Also show an in-app toast banner (non-intrusive)
  showNotifBanner(m.icon, m.text, m.action);
}

function showNotifBanner(icon, text, action){
  // Only show if not on notif screen
  if(document.getElementById('s-notif').classList.contains('on'))return;
  const banner=document.getElementById('notif-banner');
  if(!banner)return;
  const clean=text.replace(/<[^>]+>/g,'');
  banner.querySelector('.nb-icon').textContent=icon;
  banner.querySelector('.nb-text').textContent=clean.length>55?clean.slice(0,55)+'…':clean;
  banner.onclick=()=>{banner.classList.remove('on');action?.();};
  banner.classList.add('on');
  clearTimeout(banner._t);
  banner._t=setTimeout(()=>banner.classList.remove('on'),4000);
}

// ── Notificaciones solo para eventos importantes ──
// (subastas ganadas, pedidos, wallet) — no auto-spam


