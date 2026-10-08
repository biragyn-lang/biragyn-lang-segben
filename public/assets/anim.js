(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Título do hero palavra por palavra
  var h1 = document.querySelector('#topo h1, section h1');
  if (h1 && !reduce) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      outer.className = 'w';
      var inner = document.createElement('span');
      inner.textContent = w;
      inner.style.setProperty('--d', (120 + i * 70) + 'ms');
      outer.appendChild(inner);
      h1.appendChild(outer);
      if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
    });
  }

  // Letreiro de clientes: duplica os nomes pra rolar sem emenda
  document.querySelectorAll('.marquee').forEach(function (m) {
    var track = document.createElement('div');
    track.className = 'marquee-track';
    var items = Array.prototype.slice.call(m.children);
    items.forEach(function (el) { track.appendChild(el); });
    items.forEach(function (el) {
      var c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
    m.appendChild(track);
  });

  // Marca o que aparece ao rolar, com atraso em cascata entre irmãos
  function mark(selector, extra, step) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (el.closest('#topo') && !el.closest('.seal')) return;
      if (selector === 'section h2' && el.closest('.card')) return;
      el.classList.add('rv');
      if (extra) el.classList.add(extra);
      var sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (s) { return s.matches(selector); }) : [];
      var idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty('--d', Math.min(idx * (step || 90), 540) + 'ms');
    });
  }
  mark('section h2');
  mark('section h2 + p, section p[style*="flex: 1 1 360px"]');
  mark('.card, article.card', 'rv-zoom', 90);
  mark('.gal img', 'rv-zoom', 70);
  mark('.step', null, 140);
  mark('.brig-row', 'rv-right', 120);
  mark('.brig-media', 'rv-left');
  mark('#treinamentos .chips > span', null, 50);
  mark('.extra > span', null, 50);

  if (reduce || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  }

  // Sombra no cabeçalho
  var hdr = document.querySelector('.site-header');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
