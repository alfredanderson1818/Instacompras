// ═══ COMMERCE — Product, Cart, Checkout, Wallet, Auction ═══
// Dependencies: core.js

// ═══ PRODUCT ═══
// Video URLs por tipo de producto
const PD_VIDEOS={
  ps5:'https://www.youtube.com/embed/RRU3l52R9i4?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0',
  iphone:'https://www.youtube.com/embed/XKfgdklWd7A?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0',
  jordan:'https://www.youtube.com/embed/oyk7mN-Ghb8?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0',
  headphones:'https://www.youtube.com/embed/jLpYPFnFNBE?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0',
  default:'https://www.youtube.com/embed/LMDSxzTjMM4?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0'
};
function pdGetVideo(p){
  const n=p.n.toLowerCase();
  if(n.includes('playstation')||n.includes('ps5'))return PD_VIDEOS.ps5;
  if(n.includes('iphone'))return PD_VIDEOS.iphone;
  if(n.includes('jordan')||n.includes('nike'))return PD_VIDEOS.jordan;
  if(n.includes('sony')||n.includes('xm5')||n.includes('auricular')||n.includes('headphone'))return PD_VIDEOS.headphones;
  return PD_VIDEOS.default;
}
function openProd(idx){
  curProd=idx;qty=1;curSz=PRODS[idx].sz[0];
  const p=PRODS[idx];const s=SELLERS[p.s];
  // Hero: mostrar video si producto live, si no mostrar imagen
  const videoWrap=document.getElementById('pd-video-wrap');
  const imgEl=document.getElementById('pd-img');
  const liveBar=document.getElementById('pd-live-bar');
  const iframe=document.getElementById('pd-iframe');
  if(p.live){
    videoWrap.style.display='block';
    imgEl.style.display='none';
    liveBar.style.display='flex';
    // Simulador live stream
    const sbg=document.getElementById('pd-stream-bg');
    const simg=document.getElementById('pd-stream-img');
    if(sbg)sbg.src=p.img||'';
    if(simg)simg.src=p.img||'';
    document.getElementById('pd-viewers').textContent=~~(Math.random()*400+80);
    const _mini=document.getElementById('pd-sav-mini');if(_mini){if(s.logo){_mini.innerHTML=`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;_mini.style.background='#000';_mini.style.overflow='hidden';}else{_mini.textContent=s.e;}} 
    document.getElementById('pd-sname-mini').textContent=s.n;
    startPdLiveSim(s);
  }else{
    stopPdLiveSim();
    videoWrap.style.display='none';
    imgEl.style.display='block';
    imgEl.src=p.img||'';
    liveBar.style.display='none';
  }
  document.getElementById('pd-emo').textContent=p.e;
  document.getElementById('pd-title').textContent=p.n;
  document.getElementById('pd-price').textContent=`$${p.p}`;
  document.getElementById('pd-old').textContent=`$${p.op}`;
  document.getElementById('pd-desc').textContent=p.d;

  const _pdSav=document.getElementById('pd-sav');if(_pdSav){if(s.logo){_pdSav.innerHTML=`<img src="${s.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;_pdSav.style.background='#000';_pdSav.style.overflow='hidden';}else{_pdSav.textContent=s.e;_pdSav.style.background='';_pdSav.style.overflow='';}} 
  document.getElementById('pd-sname').textContent=s.n;
  document.getElementById('pd-sfoll').textContent=`${s.f} seguidores`;
  document.getElementById('pd-seller').onclick=()=>openStream(p.s);
  document.getElementById('pd-wish').textContent=wish.has(idx)?'❤️':'🤍';
  // Inicializar subasta inline
  openAuction(idx);
  go('prod');
}
function selSz(btn,v){curSz=v;}
function chgQty(d){qty=Math.max(1,Math.min(10,qty+d));}
function toggleWish(){
  const btn=document.getElementById('pd-wish');
  wish.has(curProd)?wish.delete(curProd):wish.add(curProd);
  btn.textContent=wish.has(curProd)?'❤️':'🤍';
  btn.classList.remove('heart-burst');
  void btn.offsetWidth;
  btn.classList.add('heart-burst');
  if(wish.has(curProd))spawnParticle(btn,'❤️');
  toast(wish.has(curProd)?'❤️ Guardado en favoritos':'💔 Eliminado de favoritos');
}
function addCart(){if(curProd===null)return;addItem(curProd,curSz,qty);animateCartBadge();toast(`✅ ${PRODS[curProd].n} (x${qty}) al carrito`);}
function buyNow(){if(curProd===null)return;addItem(curProd,curSz,qty);go('co');updateCo();}


// ═══ CART ═══
function addItem(pi,size,q){
  const ex=cart.find(i=>i.pi===pi&&i.sz===size);
  if(ex)ex.q+=q;else cart.push({pi,sz:size,q});
  updateCart();
}
function updateCart(){
  const tot=cart.reduce((s,i)=>s+i.q,0);
  const nb=document.getElementById('cart-nb');
  if(tot){nb.textContent=tot;nb.style.display='';nb.classList.remove('cart-pop');void nb.offsetWidth;nb.classList.add('cart-pop');}
  else{nb.style.display='none';}
  document.getElementById('cart-prof-badge').textContent=tot;
  const body=document.getElementById('cart-body');
  const ft=document.getElementById('cart-ft');
  if(!cart.length){
    body.innerHTML=`<div class="cart-empty"><div class="cart-empty-ico">🛒</div><div class="cart-empty-t">Carrito vacío</div><div class="cart-empty-s">Agrega productos desde los streams en vivo 🔴</div></div>`;
    ft.style.display='none';return;
  }
  body.innerHTML=cart.map((item,i)=>{
    const p=PRODS[item.pi];const s=SELLERS[p.s];
    const unitPrice=item.overridePrice||p.p;
    const auctionBadge=item.fromAuction?`<span style="background:rgba(255,59,59,.15);color:var(--rd);font-size:9px;font-weight:900;border-radius:6px;padding:2px 7px;margin-left:4px">🔨 SUBASTA</span>`:'';
    return `<div class="citem">
      <div class="cimg">${p.img?`<img src="${p.img}" onerror="this.style.display='none'">`:`<span>${p.e}</span>`}</div>
      <div class="cinfo"><div class="cname">${p.n}${auctionBadge}</div><div class="csub">${s.n} · ${item.sz}</div><div class="cprice">$${unitPrice*item.q} USD</div></div>
      <div class="cacts">
        ${item.fromAuction?`<div style="font-size:10px;color:var(--mu);font-weight:700">x${item.q}</div>`:`<button class="cqb" onclick="cq(${i},-1)">−</button><div class="cq">${item.q}</div><button class="cqb" onclick="cq(${i},1)">+</button>`}
        <div class="crm" onclick="cr(${i})">🗑️</div>
      </div>
    </div>`;}
  ).join('');
  const sub=cart.reduce((s,i)=>s+(i.overridePrice||PRODS[i.pi].p)*i.q,0);
  document.getElementById('cart-sub').textContent=`$${sub} USD`;
  ft.style.display='';
  updateCo();
}
function cq(i,d){cart[i].q=Math.max(1,cart[i].q+d);updateCart();}
function cr(i){cart.splice(i,1);updateCart();toast('🗑️ Eliminado');}
function clearCart(){if(!cart.length)return;cart=[];updateCart();toast('🗑️ Carrito vaciado');}


// ═══ CHECKOUT ═══
function updateCo(){
  const sub=cart.reduce((s,i)=>s+(i.overridePrice||PRODS[i.pi].p)*i.q,0);
  const tot=sub+(sub>0?3:0);
  document.getElementById('co-tot').textContent=`$${tot} USD`;
  const th=document.getElementById('co-thumbs');
  if(th)th.innerHTML=cart.map(item=>{
    const p=PRODS[item.pi];
    return `<div class="co-item-thumb">${p.img?`<img src="${p.img}" onerror="this.style.display='none'">`:`<span>${p.e}</span>`}<div class="co-item-qty">${item.q}</div></div>`;
  }).join('');
  const sm=document.getElementById('co-sum');
  if(sm)sm.innerHTML=cart.map(item=>{
    const p=PRODS[item.pi];
    const unitPrice=item.overridePrice||p.p;
    return `<div class="co-summary-item"><span class="co-summary-name">${p.n}${item.fromAuction?' 🔨':''} × ${item.q}</span><span class="co-summary-val">$${unitPrice*item.q}</span></div>`;
  }).join('')+`<div class="co-summary-item"><span class="co-summary-name">Delivery 🏍️</span><span class="co-summary-val">$3</span></div><div class="co-summary-item"><span class="co-summary-name">Total</span><span class="co-summary-val" style="color:var(--y)">$${tot}</span></div>`;
}
function setSPay(i){
  selPay=i;
  document.querySelectorAll('.popt').forEach((e,j)=>{
    e.classList.toggle('on',j===i);
    e.querySelector('.prad').className='prad'+(j===i?' on':'');
  });
}
function placeOrder(){
  const sub=cart.reduce((s,i)=>s+(i.overridePrice||PRODS[i.pi].p)*i.q,0);
  const tot=sub+3;
  const num='IC-'+~~(Math.random()*90000+10000);
  const now=new Date();
  const dateStr=now.toLocaleDateString('es-VE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const buyerName=window.fbUser?.name||window.fbUser?.username||'Comprador';
  const buyerPhone=window.fbUser?.phone||window.fbUser?.email||'';
  const buyerCity=window.fbUser?.city||'';
  const buyerId=window.fbUser?.uid||'guest';
  // Push each cart item to seller dashboard + Firestore
  cart.forEach(item=>{
    const p=PRODS[item.pi];
    const s=SELLERS[p.s];
    const unitPrice=item.overridePrice||p.p;
    const orderId=fsId();
    const orderData={
      orderId, num,
      buyerId, buyerName, buyerPhone, buyerCity,
      sellerId:String(p.s), sellerName:s.n,
      prod:p.n, img:p.img||'', e:p.e||'📦',
      sz:item.sz||'', qty:item.q,
      amt:unitPrice*item.q,
      status:'pending',
      fromAuction:!!item.fromAuction,
      createdAt:Date.now(),
      date:'Ahora'
    };
    DASH_ORDERS.unshift({...orderData, _id:orderId});
    // Save to Firestore in background
    fsSet('orders',orderId,orderData).catch(()=>{});
  });
  document.getElementById('ok-order').innerHTML=`
    <div class="ok-row"><span class="ok-row-l">N° Pedido</span><span style="font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:1px">${num}</span></div>
    <div class="ok-row"><span class="ok-row-l">Fecha</span><span>${dateStr}</span></div>
    <div class="ok-row"><span class="ok-row-l">Productos</span><span>${cart.length} ítem(s)</span></div>
    <div class="ok-row"><span class="ok-row-l">Pago</span><span>⚡ InstaCreditos</span></div>
    <div class="ok-row"><span class="ok-row-l">Total</span><span>$${tot} USD</span></div>`;
  document.getElementById('st-spent').textContent=parseInt(document.getElementById('st-spent').textContent)+tot;
  document.getElementById('st-buy').textContent=parseInt(document.getElementById('st-buy').textContent)+1;
  cart=[];updateCart();
  pushNotif('📦','order','Tu pedido fue confirmado — en camino pronto 🚀',()=>openTrack(0),true);
  go('ok');
}


// ═══ WALLET ═══
let walletBalance=250;
const WALLET_METHODS=[
  {i:'🏦',n:'Pago Móvil',d:'Transferencia instantánea'},
  {i:'💜',n:'Zelle',d:'Cuenta USA verificada'},
  {i:'₿',n:'Binance Pay',d:'USDT / BTC / BNB'},
  {i:'⬡',n:'Reserve',d:'Sin comisión'},
  {i:'💵',n:'Efectivo USD',d:'En persona · Caracas'},
];
let walletSelMethod=0;
const WALLET_TXS=[
  {type:'in',icon:'💰',name:'Recarga vía Zelle',date:'Hoy 3:24 PM',amt:'+100',cls:'in'},
  {type:'lock',icon:'🔒',name:'Reservado — Subasta Nike',date:'Hoy 1:10 PM',amt:'-85',cls:'lock'},
  {type:'in',icon:'💰',name:'Recarga vía Pago Móvil',date:'Ayer 7:00 PM',amt:'+50',cls:'in'},
  {type:'out',icon:'✅',name:'Compra DualSense PS5',date:'Hace 3 días',amt:'-65',cls:'out'},
  {type:'in',icon:'🔓',name:'Créditos liberados',date:'Hace 4 días',amt:'+30',cls:'in'},
];
function openWallet(){
  document.getElementById('wallet-methods').innerHTML=WALLET_METHODS.map((m,i)=>`<div class="wallet-method ${i===walletSelMethod?'sel':''}" onclick="walletSelPay(${i})"><div class="wm-icon">${m.i}</div><div class="wm-info"><div class="wm-name">${m.n}</div><div class="wm-detail">${m.d}</div></div><div class="wm-radio ${i===walletSelMethod?'on':''}"></div></div>`).join('');
  document.getElementById('wallet-txs').innerHTML=WALLET_TXS.map(t=>`<div class="wallet-tx"><div class="wallet-tx-icon ${t.type}">${t.icon}</div><div class="wallet-tx-info"><div class="wallet-tx-name">${t.name}</div><div class="wallet-tx-date">${t.date}</div></div><div class="wallet-tx-amount ${t.cls}">${t.amt} cr</div></div>`).join('');
  updateWalletDisplay();go('wallet');
}
function updateWalletDisplay(){
  const b=document.getElementById('wallet-bal');const u=document.getElementById('wallet-bal-usd');
  if(b)b.textContent=walletBalance;if(u)u.textContent=`≈ $${(walletBalance).toFixed(2)} USD`;
}
function walletSelPay(i){
  walletSelMethod=i;
  document.querySelectorAll('.wallet-method').forEach((e,j)=>{e.classList.toggle('sel',j===i);e.querySelector('.wm-radio').className='wm-radio'+(j===i?' on':'');});
}
function walletSetAmount(v){document.getElementById('wallet-amount').value=v;walletUpdatePreview();}
function walletUpdatePreview(){const v=parseFloat(document.getElementById('wallet-amount').value)||0;document.getElementById('wallet-credits-preview').innerHTML=`Recibirás <strong style="color:var(--y)">${v} créditos</strong>`;}
function walletShowDeposit(){go('deposit');}
function walletDeposit(){go('deposit');}

// ═══ DEPOSIT PAGE ═══
function openDeposit(){
  document.getElementById('dep-balance').textContent=walletBalance;
  document.getElementById('dep-balance-usd').textContent=`≈ $${walletBalance.toFixed(2)} USD`;
  document.getElementById('dep-bal-top').textContent=`${walletBalance} cr`;
  document.getElementById('dep-amount').value='';
  depUpdatePreview();
  // build methods
  document.getElementById('dep-methods').innerHTML=WALLET_METHODS.map((m,i)=>`
    <div class="wallet-method ${i===walletSelMethod?'sel':''}" onclick="walletSelPay(${i})" style="margin-bottom:8px">
      <div class="wm-icon">${m.i}</div>
      <div class="wm-info"><div class="wm-name">${m.n}</div><div class="wm-detail">${m.d}</div></div>
      <div class="wm-radio ${i===walletSelMethod?'on':''}"></div>
    </div>`).join('');
  go('deposit');
}
function depSet(v){
  document.getElementById('dep-amount').value=v;
  depUpdatePreview();
}
function depUpdatePreview(){
  const v=parseFloat(document.getElementById('dep-amount').value)||0;
  document.getElementById('dep-credits-preview').innerHTML=`Recibirás <strong style="color:var(--y)">${v} créditos</strong>`;
}
function depConfirm(){
  const v=parseFloat(document.getElementById('dep-amount').value)||0;
  if(v<1){toast('⚠️ Monto mínimo $1 USD');return;}
  const method=WALLET_METHODS[walletSelMethod];
  // Show payment instructions
  const instructions={
    'Pago Móvil':'📱 Transfiere a: 0412-000-0000 · Banco Venezuela · J-12345678',
    'Zelle':'💜 Envía a: pagos@instacompras.ve · Nombre: InstaCompras',
    'Binance Pay':'₿ ID Binance Pay: 123456789 · Red: BEP20',
    'Reserve':'⬡ Número Reserve: +58 412 000 0001',
    'Efectivo USD':'💵 Coordina entrega con el soporte de InstaCompras'
  };
  const inst=instructions[method.n]||'';
  toast(`${method.i} ${inst}`);
  // Simulate credit after 2s
  setTimeout(()=>{
    walletBalance+=v;
    updateWalletDisplay();
    document.getElementById('dep-balance').textContent=walletBalance;
    document.getElementById('dep-balance-usd').textContent=`≈ $${walletBalance.toFixed(2)} USD`;
    document.getElementById('dep-bal-top').textContent=`${walletBalance} cr`;
    const awd=document.getElementById('auc-wallet-display');if(awd)awd.textContent=`${walletBalance} créditos`;
    const wpb=document.getElementById('wallet-prof-badge');if(wpb)wpb.textContent=`${walletBalance} cr`;
    toast(`✅ +${v} créditos acreditados a tu wallet`);
    setTimeout(()=>goBack(),1200);
  },2000);
}

// ═══ AUCTION ═══
let aucBids=[],aucCurrentBid=0,aucTimerIv=null,aucSecs=0,aucProdIdx=0;
function openAuction(prodIdx){
  aucProdIdx=prodIdx!=null?prodIdx:0;const p=PRODS[aucProdIdx];const s=SELLERS[p.s];
  aucCurrentBid=Math.floor(p.p*1.1);
  const asp=document.getElementById('auc-start-price');if(asp)asp.textContent=`$${p.p}`;
  aucBids=[{user:'carlos.VE',amt:aucCurrentBid,me:false},{user:'luisa_mpn',amt:aucCurrentBid-5,me:false},{user:'el_pana99',amt:aucCurrentBid-12,me:false}];
  aucRenderBids();
  const acb=document.getElementById('auc-current-bid');if(acb)acb.textContent=`$${aucCurrentBid}`;
  const amb=document.getElementById('auc-min-bid');if(amb)amb.textContent=`$${aucCurrentBid+1}`;
  const abi=document.getElementById('auc-bid-input');if(abi)abi.value='';
  const awd=document.getElementById('auc-wallet-display');if(awd)awd.textContent=`${walletBalance} IC`;
  aucRenderPresets();aucUpdateBtn();
  if(aucTimerIv)clearInterval(aucTimerIv);
  aucSecs=120;aucTick();aucTimerIv=setInterval(aucTick,1000);
  setTimeout(aucAutoBot,8000+Math.random()*12000);
}
function aucTick(){
  aucSecs=Math.max(0,aucSecs-1);
  const m=~~(aucSecs/60);const s=String(aucSecs%60).padStart(2,'0');
  const el=document.getElementById('pd-auction-timer');
  if(el){
    el.textContent=m+':'+s;
    el.style.color=aucSecs<=10?'#ff3b3b':aucSecs<30?'#ff6b35':aucSecs<60?'#ffaa00':'var(--rd)';
  }
  if(aucSecs===0){
    clearInterval(aucTimerIv);
    const winner=aucBids.length>0?aucBids[0].user:'nadie';
    const iWon=aucBids.length>0&&aucBids[0].me;
    toast(`🔨 ¡Subasta cerrada! Ganador: ${winner} con $${aucCurrentBid}`);
    if(iWon){
      const p=PRODS[aucProdIdx];
      const sz=p.sz[0]||'Único';
      const num='IC-'+~~(Math.random()*90000+10000);
      const buyerName=window.fbUser?.name||window.fbUser?.username||'Tú';
      const buyerPhone=window.fbUser?.phone||window.fbUser?.email||'';
      const buyerCity=window.fbUser?.city||'';
      const buyerId=window.fbUser?.uid||'guest';
      const orderId=fsId();
      const orderData={
        orderId,num,buyerId,buyerName,buyerPhone,buyerCity,
        sellerId:String(p.s),sellerName:SELLERS[p.s].n,
        prod:p.n,img:p.img||'',e:p.e||'📦',
        sz,qty:1,amt:aucCurrentBid,
        status:'pending',fromAuction:true,
        createdAt:Date.now(),date:'Ahora'
      };
      cart.push({pi:aucProdIdx,sz,q:1,overridePrice:aucCurrentBid,fromAuction:true});
      updateCart();
      DASH_ORDERS.unshift({...orderData,buyer:buyerName,_id:orderId});
      fsSet('orders',orderId,orderData).catch(()=>{});
      pushNotif('🏆','auction',`¡Ganaste la subasta! ${p.n} por $${aucCurrentBid} — revisa tu carrito`,()=>nav('cart'),true);
      setTimeout(()=>showWinCelebration(p.n,aucCurrentBid),600);
    }
  }
}
function aucRenderBids(){
  const el=document.getElementById('auc-bids-list');if(!el)return;
  const medals=['🥇','🥈','🥉'];
  const amWinning=aucBids.length>0&&aucBids[0].me;
  const amBidding=aucBids.some(b=>b.me);
  const myPos=aucBids.findIndex(b=>b.me);

  // ── Cambiar color de TODA la tarjeta de subasta ──
  const card=document.getElementById('auc-inline-card');
  if(card&&amBidding){
    if(amWinning){
      card.style.background='linear-gradient(135deg,rgba(76,175,80,.18),rgba(76,175,80,.06))';
      card.style.borderColor='rgba(76,175,80,.6)';
      card.style.transition='background .4s ease,border-color .4s ease';
    }else{
      card.style.background='linear-gradient(135deg,rgba(255,59,59,.18),rgba(255,59,59,.07))';
      card.style.borderColor='rgba(255,59,59,.65)';
      card.style.transition='background .4s ease,border-color .4s ease';
    }
  }

  // ── Status banner ──
  const sb=document.getElementById('auc-status-banner');
  if(sb){
    if(!amBidding){
      sb.style.display='none';
    }else if(amWinning){
      sb.style.display='flex';
      sb.style.background='rgba(76,175,80,.2)';
      sb.style.borderColor='rgba(76,175,80,.5)';
      sb.innerHTML='<span style="font-size:22px">🏆</span><div><div style="font-size:13px;font-weight:900;color:#4CAF50">¡Vas ganando!</div><div style="font-size:10px;color:rgba(255,255,255,.5)">Tienes la oferta más alta</div></div>';
    }else{
      sb.style.display='flex';
      sb.style.background='rgba(255,59,59,.18)';
      sb.style.borderColor='rgba(255,59,59,.55)';
      sb.innerHTML=`<span style="font-size:22px">😬</span><div><div style="font-size:13px;font-weight:900;color:var(--rd)">¡Te superaron!</div><div style="font-size:10px;color:rgba(255,255,255,.5)">Estás #${myPos+1} — oferta más para ganar</div></div>`;
    }
  }

  // ── Lista de bids ──
  el.innerHTML=aucBids.slice(0,5).map((b,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);animation:fi .25s ease">
      <span style="font-size:14px;min-width:20px">${medals[i]||'·'}</span>
      <div style="flex:1;font-size:12px;font-weight:${b.me?'900':'700'};color:${b.me?'var(--y)':'rgba(255,255,255,.7)'}">
        ${b.me?'Tú ✅':b.user}
        ${i===0?`<span style="font-size:9px;background:${b.me?'rgba(76,175,80,.25)':'rgba(255,59,59,.2)'};color:${b.me?'#4CAF50':'var(--rd)'};border-radius:4px;padding:1px 6px;margin-left:4px">LÍDER</span>`:''}
      </div>
      <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${b.me?'var(--y)':'rgba(255,255,255,.5)'}">\$${b.amt}</span>
    </div>`).join('');
}
function aucRenderPresets(){
  const base=aucCurrentBid;
  const el=document.getElementById('auc-presets');if(!el)return;
  el.innerHTML=[base+1,base+5,base+10,base+20].map(v=>`<div class="auc-preset" onclick="aucSetBid(${v})">$${v}</div>`).join('');
}
function aucSetBid(v){const i=document.getElementById('auc-bid-input');if(i)i.value=v;aucUpdateBtn();}
function aucUpdateBtn(){
  const v=parseFloat(document.getElementById('auc-bid-input').value)||0;
  const btn=document.getElementById('auc-bid-btn');if(!btn)return;
  const enough=walletBalance>=v;const valid=v>aucCurrentBid;
  btn.disabled=!valid||!enough;
  if(!enough&&v>0)btn.innerHTML='⚠️ Créditos insuficientes';
  else if(!valid&&v>0)btn.innerHTML=`Mínimo $${aucCurrentBid+1}`;
  else btn.innerHTML=`🔨 Ofertar $${v||0} USD`;
}
function placeBid(){
  if(requireAccount('🔨','Para ofertar necesitas cuenta','Crea tu cuenta y participa en subastas en vivo.'))return;
  const v=parseFloat(document.getElementById('auc-bid-input').value)||0;
  if(v<=aucCurrentBid){toast(`⚠️ Mínimo $${aucCurrentBid+1}`);return;}
  if(walletBalance<v){toast('⚠️ Recarga tu wallet primero');return;}
  aucCurrentBid=v;aucBids.unshift({user:'Tú',amt:v,me:true});aucBids=aucBids.slice(0,5);
  aucRenderBids();aucRenderPresets();
  const acb=document.getElementById('auc-current-bid');if(acb)acb.textContent=`$${v}`;
  const amb=document.getElementById('auc-min-bid');if(amb)amb.textContent=`$${v+1}`;
  const abi=document.getElementById('auc-bid-input');if(abi)abi.value='';
  aucUpdateBtn();spawnParticle(document.getElementById('auc-bid-btn'),'🔨');
  toast(`🔒 Oferta $${v} reservada. ¡Vas ganando!`);
}
function aucAutoBot(){
  if(aucSecs<=8)return; // no bots in last 8s — user can win
  const bots=['marisolita22','pedro_mcs','yoli_shop','cristi_vzla','el_pana99'];
  const bot=bots[~~(Math.random()*bots.length)];const nb=aucCurrentBid+~~(Math.random()*8+1);
  aucCurrentBid=nb;aucBids.unshift({user:bot,amt:nb,me:false});aucBids=aucBids.slice(0,5);
  aucRenderBids();aucRenderPresets();
  const acb=document.getElementById('auc-current-bid');if(acb)acb.textContent=`$${nb}`;
  const amb=document.getElementById('auc-min-bid');if(amb)amb.textContent=`$${nb+1}`;
  aucUpdateBtn();
  const wasWinning=aucBids.length>1&&aucBids[1]?.me;
  if(wasWinning)toast(`⚠️ ${bot} te superó con $${nb} — ¡oferta más!`);
  setTimeout(aucAutoBot,10000+Math.random()*20000);
}


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

