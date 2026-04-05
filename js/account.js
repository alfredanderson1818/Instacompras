// ═══ ACCOUNT — Auth, Profile, Dashboard, Order Tracking ═══
// Dependencies: core.js, firebase.js

// ═══ AUTH ═══
let accType='buyer';
function authMode(mode){
  const isLogin=mode==='login';
  document.getElementById('auth-login-form').style.display=isLogin?'flex':'none';
  document.getElementById('auth-reg-form').style.display=isLogin?'none':'flex';
  const tL=document.getElementById('tab-login');
  const tR=document.getElementById('tab-reg');
  if(tL){tL.style.background=isLogin?'var(--y)':'transparent';tL.style.color=isLogin?'var(--dk)':'var(--mu)';}
  if(tR){tR.style.background=isLogin?'transparent':'var(--y)';tR.style.color=isLogin?'var(--mu)':'var(--dk)';}
  // scroll to top
  document.getElementById('s-register').scrollTop=0;
}
function setAccType(type){
  accType=type;
  const b=document.getElementById('type-buyer');
  const s=document.getElementById('type-seller');
  const sf=document.getElementById('seller-fields');
  if(type==='buyer'){
    b.style.borderColor='rgba(255,208,0,.5)';b.children[1].style.color='var(--y)';
    s.style.borderColor='rgba(255,255,255,.06)';s.children[1].style.color='var(--mu)';
    sf.style.display='none';
  } else {
    s.style.borderColor='rgba(255,208,0,.5)';s.children[1].style.color='var(--y)';
    b.style.borderColor='rgba(255,255,255,.06)';b.children[1].style.color='var(--mu)';
    sf.style.display='';
  }
}
function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value.trim();
  if(!email||!pass){toast('⚠️ Completa todos los campos');return;}
  const btn=document.querySelector('#auth-login-form button');
  if(btn){btn.textContent='Entrando…';btn.disabled=true;}
  fbSignIn(email,pass)
    .then(async d=>{
      window.fbToken=d.idToken;
      const userData=await fbGetUser(d.localId,d.idToken);
      window.fbUser={uid:d.localId,...(userData||{email})};
      fbSaveSession(d.idToken,d.localId);fbCacheUser({uid:d.localId,...(window.fbUser||{})});
      toast('✅ ¡Bienvenido de vuelta!');setTimeout(loadProfData,500);
      const reg=document.getElementById('s-register');
      if(reg)reg.classList.remove('on');
      const ob=document.getElementById('s-onboard');
      if(ob){ob.classList.remove('on');ob.style.display='none';}
      setTimeout(()=>{buildLiveStrip();buildGrid();go('home',false);},400);
    })
    .catch(e=>{
      if(btn){btn.textContent='Entrar';btn.disabled=false;}
      const msgs={'EMAIL_NOT_FOUND':'❌ Usuario no encontrado','INVALID_PASSWORD':'❌ Contraseña incorrecta','INVALID_LOGIN_CREDENTIALS':'❌ Correo o contraseña incorrectos','TOO_MANY_ATTEMPTS_TRY_LATER':'❌ Demasiados intentos, espera un momento'};
      toast(msgs[e.code]||'❌ '+(e.message||'Error al iniciar sesión'));
    });
}
function regSocial(type){
  if(type==='Google'){
    toast('🌐 Conectando con Google…');
    fbGoogleSignIn()
      .then(async d=>{
        window.fbToken=d.idToken;
        // Check if user already has a profile
        let userData=await fbGetUser(d.localId,d.idToken).catch(()=>null);
        if(!userData){
          // New user — create profile from Google data
          userData={
            name:d.displayName||d.email.split('@')[0],
            username:d.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g,''),
            email:d.email,
            phone:'',city:'',type:'buyer',shop:'',
            uid:d.localId,
            avatar:d.photoUrl||''
          };
          await fbSaveUser(d.localId,userData,d.idToken).catch(()=>{});
        }
        window.fbUser={uid:d.localId,...userData};
        fbSaveSession(d.idToken,d.localId);fbCacheUser({uid:d.localId,...(window.fbUser||{})});
        toast('✅ Sesión iniciada con Google');
        const reg=document.getElementById('s-register');
        if(reg)reg.classList.remove('on');
        const ob=document.getElementById('s-onboard');
        if(ob){ob.classList.remove('on');ob.style.display='none';}
        setTimeout(()=>{loadProfData();buildGrid();go('home',false);},400);
      })
      .catch(e=>{
        toast('❌ '+(e.message||'Error al conectar con Google'));
      });
  } else {
    toast('🌐 Próximamente: '+type);
  }
}
function regSubmit(){
  const name=document.getElementById('reg-name').value.trim();
  const username=document.getElementById('reg-username')?.value.trim().toLowerCase()||'';
  const cedula=document.getElementById('reg-cedula')?.value.trim()||'';
  const phone=document.getElementById('reg-phone').value.trim();
  const pass=document.getElementById('reg-pass').value.trim();
  const pass2=document.getElementById('reg-pass2')?.value.trim()||'';
  const city=(document.getElementById('reg-city')?.value||'').trim();
  const shop=(document.getElementById('reg-shop')?.value||'').trim();
  if(!name){toast('⚠️ Escribe tu nombre completo');return;}
  if(!cedula){toast('⚠️ Ingresa tu número de cédula');return;}
  if(!username){toast('⚠️ Elige un nombre de usuario');return;}
  if(!phone||!phone.includes('@')){toast('⚠️ Ingresa un correo válido');return;}
  if(!pass||pass.length<6){toast('⚠️ Contraseña mínimo 6 caracteres');return;}
  if(pass!==pass2){toast('⚠️ Las contraseñas no coinciden');return;}
  const emailToUse=phone;
  const btn=document.querySelector('#auth-reg-form button');
  if(btn){btn.textContent='Creando cuenta…';btn.disabled=true;}
  fbSignUp(emailToUse,pass)
    .then(async d=>{
      window.fbToken=d.idToken;
      const userData={name,username,cedula,phone,city,type:accType,shop,email:emailToUse,uid:d.localId};
      await fbSaveUser(d.localId,userData,d.idToken);
      window.fbUser={...userData};
      fbSaveSession(d.idToken,d.localId);fbCacheUser({uid:d.localId,...(window.fbUser||{})});
      // Si es vendedor, crear tienda en Firestore
      if(accType==='seller'&&shop){
        fsSet('stores',d.localId,{
          uid:d.localId, shopName:shop, ownerName:name,
          email:emailToUse, phone, city, cedula,
          followers:0, totalSales:0, rating:5.0,
          isLive:false, isVerified:false,
          createdAt:Date.now(), category:'', description:''
        });
      }
      const msg=accType==='seller'?`📡 ¡Cuenta vendedor creada, ${name.split(' ')[0]}!`:`🎉 ¡Bienvenido, ${name.split(' ')[0]}!`;
      toast(msg);
      const reg=document.getElementById('s-register');
      if(reg)reg.classList.remove('on');
      const ob=document.getElementById('s-onboard');
      if(ob){ob.classList.remove('on');ob.style.display='none';}
      setTimeout(()=>{buildLiveStrip();buildGrid();go('home',false);},400);
    })
    .catch(e=>{
      if(btn){btn.textContent='Crear Cuenta';btn.disabled=false;}
      const msgs={'EMAIL_EXISTS':'❌ Este teléfono/correo ya está registrado','WEAK_PASSWORD : Password should be at least 6 characters':'❌ Contraseña muy débil'};
      toast(msgs[e.code]||'❌ '+(e.message||'Error al registrar'));
    });
}
function regLogin(){authMode('login');}


