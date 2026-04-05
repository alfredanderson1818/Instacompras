// ═══ BROADCAST — Go Live, Agora, Broadcast Auction, Live Sim ═══
// Dependencies: core.js, config.js

// ═══ GO LIVE ═══
let cameraStream=null, facingMode='user', bcTimerIv=null, bcSecs=0;
let bcProdIdx=0, bcSelectedProds=[], bcViewerIv=null, bcChatIv=null;
let isMuted=false;


// ═══ AGORA RTC ═══
const AGORA_APP_ID='989149d167ca46ccbd90405fbd706abb';
const AGORA_TEMP_TOKEN='007eJxTYDjltkXseur2n9WHUr4+j91gG73pqNecR0GvkwzD73rF/zRRYLC0sDQ0sUwxNDNPTjQxS05OSrE0MDEwTUtKMTcwS0xKEp95MbMhkJHBZ+UtJkYGCATxWRgyk+MNGBgAIcgh+A==';
let agoraClient=null, agoraJoined=false;
let agoraLocalVideo=null, agoraLocalAudio=null;

function getChannelForSeller(idx){
  return 'ic_'+idx;
}
function getMySellerIdx(){
  if(!window.fbUser)return 0;
  const u=(window.fbUser.username||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const idx=SELLERS.findIndex(s=>s.n.toLowerCase().replace(/[^a-z0-9]/g,'')===u);
  return idx>=0?idx:0;
}

async function leaveAgoraChannel(){
  try{
    if(agoraLocalVideo){agoraLocalVideo.stop();agoraLocalVideo.close();agoraLocalVideo=null;}
    if(agoraLocalAudio){agoraLocalAudio.stop();agoraLocalAudio.close();agoraLocalAudio=null;}
    if(agoraClient&&agoraJoined){await agoraClient.leave();agoraJoined=false;}
    agoraClient=null;
  }catch(e){console.warn('Agora leave:',e);}
  const sv=document.getElementById('sv-agora-video');
  if(sv){sv.style.display='none';sv.innerHTML='';}
  const bc=document.getElementById('bc-agora-video');
  if(bc){bc.style.display='none';bc.innerHTML='';}
}

async function joinAsAudience(channelName){
  if(typeof AgoraRTC==='undefined'){toast('⚠️ SDK de stream no disponible');return;}
  try{
    await leaveAgoraChannel();
    agoraClient=AgoraRTC.createClient({mode:'live',codec:'h264'});
    await agoraClient.setClientRole('audience');
    await agoraClient.join(AGORA_APP_ID, channelName, AGORA_TEMP_TOKEN, null);
    agoraJoined=true;
    agoraClient.on('user-published', async(user,mediaType)=>{
      await agoraClient.subscribe(user,mediaType);
      if(mediaType==='video'){
        const container=document.getElementById('sv-agora-video');
        if(container){container.style.display='block';user.videoTrack.play(container);}
        const img=document.getElementById('sv-img');
        if(img)img.style.opacity='0';
      }
      if(mediaType==='audio'){user.audioTrack.play();}
    });
    agoraClient.on('user-unpublished',(user,mediaType)=>{
      if(mediaType==='video'){
        const container=document.getElementById('sv-agora-video');
        if(container){container.style.display='none';container.innerHTML='';}
        const img=document.getElementById('sv-img');
        if(img)img.style.opacity='1';
      }
    });
    toast('📡 Conectado al live');
  }catch(e){
    console.error('Agora audience:',e);
    toast('⚠️ No se pudo conectar al stream en vivo');
  }
}

async function joinAsHost(channelName){
  if(typeof AgoraRTC==='undefined'){toast('⚠️ SDK de stream no disponible');return;}
  try{
    // Stop getUserMedia preview
    if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
    await leaveAgoraChannel();
    agoraClient=AgoraRTC.createClient({mode:'live',codec:'h264'});
    await agoraClient.setClientRole('host');
    await agoraClient.join(AGORA_APP_ID, channelName, AGORA_TEMP_TOKEN, null);
    agoraJoined=true;
    // Create tracks
    [agoraLocalAudio,agoraLocalVideo]=await AgoraRTC.createMicrophoneAndCameraTracks(
      {encoderConfig:'music_standard'},
      {encoderConfig:'720p_1',facingMode}
    );
    // Show in broadcast screen
    const bcHtml=document.getElementById('bc-video');
    if(bcHtml)bcHtml.style.display='none';
    const bcAgora=document.getElementById('bc-agora-video');
    if(bcAgora){bcAgora.style.display='block';agoraLocalVideo.play(bcAgora);}
    await agoraClient.publish([agoraLocalAudio,agoraLocalVideo]);
    toast('📡 ¡Estás en vivo!');
  }catch(e){
    console.error('Agora host:',e);
    toast('⚠️ Error al iniciar live: '+e.message);
    if(btn){btn.textContent='Empezar en Vivo';btn.disabled=false;}
  }
}

// Init go-live screen
let glSaleType='sell';
function glSetType(t){
  glSaleType=t;
  ['sell','auc','both'].forEach(k=>{
    const el=document.getElementById('gl-type-'+k);
    if(!el)return;
    const active=k===t;
    el.style.background=active?'rgba(255,208,0,.1)':'var(--dk3)';
    el.style.borderColor=active?'rgba(255,208,0,.6)':'rgba(255,255,255,.07)';
    el.querySelector('div:nth-child(2)').style.color=active?'var(--y)':'var(--mu)';
  });
}
function initGoLive(){
  const cats=['👟 Calzado','📱 Tech','👗 Ropa','💄 Belleza','🏠 Hogar','⚽ Deportes','💍 Joyería','🎮 Gaming','🪑 Hogar/Usado','🃏 Coleccionables'];
  document.getElementById('gl-cats').innerHTML=cats.map((c,i)=>`
    <div class="gl-chip ${i===0?'on':''}" onclick="glSelCat(this)">${c}</div>`).join('');
  glSetType('sell');
  startCamera();
  go('golive');
}

function glSelCat(el){
  document.querySelectorAll('#gl-cats .gl-chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
}
function glToggleProd(idx,el){
  if(bcSelectedProds.includes(idx)){
    if(bcSelectedProds.length===1)return; // keep at least 1
    bcSelectedProds=bcSelectedProds.filter(i=>i!==idx);
    el.classList.remove('on');
  } else {
    bcSelectedProds.push(idx);
    el.classList.add('on');
  }
}

async function startCamera(){
  try{
    if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode},audio:true});
    const v1=document.getElementById('gl-video');
    const v2=document.getElementById('bc-video');
    if(v1){v1.srcObject=cameraStream;}
    if(v2){v2.srcObject=cameraStream;}
    document.getElementById('gl-cam-off').style.display='none';
    document.getElementById('gl-flip').style.display='flex';
  } catch(e){
    document.getElementById('gl-cam-off').innerHTML=`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".3"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg><div style="text-align:center;padding:0 20px">Cámara no disponible.<br>Actívala en Ajustes del navegador.</div>`;
  }
}

