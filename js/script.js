/* =========================================================
   Cascada F.C. — comportamiento de la página (escritorio)
   ========================================================= */

/* 0) Menú hamburguesa (móvil y tablet) */
(function(){
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('primaryNav');
  if(!toggle || !nav) return;
  const mq = window.matchMedia('(max-width: 900px)');

  function setOpen(open){
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));

  // se cierra al elegir una sección
  nav.addEventListener('click', e => { if(e.target.closest('a')) setOpen(false); });

  // se cierra con Escape (y devuelve el foco al botón)
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && nav.classList.contains('is-open')){ setOpen(false); toggle.focus(); }
  });

  // se cierra al tocar fuera del encabezado
  document.addEventListener('click', e => {
    if(nav.classList.contains('is-open') && !e.target.closest('header')) setOpen(false);
  });

  // al pasar a pantalla ancha, vuelve al estado normal
  mq.addEventListener('change', () => setOpen(false));
})();

/* 1) Menú: marca la sección que se está viendo mientras se hace scroll.
      Los enlaces del menú llevan a cada sección de la MISMA página. */
(function(){
  const links = Array.from(document.querySelectorAll('nav.primary-nav a[href^="#"]'));
  const items = links
    .map(a => ({ a, el: document.querySelector(a.getAttribute('href')) }))
    .filter(x => x.el);
  if(!items.length) return;

  function update(){
    let current = items[0];
    items.forEach(it => {
      if(it.el.getBoundingClientRect().top <= 140) current = it;
    });
    const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if(bottom) current = items[items.length - 1];

    links.forEach(a => {
      const on = a === current.a;
      a.classList.toggle('is-active', on);
      if(on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* 2) Pestañas (hay varios grupos: ISO, modelos tradicionales y ágiles) */
document.querySelectorAll('[data-tabs]').forEach(group => {
  const tabs = Array.from(group.querySelectorAll('[role="tab"]'));

  function activate(tab){
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if(panel) panel.hidden = !selected;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', e => {
      let next = null;
      if(e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if(e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if(next){ e.preventDefault(); next.focus(); activate(next); }
    });
  });
});

/* 3) Acordeón (preguntas frecuentes) */
document.querySelectorAll('.acc-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.setAttribute('aria-expanded', String(!expanded));
    panel.style.maxHeight = expanded ? '0px' : panel.scrollHeight + 'px';
  });
});

/* 4) Ejercicios: preguntas con corrección inmediata */
document.querySelectorAll('.quiz').forEach(quiz => {
  const questions = Array.from(quiz.querySelectorAll('.quiz-q'));
  const scoreEl = quiz.querySelector('.quiz-score');
  const resetBtn = quiz.querySelector('.quiz-reset');
  let answered = 0, correct = 0;

  function render(){
    let text = `Respondidas ${answered} de ${questions.length} · Aciertos ${correct}`;
    if(answered === questions.length){
      text += correct === questions.length ? ' — ¡Perfecto!' : correct >= 3 ? ' — ¡Muy bien!' : ' — Repasá las secciones y probá de nuevo.';
    }
    scoreEl.textContent = text;
  }

  questions.forEach(q => {
    const right = Number(q.dataset.correct);
    const options = Array.from(q.querySelectorAll('.quiz-opt'));
    const feedback = q.querySelector('.quiz-fb');

    options.forEach((opt, i) => {
      opt.addEventListener('click', () => {
        if(q.dataset.done) return;
        q.dataset.done = '1';
        answered++;
        options.forEach(o => { o.disabled = true; });
        options[right].classList.add('is-correct');
        if(i === right){
          correct++;
          feedback.textContent = '¡Correcto! ' + q.dataset.explain;
        } else {
          opt.classList.add('is-wrong');
          feedback.textContent = 'No es esa. ' + q.dataset.explain;
        }
        render();
      });
    });
  });

  resetBtn.addEventListener('click', () => {
    answered = 0; correct = 0;
    questions.forEach(q => {
      delete q.dataset.done;
      q.querySelector('.quiz-fb').textContent = '';
      q.querySelectorAll('.quiz-opt').forEach(o => {
        o.disabled = false;
        o.classList.remove('is-correct', 'is-wrong');
      });
    });
    render();
  });
});

/* 5) Formulario de contacto: validación + envío real a Formspree */
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  const status = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');

  const rules = {
    campoNombre: v => v.trim().length >= 2 ? '' : 'Ingresá tu nombre completo.',
    campoTipo: v => v ? '' : 'Elegí qué querés hacer.',
    campoSeccion: v => v ? '' : 'Elegí la sección de la que querés hablar.',
    campoMensaje: v => v.trim().length >= 10 ? '' : 'Contanos un poco más (mínimo 10 caracteres).',
    campoCorreo: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Ingresá un correo válido.',
    campoAcepto: (v, field) => field.checked ? '' : 'Necesitamos tu OK para poder responderte.'
  };

  function showError(id, message){
    const field = document.getElementById(id);
    const errorEl = form.querySelector(`[data-error-for="${id}"]`);
    field.classList.toggle('has-error', Boolean(message));
    if(errorEl) errorEl.textContent = message;
  }
  function validate(id){
    const field = document.getElementById(id);
    const message = rules[id](field.value, field);
    showError(id, message);
    return !message;
  }

  Object.keys(rules).forEach(id => {
    const field = document.getElementById(id);
    field.addEventListener('blur', () => validate(id));
    ['input', 'change'].forEach(evt => field.addEventListener(evt, () => {
      if(field.classList.contains('has-error')) validate(id);
    }));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const allValid = Object.keys(rules).map(validate).every(Boolean);

    if(!allValid){
      status.textContent = 'Revisá los campos marcados antes de enviar.';
      status.className = 'form-status error';
      return;
    }
    if(form.action.includes('TU_ID_DE_FORMSPREE')){
      status.textContent = 'Falta conectar el formulario: reemplazá TU_ID_DE_FORMSPREE en index.html por tu endpoint real.';
      status.className = 'form-status error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    status.textContent = '';
    status.className = 'form-status';

    try{
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if(response.ok){
        status.textContent = '¡Gracias! Tu mensaje fue enviado. Te responderemos a la brevedad.';
        status.className = 'form-status success';
        form.reset();
        Object.keys(rules).forEach(id => showError(id, ''));
      } else {
        const data = await response.json().catch(() => null);
        const detail = data && data.errors ? data.errors.map(er => er.message).join(' ') : '';
        status.textContent = 'No se pudo enviar el mensaje. ' + (detail || 'Intentá de nuevo en un momento.');
        status.className = 'form-status error';
      }
    } catch(err){
      status.textContent = 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
      status.className = 'form-status error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar mi mensaje →';
    }
  });
})();


