/* Fictional eight-variable teaching model, not fitted clinical probabilities. */
(function (root) {
  'use strict';
  const clues = [
    { id: 'X1', label: 'Feeling hot', short: 'Hot', yes: [.15, .85] },
    { id: 'X2', label: 'Warm skin', short: 'Warm skin', yes: [.10, .90] },
    { id: 'X3', label: 'Shivering', short: 'Shivering', yes: [.10, .65] },
    { id: 'X4', label: 'Sweating', short: 'Sweating', yes: [.15, .60] },
    { id: 'X5', label: 'Rapid pulse', short: 'Fast pulse', yes: [.10, .70] }
  ];
  const names = ['D', 'F', 'T', ...clues.map(clue => clue.id)];
  const labels = { D: 'Disease', F: 'Fever', T: 'Positive test', ...Object.fromEntries(clues.map(clue => [clue.id, clue.label])) };
  function binaryFactor(id, child, parent, probabilities) {
    return { id, child, parent, probabilities,
      variables: parent ? [parent, child] : [child],
      value(a) { const p = probabilities[parent ? a[parent] : 0]; return a[child] ? p : 1 - p; }
    };
  }
  const factors = [binaryFactor('fD', 'D', null, [.10]), binaryFactor('fF', 'F', 'D', [.10, .80]),
    binaryFactor('fT', 'T', 'D', [.05, .90]), ...clues.map(clue => binaryFactor(`f${clue.id}`, clue.id, 'F', clue.yes))];
  const assignments = variables => Array.from({ length: 2 ** variables.length }, (_, mask) =>
    Object.fromEntries(variables.map((name, i) => [name, (mask >> (variables.length - i - 1)) & 1])));
  const joint = assignments(names).map((a, index) => ({ ...a, index,
    key: names.map(name => a[name]).join(''), probability: factors.reduce((p, factor) => p * factor.value(a), 1) }));
  const normalize = pair => { const total = pair[0] + pair[1]; return pair.map(value => value / total); };
  function validate(evidence) {
    for (const [name, value] of Object.entries(evidence)) if (!names.includes(name) || ![0, 1].includes(value)) throw new Error('Invalid binary evidence');
  }
  function enumerate(evidence = {}) {
    validate(evidence);
    const rows = joint.filter(row => Object.entries(evidence).every(([name, value]) => row[name] === value));
    const mass = rows.reduce((sum, row) => sum + row.probability, 0);
    return { rows, mass, beliefs: Object.fromEntries(names.map(name => [name, [0, 1].map(value =>
      rows.reduce((sum, row) => sum + (row[name] === value ? row.probability : 0), 0) / mass)])) };
  }
  function infer(query = 'D', evidence = {}) {
    validate(evidence);
    if (!names.includes(query)) throw new Error('Unknown query variable');
    const cache = new Map(), visitedVariables = new Set([query]), visitedFactors = new Set();
    const neighbors = name => factors.filter(factor => factor.variables.includes(name));
    const indicator = name => [0, 1].map(value => Number(evidence[name] === value));
    function variableToFactor(name, recipient) {
      visitedVariables.add(name);
      const key = `${name}>${recipient}`;
      if (!cache.has(key)) {
        // With a hard observation, all other incoming evidence is a common
        // multiplier at the one allowed value. Normalization cancels it.
        // This stops recursion into the five signs when fever is clamped.
        cache.set(key, name in evidence ? indicator(name) : normalize([0, 1].map(value =>
          neighbors(name).filter(factor => factor.id !== recipient).reduce((p, factor) => p * factorToVariable(factor, name)[value], 1))));
      }
      return cache.get(key);
    }
    function factorToVariable(factor, recipient) {
      visitedFactors.add(factor.id);
      const key = `${factor.id}>${recipient}`;
      if (!cache.has(key)) {
        const others = factor.variables.filter(name => name !== recipient);
        cache.set(key, normalize([0, 1].map(value => assignments(others).reduce((sum, a) =>
          sum + factor.value({ ...a, [recipient]: value }) * others.reduce((p, name) =>
            p * variableToFactor(name, factor.id)[a[name]], 1), 0))));
      }
      return cache.get(key);
    }
    const belief = query in evidence ? indicator(query) : normalize([0, 1].map(value =>
      neighbors(query).reduce((p, factor) => p * factorToVariable(factor, query)[value], 1)));
    return { belief, messages: Object.fromEntries(cache), visitedVariables: [...visitedVariables], visitedFactors: [...visitedFactors] };
  }
  const api = Object.freeze({ names, labels, clues, factors, joint, enumerate, infer });
  root.RCNDiagnosis = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