function flipCamera(){
  facingMode=facingMode==='user'?'environment':'user';
  // If broadcasting with Agora, recreate the video track
  if(agoraJoined && agoraLocalVideo){
    agoraLocalVideo.stop();agoraLocalVideo.close();
    AgoraRTC.createCameraVideoTrack({encoderConfig:'720p_1',facingMode}).then(async track=>{
      agoraLocalVideo=track;
      const bc=document.getElementById('bc-agora-video');
      if(bc)agoraLocalVideo.play(bc);
      await agoraClient.unpublish();
      await agoraClient.publish([agoraLocalAudio,agoraLocalVideo]);
    }).catch(e=>toast('⚠️ Error al voltear cámara'));
  } else {
    startCamera();
  }
}

function stopCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
}


// ═══ BROADCAST AUCTION SYSTEM ═══
let bcAucSecs=120, bcAucIv=null, bcAucTopBid=0, bcAucName='', bcSelDurSecs=10;

function bcShowAucPanel(){
  if(bcAucIv){toast('⚠️ Ya hay una subasta activa');return;}
  const p=document.getElementById('bc-auc-panel');
  if(p){p.style.display='flex';}
  // Pre-fill with current item name
  const nameInp=document.getElementById('bc-auc-name');
  const curName=document.getElementById('bc-pn')?.textContent;
  if(nameInp&&curName&&curName!=='¿Qué vas a vender?') nameInp.value=curName;
}
function bcHideAucPanel(){
  const p=document.getElementById('bc-auc-panel');
  if(p) p.style.display='none';
}
function bcShowItemPanel(){
  const p=document.getElementById('bc-item-panel');
  if(p) p.style.display='flex';
}
function bcHideItemPanel(){
  const p=document.getElementById('bc-item-panel');
  if(p) p.style.display='none';
}
function bcSaveItem(){
  const name=(document.getElementById('bc-item-name-inp')?.value||'').trim();
  const price=(document.getElementById('bc-item-price-inp')?.value||'').trim();
  if(!name){toast('⚠️ Escribe el nombre del item');return;}
  const pn=document.getElementById('bc-pn');
  const pp=document.getElementById('bc-pp');
  const pe=document.getElementById('bc-pe');
  if(pn) pn.textContent=name;
  if(pp) pp.textContent=price?'$'+price:'—';
  if(pe) pe.textContent='📦';
  document.getElementById('bc-prod-sub').textContent='Item activo';
  bcHideItemPanel();
  toast('✅ Item actualizado');
}
function bcSelDur(el,secs){
  bcSelDurSecs=secs;
  document.querySelectorAll('.bc-dur-opt').forEach(d=>d.classList.remove('on'));
  el.classList.add('on');
}
function bcStartAuction(){
  const name=(document.getElementById('bc-auc-name')?.value||'').trim();
  const startBid=parseFloat(document.getElementById('bc-auc-start')?.value)||0;
  if(!name){toast('⚠️ Escribe qué vas a subastar');return;}
  bcAucName=name; bcAucTopBid=startBid; bcAucSecs=bcSelDurSecs;
  bcHideAucPanel();
  // Show overlay
  const overlay=document.getElementById('bc-auc-overlay');
  if(overlay) overlay.style.display='block';
  const nameEl=document.getElementById('bc-auc-item-name');
  if(nameEl) nameEl.textContent=name;
  const topBidEl=document.getElementById('bc-auc-top-bid');
  if(topBidEl) topBidEl.textContent=startBid?'$'+startBid:'Sin oferta';
  // Glow the auction button
  const aucBtn=document.getElementById('bc-auc-btn');
  if(aucBtn){aucBtn.style.background='rgba(255,59,59,.4)';aucBtn.style.borderColor='var(--rd)';}
  // Update item bar
  const pn=document.getElementById('bc-pn');
  if(pn) pn.textContent='🔨 '+name;
  const pp=document.getElementById('bc-pp');
  if(pp) pp.textContent=startBid?'$'+startBid:'Abierta';
  // Start countdown
  bcAucIv=setInterval(bcAucTick,1000);
  bcAucTick();
  // Announce in chat
  addBcMsg('🔨','Sistema',`🔨 ¡SUBASTA INICIADA! "${name}" — ${bcSelDurSecs<60?bcSelDurSecs+'seg':bcSelDurSecs/60+'min'} — Oferta mínima: $${startBid}`);
  // Simulate bids
  setTimeout(()=>bcSimBid(),3000+Math.random()*4000);
  toast('🔨 ¡Subasta iniciada!');
}
function bcAucTick(){
  bcAucSecs=Math.max(0,bcAucSecs-1);
  const m=~~(bcAucSecs/60);
  const s=String(bcAucSecs%60).padStart(2,'0');
  const timerEl=document.getElementById('bc-auc-timer-display');
  if(timerEl){
    timerEl.textContent=m+':'+s;
    timerEl.style.color=bcAucSecs<=10?'#ff6b35':bcAucSecs<=30?'#ffaa00':'var(--rd)';
  }
  if(bcAucSecs===0){
    clearInterval(bcAucIv);bcAucIv=null;
    bcAucEnd();
  }
}
function bcSimBid(){
  if(!bcAucIv||bcAucSecs<=3)return;
  const users=['carlos.ve','luisa_mpn','el_pana99','maria2024','jose_rdz','pedro_ven'];
  const user=users[~~(Math.random()*users.length)];
  const increment=[1,2,5,10,15][~~(Math.random()*5)];
  bcAucTopBid+=increment;
  const topBidEl=document.getElementById('bc-auc-top-bid');
  if(topBidEl) topBidEl.textContent='$'+bcAucTopBid;
  // Add to bids feed
  const feed=document.getElementById('bc-auc-bids-feed');
  if(feed){
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-top:1px solid rgba(255,255,255,.06);animation:fi .2s ease';
    row.innerHTML=`<span style="font-size:11px;font-weight:800;color:var(--y)">@${user}</span><span style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:#fff">$${bcAucTopBid}</span>`;
    feed.prepend(row);
    while(feed.children.length>3)feed.removeChild(feed.lastChild);
  }
  addBcMsg('💛',user,`Oferta: $${bcAucTopBid}`);
  // Schedule next bid
  if(bcAucIv&&bcAucSecs>5) setTimeout(()=>bcSimBid(),2000+Math.random()*5000);
}
function bcAucEnd(){
  const overlay=document.getElementById('bc-auc-overlay');
  if(overlay) overlay.style.display='none';
  const aucBtn=document.getElementById('bc-auc-btn');
  if(aucBtn){aucBtn.style.background='rgba(255,59,59,.15)';aucBtn.style.borderColor='rgba(255,59,59,.35)';}
  const winner=bcAucTopBid>0?`¡Ganador con $${bcAucTopBid}! 🏆`:'Sin ofertas.';
  addBcMsg('🔨','Sistema',`🔨 SUBASTA CERRADA: "${bcAucName}" — ${winner}`);
  toast(`🔨 Subasta cerrada — ${winner}`);
  // Reset item bar
  const pn=document.getElementById('bc-pn');
  if(pn) pn.textContent='¿Qué vas a vender?';
  const pp=document.getElementById('bc-pp');
  if(pp) pp.textContent='—';
}
function bcEndAuction(){
  clearInterval(bcAucIv);bcAucIv=null;
  bcAucSecs=0;bcAucEnd();
}

