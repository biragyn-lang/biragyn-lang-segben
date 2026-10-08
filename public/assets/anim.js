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
  mark('.extra > span, .extra > a', null, 50);
  mark('.faq-item', null, 60);

  if (reduce || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
    // Rede de segurança: rolagem muito rápida ou salto por âncora pode pular o observer.
    // Qualquer coisa que já ficou acima da parte de baixo da tela aparece.
    var ticking = false;
    var sweep = function () {
      ticking = false;
      var lim = window.innerHeight;
      document.querySelectorAll('.rv:not(.in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < lim) { el.classList.add('in'); io.unobserve(el); }
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }, { passive: true });
    window.addEventListener('hashchange', sweep);
  }

  // Sombra no cabeçalho
  var hdr = document.querySelector('.site-header');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Números contando quando aparecem na tela
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    var fmt = function (n) { return '+' + n.toLocaleString('pt-BR'); };
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, end = +el.getAttribute('data-count'), t0 = null, dur = 1600;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.round(end * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = fmt(0);
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { co.observe(c); });
  }


  // Vídeo do topo: respeita quem pediu menos movimento
  var hv = document.querySelector('.hero-video');
  if (hv && reduce) { hv.removeAttribute('autoplay'); try { hv.pause(); } catch (e) {} }


  // Botões principais: efeito de hover com bolinha que preenche e texto com seta
  var ARROW = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  document.querySelectorAll('a.btn-main:not(.wa), .sb-send-wa').forEach(function (b) {
    if (b.classList.contains('ihb')) return;
    var label = b.textContent.replace(/\s+/g, ' ').replace(/\s*→\s*$/, '').trim();
    if (!label) return;
    var bg = getComputedStyle(b).backgroundColor;
    var fg = getComputedStyle(b).color;
    var yellow = /242,\s*194,\s*0/.test(bg);
    b.style.setProperty('--ihb-bg', bg);
    b.style.setProperty('--ihb-fg', fg);
    b.style.setProperty('--ihb-dot', yellow ? '#0d3b24' : '#f2c200');
    b.style.setProperty('--ihb-hover-fg', yellow ? '#ffffff' : '#14201a');
    var inner = document.createElement('span');
    inner.className = 'ihb-label';
    while (b.firstChild) inner.appendChild(b.firstChild);
    var hover = document.createElement('span');
    hover.className = 'ihb-hover'; hover.setAttribute('aria-hidden', 'true');
    hover.innerHTML = '<span></span>' + ARROW;
    hover.firstChild.textContent = label;
    var dot = document.createElement('span');
    dot.className = 'ihb-dot'; dot.setAttribute('aria-hidden', 'true');
    b.appendChild(dot); b.appendChild(inner); b.appendChild(hover);
    b.classList.add('ihb');
  });

  // Alterna claro/escuro e lembra a escolha
  var tb = document.querySelector('.theme-btn');
  if (tb) {
    var root = document.documentElement;
    var sync = function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      tb.setAttribute('aria-pressed', dark ? 'true' : 'false');
      tb.setAttribute('aria-label', dark ? 'Mudar para modo claro' : 'Mudar para modo escuro');
    };
    sync();
    tb.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('segben-theme', next); } catch (e) {}
      sync();
    });
    // Segue o sistema enquanto a pessoa não escolher
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSys = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('segben-theme'); } catch (err) {}
      if (!saved) { root.setAttribute('data-theme', e.matches ? 'dark' : 'light'); sync(); }
    };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
  }
})();
