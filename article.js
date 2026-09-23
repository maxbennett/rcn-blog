// Derive the outline from article headings so editing a title cannot leave stale navigation.
(function () {
  'use strict';
  const outline=document.querySelector('.contents-rail nav > ol');
  function item(heading,target,number){
    const li=document.createElement('li'),link=document.createElement('a');
    const label=document.createElement('span'),title=document.createElement('span');
    link.href='#'+target.id;label.className='contents-number';title.className='contents-title';
    label.textContent=number?number+' ':'';title.textContent=heading.textContent.trim();
    link.append(label,title);li.append(link);return li;
  }
  if(outline){
    let number=0;
    const items=[];
    document.querySelectorAll('article > section').forEach(section=>{
      const heading=section.querySelector(':scope > h2');
      if(!heading||!section.id)return;
      const appendix=section.id==='appendix',unnumbered=appendix||section.classList.contains('references');
      const main=item(heading,section,unnumbered?'':String(++number));
      const headings=section.querySelectorAll(appendix?':scope > section > h3':':scope > h3');
      if(headings.length){
        const sublist=document.createElement('ol');sublist.className='contents-subsections';
        headings.forEach((subheading,index)=>{
          const target=appendix&&subheading.parentElement.id?subheading.parentElement:subheading;
          if(!target.id)target.id=section.id+'-subsection-'+(index+1);
          sublist.append(item(subheading,target,(appendix?'A':number)+'.'+(index+1)));
        });
        main.append(sublist);
      }
      items.push(main);
    });
    outline.replaceChildren(...items);
  }
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
