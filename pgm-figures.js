(function () {
  'use strict';
  const section = document.getElementById('generative-model');
  const model = window.RCNWeather;
  if (!section || !model) return;
  const get = id => document.getElementById(id);
  const all = selector => [...section.querySelectorAll(selector)];
  const percent = (value, digits = 1) => `${Number((value * 100).toFixed(digits))}%`;
  const svgNS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const graph = get('pgm-graph');
  const colors = { R: '#416881', S: '#987143', W: '#548c87' };
  const stories = [
    'Before looking at the grass, our model gives rain a 20% chance and the sprinkler a 10% chance.',
    'The grass is wet. That supports both possible causes: rain rises to 69.7%, and sprinkler use rises to 35.2%. Neither cause is observed directly.',
    'Now we learn the sprinkler was on. It helps explain the same wet grass, so the probability of rain falls to 21.6%. Rain is still possible.'
  ];
  const presets = [{}, { W: 1 }, { W: 1, S: 1 }];
  let graphEvidence = {}, graphResult = model.sumProduct(), points = {}, animation = 0;

  function paintJoint(wetObserved) {
    const result = model.condition(wetObserved ? { W: 1 } : {});
    model.joint.forEach(row => {
      const node = get(`pgm-world-${row.key}`);
      node.classList.toggle('is-excluded', wetObserved && !row.W);
      node.classList.toggle('is-evidence', wetObserved && !!row.W);
      node.querySelector('.pgm-probability-number').textContent = percent(row.probability, 2);
      node.querySelector('.pgm-probability-track i').style.width = `${row.probability * 100}%`;
    });
    all('[data-joint-evidence]').forEach(button => button.setAttribute('aria-pressed',
      String((button.dataset.jointEvidence === 'wet') === wetObserved)));
    get('pgm-joint-question').textContent = wetObserved ? 'Chance of rain, given wet grass' : 'Chance of rain before observing';
    get('pgm-joint-answer').textContent = percent(result.beliefs.R[1]);
    get('pgm-joint-explanation').textContent = wetObserved
      ? 'The four wet-grass cases contain 26.1% of the original probability. Rain accounts for 18.18%: divide 18.18 by 26.1 to get 69.7%.'
      : 'Add the probabilities of the four cases in which it rains. Together, they account for 20% of all the probability.';
  }

  function paintScale(value) {
    const n = Math.max(3, Math.min(100, Math.round(Number(value))));
    const count = 2n ** BigInt(n);
    const exact = count.toLocaleString('en-US');
    get('pgm-variable-slider').value = n;
    get('pgm-variable-count').textContent = n;
    const output = get('pgm-case-count');
    if (n <= 20) output.textContent = exact;
    else {
      const [mantissa, exponent] = Number(count).toExponential(2).split('e+');
      output.innerHTML = `${mantissa} × 10<sup>${exponent}</sup>`;
    }
    output.setAttribute('aria-label', `${exact} possible cases`);
    output.title = exact;
    all('[data-variable-count]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.variableCount === n)));
    const tiles = document.createDocumentFragment();
    const shown = count < 64n ? Number(count) : 64;
    for (let i = 0; i < shown; i++) tiles.appendChild(document.createElement('i'));
    get('pgm-case-tiles').replaceChildren(tiles);
    get('pgm-scale-note').textContent = count <= 64n
      ? `Each square represents one complete case. All ${exact} are shown.`
      : 'Only the first 64 cases are drawn. The count above includes every possible assignment.';
  }

  function highlightFactor(name) {
    all('[data-factor]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.factor === name)));
    all('[data-factor-piece]').forEach(piece => piece.classList.toggle('is-active', piece.dataset.factorPiece === name));
    all('[data-graph-factor]').forEach(node => node.classList.toggle('is-active', node.dataset.graphFactor === name));
  }
  function paintProduct(key) {
    const row = model.joint.find(item => item.key === key);
    if (!row) return;
    all('[data-rain-row]').forEach(node => node.dataset.selected = String(+node.dataset.rainRow === row.R));
    all('[data-sprinkler-row]').forEach(node => node.dataset.selected = String(+node.dataset.sprinklerRow === row.S));
    all('[data-wet-row] [data-w]').forEach(node => node.dataset.selected = String(
      node.parentNode.dataset.wetRow === `${row.R}${row.S}` && +node.dataset.w === row.W));
    model.factors.forEach((factor, i) => get(['pgm-product-r', 'pgm-product-s', 'pgm-product-w'][i]).textContent = percent(factor.value(row), 2));
    get('pgm-product-result').textContent = percent(row.probability, 2);
  }

  function layoutGraph() {
    const w = graph.getBoundingClientRect().width || 640;
    const compact = w < 480;
    const h = compact ? 405 : 365;
    graph.setAttribute('viewBox', `0 0 ${w} ${h}`);
    graph.style.height = `${h}px`;
    points = compact ? {
      rain: [w * .23, 30], sprinkler: [w * .77, 30], R: [w * .23, 120], S: [w * .77, 120],
      wet: [w * .5, 235], W: [w * .5, 345]
    } : {
      rain: [w * .08, 105], sprinkler: [w * .92, 105], R: [w * .24, 105], S: [w * .76, 105],
      wet: [w * .5, 175], W: [w * .5, 300]
    };
    for (const [name, [x, y]] of Object.entries(points)) get(`pgm-node-${name}`).setAttribute('transform', `translate(${x} ${y})`);
    for (const [id, a, b] of [['rain', 'rain', 'R'], ['sprinkler', 'sprinkler', 'S'], ['R', 'R', 'wet'], ['S', 'S', 'wet'], ['W', 'W', 'wet']]) {
      get(`pgm-edge-${id}`).setAttribute('d', `M${points[a].join(' ')}L${points[b].join(' ')}`);
    }
    // Keep labels legible at narrow article widths without scaling text down.
    get('pgm-node-wet').querySelector('text').setAttribute('x', compact ? 20 : 24);
    get('pgm-node-wet').querySelector('text').style.fontSize = compact ? '13px' : '15px';
    ['rain', 'sprinkler'].forEach(name => get(`pgm-node-${name}`).querySelector('text').setAttribute('y', compact ? -17 : -23));
  }

  function stopAnimation() {
    if (animation) window.cancelAnimationFrame(animation);
    animation = 0;
    get('pgm-message-particles').replaceChildren();
  }
  function animateMessages(step) {
    stopAnimation();
    if (reduced.matches) return;
    const routes = step === 0
      ? [['rain', 'R', 0], ['sprinkler', 'S', 0], ['R', 'wet', .65], ['S', 'wet', .65], ['wet', 'W', 1.3]]
      : step === 1 ? [['W', 'wet', 0], ['wet', 'R', .8], ['wet', 'S', .8]]
      : step === 2 ? [['W', 'wet', 0], ['S', 'wet', 0], ['wet', 'R', .8]]
      : [['R', 'wet', 0], ['S', 'wet', 0], ['W', 'wet', 0], ...model.names.filter(name => !(name in graphEvidence)).map(name => ['wet', name, .8])];
    const nodes = routes.map(([from, to, delay]) => {
      const message = graphResult.messages[`${from}>${to}`];
      const group = document.createElementNS(svgNS, 'g');
      const color = colors[model.names.includes(to) ? to : from];
      function shape(tag, attrs) {
        const node = document.createElementNS(svgNS, tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        group.appendChild(node);
      }
      shape('rect', { x: -17, y: -6, width: 34, height: 12, rx: 2, fill: '#e5e3df', stroke: '#ffffff', 'stroke-width': 3 });
      shape('rect', { x: 17 - 34 * message[1], y: -6, width: 34 * message[1], height: 12, fill: color });
      shape('path', { d: 'M20 -4L25 0L20 4Z', fill: color, stroke: '#ffffff', 'stroke-width': 1 });
      group.style.opacity = 0;
      get('pgm-message-particles').appendChild(group);
      return { from, to, delay, group };
    });
    let start;
    function tick(time) {
      if (start === undefined) start = time;
      const elapsed = (time - start) / 1000;
      nodes.forEach(({ from, to, delay, group }) => {
        const t = (elapsed - delay) / .8;
        if (t < 0 || t > 1) { group.style.opacity = 0; return; }
        const a = points[from], b = points[to];
        const dx = b[0] - a[0], dy = b[1] - a[1], distance = Math.hypot(dx, dy);
        const q = (29 + t * (distance - 55)) / distance;
        group.setAttribute('transform', `translate(${a[0] + dx * q} ${a[1] + dy * q}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`);
        group.style.opacity = Math.min(1, t * 8, (1 - t) * 8);
      });
      if (elapsed < 2.3) animation = window.requestAnimationFrame(tick);
      else stopAnimation();
    }
    animation = window.requestAnimationFrame(tick);
  }

  function paintGraph(evidence, step = -1, animate = true) {
    graphEvidence = { ...evidence };
    graphResult = model.sumProduct(evidence);
    all('[data-pgm-step]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.pgmStep === step)));
    all('[data-observe]').forEach(select => select.value = select.dataset.observe in evidence ? evidence[select.dataset.observe] : '');
    model.names.forEach(name => {
      const observed = name in evidence;
      const value = percent(graphResult.beliefs[name][1]);
      get(`pgm-belief-${name}`).textContent = value;
      get(`pgm-belief-bar-${name}`).style.width = `${graphResult.beliefs[name][1] * 100}%`;
      const state = name === 'W' ? (evidence[name] ? 'Wet' : 'Dry') : name === 'S' ? (evidence[name] ? 'On' : 'Off') : (evidence[name] ? 'Yes' : 'No');
      get(`pgm-belief-status-${name}`).textContent = observed ? `Observed: ${state.toLowerCase()}` : 'Chance of yes';
      const node = get(`pgm-node-${name}`);
      node.classList.toggle('is-observed', observed);
      node.querySelector('.pgm-node-state').textContent = observed ? `Observed: ${state}` : 'Unknown';
    });
    get('pgm-graph-story').textContent = step >= 0 ? stories[step]
      : `Observed variables stay fixed. The model infers the rest: rain ${percent(graphResult.beliefs.R[1])}, sprinkler on ${percent(graphResult.beliefs.S[1])}, and wet grass ${percent(graphResult.beliefs.W[1])}.`;
    const message = graphResult.messages['wet>R'];
    get('pgm-message-no').textContent = percent(message[0]);
    get('pgm-message-yes').textContent = percent(message[1]);
    get('pgm-message-explanation').textContent = step === 0
      ? 'Equal support for both values leaves the rain prior unchanged. These message values are relative support, normalized to sum to one; they are not the final belief.'
      : step === 2 ? 'With the sprinkler on, wet grass is plausible with or without rain. This message is nearly balanced. Combining it with the rain prior gives a 21.6% belief in rain.'
      : 'This is the relative support arriving from the wet-grass factor, normalized to sum to one. It combines with the rain prior and any direct observation of rain to produce the belief above.';
    get('pgm-graph-svg-description').textContent = `The same three-variable factor graph. ${get('pgm-graph-story').textContent}`;
    layoutGraph();
    if (animate) animateMessages(step);
  }

  all('[data-joint-evidence]').forEach(button => button.addEventListener('click', () => paintJoint(button.dataset.jointEvidence === 'wet')));
  get('pgm-variable-slider').addEventListener('input', event => paintScale(event.target.value));
  all('[data-variable-count]').forEach(button => button.addEventListener('click', () => paintScale(button.dataset.variableCount)));
  all('[data-factor]').forEach(button => {
    button.addEventListener('click', () => highlightFactor(button.dataset.factor));
    button.addEventListener('mouseenter', () => highlightFactor(button.dataset.factor));
    button.addEventListener('focus', () => highlightFactor(button.dataset.factor));
  });
  get('pgm-world-select').addEventListener('change', event => paintProduct(event.target.value));
  all('[data-pgm-step]').forEach(button => button.addEventListener('click', () => paintGraph(presets[+button.dataset.pgmStep], +button.dataset.pgmStep)));
  all('[data-observe]').forEach(select => select.addEventListener('change', () => {
    const evidence = {};
    all('[data-observe]').forEach(input => { if (input.value !== '') evidence[input.dataset.observe] = +input.value; });
    paintGraph(evidence);
  }));
  window.addEventListener('resize', () => { stopAnimation(); layoutGraph(); }, { passive: true });
  reduced.addEventListener('change', stopAnimation);
  paintJoint(false); paintScale(3); paintProduct('101'); highlightFactor('wet'); paintGraph({}, 0, false);
  section.classList.add('pgm-ready');
})();