function startBroadcast(){
  const title=document.getElementById('gl-title').value.trim()||'Stream en vivo 🔴';
  bcProdIdx=bcSelectedProds[0]||0;
  bcSecs=0;
  // Update featured product
  updateBcProd();
  // Timer
  if(bcTimerIv)clearInterval(bcTimerIv);
  bcTimerIv=setInterval(()=>{
    bcSecs++;
    const m=String(~~(bcSecs/60)).padStart(2,'0');
    const s=String(bcSecs%60).padStart(2,'0');
    const el=document.getElementById('bc-timer');
    if(el)el.textContent=m+':'+s;
  },1000);
  // Viewers simulation
  let viewers=1;
  if(bcViewerIv)clearInterval(bcViewerIv);
  bcViewerIv=setInterval(()=>{
    viewers+=Math.random()<.7?~~(Math.random()*8+1):-(~~(Math.random()*3));
    viewers=Math.max(1,viewers);
    const el=document.getElementById('bc-viewers');
    if(el)el.textContent=viewers;
  },3000);
  // Chat simulation
  const msgs=[
    {u:'carlos.VE',t:'🔥 Ya empezó!',a:'😊'},
    {u:'luisa_mpn',t:'¿Cuánto cuesta?',a:'👩'},
    {u:'pedro_mcs',t:'Envían a Valencia?',a:'🧔'},
    {u:'yoli_shop',t:'¡Chévere el producto!',a:'💁'},
    {u:'el_pana99',t:'Comprando ahora 🛒',a:'😎'},
    {u:'cristi_vzla',t:'Me encantó 😍',a:'🤩'},
    {u:'marleny07',t:'¿Aceptas Zelle?',a:'😄'},
    {u:'rosmary.ve',t:'Más tallas disponibles?',a:'👩'},
  ];
  let msgIdx=0;
  if(bcChatIv)clearInterval(bcChatIv);
  bcChatIv=setInterval(()=>{
    const m=msgs[msgIdx%msgs.length];msgIdx++;
    addBcMsg(m.a,m.u,m.t);
  },7000+~~(Math.random()*5000));
  // Push notif to "audience"
  pushNotif('🔴','live',`<strong>Tú</strong> estás en vivo ahora — ${title}`,()=>go('broadcast'),false);
  go('broadcast');
  // Join Agora as host
  const channelName=getChannelForSeller(getMySellerIdx());
  joinAsHost(channelName);
  // Save stream to Firestore
  const uid=window.fbUser?.uid;
  if(uid){
    fsSet('streams',channelName,{
      sellerId:uid, sellerName:window.fbUser?.name||window.fbUser?.username||'Vendedor',
      shopName:window.fbUser?.shop||'', channelName, title,
      isLive:true, viewerCount:1, startedAt:Date.now()
    });
    fsSet('stores',uid,{isLive:true,channelName});
  }
  // If auction mode selected, auto-open auction panel
  if(glSaleType==='auction'){setTimeout(()=>bcShowAucPanel(),1000);}
}