/* 6) Efectos interactivos al pasar el cursor sobre los perfiles del equipo */
(function () {
  'use strict';

  var grid = document.querySelector('#equipo .grid-4');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.member'));
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX_TILT = 6; // grados

  function activate(card) {
    card.classList.add('is-active');
    grid.classList.add('has-active');
  }

  function deactivate(card) {
    card.classList.remove('is-active');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
    if (!grid.querySelector('.member.is-active')) grid.classList.remove('has-active');
  }

  cards.forEach(function (card) {
    card.setAttribute('tabindex', '0'); // accesible con teclado

    card.addEventListener('mouseenter', function () { activate(card); });
    card.addEventListener('mouseleave', function () { deactivate(card); });
    card.addEventListener('focus', function () { activate(card); });
    card.addEventListener('blur', function () { deactivate(card); });

    // Luz que sigue al cursor + inclinación suave
    card.addEventListener('mousemove', function (e) {
      if (!canHover) return;
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (reduceMotion) return;
      var px = x / r.width - 0.5;
      var py = y / r.height - 0.5;
      card.style.setProperty('--ry', (px * MAX_TILT * 2).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-py * MAX_TILT * 2).toFixed(2) + 'deg');
    });
  });
})();


/* 7) Buscador y filtro de herramientas de calidad*/
(function () {
  'use strict';

  // Minúsculas y sin tildes, para que "analisis" encuentre "Análisis"
  function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function init() {
    var root = document.getElementById('herramientas');
    if (!root) return;

    var bar     = root.querySelector('.tool-filter');
    var botones = Array.prototype.slice.call(root.querySelectorAll('.filter-chip'));
    var tarjetas = Array.prototype.slice.call(root.querySelectorAll('.tool-card'));
    var buscador = root.querySelector('#toolSearch');
    var estado  = root.querySelector('#toolStatus');
    var vacio   = root.querySelector('#toolsEmpty');
    if (!bar || !botones.length || !tarjetas.length) return;

    var categoria = 'todas';
    var consulta  = '';

    // Texto en el que se busca: nombre, tipo, descripción, etiquetas y uso
    var indice = tarjetas.map(function (t) { return normalizar(t.textContent); });

    // Contador de cada botón
    botones.forEach(function (btn) {
      var clave = btn.dataset.filter;
      var total = clave === 'todas'
        ? tarjetas.length
        : tarjetas.filter(function (t) { return t.dataset.category === clave; }).length;
      btn.querySelector('.filter-count').textContent = total;
    });

    function aplicar() {
      var palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
      var visibles = 0;

      tarjetas.forEach(function (tarjeta, i) {
        var okCategoria = categoria === 'todas' || tarjeta.dataset.category === categoria;
        var okTexto = palabras.every(function (p) { return indice[i].indexOf(p) !== -1; });
        var mostrar = okCategoria && okTexto;

        tarjeta.hidden = !mostrar;
        tarjeta.classList.remove('is-entering');
        if (mostrar) {
          tarjeta.style.setProperty('--k', visibles);
          void tarjeta.offsetWidth;               // reinicia la animación
          tarjeta.classList.add('is-entering');
          visibles++;
        }
      });

      botones.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === categoria));
      });

      if (estado) {
        estado.textContent = 'Mostrando ' + visibles + ' de ' + tarjetas.length + ' herramientas';
      }
      if (vacio) vacio.hidden = visibles !== 0;
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-chip');
      if (!btn) return;
      categoria = btn.dataset.filter;
      aplicar();
    });

    if (buscador) {
      buscador.addEventListener('input', function () {
        consulta = buscador.value;
        aplicar();
      });
    }

    aplicar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();





