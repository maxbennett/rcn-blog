/* Shared geometry for the static figure and its interactive states. */
(function (root) {
  'use strict';
  const colors = { D: '#032f56', F: '#548c87', T: '#987143', X: '#617e90' };
  const color = id => colors[id] || colors.X;
  const symbol = id => id[0] === 'X' ? `X${'₀₁₂₃₄₅'[Number(id[1])]}` : id;
  function layout(width = 642) {
    const nodes = { D: [width * .33, 90], fD: [width * .07, 90], fT: [width * .595, 90], T: [width * .86, 90], fF: [width * .33, 168], F: [width * .33, 246] };
    for (let i = 1; i <= 5; i++) { const x = width * (.07 + (i - 1) * .215); nodes[`fX${i}`] = [x, 345]; nodes[`X${i}`] = [x, 428]; }
    return nodes;
  }
  function render(width = 642, evidence = {}) {
    const model = root.RCNDiagnosis, points = layout(width), compact = width < 420;
    function edge(a, b) { const p = points[a], q = points[b]; return `<path d="M${p} L${q}" class="diagnosis-edge"/>`; }
    function variable(id, label) {
      const [x, y] = points[id], observed = id in evidence, radius = id[0] === 'X' ? (compact ? 18 : 23) : 25;
      const labelY = id === 'D' || id === 'T' ? -43 : 43;
      const labelX = id === 'F' ? -39 : 0;
      const actualY = id === 'F' ? -3 : labelY;
      const stateY = id === 'F' ? 18 : (id === 'D' || id === 'T' ? 47 : 63);
      return `<g id="diagnosis-node-${id}" class="diagnosis-variable${observed ? ' is-observed' : ''}" transform="translate(${x} ${y})" style="color:${color(id)}"><circle r="${radius}"/><text class="diagnosis-node-letter" dy=".34em">${symbol(id)}</text><text class="diagnosis-node-name" x="${labelX}" y="${actualY}"${id === 'F' ? ' style="text-anchor:end"' : ''}>${label}</text><text class="diagnosis-node-state" x="${labelX}" y="${stateY}"${id === 'F' ? ' style="text-anchor:end"' : ''}>${observed ? (evidence[id] ? 'Yes · observed' : 'No · observed') : 'Unknown'}</text></g>`;
    }
    function factor(id, label, side = false) {
      const [x, y] = points[id];
      return `<g class="diagnosis-factor" transform="translate(${x} ${y})" style="color:${color(id.slice(1))}"><rect x="-6" y="-6" width="12" height="12"/><text x="${side ? 17 : 0}" y="${side ? 5 : -20}"${side ? ' style="text-anchor:start"' : ''}>${label}</text></g>`;
    }
    return `<g>${edge('fD', 'D')}${edge('D', 'fT')}${edge('fT', 'T')}${edge('D', 'fF')}${edge('fF', 'F')}</g>` +
      `<g class="diagnosis-fever-branches${'F' in evidence ? ' is-pruned' : ''}">` + model.clues.map(clue =>
        edge('F', `f${clue.id}`) + edge(`f${clue.id}`, clue.id) + factor(`f${clue.id}`, `P(${symbol(clue.id)} | F)`) + variable(clue.id, compact ? ['Hot', 'Warm', 'Shivers', 'Sweats', 'Pulse'][Number(clue.id[1]) - 1] : clue.short)).join('') + '</g>' +
      factor('fD', 'P(D)') + factor('fT', 'P(T | D)') + factor('fF', 'P(F | D)', true) + variable('D', 'Disease') + variable('F', 'Fever') + variable('T', 'Positive test');
  }
  const api = { layout, render, color };
  root.RCNDiagnosisDiagram = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
