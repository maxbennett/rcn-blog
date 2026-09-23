(function () {
  'use strict';
  const figure = document.getElementById('neocortex-figure');
  if (!figure) return;
  const pin = figure.querySelector('.brain-story__pin');
  const canvas = figure.querySelector('.brain-story__canvas');
  const title = document.getElementById('brain-story-title');
  const description = document.getElementById('brain-stage-description');
  const stageLabel = document.getElementById('brain-stage-label');
  const note = document.getElementById('brain-stage-note');
  const controls = [...figure.querySelectorAll('[data-brain-step]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 640px)');
  const paired = document.getElementById('cortex-paired-svg');
  const circuitArt = document.getElementById('column-circuit-art');
  const layerLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'].map((_, i) => document.getElementById(`column-layer-${i + 1}`));
  const layerLeaders = layerLabels.map((_, i) => document.getElementById(`column-layer-leader-${i + 1}`));
  const flowLabels = [
    { name: 'from-cortex', point: [150, 312], side: -1, row: .20 },
    { name: 'from-thalamus', point: [165, 1190], side: -1, row: .86 },
    { name: 'to-cortex', point: [870, 365], side: 1, row: .22 },
    { name: 'to-thalamus-v5', point: [803, 1090], side: 1, row: .63 },
    { name: 'to-motor', point: [902, 1220], side: 1, row: .78 },
    { name: 'to-thalamus-v6', point: [724, 1420], side: 1, row: .92 }
  ].map(item => ({ ...item, label: document.getElementById(`column-flow-label-${item.name}`),
    leader: document.getElementById(`column-flow-leader-${item.name}`) }));
  const flowArrows = [
    { name: 'from-cortex', point: [210, 312], angle: 90 },
    { name: 'from-thalamus', point: [165, 950], angle: 0 },
    { name: 'to-cortex', point: [830, 365], angle: 90 },
    { name: 'to-thalamus-v5', point: [805, 1155], angle: 180 },
    { name: 'to-motor', point: [902, 1240], angle: 180 },
    { name: 'to-thalamus-v6', point: [724, 1420], angle: 180 },
    { name: 'iv-to-superficial', point: [348, 422], angle: 0, internal: true },
    { name: 'superficial-to-deep', point: [258, 690], angle: 180, internal: true }
  ].map(item => ({ ...item, node: document.getElementById(`column-flow-arrow-${item.name}`) }));
  const camera = figure.querySelector('.brain-camera');
  const callouts = figure.querySelector('.brain-callouts');
  const calloutLabels = callouts ? [...callouts.querySelectorAll('[data-brain-anchor]')] : [];
  const samples = [
    { name: 'language', source: [476.8, 477.8], extent: [30, 26], side: -1, fraction: .27 },
    { name: 'visual', source: [1288, 560], extent: [24, 24], side: 1, fraction: .73 }
  ].map(sample => {
    const get = suffix => document.getElementById(`${sample.name}-${suffix}`);
    return { ...sample, fragment: get('fragment'), patch: get('patch-pose'), opening: get('patch-opening'),
      cap: get('core-cap'), rim: get('core-rim'), spot: get('core-spot'), map: get('columns-map'), exposure: get('core-exposure'),
      body: get('core-body'), bodyClip: get('body-clip-shape'), texture: get('core-texture'),
      shading: get('core-shading'), label: get('pair-label'), art: get('column-art')
    };
  });
  const states = [
    {
      label: '01 / THE NEOCORTEX',
      title: 'One sheet of tissue. Many abilities.',
      description: 'The neocortex is the folded outer sheet of the brain. Its organization holds a clue to how it works.',
      note: 'Left hemisphere, viewed from the side. An illustrative anatomical render.'
    },
    {
      label: '02 / DIFFERENT REGIONS',
      title: 'Different regions. Different jobs.',
      description: 'Motor skills, touch, vision, language, hearing, spatial perception, planning. Different regions contribute to different abilities.',
      note: 'Selected functional associations, shown schematically. Some areas extend onto hidden surfaces.'
    },
    {
      label: '03 / TWO PATCHES OF CORTEX',
      title: 'Language and vision. Similar tissue.',
      description: 'As the regional colors recede, two pieces lift from language and visual areas. The samples enlarge to reveal the tissue beneath the surface.',
      note: 'Neurons appear as a fine texture at this scale. The paired samples illustrate shared features, with regional differences omitted.'
    },
    {
      label: '04 / CORTICAL COLUMNS',
      title: 'A shared organization across the cortex.',
      description: 'The surrounding tissue drops away, leaving a circular core from each patch. Now move closer: both columns reveal a similar layered organization.',
      note: 'Illustrative columns. Cell populations, layer thicknesses, and connections vary between regions.'
    },
    {
      label: '05 / THE MICROCIRCUIT',
      title: 'One column. A recurring circuit.',
      description: 'Neighboring columns connect laterally. Other inputs arrive from below, while distinct output cells send signals toward distant targets.',
      note: 'Selected pathways; projection targets and layer organization vary by cortical area. The detailed RCN mapping will come later.'
    }
  ];
  const samplingState = {
    ...states[2],
    title: 'Many microcircuits in each patch.',
    description: 'Small circles mark the many microcircuits within each patch. We follow one from each region to look more closely at its cells and layers.'
  };
  const targets = [0, .35, .69, .92, 1];
  let active = -1;
  let manualProgress = 0;
  let queued = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const ramp = (value, a, b) => smooth((value - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const number = value => Number(value.toFixed(6));

  const path = (points, close = false) => points.map((p, i) => `${i ? 'L' : 'M'}${number(p[0])} ${number(p[1])}`).join('') + (close ? 'Z' : '');
  const transform = (node, u, v, center, origin = [0, 0]) => {
    const e = center[0] - u[0] * origin[0] - v[0] * origin[1];
    const f = center[1] - u[1] * origin[0] - v[1] * origin[1];
    node.setAttribute('transform', `matrix(${[...u, ...v, e, f].map(number).join(' ')})`);
  };

  function placeSamples(p) {
    const area = canvas.getBoundingClientRect();
    const image = camera.getBoundingClientRect();
    const w = area.width, h = area.height;
    if (!w || !h) return;
    paired.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const imageScale = Math.min(image.width / 1536, image.height / 1024);
    const imageLeft = image.left - area.left + (image.width - 1536 * imageScale) / 2;
    const imageTop = image.top - area.top + (image.height - 1024 * imageScale) / 2;
    const lift = ramp(p, .45, .515);
    const rotate = ramp(p, .47, .515);
    // Rotation and the image handoff finish at brain scale. The complete artwork
    // then only translates and scales uniformly: no mesh, warping or rebuilt faces.
    const enlarge = ramp(p, .535, .645);
    const bore = ramp(p, .717, .738);
    const drop = ramp(p, .74, .82);
    const magnify = ramp(p, .832, .91);
    const merge = ramp(p, .932, .962);
    const patchSize = Math.min(h * .94, w * (narrow.matches ? .49 : .47));
    const columnHeight = Math.min(h * .79, w * (narrow.matches ? .93 : .45));
    // Visible silhouette in both registered 1024 × 1536 illustrations.
    const artTop = 87, artWidth = 352, artHeight = 1356;
    // Coordinates in the full, unmodified 1024-unit patch artwork. The ellipse
    // only marks a circular sample; it never crops or assembles the patch surface.
    const capSource = [512, 195], radiusX = 16, radiusY = 16 / 3, tissueDepth = 480;
    const angle = 8 * Math.PI / 180, ca = Math.cos(angle), sa = Math.sin(angle);
    const ex = [radiusX * ca, radiusX * sa], ey = [-radiusY * sa, radiusY * ca];
    const ring = (theta, radius = 1) => [
      capSource[0] + radius * (ex[0] * Math.cos(theta) + ey[0] * Math.sin(theta)),
      capSource[1] + radius * (ex[1] * Math.cos(theta) + ey[1] * Math.sin(theta))
    ];
    const rightAngle = Math.atan2(ey[0], ex[0]);
    const rx = Math.hypot(ex[0], ey[0]), ry = Math.hypot(ex[1], ey[1]);
    samples.forEach(sample => {
      const [sx, sy] = sample.source, [sw, sh] = sample.extent;
      const origin = [imageLeft + sx * imageScale, imageTop + sy * imageScale];
      const fraction = narrow.matches ? (sample.side < 0 ? .25 : .75) : sample.fraction;
      const lifted = [origin[0] + sample.side * 20 * lift, origin[1] - h * .12 * lift];
      const destination = [w * fraction, h * .44 + (capSource[1] / 1024 - .5) * patchSize];
      const baseCap = [lerp(lifted[0], destination[0], enlarge), lerp(lifted[1], destination[1], enlarge)];
      // The small original crop is the only element that turns. It disappears
      // before any enlargement, with the whole generated specimen in its place.
      transform(sample.fragment,
        [imageScale * lerp(1, .76, rotate), imageScale * .10 * rotate],
        [-imageScale * sw / sh * .24 * rotate, imageScale * lerp(1, .29, rotate)],
        lifted, sample.source);
      const size = lerp(sw * imageScale / .90, patchSize, enlarge);
      const patchScale = size / 1024;
      const droppedCap = [baseCap[0], baseCap[1] + h * 1.20 * drop];
      transform(sample.patch, [patchScale, 0], [0, patchScale], droppedCap, capSource);
      transform(sample.map, [patchScale, 0], [0, patchScale], droppedCap, capSource);
      let opening = 'M0 0H1024V1024H0Z';
      if (bore > 0) opening += path(Array.from({ length: 65 }, (_, i) => ring(i * Math.PI * 2 / 64, bore)), true);
      sample.opening.setAttribute('d', opening);

      // The core is revealed above the rear tissue and behind the front lip.
      // It stays still through the drop, and magnifies only after the patch clears.
      // The core spans the blue neuronal tissue in the patch. Broaden the tiny
      // sample gradually in the close-up so its cells remain readable.
      const detailScale = columnHeight * artWidth / artHeight / (2 * rx);
      const coreScale = lerp(patchScale, detailScale, magnify);
      const depth = lerp(tissueDepth * patchScale, columnHeight - 2 * ry * detailScale, magnify);
      const columnX = w * (narrow.matches ? fraction : (sample.side < 0 ? .28 : .72));
      // Once stage 4 is reached, both dimensions and vertical position are locked.
      // The two identical specimens only translate horizontally into one another.
      const capCenter = [lerp(lerp(baseCap[0], columnX, magnify), w / 2, merge),
        lerp(baseCap[1], h * .46 - depth / 2, magnify)];
      const project = (q, center = capCenter, scale = coreScale) => [center[0] + (q[0] - capSource[0]) * scale, center[1] + (q[1] - capSource[1]) * scale];
      const frontArc = Array.from({ length: 33 }, (_, i) => ring(rightAngle + Math.PI * (1 - i / 32)));
      const bodyArc = frontArc.map(q => project(q));
      const bodyOutline = path([...bodyArc, ...bodyArc.slice().reverse().map(q => [q[0], q[1] + depth])], true);
      [sample.body, sample.bodyClip, sample.shading].forEach(node => node.setAttribute('d', bodyOutline));
      const artU = [rx * coreScale * 2 / artWidth, 0];
      const artV = [0, (depth + ry * coreScale * 2) / artHeight];
      const artOrigin = [512, artTop];
      const artPosition = [capCenter[0], capCenter[1] - ry * coreScale];
      // The extracted texture and the complete illustration use the same pixels
      // and transform. The complete top/bottom replace the sampling cap during zoom.
      [sample.texture, sample.art].forEach(node => transform(node, artU, artV, artPosition, artOrigin));
      if (sample.name === 'language') {
        transform(circuitArt, artU, artV, artPosition, artOrigin);
        // Place numerals beside the actual cell strata, away from incoming arbors.
        [150, 235, 435, 645, 1045, 1145].forEach((sourceY, i) => {
          const labelY = artPosition[1] + (sourceY - artTop) * artV[1];
          const edgeX = capCenter[0] - rx * coreScale;
          const labelX = edgeX - 5;
          layerLabels[i].setAttribute('x', number(labelX));
          layerLabels[i].setAttribute('y', number(labelY));
          layerLeaders[i].setAttribute('d', `M${number(labelX + 2)} ${number(labelY)}H${number(edgeX - 1)}`);
        });
        const artworkPoint = ([x, y]) => [artPosition[0] + (x - 512) * artU[0], artPosition[1] + (y - artTop) * artV[1]];
        flowArrows.forEach(arrow => {
          const [x, y] = artworkPoint(arrow.point);
          arrow.node.setAttribute('transform', `translate(${number(x)} ${number(y)}) rotate(${arrow.angle}) scale(${arrow.internal ? .75 : 1})`);
        });
        flowLabels.forEach(item => {
          const [x, y] = artworkPoint(item.point);
          const fraction = narrow.matches ? (item.side > 0 && item.row > .5 ? .20 : .26) : .31;
          const labelX = w * (item.side < 0 ? fraction : 1 - fraction);
          const labelY = h * item.row;
          item.label.setAttribute('transform', `translate(${number(labelX)} ${number(labelY)})`);
          const fromX = labelX - item.side * (narrow.matches ? 6 : 12);
          const elbowX = lerp(fromX, x, .55);
          item.leader.setAttribute('d', path([[fromX, labelY + 3], [elbowX, labelY + 3], [x, y]]));
        });
      }
      transform(sample.cap, [coreScale, 0], [0, coreScale], capCenter, capSource);
      const rimPath = path(Array.from({ length: 65 }, (_, i) => project(ring(i * Math.PI * 2 / 64))), true);
      sample.rim.setAttribute('d', rimPath);
      sample.spot.setAttribute('d', rimPath);
      let visibleCore = 'M0 0Z';
      if (drop > 0) {
        const lip = frontArc.map(q => project(q, droppedCap, patchScale));
        visibleCore = path([[lip[0][0], -h * 2], [lip.at(-1)[0], -h * 2], ...lip.slice().reverse()], true);
      }
      if (p >= .82) visibleCore = `M${-w} ${-h}h${w * 3}v${h * 3}h${-w * 3}Z`;
      sample.exposure.setAttribute('d', visibleCore);
      const labelX = lerp(destination[0], columnX, magnify);
      sample.label.setAttribute('transform', `translate(${number(labelX)} ${number(h - 31)})`);
    });
  }

  function placeCallouts() {
    if (!callouts) return;
    const area = callouts.getBoundingClientRect();
    const image = camera.getBoundingClientRect();
    if (!area.width || !area.height) return;
    // Both brain images use object-fit: contain and identical source dimensions.
    // Account for letterboxing and the scroll-driven camera transform.
    const scale = Math.min(image.width / 1536, image.height / 1024);
    const imageLeft = image.left - area.left + (image.width - 1536 * scale) / 2;
    const imageTop = image.top - area.top + (image.height - 1024 * scale) / 2;
    const lines = callouts.querySelector('svg');
    lines.setAttribute('viewBox', `0 0 ${area.width} ${area.height}`);
    const imagePoint = coordinates => {
      const [x, y] = coordinates.split(',').map(Number);
      return [imageLeft + x * scale, imageTop + y * scale];
    };
    calloutLabels.forEach(label => {
      const points = label.dataset.brainAnchor.split(';').map(imagePoint);
      const junction = label.dataset.brainJunction ? imagePoint(label.dataset.brainJunction) : null;
      const bounds = label.getBoundingClientRect();
      const left = bounds.left - area.left;
      const top = bounds.top - area.top;
      const side = label.dataset.attach;
      let end, elbow;
      if (side === 'bottom' || side === 'top') {
        end = [left + bounds.width / 2, side === 'bottom' ? top + bounds.height + 5 : top - 5];
        elbow = [end[0], end[1] + (side === 'bottom' ? 18 : -18)];
      } else {
        end = [side === 'right' ? left + bounds.width + 5 : left - 5, top + bounds.height / 2];
        elbow = [end[0] + (side === 'right' ? 20 : -20), end[1]];
      }
      const group = lines.querySelector(`[data-callout="${label.dataset.callout}"]`);
      const paths = group.querySelectorAll('polyline');
      const dots = group.querySelectorAll('circle');
      points.forEach((point, index) => {
        const route = junction ? [point, junction, elbow, end] : [point, elbow, end];
        paths[index].setAttribute('points', route.map(pair => pair.join(',')).join(' '));
        dots[index].setAttribute('cx', String(point[0]));
        dots[index].setAttribute('cy', String(point[1]));
      });
    });
  }

  function paint(progress) {
    const p = clamp(progress);
    const regionOpacity = ramp(p, .1, .24) * (1 - ramp(p, .37, .405));
    const props = {
      '--region-opacity': regionOpacity,
      '--region-color-opacity': ramp(p, .1, .24) * (1 - ramp(p, .375, .425)),
      '--brain-opacity': 1 - ramp(p, .58, .665),
      '--brain-scale': 1,
      '--brain-shift': '0%',
      '--sites-opacity': ramp(p, .43, .45),
      '--hole-opacity': ramp(p, .452, .51),
      '--specimens-opacity': p < .445 ? 0 : 1,
      '--fragment-opacity': 1 - ramp(p, .48, .525),
      '--patch-raster-opacity': ramp(p, .48, .525),
      '--core-cap-opacity': ramp(p, .645, .67) * (1 - ramp(p, .846, .897)),
      '--column-sites-opacity': ramp(p, .645, .675),
      '--selection-spot-opacity': ramp(p, .705, .717) * (1 - ramp(p, .74, .76)),
      '--core-ring-width': lerp(.65, 1.3, ramp(p, .705, .717)),
      '--core-rim-opacity': ramp(p, .645, .675),
      '--core-view-opacity': 1 - ramp(p, .846, .897),
      '--column-art-opacity': ramp(p, .846, .897),
      '--companion-opacity': 1 - ramp(p, .956, .966),
      '--pair-label-opacity': ramp(p, .60, .645) * (1 - ramp(p, .72, .74)) + ramp(p, .832, .88) * (1 - ramp(p, .935, .96)),
      '--layer-label-opacity': ramp(p, .953, .976),
      '--column-circuit-opacity': ramp(p, .970, .998),
      '--flow-annotation-opacity': ramp(p, .982, 1),
      '--progress': `${p * 100}%`
    };
    for (const [property, value] of Object.entries(props)) figure.style.setProperty(property, String(value));
    const next = p < .15 ? 0 : p < .44 ? 1 : p < .74 ? 2 : p < .95 ? 3 : 4;
    const stateKey = next === 2 && p >= .65 ? 'sampling' : next;
    if (stateKey !== active) {
      active = stateKey;
      const state = stateKey === 'sampling' ? samplingState : states[next];
      title.textContent = state.title;
      description.textContent = state.description;
      stageLabel.textContent = state.label;
      note.textContent = state.note;
      controls.forEach((button, index) => button.setAttribute('aria-pressed', String(index === next)));
    }
    // Measure after caption/legend changes so reduced-motion button jumps also lay out correctly.
    if (regionOpacity > 0) placeCallouts();
    placeSamples(p);
  }

  function update() {
    queued = false;
    const bounds = figure.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const distance = Math.max(1, figure.offsetHeight - pin.offsetHeight);
    paint(reduced.matches ? manualProgress : (top - bounds.top) / distance);
    document.body.classList.toggle('brain-story-in-view',
      bounds.top < window.innerHeight * .55 && bounds.bottom > window.innerHeight * .4);
  }
  function schedule() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }
  function configure() {
    figure.classList.toggle('is-scrollable', !reduced.matches);
    document.getElementById('brain-scroll-hint').textContent = reduced.matches ? 'Choose a view above' : 'Scroll to explore';
    schedule();
  }
  controls.forEach(button => button.addEventListener('click', () => {
    const target = targets[Number(button.dataset.brainStep)];
    if (reduced.matches) { manualProgress = target; paint(target); return; }
    const bounds = figure.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const distance = Math.max(1, figure.offsetHeight - pin.offsetHeight);
    window.scrollTo({ top: window.scrollY + bounds.top - top + distance * target, behavior: 'smooth' });
  }));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  reduced.addEventListener('change', configure);
  narrow.addEventListener('change', configure);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(pin);
  figure.classList.add('is-ready');
  configure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
