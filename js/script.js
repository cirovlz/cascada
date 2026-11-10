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

/* 6) Persistencia de datos: guarda el borrador del formulario de contacto en localStorage */
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  const KEY = 'cascadafc:borrador-contacto';
  const ids = ['campoNombre', 'campoTipo', 'campoSeccion', 'campoMensaje', 'campoCorreo'];

  // LEER: al cargar la página, recupera lo que se había escrito
  try{
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    ids.forEach(id => { if(saved[id]) document.getElementById(id).value = saved[id]; });
  } catch(e){}

  // GUARDAR: cada vez que se escribe o se elige algo
  function guardar(){
    const data = {};
    ids.forEach(id => { data[id] = document.getElementById(id).value; });
    try{ localStorage.setItem(KEY, JSON.stringify(data)); } catch(e){}
  }
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', guardar);
    el.addEventListener('change', guardar);
  });

  // BORRAR: cuando el formulario se envía bien, el script hace form.reset() y esto limpia el borrador
  form.addEventListener('reset', () => {
    try{ localStorage.removeItem(KEY); } catch(e){}
  });
})();

/* 7) Comparador de metodologías (comparador.html) */
(function(){
  const app = document.getElementById('cmpApp');
  if(!app) return;

  const LEVELS = ['', 'Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'];
  const ROWS = [
    ['tipo', 'Tipo', 'text'],
    ['enfoque', 'Enfoque', 'text'],
    ['roles', 'Roles', 'text'],
    ['flexibilidad', 'Flexibilidad ante cambios', 'level'],
    ['entregas', 'Entregas', 'text'],
    ['documentacion', 'Documentación', 'level'],
    ['participacion', 'Participación del cliente', 'level'],
    ['riesgos', 'Gestión de riesgos', 'text'],
    ['ideal', 'Ideal para', 'text'],
    ['limitacion', 'Principal limitación', 'text']
  ];
  const DATA = [
    { id: 'cascada', nombre: 'Cascada', tipo: 'Tradicional', v: {
      tipo: 'Tradicional',
      enfoque: 'Secuencial y lineal: cada fase termina antes de empezar la siguiente.',
      roles: 'Gerente de proyecto, analista, diseñador, programador y tester, con roles especializados por fase.',
      flexibilidad: 1,
      entregas: 'Una única entrega al final del proyecto.',
      documentacion: 5, participacion: 2,
      riesgos: 'Se detectan tarde, sobre todo en las pruebas finales.',
      ideal: 'Requisitos estables, bien definidos y poco propensos a cambiar.',
      limitacion: 'Los cambios una vez avanzado el proyecto son muy costosos.' } },
    { id: 'v', nombre: 'Modelo V', tipo: 'Tradicional', v: {
      tipo: 'Tradicional',
      enfoque: 'Variante de la cascada: cada fase de construcción tiene un nivel de prueba asociado que se planifica desde el comienzo.',
      roles: 'Gerente de proyecto, analistas, diseñadores, programadores y testers, con un equipo de verificación en paralelo.',
      flexibilidad: 2,
      entregas: 'Una única entrega al final, tras completar todos los niveles de prueba.',
      documentacion: 5, participacion: 2,
      riesgos: 'Se detectan antes que en la cascada, porque cada fase tiene su prueba asociada.',
      ideal: 'Sistemas críticos donde la verificación es obligatoria: software médico, automotriz o aeroespacial.',
      limitacion: 'Es rígido ante cambios de requisitos y no produce versiones funcionales tempranas.' } },
    { id: 'iterativo', nombre: 'Iterativo / Incremental', tipo: 'Tradicional', v: {
      tipo: 'Tradicional',
      enfoque: 'Se construye en ciclos: cada iteración repite requisitos, diseño, implementación y pruebas y suma un incremento funcional.',
      roles: 'Gerente de proyecto, analistas, desarrolladores y testers; el cliente revisa cada incremento.',
      flexibilidad: 4,
      entregas: 'Incrementos funcionales entregados por partes, al final de cada iteración.',
      documentacion: 3, participacion: 3,
      riesgos: 'Se detectan temprano al probar cada incremento, aunque exige integración constante.',
      ideal: 'Proyectos grandes con requisitos que se aclaran con el tiempo y un cliente que quiere ver avances.',
      limitacion: 'Necesita una buena arquitectura desde el inicio y es más difícil estimar el costo y el plazo total.' } },
    { id: 'scrum', nombre: 'Scrum', tipo: 'Ágil', v: {
      tipo: 'Ágil',
      enfoque: 'Marco de trabajo con sprints de 1 a 4 semanas, revisiones y retrospectivas.',
      roles: 'Product Owner, Scrum Master y equipo de desarrollo autoorganizado.',
      flexibilidad: 4,
      entregas: 'Un incremento potencialmente entregable al final de cada sprint.',
      documentacion: 2, participacion: 5,
      riesgos: 'Se mitigan con revisiones de sprint y retrospectivas frecuentes.',
      ideal: 'Productos con requisitos cambiantes y equipos pequeños o medianos.',
      limitacion: 'Requiere un equipo disciplinado y un Product Owner disponible.' } },
    { id: 'kanban', nombre: 'Kanban', tipo: 'Ágil', v: {
      tipo: 'Ágil',
      enfoque: 'Método visual de flujo continuo: el trabajo se muestra en un tablero y se limita el trabajo en curso (WIP).',
      roles: 'No define roles obligatorios: el equipo conserva los que ya tiene.',
      flexibilidad: 5,
      entregas: 'Entrega continua: cada tarea se entrega apenas se termina, sin ciclos fijos.',
      documentacion: 2, participacion: 3,
      riesgos: 'Los cuellos de botella se ven en el tablero y el límite de WIP evita acumular trabajo a medio hacer.',
      ideal: 'Soporte, mantenimiento y trabajo que llega de forma continua e impredecible.',
      limitacion: 'Sin fechas ni ciclos fijos, es más difícil planificar a largo plazo.' } },
    { id: 'xp', nombre: 'XP (Extreme Programming)', tipo: 'Ágil', v: {
      tipo: 'Ágil',
      enfoque: 'Prácticas técnicas de ingeniería en iteraciones muy cortas: programación en pareja, TDD e integración continua.',
      roles: 'Programadores, cliente integrado al equipo, coach y tracker.',
      flexibilidad: 5,
      entregas: 'Versiones pequeñas y frecuentes, a menudo cada una o dos semanas.',
      documentacion: 2, participacion: 5,
      riesgos: 'Se reducen con pruebas automáticas, integración continua y revisión constante entre pares.',
      ideal: 'Equipos pequeños con requisitos cambiantes y alta exigencia técnica.',
      limitacion: 'Exige mucha disciplina técnica y un cliente muy disponible.' } }
  ];

  const KEY = 'cascadafc:comparador';
  let selected = new Set(['cascada', 'scrum']);
  let onlyDiff = false;
  try{
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(s && Array.isArray(s.selected)){
      selected = new Set(s.selected.filter(id => DATA.some(m => m.id === id)));
      onlyDiff = !!s.onlyDiff;
    }
  } catch(e){}

  const grid = document.getElementById('pickGrid');
  const result = document.getElementById('cmpResult');
  const count = document.getElementById('selCount');
  const chkDiff = document.getElementById('onlyDiff');
  const tagCls = m => m.tipo === 'Ágil' ? 't-agil' : 't-trad';

  grid.innerHTML = DATA.map(m =>
    `<label class="pick"><input type="checkbox" value="${m.id}"><span><strong>${m.nombre}</strong><em class="${tagCls(m)}">${m.tipo}</em></span></label>`
  ).join('');

  function cell(v, type){
    if(type === 'level'){
      const bars = [1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('');
      return `<div class="bars" aria-hidden="true">${bars}</div><strong>${LEVELS[v]}</strong> <span class="lv">(${v}/5)</span>`;
    }
    return v;
  }

  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify({ selected: Array.from(selected), onlyDiff })); } catch(e){}
  }

  function render(){
    const sel = DATA.filter(m => selected.has(m.id));
    grid.querySelectorAll('.pick').forEach(label => {
      const input = label.querySelector('input');
      const on = selected.has(input.value);
      input.checked = on;
      label.classList.toggle('is-selected', on);
    });
    chkDiff.checked = onlyDiff;
    count.textContent = sel.length === 1 ? '1 seleccionada' : `${sel.length} seleccionadas`;

    if(sel.length < 2){
      result.innerHTML = '<div class="cmp-empty">Marcá al menos dos metodologías para compararlas.</div>';
      return;
    }

    let diffCount = 0, body = '';
    ROWS.forEach(([key, label, type]) => {
      const vals = sel.map(m => m.v[key]);
      const same = vals.every(x => x === vals[0]);
      if(!same) diffCount++;
      if(onlyDiff && same) return;
      body += `<tr class="${same ? 'same' : 'diff'}"><th scope="row"><span>${label}</span>` +
              `<em class="${same ? 'badge-same' : 'badge-diff'}">${same ? '✓ Coinciden' : '≠ Difieren'}</em></th>` +
              sel.map(m => `<td>${cell(m.v[key], type)}</td>`).join('') + '</tr>';
    });

    const head = '<th scope="col">Característica</th>' +
      sel.map(m => `<th scope="col">${m.nombre}<small class="${tagCls(m)}">${m.tipo}</small></th>`).join('');
    const summary = `<p class="cmp-summary" role="status"><b>${diffCount} de ${ROWS.length}</b> características ` +
      `${diffCount === 1 ? 'difiere' : 'difieren'} entre las metodologías seleccionadas.</p>`;

    result.innerHTML = body
      ? `<div class="cmp-wrap"><table class="cmp-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${summary}`
      : `<div class="cmp-empty">Las metodologías seleccionadas coinciden en todas las características.</div>${summary}`;
  }

  grid.addEventListener('change', e => {
    if(e.target.matches('input[type="checkbox"]')){
      if(e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
      save(); render();
    }
  });
  chkDiff.addEventListener('change', () => { onlyDiff = chkDiff.checked; save(); render(); });
  app.querySelectorAll('[data-set]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.set;
    if(k === 'trad') selected = new Set(DATA.filter(m => m.tipo === 'Tradicional').map(m => m.id));
    if(k === 'agil') selected = new Set(DATA.filter(m => m.tipo === 'Ágil').map(m => m.id));
    if(k === 'todas') selected = new Set(DATA.map(m => m.id));
    if(k === 'limpiar') selected = new Set();
    save(); render();
  }));

  render();
})();

