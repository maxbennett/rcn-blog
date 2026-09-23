/* Spatial explaining-away figure. Position search, OR messages and scores are
   computed by RCNSceneModel; geometry and animation do not change the evidence. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),figure=$('rcn-scene-figure'),model=root.RCNSceneModel;
 if(!figure||!model)return;
 const graph=$('rcn-scene-graph'),slider=$('rcn-scene-scrub'),tooltip=$('rcn-scene-tooltip'),forwardButton=$('rcn-scene-forward');
 const dampingControl=$('rcn-scene-damping'),nextStepButton=$('rcn-scene-next-step'),previousStepButton=$('rcn-scene-previous-step');
 let damping=.5,trace=model.runFactorRounds({keep:damping,rounds:20});
 // Below 0.001 score change is settled to the displayed two-decimal precision.
 const N=20,STEPS=N,colors=['#548c87','#0f67a2','#b76356'],names=['T','7','Bar'],symbols=['T','H_7','B'],xs=[195,430,665];
 // Pixel thumbnails follow the same oriented template segments as the model.
 const exemplarPixels=model.templates.map((edges,h)=>{
  const pixels=new Set();
  edges.forEach(e=>{for(let t=-1;t<=1.001;t+=.025){
   const c=Math.round(4+(e.c+e.dc*t+.5)*3),r=Math.round(3+(e.r+e.dr*t+.5)*3);
   pixels.add(`${c}:${r}`);
  }});
  const points=[...pixels].map(key=>key.split(':').map(Number)),xx=points.map(p=>p[0]),yy=points.map(p=>p[1]);
  const left=Math.min(...xx),top=Math.min(...yy),width=Math.max(...xx)-left+1.7,height=Math.max(...yy)-top+1.7,size=Math.max(width,height)+6;
  return {viewBox:`${left+(width-size)/2} ${top+(height-size)/2} ${size} ${size}`,pixels:points.map(([x,y])=>`<rect x="${x}" y="${y}" width="1.7" height="1.7" fill="${colors[h]}"/>`).join('')};
 });
 const neutral=model.claims.map(hs=>hs.map(()=>0));
 $('rcn-scene-inspector-slot').appendChild(tooltip);
 let forwardProgress=0,backwardPosition=0,current,hovered=null,animation=0,lastTime=0,running=null;
 const pct=p=>p<.005?'＜1%':Math.round(p*100)+'%',dec=p=>String(Number(p.toFixed(3))),signed=x=>(x>=0?'+':'−')+Math.abs(x).toFixed(2);
 const xy=p=>p.map(v=>v.toFixed(2)).join(' '),smooth=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
 const ground=(r,c,z=0)=>[174+c*64+r*30,566+r*33-c*9-z];
 const imagePoint=(r,c,z=0)=>{const p=ground(r,c,z);return [p[0],p[1]+56];};
 const upper=(h,r,c)=>[xs[h]+23*(c-2.5)+9*(r-1),312+18*(r-1)-5*(c-2.5)];
 const path=(ps,color,width=1,opacity=1,extra='')=>`<path d="M${ps.map(xy).join('L')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
 const edge=(e,project,color,width=2.5,opacity=1)=>path([project(e.r-e.dr,e.c-e.dc),project(e.r+e.dr,e.c+e.dc)],color,width,opacity);
 const plane=(project,fill,stroke)=>`<path d="M${[project(-.7,-.7),project(-.7,5.7),project(2.7,5.7),project(2.7,-.7)].map(xy).join('L')}Z" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>`;
 function state(f=forwardProgress,b=backwardPosition){
  const fit=smooth(clamp((f-.72)/.28)),delivery=clamp(f/.72),step=Math.min(STEPS,Math.max(0,Math.floor(b)));
  if(f<1)return {phase:f===0?'image':f<.72?'evidence':'reveal',stage:'or',fit,delivery,step:0,index:0,scoreIndex:0,frame:trace[0],messages:neutral,scores:null,relative:null};
  const index=step,frame=trace[index],scoreIndex=frame.sourceRound;
  return {phase:step===0?'forward':step===STEPS?(frame.residual<1e-3?'settled':'limited'):'backward',stage:'all',fit:1,delivery:1,step,index,scoreIndex,contextIndex:scoreIndex,
   contextStep:step,frame,messages:frame.messages,contexts:frame.contexts,scores:frame.scores,relative:frame.relative};
 }
 function phaseCopy(s){
  return ['Messages move together','OR factors send edge evidence upward while AND factors combine landmark evidence and return context. The line scores show messages arriving next round. Hover a node to inspect the messages it has already received.'];
 }
 const routes=model.claims.flatMap((hs,k)=>hs.map(h=>({h,k})));
 function deliveryFor(s,h,k){
  const i=routes.findIndex(route=>route.h===h&&route.k===k);
  return clamp(s.delivery*routes.length-i);
 }
 const receivedAt=(h,t)=>t;
 const landmark=(h,k)=>`L_{${symbols[h]},${k+1}}`;
 const symbol=(k,h,t)=>`m^{(${t})}_{\\phi_{${k+1}}\\to ${landmark(h,k)}}`;
 // Every outgoing factor reply reads the same round of received messages.
 function pending(s,h,k){
  const next=s.scores&&s.index<N?trace[s.index+1]:null,change=next?.changes.find(c=>c.h===h&&c.k===k);
  return {active:!!change,change,step:next?s.index+1:null,value:change?change.sent:s.messages[k][model.claims[k].indexOf(h)]};
 }
 const edgeScore=value=>(value>=0?'+':'−')+Math.abs(value).toFixed(2);
 const messageSupport=v=>1/(1+Math.exp(-v));
 const credit=v=>Math.abs(v)<.005?(v===0?'0':'≈0'):(v>0?'+':'−')+String(Number(Math.abs(v).toFixed(2)));
 function nodeInbox(s,h,k=null){
  if(!s.scores)return [];
  if(k===null)return [{kind:'and',label:'AND factor',step:s.contextStep??0,value:s.scores[h]-model.prior},{kind:'prior',label:'Object-cost factor',step:0,value:model.prior}];
  return [{kind:'or',label:'OR '+(k+1),step:s.index,value:s.messages[k][model.claims[k].indexOf(h)]},{kind:'and',label:'AND factor',step:s.contextStep,value:s.contexts[k][model.claims[k].indexOf(h)]}];
 }
 let messageLabelPositions;
 function lineLabels(s){
  if(!messageLabelPositions){
   const choices=routes.map(({h,k})=>{
    const e=model.edges[k],a=ground(e.r,e.c,22),b=nodeFor(s,h,k),base=[.66,.63,.36][h];
    return Array.from({length:71},(_,i)=>.15+i*.01).sort((a,b)=>Math.abs(a-base)-Math.abs(b-base)).map(t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]).filter(p=>model.edges.every(e=>{const q=ground(e.r,e.c,22);return Math.abs(p[0]-q[0])>31||Math.abs(p[1]-q[1])>27;}));
   });
   const positions=Array(routes.length).fill(null),apart=(p,q)=>Math.abs(p[0]-q[0])>43||Math.abs(p[1]-q[1])>33;
   function place(remaining){
    if(!remaining.length)return true;
    const options=remaining.map(i=>({i,points:choices[i].filter(p=>positions.every(q=>!q||apart(p,q)))})).sort((a,b)=>a.points.length-b.points.length),next=options[0];
    for(const p of next.points){positions[next.i]=p;if(place(remaining.filter(i=>i!==next.i)))return true;}
    positions[next.i]=null;return false;
   }
   place(routes.map((_,i)=>i));messageLabelPositions=positions;
  }
  return routes.map(({h,k},i)=>{
   const p=messageLabelPositions[i];
   const event=messageEvent(s,h,k),value=event?event.change.sent:s.messages[k][model.claims[k].indexOf(h)],step=event?event.arrival:s.index;
   return `<g data-rb-message-chip="${h}:${k}" data-rb-chip-value="${value}" data-rb-chip-step="${step}" tabindex="0" role="button" aria-label="OR ${k+1} to ${names[h]} landmark ${k+1}: ${credit(value)} score, ${event?.future?'arrives':'received'} in round ${step}"><rect x="${p[0]-20}" y="${p[1]-10}" width="40" height="20" rx="5" fill="white" stroke="${colors[h]}" stroke-opacity=".45"/><text class="rb-line-credit" x="${p[0]}" y="${p[1]+4}" style="fill:${colors[h]}">${credit(value)}</text></g>`;
  }).join('');
 }
 function messageEvent(s,h,k){
  if(!s.scores)return null;
  const future=s.index<N,frame=future?trace[s.index+1]:s.frame,change=frame.changes.find(c=>c.h===h&&c.k===k);
  return change?{change,future,sourceIndex:frame.sourceRound,contextStep:frame.sourceRound,arrival:frame.round}:null;
 }
 function andEvent(s,h,k=null){
  const future=s.index<N,arrival=future?s.index+1:s.index,sourceIndex=future?s.index:trace[s.index].sourceRound,m=trace[sourceIndex].messages;
  const inputs=model.support(m,h,k).inputs,value=inputs.reduce((sum,x)=>sum+x.value,0)+(k===null?0:model.prior);
  return {future,arrival,sourceIndex,inputs,value};
 }
 const andPoint=h=>[xs[h],145],exemplarPoint=h=>[xs[h],88];
 function andRoute(s,h,k){
  const ks=model.incident(h),i=ks.indexOf(k),lane=xs[h]+(i-(ks.length-1)/2)*36;
  return [andPoint(h),[lane,195],[lane,245],nodeFor(s,h,k)];
 }
 function andLabels(s){
  const chip=(h,k,p)=>{const e=andEvent(s,h,k),attr=k===null?`data-rb-and-output="${h}"`:`data-rb-and-message="${h}:${k}"`;
   return `<g ${attr} data-rb-and-chip data-rb-chip-value="${e.value}" tabindex="0" role="button" aria-label="AND to ${names[h]} ${k===null?'exemplar':'landmark '+(k+1)}: ${credit(e.value)}, round ${e.arrival}"><rect x="${p[0]-17}" y="${p[1]-10}" width="34" height="20" rx="5" fill="white" stroke="${colors[h]}" stroke-opacity=".45"/><text class="rb-line-credit" x="${p[0]}" y="${p[1]+4}" style="fill:${colors[h]}">${credit(e.value)}</text></g>`;};
  return names.map((_,h)=>chip(h,null,[xs[h],115])+model.incident(h).map(k=>{const route=andRoute(s,h,k);return chip(h,k,[route[1][0],220]);}).join('')).join('');
 }
 function wire(s,h,k){
  const value=pending(s,h,k).value,hs=model.claims[k];
  const context=model.relative(hs.map(i=>model.support(s.messages,i,k).score));
  return {value,width:.4+3.3*clamp(value/model.evidence),opacity:s.scores ? .18+.77*context[hs.indexOf(h)] : .06};
 }
 function owner(s,k){
  const hs=model.claims[k];return hs.reduce((best,h)=>(s.contexts?.[k][hs.indexOf(h)]??0)>(s.contexts?.[k][hs.indexOf(best)]??0)?h:best,hs[0]);
 }
 const nodeFor=(s,h,k)=>{const i=model.fits[h].matches.indexOf(k),e=model.templates[h][i];return upper(h,e.r,e.c+model.fits[h].shift*s.fit);};
 function hide(){figure.classList?.remove('has-inspector');graph.classList?.remove('is-inspecting');graph.classList?.remove('is-reading-message');const overlay=graph.querySelector?.('#rb-hover-routes');if(overlay)overlay.innerHTML='';if(hovered)hovered.removeAttribute('aria-describedby');hovered=null;tooltip.hidden=true;graph.querySelectorAll('[data-rb-pool],[data-rb-hyp]').forEach(el=>el.classList.remove('is-message-source','is-message-inactive'));graph.querySelectorAll('[data-rb-wire]').forEach(el=>el.classList.remove('is-muted','is-emphasized'));}
 function draw(){
  hide();const s=current=state();figure.dataset.phase=s.phase;figure.dataset.messageStage=s.stage;
  let out='<defs>'+colors.map((c,h)=>`<marker id="rb-arrow-${h}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L8 4.5L1 8" fill="none" stroke="${c}" stroke-width="1.5"/></marker>`).join('')+'</defs>';
  out+='<defs><marker id="rb-context-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L8 5L1 9" fill="none" stroke="#0f67a2" stroke-width="1.8"/></marker></defs>';
  out+='<text x="380" y="-66" text-anchor="middle" class="rb-label">Three learned exemplars</text>';
  // The input is a fixed set of oriented edge features, not binary dot pixels.
  out+=plane((r,c)=>imagePoint(r,c),'#f5f8f5','#c9d9cf');
  for(let r=0;r<3;r++)for(let c=0;c<6;c++)out+=`<path d="M${[imagePoint(r-.46,c-.46),imagePoint(r-.46,c+.46),imagePoint(r+.46,c+.46),imagePoint(r+.46,c-.46)].map(xy).join('L')}Z" fill="#eaf0eaaa" stroke="white" stroke-width="1"/>`;
  out+=path([imagePoint(0,-.5),imagePoint(0,5.5)],'#9eb1b7',1.5,.65)+path([imagePoint(0,1),imagePoint(2.5,1)],'#9eb1b7',1.5,.65)+path([imagePoint(0,5.25),imagePoint(2.5,4)],'#9eb1b7',1.5,.65);
  model.edges.forEach(e=>{out+=edge({...e,dr:e.dr*.85,dc:e.dc*.85},(r,c)=>imagePoint(r,c),'#032f56',3.5);});
  // OR factors are slightly elevated directly over their oriented evidence.
  model.edges.forEach(e=>out+=path([imagePoint(e.r,e.c,2),ground(e.r,e.c,22)],'#91a9a4',1,.7));
  names.forEach((_,h)=>model.incident(h).forEach(k=>{
   const e=model.edges[k],a=ground(e.r,e.c,22),b=nodeFor(s,h,k),w=wire(s,h,k);
   const arrival=deliveryFor(s,h,k),active=s.phase==='evidence'&&arrival>0&&arrival<1;
   if(s.scores)w.opacity=.65;
   if(!s.scores&&s.phase!=='image'){w.opacity=active?.85:arrival>=1?.2:.05;w.width=active?2.6:1;}
   out+=`<g class="rb-wire" data-rb-wire="${h}:${k}" data-rb-owner="${h}" data-rb-cell="${k}" style="--wire-opacity:${w.opacity}">${path([a,b],colors[h],w.width,1)}<path data-rb-message="${h}:${k}" tabindex="0" role="button" aria-label="Edge message from OR ${k+1} to ${names[h]} landmark ${k+1}: ${edgeScore(w.value)} edge support" d="M${xy(a)}L${xy(b)}" fill="none" stroke="transparent" stroke-width="11" class="rb-message-hit"/></g>`;
   if(active){const t=arrival<.7?arrival/.7:1,p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];out+=`<circle class="rb-forward-packet" cx="${p[0]}" cy="${p[1]}" r="4" fill="${colors[h]}" stroke="white" stroke-width="1"/>`;}
  }));
  out+='<g id="rb-hover-routes" pointer-events="none"></g>';
  names.forEach((name,h)=>{
   const x=xs[h],shift=model.fits[h].shift*s.fit;
   out+=plane((r,c)=>upper(h,r,c),'#f7faf6',colors[h]+'65');

   const fit=model.fits[h],project=(r,c)=>upper(h,r,c);
   fit.matches.forEach((k,i)=>{const e=model.templates[h][i],pos={...e,c:e.c+shift},p=project(pos.r,pos.c);
    const arrival=deliveryFor(s,h,k),active=s.phase==='evidence'&&arrival>0&&arrival<1,received=s.phase!=='image'&&arrival>=.7;
    out+=path(andRoute(s,h,k),colors[h],s.scores?1.3:1,s.scores?.55:.18);
    out+=`<path data-rb-and-message="${h}:${k}" tabindex="0" role="button" aria-label="${name} landmark ${k+1}: returning AND context" d="M${andRoute(s,h,k).map(xy).join('L')}" fill="none" stroke="transparent" stroke-width="9"/>`;

    if(s.phase==='reveal')out+=path([project(e.r,e.c),p],colors[h],1,.3,'stroke-dasharray="3 3"');
    out+=`<g data-rb-pool="${h}:${k}" tabindex="0" role="button" aria-label="${name} landmark ${k+1}, ${s.scores?edgeScore(s.messages[k][model.claims[k].indexOf(h)])+' received edge support':'waiting for evidence'}" data-shift="${shift}" data-received="${received}">${active?`<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="${colors[h]}" fill-opacity=".12"/>`:''}<circle cx="${p[0]}" cy="${p[1]}" r="7.5" fill="${received?'#e8f1e9':'white'}" stroke="${colors[h]}" stroke-width="1.6"/>${edge({...pos,dr:pos.dr*.52,dc:pos.dc*.52},project,colors[h],1.8)}</g>`;

   });
   out+=path([exemplarPoint(h),andPoint(h)],colors[h],1.2,.6);
   out+=`<path data-rb-and-output="${h}" tabindex="0" role="button" aria-label="AND message to ${name}" d="M${x} 145L${x} 88" stroke="transparent" stroke-width="11"/>`;

   out+=`<g data-rb-and="${h}" data-rb-active="${!!s.scores}" tabindex="0" role="button" aria-label="AND factor for ${name}">${s.scores?`<rect x="${x-11}" y="134" width="22" height="22" rx="3" fill="#548c8728" stroke="#548c87" stroke-width="1"/>`:''}<rect x="${x-6}" y="139" width="12" height="12" fill="#032f56"/><text x="${x+12}" y="149">AND</text></g>`;
   out+=`<g data-rb-hyp="${h}" tabindex="0" role="button" aria-label="${name}${s.relative?', '+pct(s.relative[h])+' relative support':''}"><rect class="rb-exemplar-thumbnail-frame" x="${x-42}" y="-51" width="84" height="67" rx="7" fill="white" stroke="${colors[h]}" stroke-opacity=".4"/><svg class="rb-exemplar-thumbnail" x="${x-38}" y="-47" width="76" height="59" viewBox="${exemplarPixels[h].viewBox}" aria-hidden="true" shape-rendering="crispEdges">${exemplarPixels[h].pixels}</svg><path d="M${x} 16V30" stroke="${colors[h]}" stroke-opacity=".5"/><circle cx="${x}" cy="59" r="29" fill="white" stroke="${colors[h]}" stroke-width="1.7"/><text class="rb-belief" x="${x}" y="65" style="fill:${colors[h]}">${s.relative?pct(s.relative[h]):'—'}</text></g>`;
   out+=`<path d="M${x+29} 59h23" stroke="#a4b8ac"/><g data-rb-prior="${h}" tabindex="0" role="button" aria-label="Prior factor for ${name}"><rect x="${x+50}" y="54" width="10" height="10" fill="#032f56"/></g>`;

  });
  out+='<text x="7" y="300" class="rb-label">Landmark</text><text x="7" y="318" class="rb-label">variable nodes</text><path d="M94 272q-7 0-7 8v25q0 8-7 8q7 0 7 8v28q0 8 7 8" stroke="#9cb8a6" fill="none" stroke-width="1.2"/>';
  model.edges.forEach((e,k)=>{
   const [x,y]=ground(e.r,e.c,22),h=owner(s,k),color=s.scores?colors[h]:'#987143';
   out+=`<g data-rb-or="${k}" data-rb-active="${!!s.scores}" tabindex="0" role="button" aria-label="OR factor ${k+1}, ${e.kind} edge"><rect x="${x-14}" y="${y-14}" width="28" height="28" fill="transparent"/>${s.scores?`<rect x="${x-11}" y="${y-11}" width="22" height="22" rx="3" fill="${color}22" stroke="${color}" stroke-width="1"/>`:''}<rect x="${x-6}" y="${y-6}" width="12" height="12" rx="1" fill="${color}" stroke="white" stroke-width="1.3"/><text x="${x+10}" y="${y-4}" class="rb-factor-id">${k+1}</text></g>`;
  });
  if(s.scores)out+=lineLabels(s)+andLabels(s);
  out+='<text x="380" y="747" text-anchor="middle" class="rb-label">Oriented edge evidence · one shared image</text>';
  if(s.scores){
   out+='<text x="380" y="771" text-anchor="middle">Next-round message scores · positive = evidence for ON · 0 = neutral</text>';
  }
  graph.innerHTML=out;
  const narratives={image:['01 · FORWARD PASS','Find matching edge evidence','Run the forward pass to gather evidence at the landmark variable nodes, then reveal the best location of each exemplar.'],evidence:['01 · FORWARD PASS','Gather evidence at the landmarks','The upward messages score matching edge positions. The landmarks stay in place while their candidate locations are evaluated, as in Figure 6.'],reveal:['01 · FORWARD PASS','Reveal the best alignment','The matching has been computed. Now the landmark nodes move together to show the selected location: T on the left and 7 on the right.'],forward:['01 · FORWARD PASS COMPLETE','The bar leads—but leaves gaps','Bar has the highest independent score: 58% of the relative support, versus 21% each for T and 7. It still leaves both lower strokes unexplained. Run the backward pass to compare the explanations together.'],backward:['02 · BACKWARD PASS','Resolve the shared evidence','The lower strokes support T and 7. Their context returns to the shared OR factors, reducing the upward messages to the redundant bar.'],limited:['02 · BACKWARD PASS','Still changing at this damping','These messages have not settled within this rollout. Higher damping keeps more of each previous message, so changes can take longer. Lower λ to compare the trajectory at the same step.'],settled:['02 · BACKWARD PASS COMPLETE','T + 7 explains the whole image','The left top edges support T and the right top edges support 7. The bar adds no new evidence, so its upward connections become thin.']};
  const [phase,title,story]=s.phase==='backward'?[`ROUND ${s.step} · ALL FACTORS`,...phaseCopy(s)]:narratives[s.phase];$('rcn-scene-phase').textContent=phase;$('rcn-scene-heading').textContent=title;$('rcn-scene-story').textContent=story;
  $('rcn-scene-progress').textContent=`Round ${s.step} / ${STEPS}`;
  previousStepButton.disabled=forwardProgress<1||s.step===0;
  previousStepButton.setAttribute('aria-label',s.step>0?`Go back to message-passing round ${s.step-1}`:'Already at the first step');
  nextStepButton.disabled=forwardProgress<1||s.step>=STEPS;
  nextStepButton.textContent=s.step<STEPS?`Next round → ${s.step+1}`:'Rollout complete';
  nextStepButton.setAttribute('aria-label',s.step<STEPS?`Advance to message-passing round ${s.step+1}`:'Last backward message update reached');
  dampingControl.disabled=forwardProgress<1;
  $('rcn-scene-damping-value').textContent=`λ = ${damping.toFixed(2)}`;
  dampingControl.setAttribute('aria-valuetext',`${Math.round(damping*100)} percent previous message, ${Math.round((1-damping)*100)} percent new message`);
  slider.disabled=forwardProgress<1;slider.max=String(STEPS);slider.value=String(s.step);
  slider.style.setProperty('--rb-progress',s.step/STEPS*100+'%');slider.setAttribute('aria-valuetext',`Round ${s.step} of ${STEPS}: all factors update together`);
  figure.querySelector('.rb-timeline').hidden=forwardProgress<1;
  figure.querySelector('.rb-damping').hidden=forwardProgress<1;
  forwardButton.textContent=forwardProgress<1
   ?(running==='forward'?'Pause forward pass':forwardProgress>0?'Resume forward pass':'Run forward pass')
   :(running==='backward'?'Pause backward pass':s.step===STEPS?'Replay backward pass':s.step>0?'Resume backward pass':'Run backward pass');
  figure.dataset.running=running||'';
  drawChart(s);
 }

 function drawChart(s){
  const x=n=>35+n/STEPS*227,y=p=>150-p*118,cursor=x(s.step);
  let out='';
  if(s.scoreIndex===0){
   [0,.5,1].forEach(p=>out+=`<path d="M35 ${y(p)}H262" stroke="#e1e8e2"/><text x="28" y="${y(p)+4}" text-anchor="end">${Math.round(p*100)}%</text>`);
   colors.forEach((color,h)=>{const cx=75+h*73,p=s.relative?s.relative[h]:0;out+=`<rect x="${cx-18}" y="${y(p)}" width="36" height="${150-y(p)}" rx="3" fill="${color}" fill-opacity="${h===2?1:.6}"/><text x="${cx}" y="${y(p)-9}" text-anchor="middle" style="fill:${color};font-weight:600">${s.relative?pct(p):'—'}</text><text x="${cx}" y="166" text-anchor="middle">${names[h]}</text>`;});
   out+=`<text class="rb-chart-annotation" x="150" y="188" text-anchor="middle">${s.relative?'Bar leads · shared evidence unresolved':'Forward scores appear after matching'}</text>`;
  }else{
   [0,.5,1].forEach(p=>out+=`<path d="M35 ${y(p)}H262" stroke="#e1e8e2"/><text x="28" y="${y(p)+4}" text-anchor="end">${Math.round(p*100)}%</text>`);
   colors.forEach((color,h)=>{
    const d=Array.from({length:s.step+1},(_,i)=>{const f=trace[i];return (i?'L':'M')+x(i).toFixed(2)+' '+y(f.relative[h]).toFixed(2);}).join(' '),dash=h===1?'stroke-dasharray="4 3"':'';
    out+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="${h===0?3:1.9}" ${dash}/><circle cx="${cursor}" cy="${y(s.relative[h])}" r="${h===0?3.5:2.5}" fill="${color}"/>`;
   });
   out+=`<path d="M${cursor} 25V154" stroke="#789c95" stroke-dasharray="3 3"/><text x="40" y="16" class="rb-chart-annotation">Bar starts ahead at 58%</text><text x="35" y="174">Forward result</text><text x="262" y="174" text-anchor="end">Round ${STEPS}</text>`;
  }
  $('rcn-scene-chart').innerHTML=out;
 }
 const math=t=>`<span class="bp-calculation-term">${root.katex.renderToString(t,{throwOnError:true})}</span>`;
 const box=t=>`<div class="bp-simple-calculation">${math(t)}</div>`;
 const under=(v,label)=>`\\underbrace{${v}}_{\\text{${label}}}`;
 const routePoint=(p,mini)=>mini?[p[0],p[1]*.43+15]:p;
 const routeFor=(s,h,k)=>{const e=model.edges[k];return [ground(e.r,e.c,22),nodeFor(s,h,k),...andRoute(s,h,k).slice().reverse().slice(1),exemplarPoint(h)];};
 function flow(points,ink,id,mini=false,width=2.3,dashed=false){
  return path(points.map(p=>routePoint(p,mini)),ink,width,1,'class="rb-travel-dots"');
 }
 function movingFlow(points,color,marker,kind){
  return `<g data-rb-flow="${kind}">${path(points,color,2.5,1,'class="rb-travel-dots"')}</g>`;
 }
 function andFlow(s,h,k=null){
  const factor=andPoint(h),ink='#0f67a2';let out='';
  model.incident(h).filter(j=>j!==k).forEach(j=>{out+=`<g data-rb-and-input="${h}:${j}">${movingFlow(andRoute(s,h,j).slice().reverse(),ink,'rb-context-arrow','in')}</g>`;});
  if(k!==null)out+=`<g data-rb-and-prior="${h}">${movingFlow([exemplarPoint(h),factor],ink,'rb-context-arrow','in')}</g>`;
  return out+`<g data-rb-and-selected="${h}:${k===null?'exemplar':k}">${movingFlow(k===null?[factor,exemplarPoint(h)]:andRoute(s,h,k),colors[h],`rb-arrow-${h}`,'out')}</g>`;
 }
 const contextSymbol=(h,k,t)=>`c^{(${t})}_{${landmark(h,k)}\\to\\phi_{${k+1}}}`;
 // Inspect one local OR calculation. The AND return is already summarized at
 // its sending landmark, rather than redrawing the entire upstream computation.
 function localMessage(s,source,k,recipient){
  const up=routeFor(s,recipient,k).slice(0,2),e=model.edges[k];
  const down=source===undefined?null:routeFor(s,source,k).slice(0,2).reverse();
  return `${movingFlow([imagePoint(e.r,e.c,2),ground(e.r,e.c,22)],'#987143','rb-context-arrow','evidence')}${down?`<g data-rb-context-route="${source}:${k}">${movingFlow(down,'#0f67a2','rb-context-arrow','in')}</g>`:''}<g data-rb-reply-route="${k}:${recipient}">${movingFlow(up,colors[recipient],`rb-arrow-${recipient}`,'out')}</g>`;
 }
 // Inspect the actual inputs on the large graph. These labels replace the
 // next-round previews, so an incoming label always uses the stored message.
 function inspectionLabels(s,h,k,kind){
  const label=(p,value,direction,source)=>`<g data-rb-hover-message="${direction}" data-rb-hover-source="${source}" data-rb-hover-value="${value}"><rect x="${p[0]-17}" y="${p[1]-11}" width="34" height="22" rx="5" fill="white" stroke="${direction==='out'?colors[h]:'#0f67a2'}"/><text class="rb-line-credit" x="${p[0]}" y="${p[1]+4}" style="fill:${direction==='out'?colors[h]:'#0f67a2'}">${credit(value)}</text></g>`;
  const orPosition=(h,k)=>messageLabelPositions[routes.findIndex(r=>r.h===h&&r.k===k)];
  const andPosition=(h,k)=>k===null?[xs[h],115]:[andRoute(s,h,k)[1][0],220];
  if(kind==='or'){
   const event=messageEvent(s,h,k),c=event.change,e=model.edges[k],lo=imagePoint(e.r,e.c,2),hi=ground(e.r,e.c,22);
   return label(orPosition(h,k),c.sent,'out',`OR:${k}`)+(c.rival===undefined?'':label(orPosition(c.rival,k),c.q,'in',`landmark:${c.rival}:${k}`))+label([hi[0],(lo[1]+hi[1])/2],model.evidence,'evidence',`image:${k}`);
  }
  if(kind==='and'){
   const event=andEvent(s,h,k);
   return event.inputs.map(input=>label(andPosition(h,input.k),input.value,'in',`landmark:${h}:${input.k}`)).join('')+(k===null?'':label(andPosition(h,null),model.prior,'in',`exemplar:${h}`))+label(andPosition(h,k),event.value,'out',`AND:${h}`);
  }
  return label(orPosition(h,k),s.messages[k][model.claims[k].indexOf(h)],'in',`OR:${k}`)+label(andPosition(h,k),s.contexts[k][model.claims[k].indexOf(h)],'in',`AND:${h}`);
 }
 function provenance(s,m,source,k,recipient,t,mini=false){
  const blue='#0f67a2',marker=mini?'rb-mini-input':'rb-context-arrow',used=new Set(),included=new Set(),inbox=model.support(m,source,k);
  // Spread the included inputs across a readable row in the small map;
  // the full-size highlight follows their exact spatial locations.
  const miniPoint=j=>{
   if(j===k)return [(xs[source]+xs[recipient??source])/2,(182-15)/.43];
   const i=inbox.inputs.findIndex(input=>input.k===j),center=Math.max(230,Math.min(590,xs[source]-35));
   return [center+(i-(inbox.inputs.length-1)/2)*68,(220-15)/.43];
  };
  const route=(h,j)=>{const points=routeFor(s,h,j);if(mini)points[0]=miniPoint(j);return points;};
  let out='';
  inbox.inputs.forEach(input=>{used.add(input.k);included.add(source);out+=`<g data-rb-source-route="${input.k}:${source}">${flow(route(source,input.k),blue,marker,mini)}</g>`;});
  const prior=[[xs[source]+53,59],[xs[source]+30,59]];
  out+=`<g data-rb-prior-route="${source}">${flow(prior,blue,marker,mini)}</g>`;
  included.add(source);
  if(k!==null){
   used.add(k);out+=`<g data-rb-context-route="${source}:${k}">${flow(route(source,k).slice().reverse(),blue,marker,mini,2.8,true)}</g>`;
   if(recipient!==null){included.add(recipient);out+=`<g data-rb-reply-route="${k}:${recipient}">${flow(route(recipient,k),colors[recipient],mini?'rb-mini-reply':`rb-arrow-${recipient}`,mini,3)}</g>`;}
  }
  if(!mini)return out;
  let nodes='';
  included.forEach(h=>{
   const p=routePoint([xs[h],59],true);
   nodes+=`<circle cx="${p[0]}" cy="${p[1]}" r="22" fill="white" stroke="${colors[h]}" stroke-width="2"/><text x="${p[0]}" y="${p[1]+7}" text-anchor="middle" class="rb-mini-name">${names[h]}</text>`;
   const q=routePoint(andPoint(h),true);nodes+=`<rect x="${q[0]-5}" y="${q[1]-5}" width="10" height="10" fill="#032f56"/>`;
   model.incident(h).filter(j=>used.has(j)&&(h===source||j===k)).forEach(j=>{const v=routePoint(nodeFor(s,h,j),true);nodes+=`<circle cx="${v[0]}" cy="${v[1]}" r="4" fill="white" stroke="${colors[h]}" stroke-width="1.5"/>`;});
  });
  const priorP=routePoint([xs[source]+55,59],true);nodes+=`<rect x="${priorP[0]-5}" y="${priorP[1]-5}" width="10" height="10" fill="#032f56"/><text x="${priorP[0]}" y="${priorP[1]-12}" text-anchor="middle">−1</text>`;
  used.forEach(j=>{
   const p=routePoint(miniPoint(j),true);
   nodes+=`<rect x="${p[0]-6}" y="${p[1]-6}" width="12" height="12" fill="${j===k?'#987143':blue}"/><text x="${p[0]}" y="${p[1]+23}" text-anchor="middle">φ${j+1}</text>`;
   const input=inbox.inputs.find(x=>x.k===j);
   if(input)nodes+=`<text class="rb-mini-value" x="${p[0]}" y="${p[1]-10}" text-anchor="middle">${edgeScore(input.value)}</text>`;
  });
  const end=recipient===null?blue:colors[recipient];
  return `<svg class="rb-source-map" viewBox="70 0 690 275" role="img" aria-label="Messages from OR factors ${inbox.inputs.map(i=>i.k+1).join(', ')} and the prior reach ${names[source]}${k!==null?', then context returns to OR '+(k+1):''}${recipient!==null?', which replies to '+names[recipient]:''}"><defs><marker id="rb-mini-input" markerWidth="11" markerHeight="11" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="${blue}" stroke-width="2"/></marker><marker id="rb-mini-reply" markerWidth="11" markerHeight="11" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="${end}" stroke-width="2"/></marker></defs>${out}${nodes}</svg><p class="rb-route-key"><span>Blue ↑ received edge support</span>${k!==null?'<span>Dashed ↓ returning context</span>':''}${recipient!==null?`<span style="color:${end}">↑ reply to ${names[recipient]}</span>`:''}</p>`;
 }
 function exchange(s,k){
  const hs=model.claims[k],marker='rb-exchange-arrow';
  let out=`<defs><marker id="${marker}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L7 4L0 8" fill="none" stroke="#627d87" stroke-width="1.4"/></marker></defs>`;
  hs.forEach((h,i)=>{
   const x=hs.length===1?210:i===0?95:325,q=model.support(trace[s.contextIndex??0].messages,h,k).score,p=messageEvent(s,h,k),m=p?p.change.sent:s.messages[k][hs.indexOf(h)];
   out+=`<circle cx="${x}" cy="29" r="24" fill="white" stroke="${colors[h]}" stroke-width="1.7"/><text x="${x}" y="34" text-anchor="middle">${names[h]} · L${k+1}</text>`;
   out+=`<path class="rb-travel-dots" data-rb-direction="context" d="M${x-15} 49 Q${x-35} 111 199 149" fill="none" stroke="#0f67a2" stroke-width="1.8" stroke-dasharray="4 3"/><path class="rb-travel-dots" data-rb-direction="reply" d="M${i===0?205:217} 143 Q${x+35} 110 ${x+12} 50" fill="none" stroke="${colors[h]}" stroke-width="2"/>`;
   const left=i===0||hs.length===1;
   out+=`<text x="${left?9:283}" y="83" class="rb-exchange-label">↓ context ${credit(q)}</text><text x="${left?9:283}" y="99" class="rb-exchange-time">returned at ${s.contextStep}</text><text x="${left?125:226}" y="115" class="rb-exchange-label" style="fill:${colors[h]}">↑ ${signed(m)}</text><text x="${left?125:226}" y="130" class="rb-exchange-time">${p?(p.future?'arrives at ':'received at ')+p.arrival:'held'}</text>`;
  });
  out+=`<rect x="202" y="140" width="16" height="16" fill="#987143"/><text x="210" y="178" text-anchor="middle">OR ${k+1} · separate reply to each claimant</text>`;
  return `<svg class="rb-exchange-map" viewBox="0 0 420 190" role="img" aria-label="Each landmark sends context down to OR ${k+1} and receives its own upward reply">${out}</svg>`;
 }
 function inbox(m,h,k,t){
  const g=model.support(m,h,k),groups=[];
  g.inputs.forEach(({k,value})=>{let a=groups.find(a=>Math.abs(a.value-value)<1e-9);if(!a){a={value,ks:[]};groups.push(a);}a.ks.push(k);});
  const inputs=`<div class="rb-inbox-rows"><div class="bp-inbox-row">${math(`b_{${symbols[h]}}`)}<strong>= −1 <small>object cost</small></strong></div>`+groups.map(a=>`<div class="bp-inbox-row">${math(`m^{(${receivedAt(h,t)})}_{\\phi_k\\to L_{${symbols[h]},k}}`)}<strong>= ${dec(a.value)}</strong><small class="rb-input-indices">k = ${a.ks.map(k=>k+1).join(', ')}</small></div>`).join('')+'</div>';
  const sum=groups.map(a=>(a.ks.length>1?a.ks.length+'\\cdot ':'')+dec(a.value)).join('+');
  return {g,inputs,calculation:box(`q_{${symbols[h]}}=${under('-1','object cost')}+${sum||'0'}=${dec(g.score)}`)};
 }

 function inboxTable(rows,title='Stored incoming messages'){
  return `<table class="rb-received-table"><caption>${title}</caption><thead><tr><th>From</th><th>Received</th><th>Value</th></tr></thead><tbody>${rows.map(row=>`<tr data-rb-inbox-kind="${row.kind}" data-rb-inbox-step="${row.step??''}" data-rb-inbox-value="${row.value??''}"><th>${row.label}</th><td>${row.step===null?'not yet':'round '+row.step}</td><td>${row.value===null?'—':`<strong>${credit(row.value)}</strong>`}</td></tr>`).join('')}</tbody></table>`;
 }
 function explanation(c,h){
  const same=Math.abs(c.proposal)<1e-9;
  return `<div class="rb-or-comparison"><div><span>Best with ${names[h]} ON</span><strong>${dec(c.on)}</strong></div><div><span>Best with ${names[h]} OFF</span><strong>${dec(c.off)}</strong></div></div>${box(`\\widehat m=${dec(c.on)}-${dec(c.off)}=${dec(c.proposal)}`)}<p class="rb-zero-reason">${same?'Equally good with or without '+names[h]+': no extra evidence.':names[h]+' adds '+dec(c.proposal)+' to the best score.'}</p>`;
 }
 const groupedSum=inputs=>{
  const groups=[];inputs.forEach(({value})=>{const g=groups.find(g=>Math.abs(g.value-value)<1e-9);if(g)g.count++;else groups.push({value,count:1});});
  return groups.map(g=>(g.count>1?g.count+'\\cdot ':'')+dec(g.value)).join('+')||'0';
 };
 function show(target){
  if(hovered===target||running==='forward')return;if(animation){stop();forwardButton.textContent='Resume backward pass';}hide();figure.classList?.add('has-inspector');graph.classList?.add('is-inspecting');hovered=target;target.setAttribute('aria-describedby','rcn-scene-tooltip');
  const s=current,d=target.dataset;let content='',h=null,k=null,routeSource=null,routeTime=null,routeMessages=null,localReply=false,andOutput=false;
  if(d.rbMessage!==undefined||d.rbMessageChip!==undefined){

   [h,k]=(d.rbMessage??d.rbMessageChip).split(':').map(Number);
   const event=messageEvent(s,h,k),t=event?event.arrival:receivedAt(h,s.index),title=symbol(k,h,t),value=s.messages[k][model.claims[k].indexOf(h)];
   content=`<h5 class="bp-inspector-message-title">${math(title)}</h5><p class="bp-inspector-arrival">${event?`${names[h]} landmark ${k+1} · ${event.future?'arrives at':'received at'} round ${t}`:`${names[h]} landmark ${k+1} · last received edge score`}</p>`;
   if(!s.scores)content+='<p>Run the forward pass to gather the first edge messages.</p>';
   else if(!event){
    localReply=true;
    content+=box(`${title}=${dec(value)}`)+`<p>${s.index===0?'In the initial OR pass, this matching edge sends +1 upward. The forward pass initializes the landmark context.':'This is the last received OR message in the rollout.'}</p>`;
   }else{
    const c=event.change,r=c.rival,g=r!==undefined;localReply=true;
    if(g){routeSource=r;routeTime=event.contextStep;routeMessages=trace[event.sourceIndex].messages;}
    content+=`<p>Highlighted inputs: edge <strong>+1</strong>${g?' and '+names[r]+' context <strong>'+credit(c.q)+'</strong>':''}, received in round ${event.contextStep}.</p><ol class="bp-message-steps"><li><h6>Compare the best explanations</h6>${explanation(c,h)}</li><li><h6>Damp the new score</h6>${box(`m=${dec(damping)}\\cdot ${dec(c.old)}+${dec(1-damping)}\\cdot ${dec(c.proposal)}=${dec(c.sent)}`)}</li></ol>`;

   }

  }else if(d.rbAndMessage!==undefined||d.rbAndOutput!==undefined){
   andOutput=true;
   if(d.rbAndOutput!==undefined){h=Number(d.rbAndOutput);k=null;}else [h,k]=d.rbAndMessage.split(':').map(Number);
   const event=andEvent(s,h,k),t=event.arrival,inputs=event.inputs,sum=groupedSum(inputs),value=event.value;
   const title=`a^{(${t})}_{\\mathrm{AND}_{${symbols[h]}}\\to ${k===null?symbols[h]:landmark(h,k)}}`;
   content=`<h5 class="bp-inspector-message-title">${math(title)}</h5><p class="bp-inspector-arrival">AND → ${k===null?names[h]+' exemplar':names[h]+' landmark '+(k+1)} · ${event.future?'arrives in round ':'received in round '}${t}</p>`;
   if(!s.scores)content+='<p>Run the forward pass to collect the edge scores.</p>';
   else content+=`<ol class="bp-message-steps"><li><h6>Read the other incoming messages</h6><p>${k===null?'All landmark scores enter AND. The exemplar’s incoming message is excluded from this reply.':'The other landmark scores and the exemplar’s −1 object-cost message enter AND. The selected landmark’s input is excluded.'}</p></li><li><h6>Send along the highlighted connection</h6>${box(`a=${k===null?'':'-1+'}${under(sum||'0',k===null?'landmark scores':'other landmark scores')}=${dec(value)}`)}${k===null?`<p>The exemplar then adds its object cost: ${math(`${dec(value)}-1=${dec(value-1)}`)}.</p>`:'<p>This is the context the landmark relays to its OR factor in the next round.</p>'}</li></ol>`;
  }else if(d.rbPool!==undefined||d.rbPoolValue!==undefined){
   [h,k]=(d.rbPool??d.rbPoolValue).split(':').map(Number);
   const value=s.messages[k][model.claims[k].indexOf(h)],t=s.index;
   content=`<h5 class="bp-inspector-message-title">${math(landmark(h,k))}</h5><p class="bp-inspector-arrival">${names[h]} · landmark ${k+1} · ${model.edges[k].kind} edge</p>`;
   if(!s.scores)content+='<p>This landmark is waiting for its edge evidence.</p>';
   else {
    content+=inboxTable(nodeInbox(s,h,k));
    content+='<p>The landmark relays its OR message to AND and its AND message to OR. Each outgoing message excludes the incoming message from its recipient.</p>';

   }
  }else if(d.rbHyp!==undefined){
   h=Number(d.rbHyp);const fit=model.fits[h];
   content=`<h5>${names[h]} · ${s.scores?pct(s.relative[h])+' relative support':'finding a position'}</h5><p>Best translation: ${fit.shift===0?'center':Math.abs(fit.shift)+' grid units '+(fit.shift<0?'left':'right')}. ${fit.matches.filter(k=>k>=0).length} oriented landmarks match.</p>`;
   if(s.scores){routeSource=h;routeTime=s.contextStep??0;routeMessages=trace[s.scoreIndex].messages;const g=inbox(routeMessages,h,null,s.scoreIndex);content+=inboxTable(nodeInbox(s,h))+inboxTable(model.incident(h).map(j=>({kind:'or',label:'Landmark '+(j+1)+' ← OR '+(j+1),step:s.scoreIndex,value:routeMessages[j][model.claims[j].indexOf(h)]})),'Landmark messages used by AND')+g.calculation+`<p class="bp-inspector-calculation-label">Relative support compares the three scores</p>${box(`r_{${symbols[h]}}=\\frac{e^{${dec(s.scores[h])}}}{${s.scores.map(v=>'e^{'+dec(v)+'}').join('+')}}\\approx ${(s.relative[h]*100).toFixed(1)}\\%`)}<p>This is a share of relative support, not the probability that the object is present. T and 7 can both be present.</p>`;}
  }else if(d.rbOr!==undefined){
   k=Number(d.rbOr);const hs=model.claims[k];content=`<h5>OR ${k+1} · ${model.edges[k].kind} edge</h5><p>${hs.map(h=>names[h]).join(' or ')} can explain this edge. The factor rewards an explained edge once, even if both claimants are active.</p>${s.scores?inboxTable(hs.map(h=>({kind:'context',label:names[h]+' landmark '+(k+1),step:s.contextStep,value:s.contexts[k][model.claims[k].indexOf(h)]})),'Incoming context at this OR factor'):''}<table><caption>Local log score, with the observed evidence included</caption><thead><tr><th></th>${hs.length===1?'<th>Score</th>':`<th>${names[hs[1]]} = 0</th><th>${names[hs[1]]} = 1</th>`}</tr></thead><tbody>${[0,1].map(a=>`<tr><th>${names[hs[0]]} = ${a}</th>${(hs.length===1?[0]:[0,1]).map(b=>`<td class="${a||b?'is-supported':''}">${a||b?'+1':'0'}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Color shows the claimant with the strongest returning context. Line width previews the next update; the factor does not impose exclusive ownership.</p>`;
  }else if(d.rbPrior!==undefined){h=Number(d.rbPrior);content=`<h5>Object cost for ${names[h]}</h5><p>This unary factor contributes −1 when the object is present and 0 when it is absent. It favors explanations that use fewer objects.</p>`;
  }else if(d.rbAnd!==undefined){h=Number(d.rbAnd);content=(s.scores?inboxTable([...model.incident(h).map(j=>({kind:'or',label:'Landmark '+(j+1),step:s.index,value:s.messages[j][model.claims[j].indexOf(h)]})),{kind:'prior',label:names[h]+' exemplar (object cost)',step:0,value:model.prior}]):'')+`<h5>${names[h]} and its landmarks</h5><p>The forward search moves the template as a whole while preserving each edge orientation. After choosing its location, each landmark sends its edge score up through AND. The return to a particular landmark combines the other landmark scores with the object cost, leaving out that landmark’s own edge message. Every round, AND and OR compute their outgoing messages together. Hover a connection to inspect the other inputs used for that output.</p>`;}
  tooltip.style.setProperty('--inspector-color',h===null?'#987143':colors[h]);tooltip.innerHTML=content;tooltip.hidden=false;
  tooltip.querySelectorAll('.bp-simple-calculation > .bp-calculation-term').forEach(el=>{const avail=el.parentElement.clientWidth-22,w=el.getBoundingClientRect().width;if(w>avail)el.style.fontSize=(avail/w*100)+'%';});
  const overlay=graph.querySelector('#rb-hover-routes');
  if(andOutput){
   graph.classList.add('is-reading-message');
   overlay.innerHTML=andFlow(s,h,k)+inspectionLabels(s,h,k,'and');
  }else if(localReply){
   graph.classList.add('is-reading-message');
   overlay.innerHTML=localMessage(s,routeSource===null?undefined:routeSource,k,h)+inspectionLabels(s,h,k,'or');
   overlay.dataset.sourceStep=String(routeTime??s.step);
  }else if(routeSource!==null){
   overlay.innerHTML=provenance(s,routeMessages,routeSource,k,k===null?null:h,routeTime,false);
   overlay.dataset.sourceStep=String(routeTime); // Replies are computed from the currently received messages.
  }else if((d.rbPool!==undefined||d.rbPoolValue!==undefined||d.rbAndMessage!==undefined)&&s.scores){
   graph.classList.add('is-reading-message');
   const route=routeFor(s,h,k).slice(0,2);
   overlay.innerHTML=`<g data-rb-stored-route="${k}:${h}">${flow(route,colors[h],`rb-arrow-${h}`,false,2.8)}${flow(andRoute(s,h,k),colors[h],`rb-arrow-${h}`,false,2.8)}</g>`+inspectionLabels(s,h,k,'node');
  }else if(d.rbOr!==undefined&&s.scores&&s.contextStep!==null){
   overlay.innerHTML=model.claims[k].map(source=>{
    const up=routeFor(s,source,k).slice(0,2),down=up.slice().reverse().map(p=>[p[0]-5,p[1]]);
    return `<g data-rb-factor-context="${source}">${flow(down,'#0f67a2','rb-context-arrow',false,2,true)}</g>${messageEvent(s,source,k)?`<g data-rb-factor-reply="${source}">${flow(up,colors[source],`rb-arrow-${source}`,false,2.5)}</g>`:''}`;
   }).join('');
  }
  if(s.scores&&(localReply||andOutput)){
   graph.querySelectorAll('[data-rb-pool],[data-rb-hyp]').forEach(el=>{
    const pool=el.dataset.rbPool?.split(':').map(Number);
    // Only the other variable inputs supply this reply. The recipient has
    // not received the previewed message yet, so it fades with unrelated nodes.
    const source=pool
     ? andOutput?pool[0]===h&&pool[1]!==k:pool[0]===routeSource&&pool[1]===k
     : andOutput&&k!==null&&Number(el.dataset.rbHyp)===h;
    el.classList.toggle('is-message-source',source);
    el.classList.toggle('is-message-inactive',!source);
   });
  }
  graph.querySelectorAll('[data-rb-wire]').forEach(el=>{
   const own=Number(el.dataset.rbOwner),cell=Number(el.dataset.rbCell);
   const include=andOutput?false:localReply?(cell===k&&(own===h||own===routeSource)):routeSource!==null?((own===routeSource&&cell!==k)||(k!==null&&own===h&&cell===k)):(h===null||own===h)&&(k===null||cell===k);
   el.classList.toggle('is-muted',!include);el.classList.toggle('is-emphasized',include);
  });
 }
 const selector='[data-rb-message-chip],[data-rb-and-output],[data-rb-and-message],[data-rb-pool],[data-rb-pool-value],[data-rb-message],[data-rb-hyp],[data-rb-or],[data-rb-prior],[data-rb-and]';
 graph.addEventListener('pointerover',e=>{const target=e.target.closest(selector);if(target)show(target);else hide();});
 graph.addEventListener('pointerout',e=>{if(hovered&&!hovered.contains(e.relatedTarget))hide();});
 graph.addEventListener('pointerleave',hide);
 figure.addEventListener('pointerleave',hide);graph.addEventListener('focusin',e=>{const target=e.target.closest(selector);if(target)show(target);});
 graph.addEventListener('focusout',hide);graph.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('scroll',e=>{if(e.target!==tooltip)hide();},true);root.addEventListener('resize',hide);
 function stop(){if(animation)root.cancelAnimationFrame(animation);animation=0;lastTime=0;running=null;}
 function tick(time){
  const elapsed=lastTime?time-lastTime:0;lastTime=time;
  if(running==='forward')forwardProgress=Math.min(1,forwardProgress+elapsed/2500);
  if(running==='backward'){
   // Let the first two exchanges read clearly, then move quickly through settling.
   const slow=Math.max(0,Math.min(elapsed,(6-backwardPosition)*500));
   backwardPosition=Math.min(STEPS,backwardPosition+slow/500+(elapsed-slow)/50);
  }
  const done=running==='forward'?forwardProgress>=1:backwardPosition>=STEPS;
  if(done)stop();draw();
  if(!done)animation=root.requestAnimationFrame(tick);
 }
 forwardButton.addEventListener('click',()=>{
  if(running){stop();draw();return;}
  stop();
  if(forwardProgress<1){
   backwardPosition=0;running='forward';
  }else{
   if(backwardPosition>=STEPS)backwardPosition=0;
   running='backward';
  }
  animation=root.requestAnimationFrame(tick);draw();
 });
 previousStepButton.addEventListener('click',()=>{
  if(forwardProgress<1||backwardPosition<1)return;
  stop();backwardPosition=Math.max(0,Math.floor(backwardPosition)-1);draw();
 });
 nextStepButton.addEventListener('click',()=>{
  if(forwardProgress<1||backwardPosition>=STEPS)return;
  stop();backwardPosition=Math.min(STEPS,Math.floor(backwardPosition)+1);draw();
 });
 $('rcn-scene-reset').addEventListener('click',()=>{stop();forwardProgress=0;backwardPosition=0;draw();});
 slider.addEventListener('input',e=>{if(forwardProgress<1)return;stop();backwardPosition=Math.max(0,Math.min(STEPS,Number(e.target.value)));draw();});
 dampingControl.addEventListener('input',()=>{
  stop();damping=Number(dampingControl.value)/100;
  trace=model.runFactorRounds({keep:damping,rounds:20});draw();
 });
 $('rcn-scene-damping-equation').innerHTML=math(String.raw`m=\lambda\,m_{\rm prev}+(1-\lambda)\,m_{\rm new}`);
 root.RCNScene={get trace(){return trace;},get damping(){return damping;},state,pending,messageEvent,nodeInbox,andEvent,inspectionLabels,andFlow,wire,owner,nodeFor,deliveryFor,messageSupport,steps:STEPS};draw();
})(globalThis);
