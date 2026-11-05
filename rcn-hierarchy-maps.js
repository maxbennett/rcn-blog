(function(root){
 'use strict';
 const $=id=>document.getElementById(id),figure=$('rcn-forward-graph-prime'),M=root.RCNHierarchyMaps;
 if(!figure||!M||!root.RCNHierarchyTraining||!root.RCNHierarchyLaterals||!root.RCNForwardData)return;
 const test=root.RCNForwardData.tests[root.RCNHierarchyLaterals.inputIndex],exemplars=root.RCNHierarchyTraining.exemplars;
 const models=exemplars.map(e=>M.create(e.edgelets,test.edgelets));
 const laterals=root.RCNHierarchyLaterals.exemplars;
 const traces=models.map((m,k)=>{
  const frames=M.progression(m,laterals[k]),ready=frames[0],last=frames.at(-1);
  return [ready,{...ready,kind:'edges'},{...ready,kind:'bends'},...frames.slice(1,-1),{...last,kind:'exemplar'},last];
 });
 const frameNow=()=>traces[focus][stage];
 const input=models[0].input,blue='#0f67a2',teal='#548c87',navy='#032f56',gold='#987143',miss='#b76356';
 const inks=[blue,teal,gold],heights={edge:112,part:230,pool:355};
 const reducedMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const timing={edges:220,bends:500,evidence:220,lateral:100,settled:150,readout:550,exemplar:200,score:0};
 const duration=()=>frameNow().kind==='lateral'?Math.min(100,1100/traces[focus].filter(f=>f.kind==='lateral').length):timing[frameNow().kind];
 let focus=0,feature=3,stage=0,timer=null,motionFrame=0,links=true,inspectedPool=null;
 let response=models[0].pools.find(p=>p.feature===feature&&p.candidates.length)?.candidates[0]||input.responses[feature].points[0];
 const proj=(r,c,z=0)=>[450+2.15*(c-100)+.85*(r-100),552+.54*(r-100)-.28*(c-100)-z];
 const xy=p=>p.map(v=>v.toFixed(2)).join(' ');
 const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;
 function line(a,b,ink,width=1,opacity=1,pulse=false){
  return `<path d="M${xy(a)}L${xy(b)}" fill="none" stroke="${ink}" stroke-width="${width}" opacity="${opacity}" pointer-events="none" ${pulse?`class="rfp-flow" marker-end="url(#rfp-arrow-${Math.max(0,inks.indexOf(ink))})"` : ''}/>`;
 }
 function signal(a,b,delay=0,ink=blue){
  if(timer===null||reducedMotion)return '';
  return `<circle data-rfp-motion="${[...a,...b].join(':')}" data-rfp-delay="${delay}" cx="${a[0]}" cy="${a[1]}" r="2.7" fill="${ink}" stroke="white" stroke-width=".7" pointer-events="none"/>`;
 }
 function fitLine(a,b,oldA,oldB,ink,width=1,opacity=1,pulse=false){
  const base=line(a,b,ink,width,opacity,pulse);
  return frameNow().kind==='readout'&&timer!==null&&!reducedMotion?base.replace('/>',`data-rfp-line-from="${[...oldA,...oldB].join(':')}" data-rfp-line-to="${[...a,...b].join(':')}"/>`):base;
 }
 function fitOffset(before,after){
  return frameNow().kind==='readout'&&timer!==null&&!reducedMotion?`data-rfp-fit-offset="${before[0]-after[0]}:${before[1]-after[1]}"`:'';
 }
 const plane=(z,fill,stroke,opacity=1)=>`<path d="M${[proj(28,28,z),proj(28,172,z),proj(172,172,z),proj(172,28,z)].map(xy).join('L')}Z" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1"/>`;
 function edge(f,r,c,z,ink,width=1.5,len=2.6){
  const t=f*Math.PI/8+Math.PI/2;
  return line(proj(r-len*Math.sin(t),c-len*Math.cos(t),z),proj(r+len*Math.sin(t),c+len*Math.cos(t),z),ink,width);
 }
 const contour=(id,project,ink,width=1.4)=>`<path d="M${M.features[id].outline.map(p=>xy(project(p))).join('L')}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
 const glyph=(id,r,c,z,ink,width=1.4)=>contour(id,p=>proj(r+p.dr,c+p.dc,z),ink,width);
 const icon=(id,x,y,scale,ink,width=2)=>contour(id,p=>[x+p.dc*scale,y+p.dr*scale],ink,width);
 const familyNames={corner:'Corners',arc:'Arcs',line:'Long lines'};
 const exampleFor=family=>models[focus].pools.find(p=>M.features[p.feature].family===family&&p.candidates.length)?.feature??M.features.find(f=>f.family===family&&input.responses[f.id].points.length)?.id??M.features.find(f=>f.family===family).id;
 // All planes share image coordinates and the original isometric projection.
 const edgeZ=slot=>heights.edge-slot*20;
 const edgePoint=(slot,r,c)=>proj(r,c,edgeZ(slot));
 const edgeMaps=Array.from({length:16},(_,f)=>[f,(f+15)%16,(f+1)%16].flatMap(ch=>[...input.raw[ch]].map(k=>[ch,Math.floor(k/200),k%200])));
 function animateSignals(){
  if(motionFrame)root.cancelAnimationFrame(motionFrame);
  motionFrame=0;if(!root.requestAnimationFrame||timer===null||reducedMotion)return;
  const dots=[...$('rfp-canvas').querySelectorAll('[data-rfp-motion]')].map(el=>({el,p:el.dataset.rfpMotion.split(':').map(Number),delay:Number(el.dataset.rfpDelay)}));
  const movingLines=[...$('rfp-canvas').querySelectorAll('[data-rfp-line-from]')].map(el=>({el,from:el.dataset.rfpLineFrom.split(':').map(Number),to:el.dataset.rfpLineTo.split(':').map(Number)}));
  const movingNodes=[...$('rfp-canvas').querySelectorAll('[data-rfp-fit-offset]')].map(el=>({el,offset:el.dataset.rfpFitOffset.split(':').map(Number)}));
  if(!dots.length&&!movingLines.length&&!movingNodes.length)return;
  let start=null;
  const frameDuration=Math.max(25,duration()-20);
  function animate(now){
   if(start===null)start=now;
   let moving=false;
   dots.forEach(({el,p,delay})=>{
    const t=Math.max(0,Math.min(1,(now-start-delay)/(frameDuration-delay))),u=t*t*(3-2*t);
    el.setAttribute('cx',p[0]+u*(p[2]-p[0]));el.setAttribute('cy',p[1]+u*(p[3]-p[1]));
    el.setAttribute('opacity',t===1?'0':'1');if(t<1)moving=true;
   });
   const t=Math.min(1,(now-start)/frameDuration),u=t*t*(3-2*t);
   movingLines.forEach(({el,from,to})=>{const p=from.map((v,i)=>v+u*(to[i]-v));el.setAttribute('d',`M${p[0]} ${p[1]}L${p[2]} ${p[3]}`);});
   movingNodes.forEach(({el,offset})=>el.setAttribute('transform',`translate(${offset[0]*(1-u)} ${offset[1]*(1-u)})`));
   if(t<1&&(movingLines.length||movingNodes.length))moving=true;
   motionFrame=moving?root.requestAnimationFrame(animate):0;
  }
  movingLines.forEach(({el,from})=>el.setAttribute('d',`M${from[0]} ${from[1]}L${from[2]} ${from[3]}`));
  movingNodes.forEach(({el,offset})=>el.setAttribute('transform',`translate(${offset[0]} ${offset[1]})`));
  motionFrame=root.requestAnimationFrame(animate);
 }
 function stop(){if(timer!==null)clearTimeout(timer);timer=null;}
 function chooseResponse(){
  const pool=models[focus].pools[inspectedPool]||models[focus].pools.find(p=>p.feature===feature&&p.candidates.length);
  response=pool?.candidates[0]||input.responses[feature].points[0]||null;
 }
 function chooseFeature(id,poolIndex=null){stop();if(poolIndex===null)stage=0;feature=id;inspectedPool=poolIndex;chooseResponse();render(poolIndex===null?'feature':'');}
 function chooseExemplar(id){stop();stage=0;focus=id;inspectedPool=null;chooseResponse();render('exemplar');}
 function render(swap=''){
  const model=models[focus],exemplar=exemplars[focus],F=M.features[feature],pool=model.pools[inspectedPool];
  const frame=frameNow(),phase=frame.kind,moving=phase==='lateral',revealed=['settled','readout','exemplar','score'].includes(phase),done=phase==='score';
  const poolPoint=i=>proj(...frame.positions[i],heights.pool),storedPoint=i=>proj(model.pools[i].r,model.pools[i].c,heights.pool);
  const updating=new Set(moving?frame.edges.flatMap(([a,b])=>[a,b]):[]);
  const featurePools=model.pools.filter(p=>p.feature===feature),detections=input.responses[feature].points;
  const channels=[...new Set(F.parts.map(p=>p.f))],witnesses=response?M.witnesses(input,F,...response):[];
  const partIds=[feature,...M.families.filter(f=>f!==F.family).map(exampleFor)],combinedParts=stage>=2;
  const selectedPoint=response?proj(...response,heights.part):null,supported=revealed?frame.evidence.filter(v=>v>0).length:model.pools.filter(p=>p.candidates.length).length;
  Object.assign(figure.dataset,{stage:String(stage),phase,feature:String(feature),exemplar:String(exemplar.index),edgeChannels:channels.join(':'),matchingPools:String(featurePools.length),detections:String(detections.length),inspectedPool:inspectedPool===null?'':String(inspectedPool)});
  let s=`<defs><clipPath id="rfp-image-clip"><path d="M${[proj(28,28),proj(28,172),proj(172,172),proj(172,28)].map(xy).join('L')}Z"/></clipPath>${inks.map((ink,i)=>`<marker id="rfp-arrow-${i}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L4 2.5L0 5" fill="none" stroke="${ink}" stroke-width="1"/></marker>`).join('')}</defs>`;
  s+=plane(0,'#f7fafb','#c4d1d8');
  s+=`<g clip-path="url(#rfp-image-clip)"><image href="${test.image}" width="200" height="200" transform="matrix(2.15 -.28 .85 .54 150 526)"/></g>`;
  // The same spatial response positions are marked on the original image.
  // Dense neighboring dots are response locations, not separate objects.
  s+='<g pointer-events="none">';
  for(const [r,c] of detections){const p=proj(r,c);s+=`<circle data-rfp-image-detection="${feature}:${r}:${c}" cx="${p[0]}" cy="${p[1]}" r="1.5" fill="#23a5d5"/>`;}
  s+='</g>';
  // Show the bank as a 3D stack, with every required edge orientation lit.
  s+=`<g opacity=".3">`+plane(heights.edge-60,'none','#bdcbd1')+plane(heights.edge-68,'none','#bdcbd1')+'</g>';
  for(let slot=channels.length-1;slot>=0;slot--){
   const f=channels[slot],ink=inks[slot],z=edgeZ(slot);
   s+=`<g data-rfp-edge-map="${f}" data-rfp-component="${slot}" class="${swap==='feature'?'rfp-map-change':stage===1?'rfp-edge-gather':''}">`+plane(z,'#eaf2f6',ink,.1);
   s+='<g opacity=".65">';
   for(const [ch,r,c] of edgeMaps[f])s+=`<g data-rfp-edge-detection="${slot}:${ch}:${r}:${c}">`+edge(ch,r,c,z,ink,1.1,2.3)+'</g>';
   s+='</g>';
   const p=proj(28,28,z),a=f*Math.PI/8+Math.PI/2;
   s+=`<rect x="${p[0]+5}" y="${p[1]-12}" width="59" height="17" rx="3" fill="white" fill-opacity=".92" stroke="${ink}" stroke-opacity=".35"/>`;
   s+=line([p[0]+16-5*Math.cos(a),p[1]-4-5*Math.sin(a)],[p[0]+16+5*Math.cos(a),p[1]-4+5*Math.sin(a)],ink,2);
   s+=`<text x="${p[0]+27}" y="${p[1]}" style="fill:${ink};font-size:9px">${f*22.5}°</text></g>`;
  }
  const paintMap=(id,z,active)=>{
   let out=`<g data-rfp-feature-map="${id}">`;
   if(active)for(const p of pool?[pool]:featurePools){
    const q=[proj(p.r-12.5,p.c-12.5,z),proj(p.r-12.5,p.c+12.5,z),proj(p.r+12.5,p.c+12.5,z),proj(p.r+12.5,p.c-12.5,z)];
    out+=`<path data-rfp-footprint="${model.pools.indexOf(p)}" d="M${q.map(xy).join('L')}Z" fill="${teal}" fill-opacity=".045" stroke="${teal}" stroke-opacity=".5" stroke-width=".9" stroke-dasharray="4 3"/>`;
   }
   // Every positive location is displayed. Only the large explanatory contour
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
   const z=heights.part-slot*12;
   s+=`<g opacity="${slot===0?1:.23}" class="${swap==='feature'?'rfp-map-change':''}">`+plane(z,'#f2f6ec',teal,.8)+paintMap(partIds[slot],z,slot===0)+'</g>';
  }
  // Show one complete composition at a time. Draw it after the map surfaces,
  // so neither end disappears behind a sheet. Every wire meets an actual edge.
  if(links)witnesses.forEach((w,i)=>{
   const slot=channels.indexOf(w.expected.f),from=edgePoint(slot,w.observed.r,w.observed.c),ink=inks[slot];
   s+=`<g data-rfp-composition="${i}:${w.expected.f}:${w.observed.f}:${w.observed.r}:${w.observed.c}:${response.join(':')}" pointer-events="none">`;
   s+=line(from,selectedPoint,'white',3,.85)+line(from,selectedPoint,ink,1.25,.8,stage===2);
   s+=`<circle data-rfp-witness="${w.observed.f}:${w.observed.r}:${w.observed.c}" cx="${from[0]}" cy="${from[1]}" r="4.2" fill="white" stroke="${ink}" stroke-width="1.1"/>`;
   s+=edge(w.observed.f,w.observed.r,w.observed.c,edgeZ(slot),ink,2,3);
   if(stage===2)s+=signal(from,selectedPoint,i*30,ink);
   s+='</g>';
  });
  if(response)s+=`<circle data-rfp-selected-response="${response.join(':')}" pointer-events="none" cx="${selectedPoint[0]}" cy="${selectedPoint[1]}" r="5.5" fill="none" stroke="${blue}" stroke-width="1.5"/>`;
  if(response&&!moving&&!revealed){
   s+=text(selectedPoint[0]+9,selectedPoint[1]-9,stage===2?'Edges → '+F.family:'Inspect this '+F.family,'rfp-small');
   if(stage===2)s+=`<g class="rfp-assembly">`+glyph(feature,...response,heights.part,blue,2.6)+'</g>';
  }
  // Each exemplar has its OWN training-derived pool locations, over the shared
  // bank of part maps. No upper pool reads directly from the edge level.
  if(links)model.pools.forEach((p,i)=>{
   if(!combinedParts&&p.feature!==feature)return;
   const to=poolPoint(i),points=revealed?(frame.evidence[i]>0?[(frame.chosenPositions||frame.positions)[i]]:[]):p.candidates;
   // A faint cone shows the structural pool window even when it contains no
   // positive responses. Solid wires below always originate at real detections.
   if(!combinedParts){
    const corners=[proj(p.r-12.5,p.c-12.5,heights.part),proj(p.r-12.5,p.c+12.5,heights.part),proj(p.r+12.5,p.c+12.5,heights.part),proj(p.r+12.5,p.c-12.5,heights.part)];
    s+=`<g data-rfp-receptive-field="${i}" stroke-dasharray="3 4">`+corners.map(from=>line(from,to,teal,.7,.17)).join('')+'</g>';
   }
   points.forEach(([r,c])=>{
    const from=proj(r,c,heights.part),active=p.feature===feature,q=(r-p.r+12)*25+c-p.c+12;
    const weight=frame.positionScores&&!revealed?1/(1+frame.bestScores[i]-frame.positionScores[i][q]):1;
    const emphasis=moving&&updating.has(i),opacity=revealed?.65:moving?(emphasis?.08+.7*weight:.015+.08*weight):stage===3?.22:active?.24:.1;
    s+=`<g data-rfp-pool-link="${p.feature}:${r}:${c}" data-rfp-target-pool="${i}" data-rfp-source-level="higher" data-rfp-weight="${weight}">`+fitLine(from,to,from,storedPoint(i),emphasis?blue:teal,revealed?1.3:active?1:.7,opacity,stage===3)+'</g>';
   });
   if(stage===3&&p.candidates.length)s+=signal(proj(...p.candidates[0],heights.part),to,Math.min(i*5,110));
  });
  for(let depth=2;depth>=0;depth--){
   const active=depth===0;
   s+=`<g data-rfp-network="${exemplars[(focus+depth)%3].index}" opacity="${active?1:.16}" class="${swap==='exemplar'?'rfp-sheet-rise':''}">`+plane(heights.pool-depth*10,'#eaf2eb','#a8c4b3',.3)+'</g>';
  }
  if(links)exemplars.forEach((ex,j)=>{
   const active=j===focus,to=[300+j*210,124];
   s+=`<g data-rfp-exemplar-links="${ex.index}" opacity="${active?1:.11}">`;
   models[j].pools.forEach(p=>{
    const i=models[j].pools.indexOf(p),from=active?poolPoint(i):proj(p.r,p.c,heights.pool-(j-focus+3)%3*10);
    s+=fitLine(from,to,active?storedPoint(i):from,to,active&&phase==='exemplar'?blue:teal,.85,active?((combinedParts||p.feature===feature)?.3:.045):.3,active&&phase==='exemplar');
    if(active&&phase==='exemplar')s+=signal(from,to);
   });s+='</g>';
  });
  // The same dependency-ordered tree messages as Fig. 6, now acting on part
  // placements. Geometry remains fixed until the joint assignment is settled.
  if(links)laterals[focus].tree.forEach(([a,b,rho])=>{
   const pa=poolPoint(a),pb=poolPoint(b),oldA=storedPoint(a),oldB=storedPoint(b);
   const sending=moving&&frame.edges.some(([aa,bb])=>aa===a&&bb===b);
   s+=`<g data-rfp-lateral="${a}:${b}" data-rfp-rho="${rho}">`+fitLine(pa,pb,oldA,oldB,blue,sending?2.7:1,sending?1:combinedParts?.4:.18,sending);
   const mid=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2],oldMid=[(oldA[0]+oldB[0])/2,(oldA[1]+oldB[1])/2];
   s+=`<g ${fitOffset(oldMid,mid)}><rect class="rfp-lateral-factor" data-rfp-active-factor="${sending}" x="${mid[0]-2.8}" y="${mid[1]-2.8}" width="5.6" height="5.6" fill="${blue}" stroke="white" stroke-width=".6"/></g>`;
   if(sending)s+=`<g data-rfp-message="${a}:${b}">`+signal(pa,pb)+'</g>';
   s+='</g>';
  });
  model.pools.forEach((p,i)=>{
   const q=poolPoint(i),stored=storedPoint(i),active=p.feature===feature,on=frame.evidence[i]===undefined?p.candidates.length>0:frame.evidence[i]>0,ink=stage>=3&&!on?miss:active?blue:teal,inspected=i===inspectedPool;
   const fill=stage>=3?(on?'#e4efe8':'#f7e6e1'):'white';
   if(revealed)s+=line(stored,q,'#899b93',.8,.38)+`<circle cx="${stored[0]}" cy="${stored[1]}" r="4.5" fill="none" stroke="#899b93" stroke-width=".8" opacity=".35"/>`;
   s+=`<g data-rfp-pool="${i}" data-rfp-pool-feature="${p.feature}" data-rfp-map-active="${active}" data-rfp-position="${frame.positions[i].join(':')}" ${fitOffset(stored,q)} role="button" tabindex="0" aria-label="Inspect landmark ${i+1}, ${M.features[p.feature].name}, digit ${exemplar.label}" aria-pressed="${inspected}" opacity="${combinedParts||active?1:.3}" ${stage>=3?`data-rfp-supported="${on}"`:''}>`;
   if(updating.has(i))s+=`<circle cx="${q[0]}" cy="${q[1]}" r="10" fill="${blue}" fill-opacity=".12" stroke="${blue}" stroke-width=".8"/>`;
   s+=`<circle cx="${q[0]}" cy="${q[1]}" r="${inspected?8:active?6:4.5}" fill="${active&&stage<3?'#e8f2f7':fill}" stroke="${ink}" stroke-width="${active?1.8:1.1}"/>`;
   s+=icon(p.feature,q[0],q[1],.22,ink,1.2);
   if(active||updating.has(i))s+=text(q[0]+9,q[1]+3,`${i+1}`,'rfp-small');s+='</g>';
  });
  exemplars.forEach((ex,j)=>{
   const x=300+j*210,active=j===focus;
   s+=`<g data-rfp-exemplar="${j}" role="button" tabindex="0" aria-label="Select learned ${ex.label} exemplar" aria-pressed="${active}"><rect class="rfp-exemplar-card" x="${x-44}" y="3" width="88" height="83" rx="6"/>`;
   s+=text(x,17,'Exemplar','rfp-title','middle')+`<image data-rfp-exemplar-image="${ex.index}" href="${ex.image}" x="${x-25}" y="21" width="50" height="50"/>`+text(x,79,active?'Selected ✓':'Select →','rfp-action','middle')+'</g>';
   if(links)s+=line([x,119],[x,91],active&&revealed?blue:teal,1.3,active?1:.4,active&&phase==='exemplar');
   s+=`<circle cx="${x}" cy="91" r="4.5" fill="${active?teal:'#a8b8af'}"/><rect x="${x-4}" y="120" width="8" height="8" fill="${navy}" opacity="${active?1:.4}"/>`+text(x+10,128,'AND','rfp-sub');
   if(links&&active&&phase==='exemplar')s+=signal([x,119],[x,91]);
   if(active&&done)s+=`<text data-rfp-score="${frame.score}" x="${x+13}" y="104" class="rfp-title">${supported} − ${model.pools.length-supported} = ${frame.score}</text>`+text(x+13,117,'part match score','rfp-small');
  });
  const guide=(y,label,sub,z)=>text(28,y,label,'rfp-label')+text(28,y+17,sub,'rfp-sub')+line([199,y-4],proj(28,28,z),'#b9c8c0',.8);
  s+=text(28,35,'Learned exemplars','rfp-label')+text(28,53,'One variable per exemplar','rfp-sub');
  s+=guide(174,'Landmark pools',`${featurePools.length} use ${F.name} · digit ${exemplar.label}`,heights.pool);
  s+=guide(280,'Level 2 · Contour parts','Corners · arcs · long lines',heights.part);
  M.families.forEach((family,i)=>{
   const x=53+i*57,active=family===F.family,id={corner:3,arc:10,line:18}[family];
   s+=`<g data-rfp-family="${family}" role="button" tabindex="0" aria-label="Show ${familyNames[family].toLowerCase()}" aria-pressed="${active}"><rect x="${x-23}" y="306" width="49" height="48" rx="5" fill="${active?'#e6f1e9':'white'}" stroke="${active?teal:'#d1ddd5'}"/>`;
   s+=icon(id,x,325,.7,active?navy:'#7e9688',2.3)+text(x,348,family==='line'?'Lines':familyNames[family],'rfp-small','middle')+'</g>';
  });
  s+=text(28,451,'Level 1 · Local edges','rfp-label')+text(28,468,'Short, oriented fragments','rfp-sub');
  [0,2,4,6].forEach((f,i)=>{const a=f*Math.PI/8+Math.PI/2,x=47+i*38,y=494;s+=line([x-8*Math.cos(a),y-8*Math.sin(a)],[x+8*Math.cos(a),y+8*Math.sin(a)],navy,2.5);});
  s+=text(28,525,`${channels.length} edge map${channels.length===1?'':'s'} highlighted`,'rfp-sub')+text(28,542,`for the selected ${F.family}.`,'rfp-sub');
  s+=text(450,640,`Observed 5 · blue marks ${F.family} responses`,'rfp-title','middle');
  // A smaller inset leaves the compact three-exemplar graph as the main view.
  s+=`<rect x="710" y="278" width="176" height="260" rx="6" fill="#fcfdfb" stroke="#c6d9cc"/>`;
  if(moving){
   const [a,b,rho]=frame.edges[0],left=[734,350],right=[862,350];
   const wave=traces[focus].slice(0,stage+1).filter(f=>f.kind==='lateral').length,total=traces[focus].filter(f=>f.kind==='lateral').length;
   s+=text(723,300,`LATERAL WAVE ${wave} / ${total}`,'rfp-mini')+text(723,322,`Landmark ${a+1} → landmark ${b+1}`,'rfp-title');
   s+=line(left,right,blue,1.8,1,true)+signal(left,right);
   s+=`<circle cx="734" cy="350" r="7" fill="white" stroke="${teal}" stroke-width="1.5"/><rect x="794" y="345" width="10" height="10" fill="${blue}"/><circle cx="862" cy="350" r="7" fill="white" stroke="${teal}" stroke-width="1.5"/>`;
   s+=text(723,382,`Shift difference ≤ ${rho} pixels`,'rfp-sub')+text(723,398,'on each image axis.','rfp-sub');
   const receiver=model.pools[b],cell=3.4,gx=723,gy=412;
   for(let y=0;y<25;y++)for(let x=0;x<25;x++){
    const q=y*25+x,r=receiver.r+y-12,c=receiver.c+x-12,on=input.responses[receiver.feature].values[r*200+c];
    const weight=1/(1+frame.bestScores[b]-frame.positionScores[b][q]);
    s+=`<rect data-rfp-receiver-state="${b}:${q}" x="${gx+x*cell}" y="${gy+y*cell}" width="3" height="3" fill="${on?teal:'#c5cec8'}" opacity="${.12+.88*weight}"/>`;
   }
   s+=text(818,438,'Receiving pool','rfp-small')+text(818,455,'625 positions','rfp-small')+text(818,478,'Darker =','rfp-small')+text(818,492,'higher score','rfp-small');
   s+=text(723,526,`${frame.edges.length} message${frame.edges.length===1?'':'s'} in this wave`,'rfp-sub');
  }else if(revealed){
   s+=text(723,300,phase==='settled'?'JOINT CHOICES SETTLED':'THE JOINT FIT','rfp-mini');
   s+=`<circle cx="728" cy="327" r="4" fill="#e4efe8" stroke="${teal}"/>`+text(740,331,`${supported} matched part landmarks`,'rfp-sub');
   s+=`<circle cx="728" cy="351" r="4" fill="#f7e6e1" stroke="${miss}"/>`+text(740,355,`${model.pools.length-supported} without part support`,'rfp-sub');
   s+=text(723,387,`${supported} − ${model.pools.length-supported} = ${frame.score}`,'rfp-title')+text(723,405,'All tree constraints satisfied.','rfp-sub');
   const positions=frame.chosenPositions||frame.positions;
   s+=`<svg x="748" y="414" width="100" height="100" viewBox="40 40 120 120" aria-label="Jointly selected part positions on the input"><image href="${test.image}" width="200" height="200"/>`;
   for(const [a,b] of laterals[focus].tree)s+=line([positions[a][1],positions[a][0]],[positions[b][1],positions[b][0]],teal,.7,.5);
   positions.forEach(([r,c],i)=>{s+=`<circle cx="${c}" cy="${r}" r="2.4" fill="${frame.evidence[i]>0?teal:miss}" stroke="white" stroke-width=".6"/>`;});
   s+='</svg>'+text(723,526,'Faint outlines: stored positions','rfp-sub');
  }else{
  s+=text(723,300,'EDGES BECOME A PART','rfp-mini')+text(723,322,F.name,'rfp-title');
  F.parts.forEach((p,i)=>{
   const t=p.f*Math.PI/8+Math.PI/2,x=796+p.dc*1.35,y=357+p.dr*1.35,ink=inks[channels.indexOf(p.f)];
   s+=line([x-4*Math.cos(t),y-4*Math.sin(t)],[x+4*Math.cos(t),y+4*Math.sin(t)],ink,2.8);
  });
  s+=text(723,383,`${F.parts.length} edges · ${channels.length} orientation${channels.length===1?'':'s'}`,'rfp-sub');
  s+=text(723,400,`${detections.length} response position${detections.length===1?'':'s'} in input`,'rfp-sub');
  s+=text(723,417,`${featurePools.length} landmark${featurePools.length===1?' uses':'s use'} this map in digit ${exemplar.label}`,'rfp-sub');
  s+=`<svg x="748" y="424" width="85" height="85" viewBox="40 40 120 120" aria-label="Locations of the selected higher-level feature on the input image"><image href="${test.image}" width="200" height="200"/>`;
  for(const [r,c] of detections)s+=`<circle cx="${c}" cy="${r}" r="1.5" fill="#23a5d5"/>`;
  s+='</svg>';
  s+=text(723,526,pool?`Landmark ${inspectedPool+1}: ${pool.candidates.length} nearby responses`:'Click a blue dot to trace its inputs','rfp-sub');
  }
  $('rfp-canvas').innerHTML=s;
  $('rfp-canvas').setAttribute('aria-label',`Fig. 6 prime. Three exemplars: 5, 3, and 7. Digit ${exemplar.label} selected. ${F.name}: ${detections.length} response position${detections.length===1?'':'s'} and ${featurePools.length} matching landmark${featurePools.length===1?'':'s'}, out of ${model.pools.length} exemplar-specific pools. Stage ${stage}.`);
  $('rfp-exemplar-label').textContent=`Digit ${exemplar.label}`;$('rfp-exemplar-count').textContent=`${focus+1} / 3 exemplars`;
  $('rfp-feature-name').textContent=`${F.name} · ${feature+1} / ${M.features.length}`;
  $('rfp-run').textContent=timer!==null?'Pause Forward Pass':done?'Run Forward Pass ↻':stage>0?'Resume Forward Pass':'Run Forward Pass ↑';
  $('rfp-reset').hidden=stage===0;
  const titles={ready:`${F.name}: ${detections.length} response position${detections.length===1?'':'s'}, ${featurePools.length} landmark${featurePools.length===1?'':'s'}`,edges:'Collect short edge fragments',bends:'Edges become a '+F.family,evidence:'Keep every supported part position',lateral:'Lateral messages coordinate the part landmarks',settled:'The joint choices are settled',readout:'Reveal the jointly chosen shape',exemplar:'Evidence reaches the exemplar',score:`Part match score: ${frame.score}`};
  const bodies={
   ready:response?`${F.name} combines ${F.parts.length} edge fragments from ${channels.length} highlighted map${channels.length===1?'':'s'}. Click a blue response dot to trace another occurrence.`:`No ${F.name.toLowerCase()} responses in this image. Its ${channels.length} contributing edge maps remain highlighted; try another orientation or feature family.`,
   edges:`The highlighted edge maps supply the selected ${F.family}. Each plane records a different edge orientation at the same image coordinates.`,
   bends:`Colored fragments feed the highlighted ${F.family}, creating a larger contour part. All corner, arc, and line maps are evaluated for the forward pass.`,
   evidence:'Each landmark keeps all nearby part responses as candidates. Lateral constraints will coordinate their placements.',
   lateral:'Blue pulses carry scores for all 625 placements to neighboring pools. Stronger wires mark better-supported candidates; the landmarks stay at their stored positions.',
   settled:'The tree pass has selected a compatible joint arrangement. Match colors are now fixed; next we reveal the chosen positions.',
   readout:'The part landmarks move together into their selected positions. Their relative shifts obey the lateral limits; faint outlines mark the stored positions.',
   exemplar:`The ${exemplar.label} exemplar receives the score of its best compatible arrangement of contour parts.`,
   score:`${supported} matched parts − ${model.pools.length-supported} unmatched. This is the optimal fit on the displayed tree for these illustrative contour features.`
  };
  $('rfp-stage-title').textContent=titles[phase];$('rfp-story').textContent=bodies[phase];
  animateSignals();
 }
 function tick(){stage++;if(stage===traces[focus].length-1)stop();else timer=setTimeout(tick,duration());render();}
 $('rfp-run').addEventListener('click',()=>{
  if(timer!==null){stop();render();return;}if(stage===traces[focus].length-1)stage=0;
  if(reducedMotion){stage=traces[focus].length-1;render();return;}tick();
 });
 $('rfp-reset').addEventListener('click',()=>{stop();stage=0;render();});
 $('rfp-exemplar-next').addEventListener('click',()=>chooseExemplar((focus+1)%3));
 $('rfp-next-feature').addEventListener('click',()=>chooseFeature((feature+1)%M.features.length));
 $('rfp-links').addEventListener('change',e=>{links=e.target.checked;render();});
 $('rfp-show-lateral').addEventListener('change',e=>{figure.dataset.lateralNodes=String(e.target.checked);});
 function pick(e){
  const family=e.target.closest('[data-rfp-family]'),exemplar=e.target.closest('[data-rfp-exemplar]'),pool=e.target.closest('[data-rfp-pool]'),point=e.target.closest('[data-rfp-response]');
  if(family)chooseFeature(exampleFor(family.dataset.rfpFamily));
  else if(exemplar)chooseExemplar(Number(exemplar.dataset.rfpExemplar));
  else if(pool)chooseFeature(Number(pool.dataset.rfpPoolFeature),Number(pool.dataset.rfpPool));
  else if(point){stop();response=point.dataset.rfpResponse.split(':').map(Number);render();}
 }
 $('rfp-canvas').addEventListener('click',pick);
 $('rfp-canvas').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}});
 render();
})(window);
