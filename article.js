// Follow the article's section and subsection anchors in the contents rail.
(function () {
  'use strict';
  const entries=[...document.querySelectorAll('.contents-rail a')].map(link=>({link,target:document.getElementById(link.hash.slice(1))})).filter(entry=>entry.target);
  let scheduled=false;
  function update(){
    scheduled=false;
    const threshold=Math.min(180,window.innerHeight*.25);
    let active=entries[0];
    entries.forEach(entry=>{if(entry.target.getBoundingClientRect().top<=threshold)active=entry;});
    entries.forEach(entry=>{if(entry===active)entry.link.setAttribute('aria-current','location');else entry.link.removeAttribute('aria-current');});
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('load',schedule);
  document.fonts?.ready.then(schedule);
  schedule();
})();