function updateBcProd(){
  const p=PRODS[bcProdIdx];
  const pt=document.getElementById('bc-pt');
  const pn=document.getElementById('bc-pn');
  const pp=document.getElementById('bc-pp');
  if(pt)pt.innerHTML=p.img?`<img src="${p.img}" onerror="this.style.display='none'"><span style="position:absolute">${p.e}</span>`:`<span>${p.e}</span>`;
  if(pn)pn.textContent=p.n;
  if(pp)pp.textContent=`$${p.p}`;
}

function cycleBcProd(){
  const idx=bcSelectedProds.indexOf(bcProdIdx);
  bcProdIdx=bcSelectedProds[(idx+1)%bcSelectedProds.length];
  updateBcProd();
  toast(`🛍️ Mostrando: ${PRODS[bcProdIdx].n}`);
}

function toggleMute(){
  isMuted=!isMuted;
  // Agora track mute
  if(agoraLocalAudio){agoraLocalAudio.setEnabled(!isMuted);}
  // Fallback: getUserMedia mute
  if(cameraStream){cameraStream.getAudioTracks().forEach(t=>t.enabled=!isMuted);}
  const btn=document.getElementById('bc-mute-btn');
  if(btn){
    const micSVG=isMuted
      ?'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>'
      :'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>';
    btn.innerHTML=micSVG+`<div class="bc-act-l" style="color:${isMuted?'#ff3b3b':'rgba(255,255,255,.8)'}">${isMuted?'Silenc.':'Mic'}</div>`;
  }
  toast(isMuted?'🔇 Micrófono silenciado':'🎤 Micrófono activado');
}