/* 8) SDLC iluminación paso a paso de las etapas*/
(function () {
  'use strict';

  var block = document.getElementById('sdlc');
  var controls = document.getElementById('sdlcControls');
  var timeline = block && block.querySelector('.timeline');
  if (!block || !controls || !timeline) return;

  var items   = Array.prototype.slice.call(timeline.querySelectorAll('.tl-item'));
  var stepper = document.getElementById('sdlcStepper');
  var steps   = Array.prototype.slice.call(stepper.querySelectorAll('.sdlc-step'));
  var boxes   = Array.prototype.slice.call(block.querySelectorAll('.sdlc-side svg rect.svg-box'));
  var status  = document.getElementById('sdlcStatus');
  var prevBtn = document.getElementById('sdlcPrev');
  var nextBtn = document.getElementById('sdlcNext');
  if (!items.length || items.length !== steps.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = -1;
  var autoScrolling = false;   // true mientras la página se desplaza sola (clic en una etapa)
  var idleTimer = null;

  function behavior() { return reduceMotion.matches ? 'auto' : 'smooth'; }

  /* La barra de progreso llega hasta el punto de la etapa activa */
  function updateFill() {
    if (current < 0) return;
    var y = items[current].offsetTop - 1;
    timeline.style.setProperty('--fill', Math.max(0, y) + 'px');
  }

  /* En pantallas angostas, mantiene visible la etapa activa dentro de la barra horizontal */
  function keepStepVisible() {
    if (stepper.scrollWidth <= stepper.clientWidth) return;
    var st = steps[current];
    var left = st.offsetLeft - (stepper.clientWidth - st.offsetWidth) / 2;
    stepper.scrollTo({ left: left, behavior: behavior() });
  }

  function setActive(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    if (i === current) return;
    current = i;

    items.forEach(function (it, k) {
      it.classList.toggle('is-active', k === i);
      it.classList.toggle('is-done', k < i);
    });
    steps.forEach(function (st, k) {
      st.classList.toggle('is-active', k === i);
      st.classList.toggle('is-done', k < i);
      if (k === i) { st.setAttribute('aria-current', 'step'); }
      else { st.removeAttribute('aria-current'); }
    });
    boxes.forEach(function (b, k) { b.classList.toggle('is-lit', k === i); });

    var name = items[i].querySelector('h3');
    status.textContent = 'Etapa ' + (i + 1) + ' de ' + items.length + (name ? ': ' + name.textContent : '');
    prevBtn.disabled = (i === 0);
    nextBtn.disabled = (i === items.length - 1);

    updateFill();
    keepStepVisible();
  }

  /* Ir a una etapa con desplazamiento suave */
  function goTo(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    setActive(i);
    lockObserver();
    items[i].scrollIntoView({ behavior: behavior(), block: 'center' });
  }

  /* Mientras dura el desplazamiento automático se ignora el scroll, para que no parpadeen etapas intermedias */
  function lockObserver() {
    autoScrolling = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { autoScrolling = false; }, 250);
  }
  window.addEventListener('scroll', function () {
    if (!autoScrolling) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { autoScrolling = false; }, 160);
  }, { passive: true });

  /* ----- eventos ----- */
  steps.forEach(function (st, k) {
    st.addEventListener('click', function () { goTo(k); });
  });
  prevBtn.addEventListener('click', function () { goTo(current - 1); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); });

  items.forEach(function (it, k) {
    it.addEventListener('click', function () { setActive(k); });
    it.addEventListener('focus', function () { setActive(k); });
  });

  /* Al hacer scroll se enciende la etapa que cruza el centro de la pantalla */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (autoScrolling) return;
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(items.indexOf(e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    items.forEach(function (it) { io.observe(it); });
  }

  /* La barra de progreso se recalcula si cambia el alto de la línea de tiempo */
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateFill).observe(timeline);
  } else {
    window.addEventListener('resize', updateFill);
  }

  /* ----- inicio ----- */
  boxes.forEach(function (b) { b.classList.remove('hl'); });  // el resaltado fijo pasa a depender de la etapa activa
  timeline.classList.add('is-live');
  controls.hidden = false;
  setActive(0);
})();

