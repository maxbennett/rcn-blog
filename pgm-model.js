/* A small tree-structured probability model shared by the article figures. */
(function (root) {
  'use strict';
  const names = ['R', 'S', 'W'];
  const wet = [[.01, .90], [.90, .99]];
  const factors = [
    { id: 'rain', variables: ['R'], value: a => a.R ? .2 : .8 },
    { id: 'sprinkler', variables: ['S'], value: a => a.S ? .1 : .9 },
    { id: 'wet', variables: names, value: a => a.W ? wet[a.R][a.S] : 1 - wet[a.R][a.S] }
  ];
  const normalize = pair => { const total = pair[0] + pair[1]; return pair.map(x => x / total); };
  function assignments(variables) {
    return Array.from({ length: 2 ** variables.length }, (_, mask) =>
      Object.fromEntries(variables.map((name, i) => [name, (mask >> (variables.length - i - 1)) & 1])));
  }
  const joint = assignments(names).map(values => ({ ...values,
    key: names.map(name => values[name]).join(''),
    probability: factors.reduce((product, factor) => product * factor.value(values), 1)
  }));
  function validate(evidence) {
    for (const [name, value] of Object.entries(evidence)) {
      if (!names.includes(name) || ![0, 1].includes(value)) throw new Error('Evidence must assign R, S, or W to 0 or 1.');
    }
  }
  function condition(evidence = {}) {
    validate(evidence);
    const rows = joint.filter(row => Object.entries(evidence).every(([name, value]) => row[name] === value));
    const mass = rows.reduce((sum, row) => sum + row.probability, 0);
    const beliefs = Object.fromEntries(names.map(name => [name, [0, 1].map(value =>
      rows.reduce((sum, row) => sum + (row[name] === value ? row.probability : 0), 0) / mass)]));
    return { rows, mass, beliefs };
  }
  // Sum-product on the factor tree. A recipient is excluded from the return
  // message, so evidence never echoes straight back as additional support.
  function sumProduct(evidence = {}) {
    validate(evidence);
    const cache = new Map();
    const neighbors = name => factors.filter(factor => factor.variables.includes(name));
    function variableToFactor(name, recipient) {
      const key = `${name}>${recipient}`;
      if (!cache.has(key)) cache.set(key, normalize([0, 1].map(value => {
        if (name in evidence && evidence[name] !== value) return 0;
        return neighbors(name).filter(factor => factor.id !== recipient)
          .reduce((product, factor) => product * factorToVariable(factor, name)[value], 1);
      })));
      return cache.get(key);
    }
    function factorToVariable(factor, recipient) {
      const key = `${factor.id}>${recipient}`;
      if (!cache.has(key)) cache.set(key, normalize([0, 1].map(value => {
        const others = factor.variables.filter(name => name !== recipient);
        return assignments(others).reduce((sum, values) => {
          const assignment = { ...values, [recipient]: value };
          return sum + factor.value(assignment) * others.reduce((product, name) =>
            product * variableToFactor(name, factor.id)[values[name]], 1);
        }, 0);
      })));
      return cache.get(key);
    }
    const beliefs = Object.fromEntries(names.map(name => [name, normalize([0, 1].map(value => {
      if (name in evidence && evidence[name] !== value) return 0;
      return neighbors(name).reduce((product, factor) => product * factorToVariable(factor, name)[value], 1);
    }))]));
    factors.forEach(factor => factor.variables.forEach(name => {
      variableToFactor(name, factor.id); factorToVariable(factor, name);
    }));
    return { beliefs, messages: Object.fromEntries(cache) };
  }
  const api = Object.freeze({ names, factors, joint, condition, sumProduct });
  root.RCNWeather = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
