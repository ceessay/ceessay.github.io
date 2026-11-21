// Met en avant, dans les barres de navigation, la section affichée à l'écran.
(function () {
  var plan = [
    ['offre', 'offre'],
    ['projets', 'projets'],
    ['realisations', 'projets'],
    ['methode', 'methode'],
    ['parcours', 'parcours'],
    ['contact', 'contact']
  ];

  function suivre() {
    var ligne = window.innerHeight * 0.4;
    var active = '';
    for (var i = 0; i < plan.length; i++) {
      var el = document.getElementById(plan[i][0]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.top <= ligne && r.bottom > ligne) active = plan[i][1];
    }
    var fin = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (fin) active = 'contact';
    document.documentElement.setAttribute('data-section', active);
    var liens = document.querySelectorAll('[data-nav]');
    for (var j = 0; j < liens.length; j++) {
      if (liens[j].getAttribute('data-nav') === active) liens[j].setAttribute('aria-current', 'location');
      else liens[j].removeAttribute('aria-current');
    }
  }

  window.addEventListener('scroll', suivre, { passive: true });
  window.addEventListener('resize', suivre);
  suivre();
})();

// Mémorise le choix de langue quand le visiteur clique sur FR ou EN.
(function () {
  var liens = document.querySelectorAll('a[hreflang]');
  for (var i = 0; i < liens.length; i++) {
    liens[i].addEventListener('click', function () {
      try { localStorage.setItem('mcisse-lang', this.getAttribute('hreflang')); } catch (e) {}
    });
  }
})();
