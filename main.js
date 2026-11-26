// Couleur du site choisie par le visiteur. Toutes les couleurs de la page (feuille de style
// et styles en ligne) tournent autour de la teinte choisie, en gardant leur luminosité
// perçue (espace OKLCH) : les contrastes du design d'origine restent les mêmes.
var couleurs = (function () {
  var BASE = '#1d5fd1';
  var CLE = 'mcisse-couleur';
  var MOTIF = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])|rgba?\([^)]*\)/gi;
  var origines = null;
  var choisie = null;
  var rotation = 0;
  var intensite = 1;
  var memo = {};

  function lineaire(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function gamma(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

  function versOklch(r, g, b) {
    r = lineaire(r); g = lineaire(g); b = lineaire(b);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
  }

  function versRgb(L, C, H) {
    var A = C * Math.cos(H), B = C * Math.sin(H);
    var l = L + 0.3963377774 * A + 0.2158037573 * B;
    var m = L - 0.1055613458 * A - 0.0638541728 * B;
    var s = L - 0.0894841775 * A - 1.2914855480 * B;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [
      gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    ];
  }

  function horsGamut(c) { return c[0] < -0.001 || c[0] > 1.001 || c[1] < -0.001 || c[1] > 1.001 || c[2] < -0.001 || c[2] > 1.001; }

  function lire(texte) {
    var t = texte.toLowerCase();
    if (t.charAt(0) === '#') {
      t = t.slice(1);
      if (t.length < 5) t = t.replace(/./g, '$&$&');
      return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16),
        t.length === 8 ? parseInt(t.slice(6, 8), 16) / 255 : 1];
    }
    var n = t.match(/[\d.]+%?/g);
    if (!n || n.length < 3) return null;
    var a = n.length > 3 ? (n[3].slice(-1) === '%' ? parseFloat(n[3]) / 100 : parseFloat(n[3])) : 1;
    return [parseFloat(n[0]), parseFloat(n[1]), parseFloat(n[2]), a];
  }

  function hex(v) { var h = Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16); return h.length < 2 ? '0' + h : h; }

  function tourner(texte) {
    if (memo[texte]) return memo[texte];
    var c = lire(texte);
    if (!c) return texte;
    var o = versOklch(c[0], c[1], c[2]);
    var H = o[2] + rotation, C = o[1] * intensite;
    var rgb = versRgb(o[0], C, H);
    // Hors de l'espace sRGB : on baisse la saturation jusqu'à rentrer dedans.
    if (horsGamut(rgb)) {
      var bas = 0, haut = C;
      for (var i = 0; i < 14; i++) {
        var mil = (bas + haut) / 2;
        if (horsGamut(versRgb(o[0], mil, H))) haut = mil; else bas = mil;
      }
      rgb = versRgb(o[0], bas, H);
    }
    var sortie = c[3] < 1
      ? 'rgba(' + Math.round(Math.min(1, Math.max(0, rgb[0])) * 255) + ', ' + Math.round(Math.min(1, Math.max(0, rgb[1])) * 255) + ', ' + Math.round(Math.min(1, Math.max(0, rgb[2])) * 255) + ', ' + c[3] + ')'
      : '#' + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
    memo[texte] = sortie;
    return sortie;
  }

  function convertir(texte) { return choisie ? texte.replace(MOTIF, tourner) : texte; }

  // Relève une fois les couleurs d'origine : feuilles de style et propriétés en ligne.
  function relever() {
    origines = { feuilles: [], props: [] };
    var feuilles = document.querySelectorAll('style');
    for (var i = 0; i < feuilles.length; i++) origines.feuilles.push([feuilles[i], feuilles[i].textContent]);
    var blocs = document.querySelectorAll('body [style]');
    for (var j = 0; j < blocs.length; j++) {
      var el = blocs[j];
      if (el.closest('.teinte')) continue;
      for (var k = 0; k < el.style.length; k++) {
        var p = el.style[k];
        var v = el.style.getPropertyValue(p);
        MOTIF.lastIndex = 0;
        if (MOTIF.test(v)) origines.props.push([el, p, v, el.style.getPropertyPriority(p)]);
      }
    }
  }

  function peindre() {
    if (!origines) relever();
    var i, f, p;
    for (i = 0; i < origines.feuilles.length; i++) { f = origines.feuilles[i]; f[0].textContent = convertir(f[1]); }
    for (i = 0; i < origines.props.length; i++) { p = origines.props[i]; p[0].style.setProperty(p[1], convertir(p[2]), p[3]); }
    if (typeof teinter === 'function') teinter(true);
  }

  // Une couleur choisie, ou null pour revenir aux couleurs d'origine.
  function choisir(couleur) {
    // Un choix direct annule la mise à jour encore en attente du sélecteur libre.
    if (image) { cancelAnimationFrame(image); image = 0; }
    couleur = couleur ? String(couleur).toLowerCase() : null;
    if (couleur === BASE) couleur = null;
    if (couleur === choisie) return;
    if (couleur) {
      var c = lire(couleur), b = lire(BASE);
      var oc = versOklch(c[0], c[1], c[2]), ob = versOklch(b[0], b[1], b[2]);
      rotation = oc[2] - ob[2];
      intensite = Math.min(1.25, oc[1] / ob[1]);
    }
    choisie = couleur;
    memo = {};
    try { if (couleur) localStorage.setItem(CLE, couleur); else localStorage.removeItem(CLE); } catch (e) {}
    if (origines || couleur) peindre();
  }

  var enAttente = null;
  var image = 0;
  // Pendant qu'on fait glisser le sélecteur : une mise à jour par image, pas plus.
  function suivre(couleur) {
    enAttente = couleur;
    if (image) return;
    image = requestAnimationFrame(function () { image = 0; choisir(enAttente); });
  }

  return {
    base: BASE,
    choisir: choisir,
    suivre: suivre,
    convertir: convertir,
    actuelle: function () { return choisie || BASE; },
    memorisee: function () { try { return localStorage.getItem(CLE); } catch (e) { return null; } }
  };
})();

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
  // forcer : la couleur du site vient de changer, on repeint même sans changer de section.
  return function (forcer) {
    var choix = teintes[0];
    for (var i = 0; i < teintes.length; i++) {
      var el = document.getElementById(teintes[i][0]);
      if (el && el.getBoundingClientRect().top <= 1) choix = teintes[i];
    }
    if (choix[1] === actuelle && !forcer) return;
    actuelle = choix[1];
    var fond = couleurs.convertir(choix[1]);
    document.body.style.backgroundColor = fond;
    if (meta) meta.setAttribute('content', fond);
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

// Bouton palette du menu : ouvre le nuancier, la couleur s'applique à mesure qu'on la choisit.
(function () {
  var boutons = document.querySelectorAll('[data-teinte]');
  var en = document.documentElement.lang === 'en';
  var mots = en
    ? { titre: 'Pick a colour', libre: 'Any colour', origine: 'Original colours' }
    : { titre: 'Choisissez une couleur', libre: 'Couleur libre', origine: "Couleurs d'origine" };
  var nuances = [
    ['#0e8c82', en ? 'Teal' : 'Sarcelle'], ['#2f8f46', en ? 'Green' : 'Vert'],
    ['#d9822b', en ? 'Amber' : 'Ambre'], ['#e0533d', en ? 'Coral' : 'Corail'],
    ['#c42e6b', en ? 'Raspberry' : 'Framboise'], ['#7044c9', 'Violet'], ['#56606b', 'Graphite']
  ];

  var memo = couleurs.memorisee();
  if (memo) couleurs.choisir(memo);
  if (!boutons.length) return;

  var panneau = document.createElement('div');
  panneau.className = 'teinte glass';
  panneau.id = 'teinte';
  panneau.setAttribute('role', 'dialog');
  panneau.setAttribute('aria-label', mots.titre);
  panneau.hidden = true;
  var html = '<p class="teinte-titre">' + mots.titre + '</p><div class="teinte-nuancier">';
  for (var i = 0; i < nuances.length; i++) {
    html += '<button type="button" class="teinte-pastille" data-couleur="' + nuances[i][0] + '" aria-label="' + nuances[i][1] + '" style="--c: ' + nuances[i][0] + '"></button>';
  }
  html += '<label class="teinte-pastille teinte-libre" title="' + mots.libre + '"><input type="color" aria-label="' + mots.libre + '"></label></div>'
    + '<button type="button" class="teinte-origine"><span aria-hidden="true" style="--c: ' + couleurs.base + '"></span>' + mots.origine + '</button>';
  panneau.innerHTML = html;
  document.body.appendChild(panneau);

  var libre = panneau.querySelector('input[type="color"]');
  var pastilles = panneau.querySelectorAll('[data-couleur]');
  var origine = panneau.querySelector('.teinte-origine');
  var ouvreur = null;

  function marquer() {
    var c = couleurs.actuelle();
    var connue = c === couleurs.base;
    for (var i = 0; i < pastilles.length; i++) {
      var oui = pastilles[i].getAttribute('data-couleur') === c;
      if (oui) connue = true;
      pastilles[i].setAttribute('aria-pressed', oui ? 'true' : 'false');
    }
    libre.parentNode.classList.toggle('choisie', !connue);
    if (!connue) libre.parentNode.style.setProperty('--c', c);
    libre.value = c;
    origine.disabled = c === couleurs.base;
  }

  function placer() {
    if (!ouvreur) return;
    var r = ouvreur.getBoundingClientRect();
    var l = panneau.offsetWidth;
    // Bouton à gauche de l'écran : le nuancier s'ouvre vers la droite, et inversement.
    var aGauche = r.left + r.width / 2 < window.innerWidth / 2;
    var gauche = Math.min(window.innerWidth - l - 12, Math.max(12, aGauche ? r.left : r.right - l));
    panneau.style.left = gauche + 'px';
    panneau.style.transformOrigin = aGauche ? 'top left' : 'top right';
    panneau.style.top = (r.bottom + 10) + 'px';
  }

  function ouvrir(bouton) {
    ouvreur = bouton;
    marquer();
    panneau.hidden = false;
    placer();
    for (var i = 0; i < boutons.length; i++) boutons[i].setAttribute('aria-expanded', boutons[i] === bouton ? 'true' : 'false');
    var cible = panneau.querySelector('[aria-pressed="true"]') || pastilles[0];
    cible.focus({ preventScroll: true });
  }

  function fermer(rendreFocus) {
    if (panneau.hidden) return;
    panneau.hidden = true;
    for (var i = 0; i < boutons.length; i++) boutons[i].setAttribute('aria-expanded', 'false');
    if (rendreFocus && ouvreur) ouvreur.focus({ preventScroll: true });
    ouvreur = null;
  }

  for (var b = 0; b < boutons.length; b++) {
    boutons[b].addEventListener('click', function (e) {
      e.stopPropagation();
      if (!panneau.hidden && ouvreur === this) fermer(false);
      else ouvrir(this);
    });
  }

  panneau.addEventListener('click', function (e) {
    var p = e.target.closest('[data-couleur]');
    if (p) { couleurs.choisir(p.getAttribute('data-couleur')); marquer(); }
    if (e.target.closest('.teinte-origine')) { couleurs.choisir(null); marquer(); pastilles[0].focus(); }
  });
  libre.addEventListener('input', function () {
    couleurs.suivre(libre.value);
    libre.parentNode.classList.add('choisie');
    libre.parentNode.style.setProperty('--c', libre.value);
    for (var i = 0; i < pastilles.length; i++) pastilles[i].setAttribute('aria-pressed', 'false');
    origine.disabled = false;
  });
  libre.addEventListener('change', function () { couleurs.choisir(libre.value); marquer(); });

  document.addEventListener('click', function (e) {
    if (!panneau.hidden && !panneau.contains(e.target)) fermer(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fermer(true);
  });
  window.addEventListener('resize', placer);
  window.addEventListener('scroll', function () {
    // Le bouton du haut sort de l'écran : le nuancier se referme avec lui.
    if (!ouvreur) return;
    var r = ouvreur.getBoundingClientRect();
    if (r.bottom < 0 || !ouvreur.offsetWidth || getComputedStyle(ouvreur).visibility === 'hidden') fermer(false);
    else placer();
  }, { passive: true });

  // Première visite : le bouton pulse deux fois et une bulle le présente, une seule fois.
  var CLE_APPEL = 'mcisse-teinte-vue';
  var appel = null;
  var minuteries = [];

  function deja() {
    try { return !!localStorage.getItem(CLE_APPEL); } catch (e) { return true; }
  }

  function taireAppel() {
    try { localStorage.setItem(CLE_APPEL, '1'); } catch (e) {}
    while (minuteries.length) clearTimeout(minuteries.pop());
    for (var i = 0; i < boutons.length; i++) boutons[i].classList.remove('appel');
    if (!appel) return;
    var bulle = appel;
    appel = null;
    bulle.classList.remove('visible');
    setTimeout(function () { bulle.remove(); }, 300);
    window.removeEventListener('scroll', taireAppel);
  }

  function visible(el) {
    var r = el.getBoundingClientRect();
    return el.offsetWidth && r.top >= 0 && r.bottom <= window.innerHeight && getComputedStyle(el).visibility !== 'hidden';
  }

  function appeler() {
    var cible = null;
    for (var i = 0; i < boutons.length; i++) if (visible(boutons[i])) { cible = boutons[i]; break; }
    if (!cible || !panneau.hidden) return;
    try { localStorage.setItem(CLE_APPEL, '1'); } catch (e) {}
    cible.classList.add('appel');
    appel = document.createElement('div');
    appel.className = 'teinte-bulle';
    appel.setAttribute('aria-hidden', 'true');
    appel.textContent = en ? 'Try another colour' : 'Essayez une autre couleur';
    document.body.appendChild(appel);
    var r = cible.getBoundingClientRect();
    var l = appel.offsetWidth;
    var centre = r.left + r.width / 2;
    var gauche = Math.min(window.innerWidth - l - 12, Math.max(12, centre - l / 2));
    appel.style.left = gauche + 'px';
    appel.style.top = (r.bottom + 12) + 'px';
    appel.style.setProperty('--x', (centre - gauche) + 'px');
    void appel.offsetWidth;
    appel.classList.add('visible');
    window.addEventListener('scroll', taireAppel, { passive: true });
    minuteries.push(setTimeout(taireAppel, 6000));
  }

  for (var a = 0; a < boutons.length; a++) boutons[a].addEventListener('click', taireAppel);
  if (!memo && !deja()) minuteries.push(setTimeout(appeler, 2500));
})();

// Application installable : service worker pour l'installation et la consultation hors ligne.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
