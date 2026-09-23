(function () {
  'use strict';
  const model = window.RCNDiagnosis, diagram = window.RCNDiagnosisDiagram;
  const root = document.getElementById('generative-model');
  if (!root || !model || !diagram) return;
  const byId = id => document.getElementById(`diagnosis-${id}`);
  const probability = p => `${(100 * p).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  const exactProbability = p => `${(100 * p).toLocaleString('en-US', { maximumFractionDigits: 6 })}%`;
  const grid = byId('world-grid'), cells = [...grid.querySelectorAll('button')];
  let selected = 255;
  function selectWorld(index, focus = false) {
    cells[selected].tabIndex = -1; cells[selected].setAttribute('aria-selected', 'false');
    selected = Math.max(0, Math.min(255, index));
    cells[selected].tabIndex = 0; cells[selected].setAttribute('aria-selected', 'true');
    const row = model.joint[selected];
    byId('world-number').textContent = `Case ${selected + 1} / 256`;
    byId('world-probability').textContent = exactProbability(row.probability);
    byId('world-values').innerHTML = model.names.map(name => `<div><dt>${model.labels[name]}</dt><dd>${row[name] ? 'Yes' : 'No'}</dd></div>`).join('');
    if (focus) cells[selected].focus();
  }
  cells.forEach((cell, i) => cell.addEventListener('click', () => selectWorld(i)));
  grid.addEventListener('keydown', event => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16 };
    if (event.key in moves) { event.preventDefault(); selectWorld(selected + moves[event.key], true); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); selectWorld(event.key === 'Home' ? 0 : 255, true); }
  });
  const svg = byId('graph'), nodes = byId('graph-nodes'), particles = byId('particles');
  const feverSelect = byId('fever-observation'), testSelect = byId('test-observation');
  const clueSelects = [...root.querySelectorAll('[data-diagnosis-clue]')];
  const stepButtons = [...root.querySelectorAll('[data-diagnosis-step]')];
  const presets = [{}, { X2: 1, X3: 1 }, { X2: 1, X3: 1, F: 1 }, { X2: 1, X3: 1, F: 1, T: 1 }];
  const stories = [
    'Before observing anything, the disease has a 10% probability in our model. The other branches contain no observed evidence yet.',
    'Warm skin and shivering make fever more likely. Their evidence travels through fever to disease, raising its probability to about 44%.',
    'Fever is now confirmed. Its value is fixed, so the five signs no longer provide extra information about disease. Try changing them below: the diagnosis stays the same.',
    'A positive test still provides new evidence. Fever and the test together raise the disease probability to about 94%. The five sign branches remain unnecessary for this query.'
  ];
  let evidence = {}, result, width = 642, frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw() {
    width = Math.max(280, Math.round(svg.getBoundingClientRect().width || 642));
    svg.setAttribute('viewBox', `0 0 ${width} 510`);
    nodes.innerHTML = diagram.render(width, evidence);
  }
  function cancelAnimation() { cancelAnimationFrame(frame); particles.replaceChildren(); }
  function animate() {
    cancelAnimation();
    if (reducedMotion.matches || !result) return;
    const points = diagram.layout(width), ns = 'http://www.w3.org/2000/svg';
    const routes = Object.entries(result.messages).map(([key, pair]) => {
      const [from, to] = key.split('>');
      let start = 0;
      if (from.startsWith('X')) start = 0;
      else if (from.startsWith('fX')) start = 750;
      else if (from === 'F') start = 'F' in evidence ? 0 : 1500;
      else if (from === 'fF') start = 'F' in evidence ? 750 : 2250;
      else if (from === 'T') start = 'F' in evidence ? 0 : 1500;
      else start = 'F' in evidence ? 750 : 2250;
      const group = document.createElementNS(ns, 'g');
      const c = diagram.color(from.replace(/^f/, ''));
      group.innerHTML = `<rect x="-16" y="-5" width="32" height="10" rx="2" fill="#d9dfdf" stroke="white" stroke-width="2"/><rect x="${-16 + 32 * pair[0]}" y="-5" width="${32 * pair[1]}" height="10" fill="${c}"/><path d="M19,-5 L25,0 L19,5" fill="none" stroke="${c}" stroke-width="2"/>`;
      group.style.opacity = '0'; particles.appendChild(group);
      return { group, a: points[from], b: points[to], start, duration: 730 };
    });
    const beginning = performance.now();
    function tick(now) {
      const elapsed = now - beginning;
      for (const route of routes) {
        const t = (elapsed - route.start) / route.duration;
        if (t < 0 || t > 1) { route.group.style.opacity = '0'; continue; }
        const dx = route.b[0] - route.a[0], dy = route.b[1] - route.a[1];
        const p = .2 + .6 * t;
        route.group.setAttribute('transform', `translate(${route.a[0] + dx * p} ${route.a[1] + dy * p}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`);
        route.group.style.opacity = String(Math.min(1, t * 8, (1 - t) * 8));
      }
      if (elapsed < 3100) frame = requestAnimationFrame(tick); else particles.replaceChildren();
    }
    frame = requestAnimationFrame(tick);
  }
  function update(step = null, play = true) {
    result = model.infer('D', evidence);
    const fever = model.infer('F', evidence).belief[1], disease = result.belief[1], clamped = 'F' in evidence;
    byId('disease-probability').textContent = probability(disease);
    byId('fever-probability').textContent = probability(fever);
    byId('disease-bar').style.width = `${100 * disease}%`;
    byId('fever-bar').style.width = `${100 * fever}%`;
    byId('active-count').textContent = result.visitedVariables.length;
    byId('scope-caption').textContent = clamped ? 'Five sign branches need no messages.' : 'The fever branch can carry evidence.';
    byId('sign-hint').textContent = clamped ? 'Fever is fixed. Changing these signs will not change the disease probability.' : 'With fever unknown, these signs can change the diagnosis.';
    byId('story').textContent = step !== null ? stories[step] : clamped ?
      `Fever is fixed to ${evidence.F ? 'yes' : 'no'}. The disease probability is ${probability(disease)}. The five signs cannot change it; the test still can.` :
      `Fever is unknown. Evidence from the five signs can travel through fever and affect the disease probability, currently ${probability(disease)}.`;
    stepButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(step === i)));
    byId('graph-description').textContent = clamped ?
      'Fever is observed. Only disease, fever, and test are visited for the disease query. The five sign branches are faded because their contributions cancel.' :
      'Disease connects to a prior, a fever factor, and a test factor. Fever connects to five sign factors. Evidence from the signs can pass through fever toward disease.';
    draw();
    if (play) animate();
  }
  function readControls() {
    evidence = {};
    for (const [name, control] of [['F', feverSelect], ['T', testSelect], ...clueSelects.map(select => [select.dataset.diagnosisClue, select])]) {
      if (control.value !== '') evidence[name] = Number(control.value);
    }
    update();
  }
  stepButtons.forEach((button, i) => button.addEventListener('click', () => {
    evidence = { ...presets[i] };
    feverSelect.value = evidence.F === undefined ? '' : String(evidence.F);
    testSelect.value = evidence.T === undefined ? '' : String(evidence.T);
    clueSelects.forEach(select => { const value = evidence[select.dataset.diagnosisClue]; select.value = value === undefined ? '' : String(value); });
    update(i);
  }));
  [feverSelect, testSelect, ...clueSelects].forEach(select => select.addEventListener('change', readControls));
  byId('replay').addEventListener('click', animate);
  root.classList.add('diagnosis-ready');
  update(0, false);
  if ('ResizeObserver' in window) new ResizeObserver(() => { cancelAnimation(); draw(); }).observe(svg);
  else window.addEventListener('resize', () => { cancelAnimation(); draw(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimation(); });
})();
