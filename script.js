(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  function label() {
    var en = root.lang === 'en', dark = root.dataset.theme === 'dark';
    var t = en ? (dark ? 'Switch to light mode' : 'Switch to dark mode') : (dark ? 'Passer en mode clair' : 'Passer en mode sombre');
    btn.setAttribute('aria-label', t);
    btn.setAttribute('title', t);
  }
  if (btn) {
    label();
    btn.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      label();
    });
  }

  var tilt = document.getElementById('badge-tilt');
  var swing = document.getElementById('badge-swing');
  var glare = document.getElementById('badge-glare');
  if (!tilt) return;
  var rest = glare ? glare.style.background : '';
  tilt.addEventListener('pointermove', function (e) {
    var r = tilt.getBoundingClientRect();
    var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    tilt.style.transition = 'transform 0.08s linear';
    tilt.style.transform = 'rotateX(' + (-(y - 0.5) * 22) + 'deg) rotateY(' + ((x - 0.5) * 28) + 'deg)';
    if (swing) swing.style.animation = 'none';
    if (glare) glare.style.background = 'radial-gradient(circle at ' + Math.round(x * 100) + '% ' + Math.round(y * 100) + '%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)';
  });
  function reset() {
    tilt.style.transition = 'transform 0.7s cubic-bezier(.2,.8,.2,1)';
    tilt.style.transform = 'rotateX(0deg) rotateY(0deg)';
    if (swing) swing.style.animation = '';
    if (glare) glare.style.background = rest;
  }
  ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (t) { tilt.addEventListener(t, reset); });
})();
