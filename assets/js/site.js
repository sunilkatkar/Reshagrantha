/* Reshagrantha — shared behaviour for every page.
   Depends on projects.js being loaded first. */
(function () {
  'use strict';

  var projects = window.PROJECTS || [];
  var byId = {};
  projects.forEach(function (p) { byId[p.id] = p; byId[p.slug] = p; });

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* A cover that 404s should leave a quiet empty frame, not a broken-image
     icon and sprawling alt text. This happened for real: image paths moved
     while browsers still held a 16-day-cached projects.js. Asset URLs are
     versioned now, but a missing file should never look like a bug. */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    img.style.visibility = 'hidden';
    img.alt = '';
  }, true);
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function href(p) { return 'portfolio-details.html?project=' + encodeURIComponent(p.slug); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------------------------------------------------------- nav */
  var nav = document.querySelector('.nav');
  var waFloat = document.querySelector('.wa-float');

  function onScroll() {
    if (nav) nav.classList.toggle('solid', window.scrollY > 40);
    if (waFloat) {
      var trigger = nav && nav.classList.contains('over') ? window.innerHeight * 0.85 : 400;
      waFloat.classList.toggle('show', window.scrollY > trigger);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (nav) nav.classList.toggle('solid', open || window.scrollY > 40);
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var target = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
    if (target && target === here) a.setAttribute('aria-current', 'page');
  });

  /* -------------------------------------------------- reveals & wipes */
  function observe(nodes) {
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* Entrance animations.
     Three layers, because content must never be left invisible:
       1. IntersectionObserver — the normal path.
       2. A scroll/resize sweep using getBoundingClientRect, which ignores the
          clipping and compositing that can stop the observer firing.
       3. A hard timeout that reveals anything still hidden, whatever happened.
     CSS only hides things once `anim` is on <html>, so if this file fails to
     parse or the browser lacks IntersectionObserver, everything just shows. */
  var ANIM = 'IntersectionObserver' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ANIM) document.documentElement.classList.add('anim');

  var FAILSAFE_MS = 4000;
  var pending = [];
  var lastSweep = 0;

  function sweep() {
    lastSweep = Date.now();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    pending = pending.filter(function (n) {
      if (n.classList.contains('in')) return false;
      var r = n.getBoundingClientRect();
      if (r.top < vh * 0.96 && r.bottom > 0) { n.classList.add('in'); return false; }
      return true;
    });
  }
  // Time-throttled rather than rAF-driven: rAF is suspended whenever the page
  // isn't painting, which is exactly when we still want this to catch up.
  function queueSweep() {
    if (!pending.length || Date.now() - lastSweep < 100) return;
    sweep();
  }
  addEventListener('scroll', queueSweep, { passive: true });
  addEventListener('resize', queueSweep, { passive: true });
  addEventListener('load', function () { setTimeout(sweep, 60); });

  window.revealIn = function (root) {
    var scope = root || document;
    var texts = Array.prototype.slice.call(scope.querySelectorAll('.reveal:not(.in)'));
    var wipes = Array.prototype.slice.call(scope.querySelectorAll('.wipe:not(.in)'));
    var all = texts.concat(wipes);
    if (!all.length) return;

    if (!ANIM) { all.forEach(function (n) { n.classList.add('in'); }); return; }

    texts.forEach(function (n, i) {
      n.style.transitionDelay = (n.dataset.delay || (i % 3) * 90) + 'ms';
    });
    observe(texts);
    observe(wipes);
    pending = pending.concat(all);
    sweep();

    // layer 3 — nothing stays hidden, no matter what failed above
    setTimeout(function () { all.forEach(function (n) { n.classList.add('in'); }); }, FAILSAFE_MS);
  };
  window.revealIn();

  /* ---------------------------------------------------------- lightbox */
  var lb = document.querySelector('.lb');
  var lbImg = lb && lb.querySelector('.lb-stage img');
  var lbCap = lb && lb.querySelector('.caption');
  var shots = [];
  var at = 0;

  function show(i) {
    if (!shots.length) return;
    at = (i + shots.length) % shots.length;
    lbImg.src = shots[at].src;
    lbImg.alt = shots[at].alt || '';
    if (lbCap) lbCap.textContent = pad(at + 1) + ' / ' + pad(shots.length);
  }
  window.openLightbox = function (list, index) {
    if (!lb) return;
    shots = list;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    show(index || 0);
  };
  function closeLb() {
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (lb) {
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(at - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(at + 1); });
    lb.querySelector('.lb-stage').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeLb();
    });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') show(at + 1);
      if (e.key === 'ArrowLeft') show(at - 1);
    });
  }

  /* ------------------------------------------------------ card markup */
  function card(p, n, extraClass) {
    var art = el('article', 'proj' + (extraClass ? ' ' + extraClass : ''));
    art.dataset.discipline = p.discipline;
    art.innerHTML =
      '<a href="' + href(p) + '">' +
        '<div class="proj-media wipe">' +
          '<img src="' + esc(p.cover) + '" alt="' + esc(p.title + (p.place ? ', ' + p.place : '')) + '"' +
          ' loading="lazy" decoding="async">' +
        '</div>' +
        '<div class="proj-meta">' +
          '<div>' +
            '<div class="proj-kicker"><span class="n">' + pad(n) + '</span><span>' + esc(p.discipline) + '</span></div>' +
            '<h3>' + esc(p.title) + '</h3>' +
          '</div>' +
          (p.place ? '<span class="where">' + esc(p.place) + '</span>' : '') +
        '</div>' +
      '</a>';
    return art;
  }

  /* ------------------------------------------------ home: hero slides */
  // data-hero="id|optional-image,id,id" — slide 1 is already in the markup.
  var heroMedia = document.querySelector('[data-hero]');
  if (heroMedia) {
    var slides = (heroMedia.dataset.hero || '').split(',').map(function (chunk) {
      var bits = chunk.trim().split('|');
      var p = byId[bits[0]];
      if (!p) return null;
      return { p: p, src: bits[1] || p.cover };
    }).filter(Boolean);

    var bars = document.querySelector('.hero-bars');
    var cap = document.querySelector('.hero-cap');

    if (slides.length > 1 && ANIM) {
      // slide 1 is static in the HTML; build the rest
      slides.slice(1).forEach(function (s) {
        var d = el('div', 'hero-slide');
        d.innerHTML = '<img src="' + esc(s.src) + '" alt="' + esc(s.p.title) + '" decoding="async">';
        heroMedia.appendChild(d);
      });
      if (bars) {
        slides.forEach(function (_, i) {
          var b = document.createElement('i');
          if (i === 0) b.className = 'on';
          bars.appendChild(b);
        });
      }

      var nodes = heroMedia.querySelectorAll('.hero-slide');
      var at = 0;
      var HOLD = 6200;

      function go(n) {
        at = n % slides.length;
        nodes.forEach(function (el2, i) { el2.classList.toggle('on', i === at); });
        if (bars) bars.querySelectorAll('i').forEach(function (b, i) { b.classList.toggle('on', i === at); });
        if (cap) {
          cap.classList.add('fading');
          setTimeout(function () {
            var s = slides[at];
            cap.href = href(s.p);
            cap.innerHTML = '<b>' + esc(s.p.title) + '</b><em>' + esc(s.p.place || 'Maharashtra') + '</em>';
            cap.classList.remove('fading');
          }, 350);
        }
      }

      // don't start cycling until the other covers are in, so the first
      // transition is never a half-loaded image
      var ready = 0;
      slides.slice(1).forEach(function (s) {
        var im = new Image();
        im.onload = im.onerror = function () { if (++ready === slides.length - 1) start(); };
        im.src = s.src;
      });
      function start() {
        setInterval(function () { go(at + 1); }, HOLD);
      }
    }
  }

  /* ----------------------------------------------- home: selected work */
  var featured = document.querySelector('[data-featured]');
  if (featured) {
    var shapes = ['wide', 'narrow tall offset', 'narrow', 'wide', 'wide', 'narrow tall offset'];
    (featured.dataset.featured || '').split(',').map(function (s) { return s.trim(); })
      .forEach(function (id, i) {
        var p = byId[id];
        if (p) featured.appendChild(card(p, i + 1, shapes[i % shapes.length]));
      });
    window.revealIn(featured);
  }

  /* ------------------------------------- home: heritage / conservation */
  var heritage = document.querySelector('[data-heritage]');
  if (heritage) {
    projects.filter(function (p) { return p.discipline === 'Conservation'; }).forEach(function (p) {
      var a = el('a', 'her');
      a.href = href(p);
      a.innerHTML =
        '<div class="her-media wipe"><img src="' + esc(p.cover) + '" alt="' + esc(p.title) +
        '" loading="lazy" decoding="async"></div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<span>' + esc(p.place || 'Maharashtra') + '</span>';
      heritage.appendChild(a);
    });
    window.revealIn(heritage);
  }

  /* --------------------------------------------- portfolio: the grid */
  var grid = document.querySelector('[data-grid]');
  if (grid) {
    projects.forEach(function (p, i) { grid.appendChild(card(p, i + 1)); });
    window.revealIn(grid);

    var filterBtns = document.querySelectorAll('.filters button[data-filter]');
    var count = document.querySelector('.filters .count');
    var current = 'All';

    function syncUrl() {
      var url = new URL(location.href);
      if (current === 'All') url.searchParams.delete('filter');
      else url.searchParams.set('filter', current);
      history.replaceState(null, '', url);
    }

    function applyFilter(want) {
      current = want;
      var shown = 0;
      grid.querySelectorAll('.proj').forEach(function (c) {
        var match = want === 'All' || c.dataset.discipline === want;
        c.classList.toggle('hide', !match);
        if (match) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' project' : ' projects');
      filterBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.filter === want ? 'true' : 'false');
      });
      syncUrl();
      window.revealIn(grid);
    }

    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.dataset.filter); });
    });

    applyFilter(new URLSearchParams(location.search).get('filter') || 'All');
  }

  /* --------------------------------------------- project detail page */
  var detail = document.querySelector('[data-detail]');
  if (detail) {
    var q = new URLSearchParams(location.search);
    var key = q.get('project') || q.get('gallery') || projects[0].id;
    var p = byId[key] || projects[0];

    document.title = p.title + (p.place ? ' — ' + p.place : '') + ' | Reshagrantha Architects';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.content = p.description
        ? p.description.slice(0, 155)
        : p.discipline + ' project by Reshagrantha Architects' + (p.place ? ' in ' + p.place : '') + '.';
    }

    var specs = [
      ['Discipline', p.discipline],
      ['Location', p.location || p.place],
      ['Area', p.area && p.area !== 'N/A' ? p.area : ''],
    ].filter(function (s) { return s[1]; });

    // the bar floats over a dark image here, same as the home hero
    if (nav) nav.classList.add('over');

    var topMeta = [p.place, p.area && p.area !== 'N/A' ? p.area : '', p.discipline]
      .filter(Boolean)
      .map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('');

    detail.innerHTML =
      '<header class="pd-top">' +
        '<div class="pd-cover"><img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" fetchpriority="high"></div>' +
        '<div class="pd-top-inner wrap">' +
          '<a class="pd-back" href="portfolio.html">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
            '<path d="M19 12H5M11 18l-6-6 6-6"/></svg>All projects</a>' +
          '<span class="label">' + esc(p.discipline) + '</span>' +
          '<h1>' + esc(p.title) + '</h1>' +
          '<div class="pd-top-meta">' + topMeta + '</div>' +
        '</div>' +
      '</header>' +
      '<div class="wrap pd-body">' +
        '<div class="pd-specs">' +
          specs.map(function (s) {
            return '<div class="pd-spec"><span class="label">' + esc(s[0]) + '</span><p>' + esc(s[1]) + '</p></div>';
          }).join('') +
        '</div>' +
        '<div class="pd-text">' +
          (p.description
            ? p.description.split(/\n+/).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('')
            : '<p>' + (/^[aeiou]/i.test(p.discipline) ? 'An ' : 'A ') + esc(p.discipline.toLowerCase()) +
              ' project by Reshagrantha Architects' + (p.place ? ' in ' + esc(p.place) : '') +
              '. Photographs below.</p>') +
        '</div>' +
      '</div>';

    var gal = el('div', 'wrap');
    var inner = el('div', 'pd-gallery');
    p.images.forEach(function (src, i) {
      var fig = el('figure', 'pd-shot wipe' + (i % 3 === 0 ? '' : ' half'));
      fig.innerHTML = '<img src="' + esc(src) + '" alt="' + esc(p.title) + ' — image ' + (i + 1) +
        '" loading="lazy" decoding="async">';
      fig.addEventListener('click', function () {
        window.openLightbox(p.images.map(function (s) { return { src: s, alt: p.title }; }), i);
      });
      inner.appendChild(fig);
    });
    gal.appendChild(inner);
    gal.style.paddingBottom = 'clamp(4.5rem, 9vw, 8rem)';
    detail.appendChild(gal);

    var idx = projects.indexOf(p);
    var next = projects[(idx + 1) % projects.length];
    var nx = el('div', 'pd-next');
    nx.innerHTML = '<div class="wrap">' +
      '<a class="pd-back-foot" href="portfolio.html">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<path d="M19 12H5M11 18l-6-6 6-6"/></svg>All projects</a>' +
      '<a class="pd-next-main" href="' + href(next) + '">' +
      '<div><span class="label">Next project</span><h3>' + esc(next.title) + '</h3></div>' +
      '<span class="pd-next-cover"><img src="' + esc(next.cover) + '" alt="" loading="lazy" decoding="async"></span>' +
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">' +
      '<path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>';
    detail.appendChild(nx);

    window.revealIn(detail);
  }

  /* ------------------------------------------------------------- misc */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