// ═══ PROFILE EDIT ═══
function loadProfData(){
  const u=window.fbUser;
  if(!u)return;
  // Name
  const nameEl=document.getElementById('prof-name-display');
  if(nameEl) nameEl.textContent=u.name||u.email||'Usuario';
  // Handle
  const handleEl=document.getElementById('prof-handle-display');
  if(handleEl){
    const handle=u.username?('@'+u.username):(u.email?u.email.split('@')[0]:'');
    const city=u.city?(' · '+u.city+' 🇻🇪'):'';
    handleEl.textContent=handle+city;
  }
  // Bio
  const bioEl=document.getElementById('prof-bio-display');
  if(bioEl){
    const type=u.type==='seller'?'Vendedor 📡':'Comprador 🛍️';
    bioEl.textContent=u.bio||(type+(u.city?' · '+u.city:''));
  }
  // Type badge
  const badge=document.getElementById('prof-type-badge');
  if(badge) badge.textContent=u.type==='seller'?'VENDEDOR':'COMPRADOR';
  // Avatar initials
  const initEl=document.getElementById('prof-av-initials');
  if(initEl){
    const name=u.name||u.email||'?';
    const parts=name.trim().split(' ');
    const initials=parts.length>=2?(parts[0][0]+parts[1][0]).toUpperCase():name[0].toUpperCase();
    initEl.textContent=initials;
  }
  // If Google avatar exists
  if(u.avatar){
    const img=document.getElementById('prof-av-img');
    const ini=document.getElementById('prof-av-initials');
    if(img&&ini){img.src=u.avatar;img.style.display='block';ini.style.display='none';}
  }
  // Checkout name
  const coName=document.getElementById('co-name-display');
  if(coName) coName.textContent=u.name||'—';
}

