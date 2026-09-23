(function (global) {
 'use strict';
 const data=global.RCNForwardData, learned=global.RCNLearningData;
 const figure=document.getElementById('rcn-forward');
 if(!figure||!data||!learned)return;
 const $=id=>document.getElementById(id), svg=$('forward-canvas');
 let digit=0,handwriting=0,stage=0,candidate=null,landmark=0,flexibility=1,movement=1,animation=0;
 const cache=new Map();
 const current=()=>{
  const test=data.tests[digit*2+handwriting];
  if(flexibility===1)return test;
  const key=`${digit*2+handwriting}:${flexibility}`;
  if(!cache.has(key))cache.set(key,global.RCNForwardModel.evaluate(test,learned.exemplars,data.trees,flexibility));
  return cache.get(key);
 };
 const index=()=>candidate===null?current().ranking[0]:candidate;
 const colors=['#032f56','#0f67a2','#548c87','#987143'];
 const color=f=>colors[Math.floor(f/4)%4];
 const edge=([f,r,c],w=.8,l=2,ink=null)=>{
  const t=f*Math.PI/8+Math.PI/2,dx=Math.cos(t)*l/2,dy=Math.sin(t)*l/2;
  return `<path d="M${c-dx} ${r-dy}L${c+dx} ${r+dy}" stroke="${ink||color(f)}" stroke-width="${w}" stroke-linecap="round"/>`;
 };
 function graph(ex){
  return ex.laterals.map(([a,b])=>{const [,y,x]=ex.landmarks[a],[,v,u]=ex.landmarks[b];return `<path d="M${x} ${y}L${u} ${v}" stroke="#9cb7ac" stroke-width=".6"/>`;}).join('')+ex.landmarks.map(f=>edge(f,1,3)).join('');
 }
 const thumbnail=ex=>`<svg viewBox="30 30 140 140" aria-hidden="true">${graph(ex)}</svg>`;
 function math(tex){return global.katex?global.katex.renderToString(tex,{throwOnError:true}):tex;}
 function picker(){
  $('forward-picker').innerHTML=Array.from({length:10},(_,d)=>`<button type="button" data-forward-digit="${d}" aria-pressed="${d===digit}" aria-label="Use held-out digit ${d}, handwriting ${handwriting+1}"><img src="${data.tests[2*d+handwriting].image}" alt=""><span>${d}</span></button>`).join('');
  $('forward-handwriting').textContent=`Try another handwriting ↻`;
 }
 function draw(){
  const test=current(),k=index(),ex=learned.exemplars[k],match=test.matches[k];
  const position=i=>{const [,r,c]=ex.landmarks[i],[y,x]=match.positions[i];return [r+(y-r)*movement,c+(x-c)*movement];};
  let s='';
  if(stage===0)s=`<image href="${test.image}" x="0" y="0" width="200" height="200"/>`;
  else if(stage===1)s=test.edgelets.map(e=>edge(e,.8,2,'#032f56')).join('');
  else{
   s=`<image href="${test.image}" x="0" y="0" width="200" height="200" opacity=".1"/><g opacity=".75">${test.edgelets.map(e=>edge(e,.8,2,'#032f56')).join('')}</g>`;
   if(stage===3){
     s+=`<g class="forward-stored" opacity=".55">${graph(ex)}</g>`;
     s+=`<defs><marker id="forward-motion-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4" fill="none" stroke="#548c87" stroke-width=".7"/></marker></defs>`;
     s+=ex.landmarks.map(([,r,c],i)=>{const [y,x]=position(i);return Math.hypot(x-c,y-r)>1?`<path d="M${c} ${r}L${x} ${y}" stroke="#548c87" opacity=".5" stroke-width=".45" marker-end="url(#forward-motion-arrow)"/>`:'';}).join('');
    s+=data.trees[k].map(([a,b])=>{const [y,x]=position(a),[v,u]=position(b);return `<path d="M${x} ${y}L${u} ${v}" stroke="#548c87" stroke-width=".8" opacity=".8"/>`;}).join('');
   }
   s+=ex.landmarks.map(([f,r,c],i)=>{
    const [y,x]=stage===3?position(i):[r,c],missed=stage===3&&match.evidence[i]<0,ink=stage===3?(missed?'#b25b52':'#548c87'):'#849991';
    return `<g data-forward-landmark="${i}" data-forward-missed="${missed}" tabindex="0" role="button" aria-label="Inspect landmark ${i+1}${stage===3?(missed?': missed, minus one':': matched, plus one'):''}"><circle cx="${x}" cy="${y}" r="${missed?1.65:1.3}" fill="${ink}" stroke="white" stroke-width=".35"/>${edge([f,y,x],.75,3,ink)}<circle cx="${x}" cy="${y}" r="2.1" fill="transparent"/></g>`;
   }).join('');
   const [,r,c]=ex.landmarks[landmark], [y,x]=stage===3?position(landmark):[r,c];
   if(stage===2)s+=`<g pointer-events="none"><rect x="${c-12.5}" y="${r-12.5}" width="25" height="25" fill="#548c870b" stroke="#548c87" stroke-width=".55" stroke-dasharray="1.4 1.4"/><circle cx="${x}" cy="${y}" r="2.1" fill="none" stroke="#376e69" stroke-width=".7"/></g>`;
  }
  svg.innerHTML=s;
  svg.setAttribute('aria-label',`Stage ${stage+1}: test digit ${test.label}${stage>=2?`, inspecting exemplar ${ex.label}, example ${k%2+1}`:''}`);
  $('forward-image-legend').hidden=stage<2;
  $('forward-key').hidden=stage<2;
  $('forward-picture-label').textContent=['New image · held out from training','Observed edges · position + orientation',`Stored ${ex.label} · landmark pool locations`,`Exemplar ${ex.label} · ${movement<1?'moving to match':'matched to the new image'}`][stage];
 }

 function rankings(){
  const test=current(),scores=test.matches.map(m=>m.score),lo=Math.min(...scores),hi=Math.max(...scores);
  $('forward-ranking').innerHTML='<div class="forward-rank-heading"><span>Compare the leading exemplars</span><span>Forward score</span></div>'+test.ranking.slice(0,4).map((k,i)=>{
   const ex=learned.exemplars[k],score=scores[k],width=100*(score-lo)/(hi-lo||1);
   return `<button type="button" class="forward-rank" data-forward-candidate="${k}" aria-pressed="${index()===k}">${thumbnail(ex)}<span>${i===0?'✓ ':''}Digit ${ex.label}<small>Exemplar ${k%2+1}${i===0?' · highest score':''}</small><span class="forward-rank-meter"><i style="width:${width}%"></i></span></span><b>${score}</b></button>`;
  }).join('');
 }
 function narrative(stage,test,k){
  const ex=learned.exemplars[k],match=test.matches[k],best=learned.exemplars[test.ranking[0]],correct=best.label===test.label;
  const titles=['A new image arrives','Turn pixels into edge evidence','Each landmark can look nearby','The strongest forward explanation'];
  const bodies=[
   `This handwritten ${test.label} was held out from training. We will compare it with the same 20 stored exemplars—two ways of writing each digit. No learning happens during this pass.`,
   'An edge at a particular position and orientation sends evidence upward. A stored landmark can use nearby orientations too, so a small change in stroke direction need not destroy a match.',
   `Here are the learned landmark positions of a ${ex.label} exemplar in gray, overlaid on the new image’s edges in navy. Each landmark searches its pool for a local edge match. Those separate matches are not yet a coherent shape: the connections must also fit.`,
   correct?`A ${best.label} exemplar has the highest forward score. Its landmarks can find a compatible placement on the new image, even though this handwriting differs from the training example.`:`The forward pass selects a ${best.label} exemplar for this ${test.label}. This is a real mistake with our tiny exemplar bank and approximate inference. A high score is a candidate explanation, not a guarantee.`
  ];
  const points=[
   'Keep the learned exemplars fixed. Change only the observed image.',
   'The evidence describes local edges; it does not yet name the digit.',
   'Pooling provides flexibility. Lateral connections constrain that flexibility.',
   correct?'Recognition reuses a learned shape; it does not require identical pixels.':'A larger exemplar bank and more complete inference can help; this pass alone is not the final word.'
  ];
  let title=titles[stage],body=bodies[stage];
  if(stage===3&&k!==test.ranking[0]){
   title='Compare another explanation';
   body=`This is a digit ${ex.label} exemplar. Teal landmarks find supporting edges; red landmarks miss at their chosen positions. Its best tree-compatible fit scores ${match.score}, compared with ${test.matches[test.ranking[0]].score} for the leading exemplar.`;
  }
  return {title,body,point:points[stage]};
 }
 function render(){
  const test=current(),k=index(),ex=learned.exemplars[k],match=test.matches[k],best=learned.exemplars[test.ranking[0]],correct=best.label===test.label;
  figure.dataset.stage=String(stage);figure.dataset.test=String(digit*2+handwriting);
  const copy=narrative(stage,test,k);
  $('forward-step-title').textContent=copy.title;$('forward-step-body').textContent=copy.body;$('forward-point').textContent=copy.point;
  $('forward-reference').hidden=stage===3;
  $('forward-flexibility').hidden=stage!==3;
  $('forward-replay').hidden=stage!==3;
  $('forward-rho-value').textContent=`ρ × ${flexibility}`;
  $('forward-reference').innerHTML=thumbnail(ex)+`<span><strong>Stored ${ex.label} · exemplar ${k%2+1}</strong>${ex.landmarks.length} landmarks<br>One of 20 learned graphs</span>`;
  $('forward-math').hidden=stage<2;
  const hits=match.evidence.filter(v=>v>0).length,misses=match.evidence.length-hits;
  $('forward-math').innerHTML=stage===2?'':stage===3?`<div class="forward-score-counts"><span class="forward-hit-count">${hits} matched × (+1)</span><span class="forward-miss-count">${misses} missed × (−1)</span></div>`+math(String.raw`S_{\mathrm{forward}}=${hits}-${misses}=${match.score}`):'';
  $('forward-math').dataset.matches=String(hits);$('forward-math').dataset.misses=String(misses);
  $('forward-ranking').hidden=stage!==3;if(stage===3)rankings();
  $('forward-next').textContent=['Find the edges →','Look for landmarks →','Combine the evidence →','Restart ↻'][stage];
  $('forward-back').disabled=stage===0;$('forward-progress').textContent=`Step ${stage+1} of 4`;
  $('forward-step-dots').innerHTML=Array.from({length:4},(_,i)=>`<i class="${i===stage?'is-current':i<stage?'is-complete':''}"></i>`).join('');
  draw();scheduleSize();
 }
 // Match the text slots to the tallest step at the current responsive width.
 function sizeWalkthrough(){
  const copy=figure.querySelector('.forward-copy'),width=copy.getBoundingClientRect().width;
  if(!width)return;
  const probe=copy.cloneNode(false);
  Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',width:width+'px',display:'block',visibility:'hidden',pointerEvents:'none'});
  figure.appendChild(probe);
  const heights={title:0,body:0,point:0},test=current(),k=index();
  const variants=Array.from({length:4},(_,i)=>narrative(i,test,k));
  test.ranking.slice(0,4).forEach(candidate=>variants.push(narrative(3,test,candidate)));
  variants.forEach(item=>{
   probe.innerHTML=`<h5>${item.title}</h5><p>${item.body}</p><p class="forward-point">${item.point}</p>`;
   [...probe.children].forEach((el,i)=>{
    el.style.height='auto';el.style.minHeight='0';el.style.margin='0';
    const key=['title','body','point'][i];
    heights[key]=Math.max(heights[key],Math.ceil(el.getBoundingClientRect().height));
   });
  });
  probe.remove();
  Object.entries(heights).forEach(([key,value])=>figure.style.setProperty(`--forward-${key}-height`,`${value+2}px`));
 }
 let resizeFrame;
 function scheduleSize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(sizeWalkthrough);}
 new ResizeObserver(scheduleSize).observe(figure.querySelector('.forward-copy'));
 document.fonts.ready.then(scheduleSize);
 global.addEventListener('resize',scheduleSize);
 function stopAnimation(){if(animation&&global.cancelAnimationFrame)global.cancelAnimationFrame(animation);animation=0;}
 function animate(){
  stopAnimation();
  if(stage!==3||!global.requestAnimationFrame||global.matchMedia?.('(prefers-reduced-motion: reduce)').matches){movement=1;draw();return;}
  movement=0;draw();let start=null;
  const tick=time=>{if(start===null)start=time;const t=Math.min(1,(time-start)/1800);movement=t*t*(3-2*t);draw();if(t<1)animation=global.requestAnimationFrame(tick);else animation=0;};
  animation=global.requestAnimationFrame(tick);
 }
 function resetCandidate(){$('forward-image-menu').open=false;stopAnimation();candidate=null;landmark=0;movement=1;picker();render();animate();}
 $('forward-picker').addEventListener('click',event=>{const el=event.target.closest('[data-forward-digit]');if(!el)return;digit=Number(el.dataset.forwardDigit);resetCandidate();});
 $('forward-handwriting').addEventListener('click',()=>{handwriting=1-handwriting;resetCandidate();});
 $('forward-next').addEventListener('click',()=>{stage=(stage+1)%4;resetCandidate();});
 $('forward-back').addEventListener('click',()=>{stage=Math.max(0,stage-1);resetCandidate();});
 $('forward-ranking').addEventListener('click',event=>{const el=event.target.closest('[data-forward-candidate]');if(!el)return;stopAnimation();candidate=Number(el.dataset.forwardCandidate);landmark=0;movement=1;render();animate();});
 $('forward-replay').addEventListener('click',animate);
 $('forward-rho').addEventListener('input',event=>{stopAnimation();flexibility=Number(event.target.value);candidate=null;landmark=0;movement=1;render();});
 function inspect(event){const el=event.target.closest('[data-forward-landmark]');if(!el)return;const i=Number(el.dataset.forwardLandmark);if(i===landmark)return;landmark=i;draw();}
 svg.addEventListener('pointerover',inspect);svg.addEventListener('focusin',inspect);
 picker();render();
})(window);