/* 8) Encuesta de preferencias metodológicas (encuesta.html) */
(function(){
  const root = document.getElementById('survey');
  if(!root) return;

  // cada opción: [título, descripción, puntaje]  (0 = tradicional · 1 = híbrido · 2 = ágil)
  const Q = [
    { label: 'Tamaño', title: '¿Qué tan grande es el proyecto y el equipo?', hint: 'Pensá en personas involucradas y duración estimada.',
      opts: [['Pequeño', 'Hasta ~5 personas y pocos meses', 2], ['Mediano', 'Entre 6 y 15 personas', 1], ['Grande', 'Varios equipos o más de 15 personas', 0]] },
    { label: 'Complejidad', title: '¿Qué tan complejo es el problema técnico y de negocio?', hint: 'Considerá integraciones, reglas de negocio y tecnología nueva.',
      opts: [['Baja', 'Problema conocido y tecnología probada', 0], ['Media', 'Algunas integraciones o reglas complejas', 1], ['Alta', 'Mucha incertidumbre técnica o de negocio', 2]] },
    { label: 'Requisitos', title: '¿Qué tan estables son los requisitos?', hint: '¿Esperás que cambien durante el proyecto?',
      opts: [['Estables', 'Definidos de antemano y poco propensos a cambiar', 0], ['Algo cambiantes', 'Se irán afinando con el tiempo', 1], ['Muy cambiantes', 'Cambian seguido o recién se están descubriendo', 2]] },
    { label: 'Cliente', title: '¿Qué tan disponible está el cliente?', hint: 'Pensá en cuánto puede participar y dar su opinión.',
      opts: [['Poco disponible', 'Solo al inicio y al final del proyecto', 0], ['Disponible a veces', 'Reuniones periódicas de seguimiento', 1], ['Muy disponible', 'Puede integrarse al equipo y responder rápido', 2]] },
    { label: 'Entregas', title: '¿Cuándo necesita el cliente ver resultados?', hint: 'Pensá en cada cuánto espera recibir algo utilizable.',
      opts: [['Una sola entrega final', 'El producto completo, al terminar', 0], ['Entregas por etapas', 'Hitos grandes cada cierto tiempo', 1], ['Entregas frecuentes', 'Versiones utilizables cada pocas semanas', 2]] },
    { label: 'Criticidad', title: '¿Qué tan crítico es un fallo en producción?', hint: 'Pensá en las consecuencias de un error una vez entregado.',
      opts: [['Crítico', 'Una falla pone en riesgo vidas, dinero o normativas', 0], ['Importante', 'Un fallo causa problemas serios pero reparables', 1], ['Tolerable', 'Se puede corregir rápido sin grandes consecuencias', 2]] },
    { label: 'Equipo', title: '¿Cómo trabaja y qué experiencia tiene el equipo?', hint: 'Pensá en su autonomía y en su costumbre de colaborar.',
      opts: [['Roles definidos y jerárquico', 'Funciones especializadas por fase', 0], ['Mixto', 'Parte del equipo trabaja con autonomía', 1], ['Autoorganizado', 'Equipo multidisciplinario con experiencia colaborativa', 2]] },
    { label: 'Documentación', title: '¿Cuánta documentación exige el proyecto?', hint: 'Contratos, normativas o auditorías pueden requerirla.',
      opts: [['Mucha', 'Contratos, normativas o auditorías la requieren', 0], ['Moderada', 'La necesaria para mantener el sistema', 1], ['Mínima', 'Se prefiere software funcionando antes que documentos', 2]] },
    { label: 'Tipo de equipo', title: '¿Dónde y cómo trabaja el equipo?', hint: 'Pensá en la ubicación y en cuánto se comunican a diario.',
      opts: [['Distribuido o con terceros', 'Varias sedes, contratistas o husos horarios', 0], ['Mixto', 'Parte junto y parte a distancia', 1], ['Reunido y en contacto diario', 'Mismo lugar o comunicación diaria fluida', 2]] }
  ];
  const RES = {
    tradicional: { badge: 'Tradicional', title: 'Te conviene un enfoque tradicional',
      text: 'Tus respuestas apuntan a requisitos estables, necesidad de control y documentación o consecuencias serias ante un fallo. Un modelo secuencial te da previsibilidad de plazos, costos y trazabilidad.',
      recs: [['Cascada', 'Si el alcance está cerrado y los requisitos no van a cambiar.'], ['Modelo en V', 'Si además la verificación es obligatoria, porque cada fase tiene su prueba asociada.']] },
    hibrido: { badge: 'Híbrido', title: 'Te conviene un enfoque híbrido',
      text: 'Tus respuestas mezclan señales de estabilidad y de cambio. Podés planificar y documentar lo esencial al inicio, como en un modelo tradicional, y construir por iteraciones cortas con entregas parciales.',
      recs: [['Iterativo e incremental', 'Entregas por partes con una arquitectura definida desde el principio.'], ['Scrum con planificación inicial', 'Sprints y revisiones, apoyados en una etapa previa de requisitos y diseño general.']] },
    agil: { badge: 'Ágil', title: 'Te conviene un enfoque ágil',
      text: 'Tus respuestas indican requisitos cambiantes, un cliente disponible y un equipo con autonomía. Entregar valor en ciclos cortos y aprender de cada iteración te permite absorber el cambio.',
      recs: [['Scrum', 'Si querés un ritmo de sprints con roles y revisiones periódicas.'], ['Kanban', 'Si el trabajo llega de forma continua y importa más el flujo que los ciclos.'], ['XP', 'Si la exigencia técnica es alta y querés prácticas como TDD e integración continua.']] }
  };
  const LEAN = ['Tradicional', 'Híbrido', 'Ágil'];
  const KEY = 'cascadafc:encuesta';

  let st = { answers: Array(Q.length).fill(null), step: 0, done: false };
  try{
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(s && Array.isArray(s.answers) && s.answers.length === Q.length){
      st = { answers: s.answers.map(a => (Number.isInteger(a) && a >= 0 && a < 3) ? a : null), step: Math.min(Math.max(s.step | 0, 0), Q.length - 1), done: !!s.done };
      if(st.done && st.answers.includes(null)) st.done = false;
    }
  } catch(e){}
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(st)); } catch(e){} };

  const elP = document.getElementById('sPregunta'), elPct = document.getElementById('sPct'), elBar = document.getElementById('sBar');
  const elProg = document.getElementById('sProgress'), elStep = document.getElementById('sStepper'), card = document.getElementById('sCard');

  function maxStep(){ const i = st.answers.indexOf(null); return i === -1 ? Q.length - 1 : i; }

  function chrome(){
    const answered = st.answers.filter(a => a !== null).length;
    const pct = Math.round(answered / Q.length * 100);
    elP.textContent = st.done ? 'Encuesta completa' : `Pregunta ${st.step + 1} de ${Q.length}`;
    elPct.textContent = `${pct}% completado`;
    elBar.style.width = pct + '%';
    elProg.setAttribute('aria-valuenow', String(pct));
    elStep.innerHTML = Q.map((q, i) => {
      const done = st.answers[i] !== null && !(i === st.step && !st.done);
      const cur = i === st.step && !st.done;
      const can = i <= maxStep();
      return `<li class="step${cur ? ' is-current' : ''}${done ? ' is-done' : ''}"><button type="button" data-go="${i}"${can ? '' : ' disabled'}${cur ? ' aria-current="step"' : ''}><span class="dot">${done ? '✓' : i + 1}</span><span>${q.label}</span></button></li>`;
    }).join('');
  }

  function showQuestion(){
    const q = Q[st.step];
    const sel = st.answers[st.step];
    card.innerHTML =
      `<fieldset><legend>${q.title}</legend><p class="q-hint">${q.hint}</p>` +
      q.opts.map((o, i) => `<label class="opt${sel === i ? ' is-selected' : ''}"><input type="radio" name="q${st.step}" value="${i}"${sel === i ? ' checked' : ''}><span><strong>${o[0]}</strong><span>${o[1]}</span></span></label>`).join('') +
      '</fieldset>' +
      `<div class="q-nav"><button type="button" class="btn btn-ghost btn-pill" id="sPrev"${st.step === 0 ? ' disabled' : ''}>← Anterior</button>` +
      `<button type="button" class="btn btn-accent" id="sNext"${sel === null ? ' disabled' : ''}>${st.step === Q.length - 1 ? 'Ver resultado →' : 'Siguiente →'}</button></div>`;

    card.querySelectorAll('input[type="radio"]').forEach(inp => inp.addEventListener('change', () => {
      st.answers[st.step] = Number(inp.value);
      save();
      card.querySelectorAll('.opt').forEach(l => l.classList.toggle('is-selected', l.contains(inp) && inp.checked));
      card.querySelector('#sNext').disabled = false;
      chrome();
    }));
    card.querySelector('#sPrev').addEventListener('click', () => { if(st.step > 0){ st.step--; save(); render(); } });
    card.querySelector('#sNext').addEventListener('click', () => {
      if(st.answers[st.step] === null) return;
      if(st.step < Q.length - 1){ st.step++; } else { st.done = true; }
      save(); render();
    });
  }

  function showResult(){
    const score = st.answers.reduce((sum, a, i) => sum + Q[i].opts[a][2], 0);
    const max = Q.length * 2;
    const type = score <= 6 ? 'tradicional' : score <= 11 ? 'hibrido' : 'agil';
    const r = RES[type];
    const pct = Math.round(score / max * 100);
    const recs = r.recs.map(x => `<li><strong>${x[0]}.</strong> ${x[1]}</li>`).join('');
    const ans = Q.map((q, i) => { const o = q.opts[st.answers[i]]; return `<div class="ans"><b>${q.label}</b>${o[0]}<br><em class="l-${o[2]}">${LEAN[o[2]]}</em></div>`; }).join('');
    const tip = (Q[5].opts[st.answers[5]][2] === 0 && type !== 'tradicional')
      ? '<div class="note res-tip"><p><b>Ojo con la criticidad:</b> indicaste que un fallo es crítico. Aun con un enfoque ' + (type === 'agil' ? 'ágil' : 'híbrido') + ', conviene reforzar las pruebas y la documentación.</p></div>' : '';
    card.innerHTML =
      `<span class="res-badge ${type}">${r.badge}</span><h2 class="res-title">${r.title}</h2><p class="res-text">${r.text}</p>` +
      `<div class="gauge"><div class="gauge-bar"><span class="gauge-mark" style="left:${Math.min(Math.max(pct, 2), 98)}%"></span></div><div class="gauge-lbl"><span>Tradicional</span><span>Híbrido</span><span>Ágil</span></div></div>` +
      `<h3 class="res-h">Qué te sugerimos mirar</h3><ul class="rec-list">${recs}</ul>${tip}` +
      `<h3 class="res-h">Tus respuestas</h3><div class="ans-grid">${ans}</div>` +
      '<div class="res-actions"><button type="button" class="btn btn-accent" id="sReset">Reiniciar encuesta</button><a class="btn btn-ghost btn-pill" href="comparador.html">Ver el comparador</a><a class="btn btn-ghost btn-pill" href="index.html">Volver al inicio</a></div>';
    card.querySelector('#sReset').addEventListener('click', () => {
      st = { answers: Array(Q.length).fill(null), step: 0, done: false };
      try{ localStorage.removeItem(KEY); } catch(e){}
      render();
    });
  }

  function render(){
    chrome();
    if(st.done) showResult(); else showQuestion();
  }

  elStep.addEventListener('click', e => {
    const b = e.target.closest('button[data-go]');
    if(!b || b.disabled) return;
    st.step = Number(b.dataset.go); st.done = false; save(); render();
  });

  render();
})();

