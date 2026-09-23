/* Fixed-position teaching model from toy_message_passing.ipynb, Parts 1–4.
   Positive evidence = +1; prior = -1 per active symbol; max-product BP.
   No inference library, training data, or network requests are required. */
(function (root) {
  'use strict';
  const names = ['T', '7', 'BAR'];
  const pixels = [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,1],[1,5],[2,1],[2,4]];
  const claims = [[0,2],[0,2],[0,2],[1,2],[1,2],[1,2],[0],[1],[0],[1]];
  const templates = names.map((_, h) => pixels.filter((_, k) => claims[k].includes(h)));

  function factorMessage(reports, recipient, evidence = 1) {
    const others = reports.filter((_, i) => i !== recipient);
    const positiveSum = others.reduce((sum, v) => sum + Math.max(0, v), 0);
    const bestOn = evidence + positiveSum;
    const bestOff = others.length === 0 ? 0 : Math.max(0, evidence +
      (others.some(v => v > 0) ? positiveSum : Math.max(...others)));
    return { bestOn, bestOff, target: bestOn - bestOff };
  }

  function score(active, prior = -1) {
    return claims.filter(parents => parents.some(h => active.includes(h))).length + prior * active.length;
  }

  function enumerate(prior = -1) {
    return Array.from({ length: 8 }, (_, mask) => {
      const active = names.map((_, h) => h).filter(h => mask & (1 << h));
      return { active, score: score(active, prior) };
    }).sort((a, b) => b.score - a.score);
  }

  function run({ damping = 0.5, prior = -1, steps = 32, initialForward = false } = {}) {
    // A forward initialization passes each +1 observation upward before competition.
    let messages = claims.map(parents => parents.map(() => initialForward ? 1 : 0));
    const frames = [];
    for (let iteration = 0; iteration <= steps; iteration++) {
      const beliefs = names.map((_, h) => prior + claims.reduce((sum, parents, k) => {
        const p = parents.indexOf(h);
        return sum + (p < 0 ? 0 : messages[k][p]);
      }, 0));
      const reports = claims.map((parents, k) => parents.map((h, i) => beliefs[h] - messages[k][i]));
      const calculations = reports.map(values => values.map((_, i) => factorMessage(values, i)));
      const targets = calculations.map(row => row.map(v => v.target));
      const residual = Math.max(...targets.flatMap((row, k) => row.map((v, i) => Math.abs(v - messages[k][i]))));
      frames.push({ iteration, beliefs, messages, reports, calculations, residual,
        active: beliefs.map((_, h) => h).filter(h => beliefs[h] > 0) });
      messages = targets.map((row, k) => row.map((v, i) => messages[k][i] + damping * (v - messages[k][i])));
    }
    return frames;
  }
  root.RCNToy = { names, pixels, claims, templates, factorMessage, score, enumerate, run };
})(globalThis);
