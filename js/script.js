/* =========================================================
   Cascada F.C. — comportamiento de la página (escritorio)
   ========================================================= */

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