function openProfEdit(){
  const modal=document.getElementById('prof-edit-modal');
  if(!modal)return;
  document.getElementById('prof-edit-name').value=document.getElementById('prof-name-display').textContent;
  const h=document.getElementById('prof-handle-display').textContent.split('@')[1]?.split('·')[0]?.trim()||'';
  document.getElementById('prof-edit-handle').value=h;
  document.getElementById('prof-edit-bio').value=document.getElementById('prof-bio-display').textContent.trim();
  updateBioCount();
  modal.style.display='flex';
  document.getElementById('prof-edit-name').focus();
}
function closeProfEdit(){
  const modal=document.getElementById('prof-edit-modal');
  if(modal)modal.style.display='none';
}
function updateBioCount(){
  const ta=document.getElementById('prof-edit-bio');
  const cnt=document.getElementById('prof-bio-count');
  if(ta&&cnt)cnt.textContent=ta.value.length;
}
function saveProfEdit(){
  const name=document.getElementById('prof-edit-name').value.trim();
  const handle=document.getElementById('prof-edit-handle').value.trim();
  const bio=document.getElementById('prof-edit-bio').value.trim();
  if(!name){toast('⚠️ Escribe tu nombre');return;}
  if(name)document.getElementById('prof-name-display').textContent=name;
  if(handle)document.getElementById('prof-handle-display').textContent=`@${handle} · Caracas 🇻🇪`;
  if(bio)document.getElementById('prof-bio-display').textContent=bio;
  closeProfEdit();
  toast('✅ Perfil actualizado');
}
// Counter live en textarea bio
document.addEventListener('DOMContentLoaded',()=>{
  const ta=document.getElementById('prof-edit-bio');
  if(ta)ta.addEventListener('input',updateBioCount);
});

// ═══ PROFILE PHOTO UPLOAD ═══
function profUploadAv(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.getElementById('prof-av-img');
    if(img){img.src=e.target.result;}
    toast('✅ Foto de perfil actualizada');
  };
  reader.readAsDataURL(file);
  input.value='';
}
function profUploadBanner(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.getElementById('prof-banner-img');
    if(img){img.src=e.target.result;img.style.opacity='.75';}
    toast('✅ Portada actualizada');
  };
  reader.readAsDataURL(file);
  input.value='';
}

// ═══ ORDER TRACKING ═══
const TRACK_STEPS=[
  {icon:'✅',title:'Pedido confirmado',desc:'El vendedor recibió y confirmó tu pedido',time:'Hoy 1:05 PM',status:'done'},
  {icon:'📦',title:'Preparando envío',desc:'El vendedor está empacando tu producto',time:'Hoy 2:30 PM',status:'done'},
  {icon:'🏍️',title:'En camino',desc:'Tu moto delivery está en ruta hacia ti',time:'Hoy 3:15 PM',status:'active'},
  {icon:'🏠',title:'Entregado',desc:'Tu pedido llegará pronto a tu dirección',time:'Estimado 3-5 PM',status:'pending'},
];

function openTrack(cartIdx){
  const item=cart.length?cart[cartIdx||0]:null;
  const prod=item?PRODS[item.pi]:PRODS[0];
  const seller=SELLERS[prod.s];
  const num='IC-'+~~(Math.random()*90000+10000);

  document.getElementById('track-order-num').textContent='#'+num;
  document.getElementById('track-num2').textContent='#'+num;
  document.getElementById('track-emo').textContent=prod.e;
  const img=document.getElementById('track-img');
  if(prod.img)img.innerHTML=`<img src="${prod.img}" onerror="this.style.display='none'">${prod.e}`;
  document.getElementById('track-prod-name').textContent=prod.n;
  document.getElementById('track-prod-seller').textContent=seller.n;
  document.getElementById('track-prod-price').textContent='$'+(item?prod.p*item.q:prod.p);
  document.getElementById('track-pay').textContent='⚡ InstaCreditos';

  // Timeline
  document.getElementById('track-timeline').innerHTML=TRACK_STEPS.map(s=>`
    <div class="track-step ${s.status}">
      <div class="track-dot">${s.icon}</div>
      <div class="track-info">
        <div class="track-step-title">${s.title}</div>
        <div class="track-step-desc">${s.desc}</div>
        <div class="track-step-time">${s.time}</div>
      </div>
    </div>`).join('');

  go('track');
}


