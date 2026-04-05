// ═══ INIT — Bootstrap & Auto-login ═══
// This file loads LAST — all dependencies are available

// 1. Build initial UI
buildLiveStrip();
buildCats();
buildGrid();
buildSellers();
buildCoPays();
updateCart();

// 2. Show initial notification badge
(()=>{
  const count = notifData.filter(n => n.unread).length;
  const b = document.getElementById('notif-badge');
  if (b && count) { b.style.display = 'flex'; b.textContent = count; }
})();

// 3. Auto-login from saved session

(async () => {
  const ok = await fbRestoreSession();
  if (ok) {
    const ob = document.getElementById('s-onboard');
    if (ob) { ob.classList.remove('on'); ob.style.display = 'none'; }
    buildLiveStrip(); buildGrid(); go('home', false);
  }
})();

function fbLogout() {
  fbClearSession();
  window.fbUser = null;
  window.fbToken = null;
  toast('👋 Sesión cerrada');
  setTimeout(() => go('register', false), 400);
}