/* 9) Metodologías ágiles: índice flotante con salto fluido y sección activa */
(function(){
  const bar = document.getElementById('agilesToc');
  if(!bar) return;
  const links = Array.from(bar.querySelectorAll('a.toc-pill'));
  const section = document.getElementById('agiles');
  const targets = [...new Set(links.map(a => a.getAttribute('href')))];

  function selectedScrumTab(){
    const t = document.querySelector('#scrum-detalle [role="tab"][aria-selected="true"]');
    return t ? t.id : null;
  }

  function update(){
    const r = section.getBoundingClientRect();
    let current = null, activeTarget = null;
    if(r.top < window.innerHeight && r.bottom > 0){
      targets.forEach(h => {
        const el = document.querySelector(h);
        if(el && el.getBoundingClientRect().top <= 200) activeTarget = h;
      });
      if(activeTarget === '#scrum-detalle'){
        current = links.find(a => a.dataset.tab === selectedScrumTab()) || links.find(a => a.getAttribute('href') === activeTarget);
      } else if(activeTarget){
        current = links.find(a => a.getAttribute('href') === activeTarget);
      }
    }
    links.forEach(a => {
      const on = a === current;
      a.classList.toggle('is-active', on);
      if(on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  // Roles / Ceremonias / Artefactos: abre la pestaña correcta de Scrum y baja hasta ella
  links.forEach(a => a.addEventListener('click', () => {
    if(a.dataset.tab){
      const tab = document.getElementById(a.dataset.tab);
      if(tab) tab.click();
    }
  }));
  document.querySelectorAll('#scrum-detalle [role="tab"]').forEach(t => t.addEventListener('click', () => setTimeout(update, 0)));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