// ═══ DASHBOARD ═══
let DASH_ORDERS=[
  {prod:'Nike Air Jordan 1',img:IMGS.jordan,e:'👟',buyer:'carlos.VE',amt:120,status:'pending',date:'Hace 5 min'},
  {prod:'Sony WH-1000XM5',img:IMGS.headphones,e:'🎧',buyer:'luisa_mpn',amt:110,status:'processing',date:'Hace 22 min'},
  {prod:'Casio G-Shock',img:IMGS.watch,e:'⌚',buyer:'pedro_mcs',amt:75,status:'delivered',date:'Hace 1h'},
  {prod:'Perfume Premium',img:IMGS.perfume,e:'🌸',buyer:'yoli_shop',amt:55,status:'delivered',date:'Hace 2h'},
  {prod:'Control PS5',img:IMGS.gamepad,e:'🎮',buyer:'el_pana99',amt:65,status:'pending',date:'Hace 3h'},
  {prod:'Tacones Stiletto',img:IMGS.heels,e:'👠',buyer:'cristi_vzla',amt:35,status:'delivered',date:'Ayer'},
  {prod:'Anillo Oro 18K',img:IMGS.ring,e:'💍',buyer:'marleny07',amt:95,status:'delivered',date:'Ayer'},
];
const DAYS=["L","M","M","J","V","S","D"];
const WEEK_DATA=[42,78,55,91,63,120,88];

