(function () {
  'use strict';
  const model = window.RCNFactorExplorer;
  const figure = document.getElementById('factor-explorer');
  if (!figure || !model) return;
  const map = figure.querySelector('.factor-map');
  const buttons = [...map.querySelectorAll('[data-factor]')];
  const panel = document.getElementById('factor-inspector');
  const content = document.getElementById('factor-inspector-content');
  const closeButton = document.getElementById('factor-inspector-close');
  document.body.appendChild(panel);
  let active = null, pinned = false, timer = 0, suppressFocus = false;
  function position() {
    if (!active || panel.hidden) return;
    const bounds = active.getBoundingClientRect();
    const width = panel.offsetWidth, height = panel.offsetHeight;
    let x = bounds.right + 14;
    if (x + width > window.innerWidth - 12) x = bounds.left - width - 14;
    x = Math.max(12, Math.min(x, window.innerWidth - width - 12));
    let y = Math.max(12, Math.min(bounds.top - 25, window.innerHeight - height - 12));
    if (window.innerWidth <= 600) { x = 12; y = Math.max(12, window.innerHeight - height - 12); }
    panel.style.left = `${x}px`; panel.style.top = `${y}px`;
  }
  function show(button) {
    clearTimeout(timer);
    active = button;
    const factor = model.factors.find(item => item.id === button.dataset.factor);
    const template = document.getElementById(`table-${factor.id}`);
    const fallback = window.RCNFactorTables && window.RCNFactorTables[factor.id];
    if (!template && !fallback) return;
    panel.style.setProperty('--factor-color', template ? template.style.getPropertyValue('--factor-color') : fallback.color);
    content.innerHTML = template ? template.innerHTML : fallback.html;
    panel.hidden = false;
    map.classList.add('has-selection');
    buttons.forEach(item => {
      item.classList.toggle('is-related', item === button);
      item.setAttribute('aria-expanded', String(item === button));
    });
    map.querySelectorAll('[data-variable]').forEach(node => node.classList.toggle('is-related', factor.variables.includes(node.dataset.variable)));
    map.querySelectorAll('[data-for]').forEach(edge => edge.classList.toggle('is-related', edge.dataset.for === factor.id));
    position();
  }
  function hide(restoreFocus = false) {
    clearTimeout(timer);
    const previous = active;
    active = null; pinned = false; panel.hidden = true;
    map.classList.remove('has-selection');
    map.querySelectorAll('.is-related').forEach(node => node.classList.remove('is-related'));
    buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (restoreFocus && previous) { suppressFocus = true; previous.focus({ preventScroll:true }); suppressFocus = false; }
  }
  function scheduleHide() { if (!pinned) { clearTimeout(timer); timer = setTimeout(() => hide(), 160); } }
  buttons.forEach(button => {
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch' && !pinned) show(button); });
    button.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch' && active === button) hide();
    });
    button.addEventListener('focus', () => { if (!suppressFocus) { pinned = false; show(button); } });
    button.addEventListener('blur', event => { if (!panel.contains(event.relatedTarget)) scheduleHide(); });
    button.addEventListener('click', () => {
      if (pinned && active === button) hide();
      else { pinned = true; show(button); }
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pinned = true; show(button); }
    });
  });
  panel.addEventListener('focusin', () => clearTimeout(timer));
  panel.addEventListener('focusout', event => { if (!panel.contains(event.relatedTarget)) scheduleHide(); });
  closeButton.addEventListener('click', () => hide(true));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); hide(true); } });
  document.addEventListener('pointerdown', event => {
    if (active && !panel.contains(event.target) && !event.target.closest('[data-factor]')) hide();
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', () => { if (pinned) position(); else hide(); }, { passive:true });
  figure.querySelector('.factor-map-scroll').addEventListener('scroll', () => { if (pinned) position(); else hide(); }, { passive:true });
})();