/* 9) Navegación interna entre Cascada, Modelo en V e Iterativo e incremental  */
(function () {
  'use strict';

  var root = document.querySelector('[data-modelos]');
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  var panels = tabs.map(function (t) {
    return document.getElementById(t.getAttribute('aria-controls'));
  });
  var tablist = root.querySelector('[role="tablist"]');
  var prev = root.querySelector('[data-modelos-prev]');
  var next = root.querySelector('[data-modelos-next]');
  var count = root.querySelector('[data-modelos-count]');
  var section = document.getElementById('modelos');
  var PREFIX = '#modelos-';
  var current = 0;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slugOf(i) {
    return tabs[i].id.replace(/^tab-/, '');
  }

  function indexFromHash(hash) {
    if (!hash || hash.indexOf(PREFIX) !== 0) return -1;
    var slug = hash.slice(PREFIX.length);
    for (var i = 0; i < tabs.length; i++) {
      if (slugOf(i) === slug) return i;
    }
    return -1;
  }

  function select(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= tabs.length) return;
    current = i;

    tabs.forEach(function (tab, k) {
      var on = k === i;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (panels[k]) panels[k].hidden = !on;
    });

    if (count) count.textContent = (i + 1) + ' / ' + tabs.length;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === tabs.length - 1;

    if (opts.focus) tabs[i].focus();
    if (opts.hash && window.history && history.replaceState) {
      history.replaceState(null, '', PREFIX + slugOf(i));
    }
  }

  function revealSection() {
    if (!section) return;
    section.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  /* clic en una pestaña */
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      select(i, { hash: true });
    });
  });

  /* teclado: flechas, Inicio y Fin (patrón WAI-ARIA de pestañas) */
  if (tablist) {
    tablist.addEventListener('keydown', function (e) {
      var target = -1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          target = (current + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          target = (current - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = tabs.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      select(target, { focus: true, hash: true });
    });
  }

  /* botones anterior / siguiente */
  if (prev) {
    prev.addEventListener('click', function () {
      select(current - 1, { hash: true });
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      select(current + 1, { hash: true });
    });
  }

  /* enlaces directos (también funcionan <a href="#modelos-v"> en cualquier parte) */
  window.addEventListener('hashchange', function () {
    var i = indexFromHash(window.location.hash);
    if (i >= 0) {
      select(i);
      revealSection();
    }
  });

  /* estado inicial */
  var start = indexFromHash(window.location.hash);
  if (start >= 0) {
    select(start);
    window.setTimeout(revealSection, 60);
  } else {
    select(0);
  }
})();
