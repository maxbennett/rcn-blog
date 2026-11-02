(function(root){
 'use strict';
 const $=id=>document.getElementById(id),figure=$('rcn-forward-graph-prime'),M=root.RCNHierarchyMaps;
 if(!figure||!M||!root.RCNHierarchyTraining||!root.RCNForwardData)return;
 const test=root.RCNForwardData.tests[0],exemplars=root.RCNHierarchyTraining.exemplars;
 const models=exemplars.map(e=>M.create(e.edgelets,test.edgelets));
 const input=models[0].input,blue='#0f67a2',teal='#548c87',navy='#032f56',gold='#987143',miss='#b76356';
 const inks=[blue,teal,gold],heights={edge:80,part:205,pool:330};
 const reducedMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const timing=[0,300,360,440,300,0];
 let focus=0,feature=1,channel=2,edgeMode='parts',stage=0,timer=null,motionFrame=0,links=true,inspectedPool=null,responseInspected=false;
 let response=models[0].pools.find(p=>p.feature===feature&&p.candidates.length)?.candidates[0]||input.responses[feature].points[0];
 const proj=(r,c,z=0)=>[450+2.15*(c-100)+.85*(r-100),552+.54*(r-100)-.28*(c-100)-z];
 const xy=p=>p.map(v=>v.toFixed(2)).join(' ');
 const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;
 function line(a,b,ink,width=1,opacity=1,pulse=false){
  return `<path d="M${xy(a)}L${xy(b)}" fill="none" stroke="${ink}" stroke-width="${width}" opacity="${opacity}" pointer-events="none" ${pulse?'class="rfp-flow" marker-end="url(#rfp-arrow)"':''}/>`;
 }
 function signal(a,b,delay=0){
  if(timer===null||reducedMotion)return '';
  return `<circle data-rfp-motion="${[...a,...b].join(':')}" data-rfp-delay="${delay}" cx="${a[0]}" cy="${a[1]}" r="2.7" fill="${blue}" stroke="white" stroke-width=".7" pointer-events="none"/>`;
 }
 const plane=(z,fill,stroke,opacity=1)=>`<path d="M${[proj(28,28,z),proj(28,172,z),proj(172,172,z),proj(172,28,z)].map(xy).join('L')}Z" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1"/>`;
 function edge(f,r,c,z,ink,width=1.5,len=2.6){
  const t=f*Math.PI/8+Math.PI/2;
  return line(proj(r-len*Math.sin(t),c-len*Math.cos(t),z),proj(r+len*Math.sin(t),c+len*Math.cos(t),z),ink,width);
 }
 const glyph=(id,r,c,z,ink,width=1.4)=>M.features[id].parts.map(p=>edge(p.f,r+p.dr,c+p.dc,z,ink,width,2)).join('');
 function sample(points,gap=12,preferred=null){
  const chosen=[],sorted=preferred?[...points].sort((a,b)=>Math.hypot(a[0]-preferred[0],a[1]-preferred[1])-Math.hypot(b[0]-preferred[0],b[1]-preferred[1])):points;
  for(const p of sorted){const q=proj(...p);if(chosen.every(a=>{const b=proj(...a);return Math.hypot(q[0]-b[0],q[1]-b[1])>=gap;}))chosen.push(p);}
  return chosen;
 }
 const edgeMaps=Array.from({length:16},(_,f)=>{
  const points=new Set([...input.raw[f],...input.raw[(f+15)%16],...input.raw[(f+1)%16]]);
  return sample([...points].map(k=>[Math.floor(k/200),k%200]),6);
 });
 function animateSignals(){
  if(motionFrame)root.cancelAnimationFrame(motionFrame);
  motionFrame=0;if(!root.requestAnimationFrame||timer===null||reducedMotion)return;
  const dots=[...$('rfp-canvas').querySelectorAll('[data-rfp-motion]')].map(el=>({el,p:el.dataset.rfpMotion.split(':').map(Number),delay:Number(el.dataset.rfpDelay)}));
  if(!dots.length)return;
  let start=null;
  const duration=timing[stage]-45;
  function animate(now){
   if(start===null)start=now;
   let moving=false;
   dots.forEach(({el,p,delay})=>{
    const t=Math.max(0,Math.min(1,(now-start-delay)/(duration-delay))),u=t*t*(3-2*t);
    el.setAttribute('cx',p[0]+u*(p[2]-p[0]));el.setAttribute('cy',p[1]+u*(p[3]-p[1]));
    el.setAttribute('opacity',t===1?'0':'1');if(t<1)moving=true;
   });
   motionFrame=moving?root.requestAnimationFrame(animate):0;
  }
  motionFrame=root.requestAnimationFrame(animate);
 }
 function stop(){if(timer!==null)clearTimeout(timer);timer=null;}
 function chooseResponse(){
  const pool=models[focus].pools[inspectedPool]||models[focus].pools.find(p=>p.feature===feature&&p.candidates.length);
  response=pool?.candidates[0]||input.responses[feature].points[0];
 }
 function chooseFeature(id,poolIndex=null){stop();stage=0;feature=id;inspectedPool=poolIndex;responseInspected=poolIndex!==null;channel=M.features[id].f;edgeMode='parts';chooseResponse();render('feature');}
 function chooseExemplar(id){stop();stage=0;focus=id;inspectedPool=null;responseInspected=false;chooseResponse();render('exemplar');}
 function render(swap=''){
  const model=models[focus],exemplar=exemplars[focus],F=M.features[feature],pool=model.pools[inspectedPool];
  const featurePools=model.pools.filter(p=>p.feature===feature),detections=input.responses[feature].points;
  const channels=edgeMode==='parts'?[F.f,(F.f+2)%16,(F.f+14)%16]:[channel,(channel+1)%16,(channel+2)%16];
  const partIds=[feature,(feature+1)%8,(feature+2)%8],combinedEdges=stage>=1,combinedParts=stage>=2;
  const selectedPoint=proj(...response,heights.part),supported=model.pools.filter(p=>p.candidates.length).length;
  Object.assign(figure.dataset,{stage:String(stage),feature:String(feature),exemplar:String(exemplar.index),channel:String(channel),matchingPools:String(featurePools.length),detections:String(detections.length),inspectedPool:inspectedPool===null?'':String(inspectedPool)});
  let s=`<defs><clipPath id="rfp-image-clip"><path d="M${[proj(28,28),proj(28,172),proj(172,172),proj(172,28)].map(xy).join('L')}Z"/></clipPath><marker id="rfp-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L4 2.5L0 5" fill="none" stroke="${blue}" stroke-width="1"/></marker></defs>`;
  s+=plane(0,'#f7fafb','#c4d1d8');
  s+=`<g clip-path="url(#rfp-image-clip)"><image href="${test.image}" width="200" height="200" transform="matrix(2.15 -.28 .85 .54 150 526)"/></g>`;
  // The same spatial response positions are marked on the original image.
  // Dense neighboring dots are response locations, not separate objects.
  s+='<g pointer-events="none">';
  for(const [r,c] of detections){const p=proj(r,c);s+=`<circle data-rfp-image-detection="${feature}:${r}:${c}" cx="${p[0]}" cy="${p[1]}" r="1.5" fill="#23a5d5"/>`;}
  s+='</g>';
  // Browsing preserves the individual channels; the pass overlays them while
  // retaining each feature identity, as in the original Fig. 6.
  if(combinedEdges){
   s+=`<g class="${stage===1?'rfp-combine-in':''}" data-rfp-combined-edges="true">`+plane(heights.edge,'#eef5f8',blue,.8);
   edgeMaps.forEach((points,f)=>{s+=`<g data-rfp-edge-map="${f}" opacity=".32">`;points.forEach(([r,c])=>{s+=edge(f,r,c,heights.edge,navy,1,1.8);});s+='</g>';});
   s+='</g>';
  }else for(let slot=2;slot>=0;slot--){
   const f=channels[slot],z=heights.edge-slot*10;
   s+=`<g data-rfp-edge-map="${f}" opacity="${slot===0?1:.2}" class="${swap==='filter'||swap==='feature'?'rfp-sheet-rise':''}">`+plane(z,'#eef5f8',blue,.8);
   for(const [r,c] of edgeMaps[f])s+=edge(f,r,c,z,navy,slot===0?1.5:1);
   s+='</g>';
  }
  // On composition, several genuine edge witnesses travel to their bend maps.
  const compose=stage===2?M.features.map(f=>({feature:f,points:M.locations(input.responses[f.id].points)})):[{feature:F,points:responseInspected?[response]:M.locations(detections)}];
  if(links)for(const item of compose)for(const [r,c] of item.points){
   const to=proj(r,c,heights.part);
   M.witnesses(input,item.feature,r,c).forEach((w,i)=>{
    const slot=channels.indexOf(w.expected.f);if(!combinedEdges&&slot<0)return;
    const from=proj(w.observed.r,w.observed.c,heights.edge-(combinedEdges?0:slot*10));
    s+=line(from,to,stage===2?blue:inks[i],stage===2?1.1:1.3,stage===2?.45:.65,stage===2);
    if(item.feature.id===feature)s+=`<circle data-rfp-witness="${w.observed.f}:${w.observed.r}:${w.observed.c}" cx="${from[0]}" cy="${from[1]}" r="2.5" fill="white" stroke="${inks[i]}" stroke-width="1.1"/>`;
    if(stage===2)s+=signal(from,to,i*22);
   });
  }
  const paintMap=(id,z,active)=>{
   let out=`<g data-rfp-feature-map="${id}">`;
   if(active)for(const p of pool?[pool]:featurePools){
    const q=[proj(p.r-12.5,p.c-12.5,z),proj(p.r-12.5,p.c+12.5,z),proj(p.r+12.5,p.c+12.5,z),proj(p.r+12.5,p.c-12.5,z)];
    out+=`<path data-rfp-footprint="${model.pools.indexOf(p)}" d="M${q.map(xy).join('L')}Z" fill="${teal}" fill-opacity=".045" stroke="${teal}" stroke-opacity=".5" stroke-width=".9" stroke-dasharray="4 3"/>`;
   }
   // Every positive location is displayed. Only the large explanatory bend
   // glyphs are spaced out, so nearby responses are never hidden by thinning.
   for(const [r,c] of input.responses[id].points){
    const p=proj(r,c,z);
    out+=`<circle data-rfp-detection="${id}:${r}:${c}" ${active?`data-rfp-response="${r}:${c}" role="button" tabindex="0" aria-label="Inspect ${F.name} response at row ${r}, column ${c}"`:''} cx="${p[0]}" cy="${p[1]}" r="${active?1.8:1}" fill="${active?blue:'#8ba59a'}" fill-opacity="${active?.8:.4}"/>`;
   }
   out+='<g pointer-events="none" opacity=".8">';
   for(const [r,c] of M.locations(input.responses[id].points))out+=glyph(id,r,c,z,active?teal:'#8ba59a',active?1.5:1);
   out+='</g>';
   return out+'</g>';
  };
  if(combinedParts){
   s+=`<g class="${stage===2?'rfp-combine-in':''}" data-rfp-combined-parts="true">`+plane(heights.part,'#f2f6ec',teal,.8);
   M.features.forEach(f=>{s+=paintMap(f.id,heights.part,f.id===feature);});s+='</g>';
  }else for(let slot=2;slot>=0;slot--){
   const z=heights.part-slot*10;
   s+=`<g opacity="${slot===0?1:.23}" class="${swap==='feature'?'rfp-sheet-rise':''}">`+plane(z,'#f2f6ec',teal,.8)+paintMap(partIds[slot],z,slot===0)+'</g>';
  }
  if(responseInspected)s+=`<circle pointer-events="none" cx="${selectedPoint[0]}" cy="${selectedPoint[1]}" r="5" fill="none" stroke="${blue}" stroke-width="1.5"/>`;
  // Each exemplar has its OWN training-derived pool locations, over the shared
  // bank of bend maps. No upper pool reads directly from the edge level.
  if(links)model.pools.forEach((p,i)=>{
   if(!combinedParts&&p.feature!==feature)return;
   const to=proj(p.r,p.c,heights.pool),points=stage>=4?sample(p.candidates,8):p.candidates;
   // A faint cone shows the structural pool window even when it contains no
   // positive responses. Solid wires below always originate at real detections.
   if(!combinedParts){
    const corners=[proj(p.r-12.5,p.c-12.5,heights.part),proj(p.r-12.5,p.c+12.5,heights.part),proj(p.r+12.5,p.c+12.5,heights.part),proj(p.r+12.5,p.c-12.5,heights.part)];
    s+=`<g data-rfp-receptive-field="${i}" stroke-dasharray="3 4">`+corners.map(from=>line(from,to,teal,.7,.17)).join('')+'</g>';
   }
   points.forEach(([r,c])=>{
    const from=proj(r,c,heights.part),active=p.feature===feature;
    s+=`<g data-rfp-pool-link="${p.feature}:${r}:${c}" data-rfp-target-pool="${i}" data-rfp-source-level="higher">`+line(from,to,stage===3?blue:teal,active?1:.7,stage===3?.22:active?.24:.1,stage===3)+'</g>';
   });
   if(stage===3&&p.candidates.length)s+=signal(proj(...p.candidates[0],heights.part),to,i*13);
  });
  for(let depth=2;depth>=0;depth--){
   const active=depth===0;
   s+=`<g data-rfp-network="${exemplars[(focus+depth)%3].index}" opacity="${active?1:.16}" class="${swap==='exemplar'?'rfp-sheet-rise':''}">`+plane(heights.pool-depth*10,'#eaf2eb','#a8c4b3',.3)+'</g>';
  }
  if(links)exemplars.forEach((ex,j)=>{
   const active=j===focus,to=[300+j*210,124];
   s+=`<g data-rfp-exemplar-links="${ex.index}" opacity="${active?1:.11}">`;
   models[j].pools.forEach(p=>{
    const from=proj(p.r,p.c,heights.pool-(j-focus+3)%3*10);
    s+=line(from,to,active&&stage===4?blue:teal,.85,active?((combinedParts||p.feature===feature)?.3:.045):.3,active&&stage===4);
    if(active&&stage===4&&p.candidates.length)s+=signal(from,to);
   });s+='</g>';
  });
  // Pairwise connections are schematic context, not a simulated lateral pass.
  if(links)model.pools.forEach((p,i)=>{
   const q=proj(p.r,p.c,heights.pool),next=model.pools[(i+1)%model.pools.length],b=proj(next.r,next.c,heights.pool);
   s+=line(q,b,blue,.8,.12);
  });
  model.pools.forEach((p,i)=>{
   const q=proj(p.r,p.c,heights.pool),active=p.feature===feature,on=p.candidates.length>0,ink=stage>=3&&!on?miss:active?blue:teal,inspected=i===inspectedPool;
   const fill=stage>=3?(on?'#e4efe8':'#f7e6e1'):'white';
   s+=`<g data-rfp-pool="${i}" data-rfp-pool-feature="${p.feature}" data-rfp-map-active="${active}" role="button" tabindex="0" aria-label="Inspect landmark ${i+1}, Bend ${p.feature+1}, digit ${exemplar.label}" aria-pressed="${inspected}" opacity="${combinedParts||active?1:.3}" ${stage>=3?`data-rfp-supported="${on}"`:''}>`;
   s+=`<circle cx="${q[0]}" cy="${q[1]}" r="${inspected?8:active?6:4.5}" fill="${active&&stage<3?'#e8f2f7':fill}" stroke="${ink}" stroke-width="${active?1.8:1.1}"/>`;
   const a=M.features[p.feature].f*Math.PI/8,ps=[-1,0,1].map(k=>[q[0]+4*Math.cos(a+k*Math.PI/4),q[1]+4*Math.sin(a+k*Math.PI/4)]);
   s+=`<path d="M${xy(ps[0])}Q${xy(ps[1])} ${xy(ps[2])}" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
   if(active)s+=text(q[0]+9,q[1]+3,`${i+1}`,'rfp-small');s+='</g>';
  });
  exemplars.forEach((ex,j)=>{
   const x=300+j*210,active=j===focus;
   s+=`<g data-rfp-exemplar="${j}" role="button" tabindex="0" aria-label="Select learned ${ex.label} exemplar" aria-pressed="${active}"><rect class="rfp-exemplar-card" x="${x-44}" y="3" width="88" height="83" rx="6"/>`;
   s+=text(x,17,'Exemplar','rfp-title','middle')+`<image data-rfp-exemplar-image="${ex.index}" href="${ex.image}" x="${x-25}" y="21" width="50" height="50"/>`+text(x,79,active?'Selected ✓':'Select →','rfp-action','middle')+'</g>';
   if(links)s+=line([x,91],[x,119],active&&stage>=4?blue:teal,1.3,active?1:.4,active&&stage===4);
   s+=`<circle cx="${x}" cy="91" r="4.5" fill="${active?teal:'#a8b8af'}"/><rect x="${x-4}" y="120" width="8" height="8" fill="${navy}" opacity="${active?1:.4}"/>`+text(x+10,128,'AND','rfp-sub');
   if(links&&active&&stage===4)s+=signal([x,119],[x,91]);
  });
  const guide=(y,label,sub,z)=>text(28,y,label,'rfp-label')+text(28,y+17,sub,'rfp-sub')+line([199,y-4],proj(28,28,z),'#b9c8c0',.8);
  s+=text(28,35,'Learned exemplars','rfp-label')+text(28,53,'One variable per exemplar','rfp-sub');
  s+=guide(174,'Landmark pools',`${featurePools.length} use ${F.name} · digit ${exemplar.label}`,heights.pool);
  s+=guide(304,'Higher-level feature maps',combinedParts?'8 bend types · combined view':`${F.name} · 8 bend maps`,heights.part);
  s+=guide(434,'Edge feature maps',combinedEdges?'16 directions · combined view':'16 orientation filters',heights.edge);
  s+=text(450,640,`Observed image · blue marks ${F.name} responses`,'rfp-title','middle');
  // A smaller inset leaves the compact three-exemplar graph as the main view.
  s+=`<rect x="710" y="278" width="176" height="260" rx="6" fill="#fcfdfb" stroke="#c6d9cc"/>`;
  s+=text(723,300,'ONE TYPE, MANY LOCATIONS','rfp-mini')+text(723,322,`${F.name} = three edge parts`,'rfp-title');
  F.parts.forEach((p,i)=>{
   const t=p.f*Math.PI/8+Math.PI/2,x=796+p.dc*1.5,y=356+p.dr*1.5;
   s+=line([x-5*Math.cos(t),y-5*Math.sin(t)],[x+5*Math.cos(t),y+5*Math.sin(t)],inks[i],2.8);
  });
  s+=text(723,385,`${detections.length} response positions in input`,'rfp-sub');
  s+=text(723,402,`${featurePools.length} landmark${featurePools.length===1?' uses':'s use'} this map in digit ${exemplar.label}`,'rfp-sub');
  s+=`<svg x="748" y="411" width="100" height="100" viewBox="40 40 120 120" aria-label="Locations of the selected higher-level feature on the input image"><image href="${test.image}" width="200" height="200"/>`;
  for(const [r,c] of detections)s+=`<circle cx="${c}" cy="${r}" r="1.5" fill="#23a5d5"/>`;
  s+='</svg>';
  s+=text(723,526,pool?`Landmark ${inspectedPool+1}: ${pool.candidates.length} nearby responses`:'Blue dots: detected image locations','rfp-sub');
  $('rfp-canvas').innerHTML=s;
  $('rfp-canvas').setAttribute('aria-label',`Fig. 6 prime. Three exemplars: 0, 3, and 7. Digit ${exemplar.label} selected. ${F.name}: ${detections.length} response positions and ${featurePools.length} matching landmarks, out of ${model.pools.length} exemplar-specific pools. Stage ${stage}.`);
  $('rfp-exemplar-label').textContent=`Digit ${exemplar.label}`;$('rfp-exemplar-count').textContent=`${focus+1} / 3 exemplars`;
  $('rfp-feature-name').textContent=`${F.name} / 8`;
  $('rfp-orientation').textContent=`${channel*22.5}° filter`;$('rfp-channel-count').textContent=`${channel+1} / 16 filters`;
  $('rfp-run').textContent=timer!==null?'Pause Forward Pass':stage===5?'Run Forward Pass ↻':stage>0?'Resume Forward Pass':'Run Forward Pass ↑';
  $('rfp-reset').hidden=stage===0;
  const titles=[`${F.name}: ${detections.length} response positions, ${featurePools.length} landmark${featurePools.length===1?'':'s'}`,'Collect the oriented edges','Edges combine into bends','Bend responses reach the landmark pools','Evidence travels to the exemplar',`${supported} of ${model.pools.length} bend landmarks have nearby support`];
  const bodies=[
   'Blue dots show every detected position. Highlighted landmarks use this feature type; each connects only to responses inside its own spatial pool.',
   'The sixteen edge channels share one view during the forward pass.',
   'Three edge parts in a compatible arrangement activate each bend response.',
   'Each landmark collects nearby responses from its own bend map. Green has support; red has none.',
   `The pooled evidence now reaches the selected ${exemplar.label} exemplar.`,
   'This traces bottom-up feature and pooling evidence. It does not score a joint fit under lateral constraints.'
  ];
  $('rfp-stage-title').textContent=titles[stage];$('rfp-story').textContent=bodies[stage];
  animateSignals();
 }
 function tick(){stage++;if(stage===5)stop();else timer=setTimeout(tick,timing[stage]);render();}
 $('rfp-run').addEventListener('click',()=>{
  if(timer!==null){stop();render();return;}if(stage===5)stage=0;
  if(reducedMotion){stage=5;render();return;}tick();
 });
 $('rfp-reset').addEventListener('click',()=>{stop();stage=0;render();});
 $('rfp-exemplar-next').addEventListener('click',()=>chooseExemplar((focus+1)%3));
 $('rfp-next-feature').addEventListener('click',()=>chooseFeature((feature+1)%8));
 $('rfp-channel-next').addEventListener('click',()=>{stop();stage=0;channel=(channel+1)%16;edgeMode='filter';render('filter');});
 $('rfp-links').addEventListener('change',e=>{links=e.target.checked;render();});
 function pick(e){
  const exemplar=e.target.closest('[data-rfp-exemplar]'),pool=e.target.closest('[data-rfp-pool]'),point=e.target.closest('[data-rfp-response]');
  if(exemplar)chooseExemplar(Number(exemplar.dataset.rfpExemplar));
  else if(pool)chooseFeature(Number(pool.dataset.rfpPoolFeature),Number(pool.dataset.rfpPool));
  else if(point){stop();responseInspected=true;response=point.dataset.rfpResponse.split(':').map(Number);render();}
 }
 $('rfp-canvas').addEventListener('click',pick);
 $('rfp-canvas').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}});
 render();
})(window);