async function openDash(){
  go('dash');
  dashTab('orders');
  // Load real orders from Firestore for this seller
  const uid=window.fbUser?.uid;
  if(uid){
    fsQuery('orders',[{field:'sellerId',value:uid}]).then(fsOrders=>{
      if(fsOrders.length){
        // Merge FS orders with local, dedup by orderId
        const existingIds=new Set(DASH_ORDERS.map(o=>o._id||o.orderId));
        fsOrders.forEach(o=>{if(!existingIds.has(o._id))DASH_ORDERS.unshift({...o,buyer:o.buyerName,buyerPhone:o.buyerPhone,buyerCity:o.buyerCity,num:o.num||o.orderId,date:o.date||'Guardado'});});
      }
      renderDash();
    }).catch(()=>renderDash());
  } else {
    renderDash();
  }
}
function renderDash(){
  const revenue=DASH_ORDERS.reduce((s,o)=>s+o.amt,0);
  const todayRev=DASH_ORDERS.slice(0,3).reduce((s,o)=>s+o.amt,0);
  const pending=DASH_ORDERS.filter(o=>o.status==='pending').reduce((s,o)=>s+o.amt,0);
  document.getElementById('dash-revenue').textContent='$'+revenue;
  document.getElementById('dash-rev-sub').textContent='+23% vs mes anterior';
  document.getElementById('dash-today').textContent='$'+todayRev;
  document.getElementById('dash-pending').textContent='$'+pending;
  document.getElementById('dash-orders').textContent=DASH_ORDERS.length;
  document.getElementById('dash-views').textContent='389';
  document.getElementById('dash-followers').textContent='12.4k';
  document.getElementById('dash-products').textContent=PRODS.filter(p=>p.s===0).length||6;
  const maxVal=Math.max(...WEEK_DATA);
  document.getElementById('dash-bars').innerHTML=WEEK_DATA.map((v,i)=>`<div class="dash-bar-wrap"><div class="dash-bar-val">${v>0?'$'+v:''}</div><div class="dash-bar ${i===6?'today':''}" style="height:${Math.round((v/maxVal)*72)+4}px"></div><div class="dash-bar-lbl">${DAYS[i]}</div></div>`).join('');
  document.getElementById('dash-orders-list').innerHTML=DASH_ORDERS.map((o,i)=>{
    const statusLabel=o.status==='pending'?'⏳ Pendiente':o.status==='processing'?'🔄 En camino':'✅ Entregado';
    const auctionTag=o.fromAuction?`<span style="font-size:8px;font-weight:900;color:var(--rd);background:rgba(255,59,59,.12);border-radius:4px;padding:1px 5px;margin-left:4px">🔨 SUBASTA</span>`:'';
    const buyerDetails=[o.buyerPhone,o.buyerCity].filter(Boolean).join(' · ');
    const orderNum=o.num||('IC-'+(10000+i));
    return `<div class="dash-order" style="flex-direction:column;align-items:stretch;gap:0;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">
        <div class="dash-order-thumb">${o.img?`<img src="${o.img}" onerror="this.style.display='none'">`:''}${o.e||''}</div>
        <div style="flex:1">
          <div class="dash-order-name">${o.prod}${auctionTag}</div>
          <div class="dash-order-meta">${o.sz?`${o.sz} · `:''}x${o.qty||1} · ${o.date}</div>
        </div>
        <div class="dash-order-right">
          <div class="dash-order-amt">$${o.amt}</div>
          <div class="dash-order-status ${o.status}">${statusLabel}</div>
        </div>
      </div>
      <div style="background:var(--dk4);border-radius:10px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:10px;font-weight:900;color:var(--mu);text-transform:uppercase;letter-spacing:.4px">Comprador</span>
          <span style="font-size:10px;color:var(--mu)">#${orderNum}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--dk3);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>
          <div>
            <div style="font-size:13px;font-weight:900;color:#fff">${o.buyer}</div>
            ${buyerDetails?`<div style="font-size:10px;color:var(--mu)">${buyerDetails}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="event.stopPropagation();markOrderStatus(${i},'processing')" style="flex:1;padding:7px;background:rgba(33,150,243,.15);border:1px solid rgba(33,150,243,.3);border-radius:9px;color:#2196F3;font-size:10px;font-weight:900;cursor:pointer">🚀 Despachar</button>
          <button onclick="event.stopPropagation();markOrderStatus(${i},'delivered')" style="flex:1;padding:7px;background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.3);border-radius:9px;color:#4CAF50;font-size:10px;font-weight:900;cursor:pointer">✅ Entregado</button>
        </div>
      </div>
    </div>`;
  }).join('');
  const topProds=PRODS.slice(0,5);
  document.getElementById('dash-prods-list').innerHTML=topProds.map((p,i)=>`<div class="dash-top-prod"><div class="dash-tp-rank">${i+1}</div><div class="dash-tp-img">${p.img?`<img src="${p.img}" onerror="this.style.display='none'">`:''}${p.e}</div><div class="dash-tp-info"><div class="dash-tp-name">${p.n}</div><div class="dash-tp-sold">${~~(Math.random()*40+5)} vendidos</div></div><div class="dash-tp-rev">$${p.p*~~(Math.random()*40+5)}</div></div>`).join('');
  const statsData=[
    {icon:'👁',label:'Vistas al perfil',val:'2.4k',sub:'Esta semana'},
    {icon:'🛒',label:'Tasa conversión',val:'8.2%',sub:'Vistas → compras'},
    {icon:'⭐',label:'Rating promedio',val:'4.9',sub:'128 reseñas'},
    {icon:'⏱',label:'Resp. promedio',val:'12 min',sub:'Tiempo respuesta'},
    {icon:'🔴',label:'Streams este mes',val:'8',sub:'Total lives'},
    {icon:'🏆',label:'Subastas cerradas',val:String(DASH_ORDERS.filter(o=>o.fromAuction).length||23),sub:'Este mes'},
  ];
  document.getElementById('dash-stats-grid').innerHTML=statsData.map(s=>`<div style="background:var(--dk3);border-radius:13px;padding:14px;border:1px solid rgba(255,255,255,.05)"><div style="font-size:22px;margin-bottom:6px">${s.icon}</div><div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--y);line-height:1">${s.val}</div><div style="font-size:11px;font-weight:800;color:var(--tx);margin-top:3px">${s.label}</div><div style="font-size:10px;color:var(--mu);margin-top:2px">${s.sub}</div></div>`).join('');
}

function markOrderStatus(i,status){
  DASH_ORDERS[i].status=status;
  const id=DASH_ORDERS[i]._id||DASH_ORDERS[i].orderId;
  if(id)fsSet('orders',id,{status}).catch(()=>{});
  toast(status==='processing'?'🚀 Pedido despachado':'✅ Marcado como entregado');
  openDash();
}

function dashTab(tab){
  ["orders","prods","stats"].forEach(t=>{
    document.getElementById("dtab-"+t).classList.toggle("on",t===tab);
    const p=document.getElementById("dpanel-"+t);
    if(p)p.style.display=t===tab?"block":"none";
  });
}

let obCur=0;
function obNext(){
  if(obCur>=2){obSkip();return;}
  const cur=document.getElementById('ob-'+obCur);
  cur.classList.remove('on');
  cur.classList.add('out');
  setTimeout(()=>cur.classList.remove('out'),300);
  obCur++;
  const next=document.getElementById('ob-'+obCur);
  next.classList.add('on');
}
function obSkip(){
  const ob=document.getElementById('s-onboard');
  ob.classList.remove('on');
  ob.classList.add('out');
  setTimeout(()=>{ob.style.display='none';},300);
  hist=['home'];
  const home=document.getElementById('s-home');
  home.classList.add('on');
  document.getElementById('nav').className='nav';
  document.getElementById('ni-home').classList.add('on');
}
function goRegister(){go('register');}

