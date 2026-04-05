// ═══ INIT — Auto-login & Bootstrap ═══
// Dependencies: All other JS files loaded before this

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
