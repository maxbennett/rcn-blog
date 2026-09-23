/* Invented probabilities for the article's fever/cough teaching model. */
(function (root) {
  'use strict';
  const feverSigns = [
    ['Chills', .10, .60], ['Sweating', .15, .65], ['Headache', .15, .55]
  ];
  const coughSigns = [
    ['Insomnia', .15, .55], ['Nausea', .02, .15],
    ['Chest pain', .04, .18]
  ];
  const signs = [...feverSigns.map((row, i) => ({ id:`X${i + 1}`, label:row[0], parent:'F', yes:row.slice(1) })),
    ...coughSigns.map((row, i) => ({ id:`Y${i + 1}`, label:row[0], parent:'C', yes:row.slice(1) }))];
  const variables = [{ id:'D', label:'Disease' }, { id:'F', label:'Fever' }, { id:'C', label:'Cough' }, ...signs];
  const symptomIndex = id => id === 'F' ? 0 : id === 'C' ? 1 : Number(id.slice(1)) + (id.startsWith('X') ? 1 : 4);
  const symbol = id => id === 'D' ? 'D' : `S${'₀₁₂₃₄₅₆₇₈₉'[symptomIndex(id)]}`;
  const latex = id => id === 'D' ? 'D' : `S_{${symptomIndex(id)}}`;
  const factors = [
    { id:'fD', child:'D', parent:null, yes:[.10] },
    { id:'fF', child:'F', parent:'D', yes:[.10, .70] },
    { id:'fC', child:'C', parent:'D', yes:[.15, .80] },
    ...signs.map(sign => ({ id:`f${sign.id}`, child:sign.id, parent:sign.parent, yes:sign.yes }))
  ].map(factor => ({ ...factor, variables:factor.parent ? [factor.parent, factor.child] : [factor.child],
    label:`P(${symbol(factor.child)}${factor.parent ? ` | ${symbol(factor.parent)}` : ''})`,
    tex:`P(${latex(factor.child)}${factor.parent ? `\\mid ${latex(factor.parent)}` : ''})` }));
  const label = id => variables.find(variable => variable.id === id).label;
  function rows(id) {
    const factor = factors.find(item => item.id === id);
    if (!factor) throw new Error('Unknown factor');
    return factor.yes.map((yes, parent) => ({ parent:factor.parent ? parent : null, no:1 - yes, yes }));
  }
  function joint(assignment) {
    return factors.reduce((p, factor) => {
      const yes = factor.yes[factor.parent ? assignment[factor.parent] : 0];
      return p * (assignment[factor.child] ? yes : 1 - yes);
    }, 1);
  }
  const api = { variables, signs, factors, symbol, latex, label, rows, joint };
  root.RCNFactorExplorer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
