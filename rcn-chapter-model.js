/* Deliberately small, transparent digit model: three templates, three translations,
   independent binary noise. Used only for the article's forward-pass illustration. */
(function (root) {
  'use strict';
  const glyphs = {
    '2': ['01110','10001','00001','00010','00100','01000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '7': ['11111','00001','00010','00010','00100','00100','01000']
  };
  const names = Object.keys(glyphs), shifts = [-1, 0, 1];
  function template(name, shift = 0) {
    if (!glyphs[name] || !shifts.includes(shift)) throw new Error('Unknown template or shift');
    return Array.from({length:49}, (_, i) => {
      const x = i % 7 - 1 - shift, y = Math.floor(i / 7);
      return x >= 0 && x < 5 ? Number(glyphs[name][y][x]) : 0;
    });
  }
  function observe(name, flips = 4, seed = 29) {
    if (!Number.isInteger(flips) || flips < 0 || flips > 49) throw new Error('Invalid flip count');
    const image = template(name), order = Array.from({length:49}, (_, i) => i);
    let state = seed >>> 0;
    for (let i = order.length - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = Math.floor(state / 4294967296 * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.slice(0, flips).forEach(i => { image[i] = 1 - image[i]; });
    return image;
  }
  function evaluate(image) {
    if (image.length !== 49 || image.some(x => x !== 0 && x !== 1)) throw new Error('Expected 49 binary observations');
    return names.map(name => {
      const candidates = shifts.map(shift => {
        const cells = template(name, shift);
        const mismatches = cells.reduce((n, x, i) => n + Number(x !== image[i]), 0);
        return {shift, cells, mismatches, score:mismatches ? -mismatches : 0};
      });
      const best = candidates.reduce((a, b) => b.score > a.score || (b.score === a.score && b.shift === 0) ? b : a);
      return {name, candidates, ...best};
    });
  }
  root.RCNDigits = {names, shifts, glyphs, template, observe, evaluate};
})(globalThis);