function addBcMsg(av,user,text){
  const el=document.getElementById('bc-msgs');
  if(!el)return;
  const d=document.createElement('div');
  d.className='bc-msg';
  d.innerHTML=`<div class="bc-av">${av}</div><div class="bc-mb"><div class="bc-mu">${user}</div><div class="bc-mt">${text}</div></div>`;
  el.appendChild(d);
  while(el.children.length>3)el.removeChild(el.firstChild);
}

function bcSend(){
  const inp=document.getElementById('bc-inp');
  if(!inp||!inp.value.trim())return;
  addBcMsg('😊','Tú (vendedor)',inp.value.trim());
  inp.value='';
}

function endBroadcast(){
  clearInterval(bcTimerIv);clearInterval(bcViewerIv);clearInterval(bcChatIv);
  stopCamera();
  leaveAgoraChannel();
  // Mark stream offline in Firestore
  const uid=window.fbUser?.uid;
  const channelName=getChannelForSeller(getMySellerIdx());
  if(uid){
    fsSet('streams',channelName,{isLive:false,endedAt:Date.now()});
    fsSet('stores',uid,{isLive:false});
  }
  const m=String(~~(bcSecs/60)).padStart(2,'0');
  const s=String(bcSecs%60).padStart(2,'0');
  toast(`✅ Stream terminado — Duración: ${m}:${s}`);
  hist=['home'];go('home',false);
}

// ═══ MODAL ═══
function openModal(){initGoLive();}
function closeModal(e,force){if(force||e?.target===document.getElementById('modal'))document.getElementById('modal').classList.remove('on');}


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
