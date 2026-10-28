(function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasIO = 'IntersectionObserver' in window;
    var nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
    var nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
    function below(el) { return el.getBoundingClientRect().top > innerHeight * 0.92; }
  
    // Todas las lecturas de layout juntas, antes de escribir nada (evita reflows en cadena)
    var rv = $$('.rv'), rvBelow = rv.map(below);
    var cn = $$('.count'), cnBelow = cn.map(below);
    var chat = document.getElementById('chat'), chatBelow = below(chat);
  
    // Barra de progreso: sin lecturas de layout dentro del scroll
    var bar = document.getElementById('progress');
    var maxScroll = 0, ticking = false;
    function measure() { maxScroll = document.documentElement.scrollHeight - innerHeight; }
    function paint() {
      ticking = false;
      var p = maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
    measure(); paint();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { measure(); onScroll(); }).observe(document.body);
    }
  
    // Pausa las animaciones infinitas de las secciones que no están en pantalla
    if (hasIO) {
      var po = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
      }, { rootMargin: '160px 0px' });
      $$('section').forEach(function (s) { po.observe(s); });
    }
  
    // Aparición al bajar: solo se esconde lo que todavía está abajo
    if (!reduce && hasIO) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
      }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
      rv.forEach(function (el, i) { if (rvBelow[i]) { el.classList.add('pre'); io.observe(el); } });
    }
  
    // Contadores
    function fmt(el, v) { var d = +(el.dataset.dec || 0); return (el.dataset.prefix || '') + (d ? nf1.format(v) : nf0.format(Math.round(v))) + (el.dataset.suffix || ''); }
    function run(el) {
      var to = parseFloat(el.dataset.to), t0 = null, dur = 1500;
      function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(el, to * e); if (k < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }
    if (!reduce && hasIO) {
      var ic = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(e.target); ic.unobserve(e.target); } });
      }, { threshold: .5 });
      cn.forEach(function (el, i) { if (cnBelow[i]) ic.observe(el); });
    }
  
    // Antes / después
    $$('.ba').forEach(function (box) {
      var input = box.querySelector('input');
      function set(v) { box.style.setProperty('--pos', v + '%'); }
      input.addEventListener('input', function () { box._touched = true; set(input.value); });
      set(input.value);
      if (reduce || !hasIO) return;
      var o = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        var keys = [50, 20, 80, 50], t0 = null, seg = 700;
        function anim(t) {
          if (box._touched) return;
          if (!t0) t0 = t;
          var p = (t - t0) / seg, k = Math.floor(p);
          if (k >= keys.length - 1) { set(50); input.value = 50; return; }
          var f = p - k, e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
          set(keys[k] + (keys[k + 1] - keys[k]) * e);
          requestAnimationFrame(anim);
        }
        setTimeout(function () { requestAnimationFrame(anim); }, 500);
      }, { threshold: .6 });
      o.observe(box);
    });
  
    // Celulares que alternan solos (solo mientras se ven)
    $$('.flip').forEach(function (f, i) {
      var b = f.querySelector('button'), s = f.querySelector('.state'), vis = true;
      function toggle() { f.classList.toggle('on'); s.textContent = f.classList.contains('on') ? 'Después' : 'Antes'; }
      b.addEventListener('click', function () { f._manual = true; toggle(); });
      if (hasIO) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(f);
      if (!reduce) setTimeout(function () { setInterval(function () { if (!f._manual && vis) toggle(); }, 3000); }, i * 600);
    });
  
    // Pestañas de la galería
    var tabs = $$('.tabs button');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) {
          var on = o === t; o.setAttribute('aria-selected', on);
          var p = document.getElementById(o.dataset.t); p.hidden = !on;
          if (on) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); p.scrollLeft = 0; }
        });
      });
    });
  
    // Ampliar piezas (la imagen grande se pide recién al hacer clic)
    var dlg = document.getElementById('zoom'), zi = document.getElementById('zoom-img');
    $$('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () { zi.src = b.dataset.zoom; zi.alt = b.querySelector('img').alt; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    });
    function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    document.getElementById('zoom-close').addEventListener('click', closeDlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
  
    // Chat que aparece
    if (!reduce && hasIO && chatBelow) {
      var oc = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { chat.classList.add('play'); oc.disconnect(); } }, { threshold: .12 });
      oc.observe(chat);
    }
  })();