// Pastille qui glisse sous le lien actif, dans la barre flottante et la barre d'onglets mobile.
var pastilles = (function () {
  var barres = [];
  var courant = '';

  function creer(boite, choisir) {
    if (!boite) return;
    var pill = document.createElement('span');
    pill.className = 'pill';
    pill.setAttribute('aria-hidden', 'true');
    boite.insertBefore(pill, boite.firstChild);
    barres.push({ pill: pill, choisir: choisir, visible: false });
  }

  var bar = document.querySelector('.bar');
  creer(bar, function (active) {
    if (active === 'contact') return document.querySelector('.bar a[data-top]');
    return document.querySelector('.bar a.item[data-nav="' + active + '"]');
  });
  creer(document.querySelector('.tabbar > div.glass'), function (active) {
    return document.querySelector('.tabbar div.glass .tab[data-nav="' + active + '"]');
  });

  function placer() {
    for (var i = 0; i < barres.length; i++) {
      var b = barres[i];
      var s = b.pill.style;
      var el = courant ? b.choisir(courant) : null;
      if (!el || !el.offsetWidth) {
        s.opacity = '0';
        b.visible = false;
        continue;
      }
      // Première apparition : la pastille se pose sans glisser depuis le bord.
      if (!b.visible) s.transition = 'opacity .2s ease';
      var r = el.getBoundingClientRect();
      var o = b.pill.parentNode.getBoundingClientRect();
      s.width = r.width + 'px';
      s.height = r.height + 'px';
      s.transform = 'translate(' + (r.left - o.left) + 'px,' + (r.top - o.top) + 'px)';
      if (!b.visible) {
        void b.pill.offsetWidth;
        s.transition = '';
      }
      s.opacity = '1';
      b.visible = true;
    }
  }

  if (barres.length) document.documentElement.classList.add('pill-ready');
  window.addEventListener('resize', placer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placer);
  // La barre change de forme en haut de page : on recale la pastille une fois la transformation finie.
  if (bar) bar.addEventListener('transitionend', function (e) {
    if (/^(max-width|padding|gap|margin)/.test(e.propertyName)) placer();
  });

  return function (active) {
    if (active === courant) return;
    courant = active;
    placer();
  };
})();

// Couleur de la barre d'état (Safari, Chrome Android, site installé) : celle de la section
// qui passe sous le haut de l'écran. Safari sur iOS 26 lit le fond de page, les autres theme-color.
var teinter = (function () {
  var teintes = [
    ['top', '#495BB2', 'fonce'], ['intro', '#F4F7F9', 'clair'], ['offre', '#FFFFFF', 'clair'],
    ['projets', '#4558B0', 'fonce'], ['realisations', '#FFFFFF', 'clair'], ['methode', '#F4F7F9', 'clair'],
    ['parcours', '#FFFFFF', 'clair'], ['contact', '#4564B7', 'fonce']
  ];
  var meta = document.querySelector('meta[name="theme-color"]');
  var actuelle = '';
  return function () {
    var choix = teintes[0];
    for (var i = 0; i < teintes.length; i++) {
      var el = document.getElementById(teintes[i][0]);
      if (el && el.getBoundingClientRect().top <= 1) choix = teintes[i];
    }
    if (choix[1] === actuelle) return;
    actuelle = choix[1];
    document.body.style.backgroundColor = choix[1];
    if (meta) meta.setAttribute('content', choix[1]);
    document.documentElement.setAttribute('data-tint', choix[2]);
  };
})();

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
    // En haut de page : l'onglet Accueil est actif.
    var heros = document.getElementById('top');
    if (!active && heros && heros.getBoundingClientRect().bottom > ligne) active = 'top';
    // Le menu du haut se transforme en barre flottante une fois le logo et le bouton Contact sortis de l'écran.
    var menu = document.querySelector('.topbar');
    document.documentElement.setAttribute('data-bar', menu && menu.getBoundingClientRect().bottom < 30 ? 'on' : 'off');
    document.documentElement.setAttribute('data-section', active);
    teinter();
    var liens = document.querySelectorAll('[data-nav]');
    for (var j = 0; j < liens.length; j++) {
      if (liens[j].getAttribute('data-nav') === active) liens[j].setAttribute('aria-current', 'location');
      else liens[j].removeAttribute('aria-current');
    }
    pastilles(active);
  }

  window.addEventListener('scroll', suivre, { passive: true });
  window.addEventListener('resize', suivre);
  suivre();
})();

// Fait apparaître les étapes de la méthode et le titre du contact à leur arrivée à l'écran.
// Sans IntersectionObserver ou avec « réduire les animations », tout reste visible d'emblée.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cibles = [];
  var blocs = document.querySelectorAll('[data-reveal]');
  for (var i = 0; i < blocs.length; i++) {
    if (blocs[i].tagName === 'H2') cibles.push(blocs[i]);
    else cibles.push.apply(cibles, blocs[i].children);
  }

  // Ce qui est déjà à l'écran au chargement s'affiche sans animation.
  var restant = [];
  for (var j = 0; j < cibles.length; j++) {
    var r = cibles[j].getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) cibles[j].classList.add('in');
    else restant.push(cibles[j]);
  }

  var obs = new IntersectionObserver(function (entrees) {
    var rang = 0;
    for (var k = 0; k < entrees.length; k++) {
      if (!entrees[k].isIntersecting) continue;
      var el = entrees[k].target;
      if (el.tagName === 'LI') el.style.setProperty('--d', Math.min(rang++ * 70, 280) + 'ms');
      el.classList.add('in');
      obs.unobserve(el);
    }
  }, { rootMargin: '0px 0px -12% 0px' });

  for (var n = 0; n < restant.length; n++) obs.observe(restant[n]);
  document.documentElement.classList.add('motion');
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

// Application installable : service worker pour l'installation et la consultation hors ligne.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
