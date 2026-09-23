(function(global){
 'use strict';
 const $=id=>document.getElementById(id),figure=$('rcn-forward-graph');
 const data=global.RCNForwardData,learned=global.RCNLearningData;if(!figure||!data||!learned)return;
 let focus=0,inspectedPool=null,channel=0,indicatorAngle=null,round=0,timer=null;
 const reducedMotion=global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const timing={evidence:450,lateral:65,settled:350,readout:850,score:80};
 const step=3,completed=new Map(),traces=new Map();
 const traceFor=k=>{if(!traces.has(k))traces.set(k,global.RCNForwardModel.progression(data.tests[0],learned.exemplars[k],data.trees[k]));return traces.get(k);};
 const frameNow=()=>traceFor(candidates()[focus])[round];
 const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
 const reset=()=>{stop();round=0;inspectedPool=null;};
 const missInk='#b76356',messageInk='#0f67a2',lateralInk='#0f67a2',andInk='#032f56';
 const evidenceCache=new Map();
 const channelCache=new Map();
 const inks=['#548c87','#548c87','#548c87'];
 const proj=(r,c,z=0,dx=0)=>[450+2.15*(c-100)+.85*(r-100)+dx,550+.72*(r-100)-.38*(c-100)-z];
 const xy=p=>p.map(v=>v.toFixed(2)).join(' ');
 const path=(a,b,color,width=1,opacity=1,active=false)=>`<path d="M${xy(a)}L${xy(b)}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" ${active?'class="rfg-flow" marker-end="url(#rfg-up)"':''}/>`;
 const candidates=()=>[0,6,14]; // A fixed set of learned 0, 3, and 7 exemplars.
 // The channel carousel is a compact display of one feature level.
 const channelOffset=f=>(f-channel+16)%16;
 const channelHeight=f=>74-channelOffset(f)*14;
 const poolPoint=(r,c,depth=0)=>proj(r,c,225-depth*14);
 const orPoint=(f,r,c)=>proj(r,c,round>0?96:channelHeight(f)+22);
 // Drive dynamically inserted SVG motion with the same animation clock and
 // smoothstep easing as the preceding matching figure. Updating only animated
 // attributes avoids rebuilding the dense edge map on every video frame.
 let motionFrame=0;
 function playSvgAnimations(){
  if(!global.requestAnimationFrame)return;
  if(motionFrame)global.cancelAnimationFrame(motionFrame);
  const numbers=value=>(value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);
  const animations=[...$('rfg-canvas').querySelectorAll('animate, animateTransform, animateMotion')].map(el=>{
   const target=el.parentElement,duration=parseFloat(el.getAttribute('dur'))*1000;
   let apply;
   if(el.localName==='animateMotion'){
    const coordinates=numbers(el.getAttribute('path')),a=coordinates.slice(0,2),b=coordinates.length===3?[coordinates[2],a[1]]:coordinates.slice(-2);
    const points=numbers(el.getAttribute('keyPoints')||'0;1'),times=numbers(el.getAttribute('keyTimes')||'0;1');
    apply=t=>{let j=0;while(j<times.length-2&&t>times[j+1])j++;const u=(t-times[j])/(times[j+1]-times[j]),v=points[j]+u*(points[j+1]-points[j]);target.setAttribute('transform',`translate(${a[0]+v*(b[0]-a[0])} ${a[1]+v*(b[1]-a[1])})`);};
   }else{
    const attribute=el.getAttribute('attributeName'),translate=el.localName==='animateTransform';
    const values=el.getAttribute('values')?.split(';')||[el.getAttribute('from'),el.getAttribute('to')];
    const parsed=values.map(numbers),times=el.hasAttribute('keyTimes')?numbers(el.getAttribute('keyTimes')):values.map((_,i)=>i/(values.length-1));
    const smooth=el.getAttribute('calcMode')==='spline';
    apply=t=>{if(smooth)t=t*t*(3-2*t);let j=0;while(j<times.length-2&&t>times[j+1])j++;const u=(t-times[j])/(times[j+1]-times[j]);let n=0;const value=values[j+1].replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi,()=>{const i=n++;return String(parsed[j][i]+u*(parsed[j+1][i]-parsed[j][i]));});target.setAttribute(attribute,translate?`translate(${value})`:value);};
   }
   el.remove();apply(0);return {duration,apply};
  });
  if(!animations.length){motionFrame=0;return;}
  let start=null;
  const advance=time=>{if(start===null)start=time;let running=false;animations.forEach(({duration,apply})=>{const t=Math.min(1,(time-start)/duration);apply(t);if(t<1)running=true;});motionFrame=running?global.requestAnimationFrame(advance):0;};
  motionFrame=global.requestAnimationFrame(advance);
 }
 function channelMaps(test){
  if(!channelCache.has(test)){
   const maps=Array.from({length:16},()=>new Map());
   test.edgelets.forEach(([f,r,c])=>[f,(f+15)%16,(f+1)%16].forEach(ch=>maps[ch].set(`${r}:${c}`,[r,c])));
   channelCache.set(test,maps.map(m=>[...m.values()]));
  }
  return channelCache.get(test);
 }

 function poolDirection(f,p,half,ink,width=1.2){
  const t=f*Math.PI/8+Math.PI/2,dx=2.15*Math.cos(t)+.85*Math.sin(t),dy=.72*Math.sin(t)-.38*Math.cos(t),length=Math.hypot(dx,dy);
  return `<path class="rfg-pool-orientation" data-rfg-pool-filter="${f}" d="M${xy([p[0]-half*dx/length,p[1]-half*dy/length])}L${xy([p[0]+half*dx/length,p[1]+half*dy/length])}" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" pointer-events="none"/>`;
 }

 function poolInset(ex,selected,test){
  if(inspectedPool===null)return null;
  const i=inspectedPool;
  const [f,r,c]=ex.landmarks[i],frame=frameNow(),position=frame.positions[i],p=poolPoint(...position);
  if(!evidenceCache.has(test))evidenceCache.set(test,new Set(test.edgelets.map(([ff,rr,cc])=>`${ff}:${rr}:${cc}`)));
  const seen=evidenceCache.get(test),support=(rr,cc)=>[f,(f+15)%16,(f+1)%16].some(ff=>seen.has(`${ff}:${rr}:${cc}`));
  const corners=[proj(r-12.5,c-12.5,74),proj(r-12.5,c+12.5,74),proj(r+12.5,c+12.5,74),proj(r+12.5,c-12.5,74)];
  const ink=round>0&&frame.evidence[i]<0?missInk:inks[focus];
  // A translucent, unoutlined cone marks the receptive field. Its surface
  // is painted before edge marks and OR nodes so those remain above the patch.
  const footprint=`<path class="rfg-pool-footprint" d="M${corners.map(xy).join('L')}Z" fill="#e4eee5" fill-opacity=".75" stroke="${ink}" stroke-width="1.4" pointer-events="none"/>`;
  const cone=`<g class="rfg-pool-cone" pointer-events="none">${corners.map((q,n)=>`<path d="M${xy(p)}L${xy(q)}L${xy(corners[(n+1)%4])}Z" fill="${ink}" fill-opacity=".075"/>`).join('')}</g>`;
  let s=`<g class="rfg-pool-inspection" pointer-events="none" data-rfg-inspected-pool="${selected}:${i}" data-rfg-inspected-filter="${f}" data-rfg-inspected-center="${r}:${c}">`;
  s+=`<circle class="rfg-pool-selection-halo" cx="${p[0]}" cy="${p[1]}" r="11" fill="${ink}" fill-opacity=".15"/><circle cx="${p[0]}" cy="${p[1]}" r="7" fill="white" stroke="${ink}" stroke-width="2"/>`+poolDirection(f,p,5.3,ink,1.6);
  s+=`<rect x="695" y="233" width="192" height="332" rx="6" fill="#fcfdfb" stroke="#c6d9cc"/><text x="710" y="255" class="rfg-pool-inset-title">ONE FILTER, MANY POSITIONS</text><text x="710" y="278" class="rfg-callout-title">Landmark ${i+1} · digit ${ex.label}</text><text x="710" y="299" class="rfg-callout-title">${f*22.5}° edge landmark</text><text x="710" y="318" class="rfg-layer-sub">Center: row ${r}, col ${c}</text>`;
  s+=`<path d="M791 341L716 367L856 367Z" fill="${ink}" fill-opacity=".10"/><circle cx="791" cy="341" r="11" fill="white" stroke="${ink}" stroke-width="2"/>`+poolDirection(f,[791,341],8,ink,1.8)+`<text x="812" y="345" class="rfg-callout-body">pool variable</text>`;
  const cell=5.6,gx=716,gy=371,revealed=['settled','readout','score'].includes(frame.kind);
  for(let y=0;y<25;y++)for(let x=0;x<25;x++)s+=`<rect class="rfg-pool-cell" data-support="${support(r+y-12,c+x-12)?1:-1}" x="${gx+x*cell}" y="${gy+y*cell}" width="${cell-.35}" height="${cell-.35}" fill-opacity="${round>0&&!revealed&&support(r+y-12,c+x-12)?.15+.85/(1+frame.bestScores[i]-frame.positionScores[i][y*25+x]):1}" fill="${support(r+y-12,c+x-12)?inks[focus]:'#e7ede7'}"/>`;
  if(revealed){const chosen=frame.chosenPositions?.[i]||position,yy=chosen[0]-r+12,xx=chosen[1]-c+12;s+=`<rect data-rfg-chosen-state="${yy}:${xx}" x="${gx+xx*cell-.4}" y="${gy+yy*cell-.4}" width="${cell+.45}" height="${cell+.45}" fill="none" stroke="${frame.evidence[i]>0?ink:missInk}" stroke-width="1.8"/>`;}
  s+=`<text x="710" y="533" class="rfg-callout-title">25 × 25 = 625 possible positions</text><text x="710" y="554" class="rfg-callout-body">${revealed?'Outline: selected position':round>0?'Darker: higher combined score':'Color: supported candidates (+1)'}</text></g>`;
  s=s.replace('</g>', '<g data-rfg-close-inspection="true" class="rfg-inspection-close" role="button" tabindex="0" aria-label="Close landmark details and restore all connections" pointer-events="all"><rect x="860" y="233" width="28" height="28" fill="transparent"/><circle cx="874" cy="247" r="10" fill="#fcfdfb" stroke="#bdd0c4"/><path d="M870 243L878 251M878 243L870 251" stroke="#376e69" stroke-width="1.4" stroke-linecap="round"/></g></g>');
  return {footprint,cone,overlay:s};
 }

 function render(swap=0,exemplarSwap=false,previousFocus=(focus+2)%3){
  const test=data.tests[0],ks=candidates(test),selected=ks[focus],ex=learned.exemplars[selected],match=test.matches[selected];
  const frames=traceFor(selected),frame=frames[round],done=frame.kind==='score',moving=frame.kind==='lateral',revealed=done||frame.kind==='readout'||frame.kind==='settled';
  const combined=round>0,pointFor=i=>poolPoint(...frame.positions[i]);
  const previousFrame=frames[Math.max(0,round-1)];
  const updatingPools=new Set(moving?frame.edges.flatMap(([a,b])=>[a,b]):[]);
  const strength=(i,q)=>1/(1+frame.bestScores[i]-frame.positionScores[i][q]);
  const optionsFor=i=>!combined?[]:revealed?(frame.evidence[i]>0?[{r:(frame.chosenPositions||frame.positions)[i][0],c:(frame.chosenPositions||frame.positions)[i][1]}]:[]):frame.candidates[i];
  const keysFor=i=>optionsFor(i).map(p=>`${ex.landmarks[i][0]}:${p.r}:${p.c}`);
  const chosenKeys=new Set(ex.landmarks.flatMap((_,i)=>keysFor(i)));
  figure.dataset.combined=String(combined);
  const filteredKeys=i=>i===null?chosenKeys:new Set(keysFor(i));
  const updatingKeys=new Set([...updatingPools].flatMap(keysFor));
  const animateFit=frame.kind==='readout'&&timer!==null&&!reducedMotion;
  const fitLine=(a,b,oldA,oldB,color,width,opacity)=>`<path d="M${xy(a)}L${xy(b)}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}">${animateFit?`<animate attributeName="d" from="M${xy(oldA)}L${xy(oldB)}" to="M${xy(a)}L${xy(b)}" dur=".75s" calcMode="spline" keyTimes="0;1" keySplines=".333 0 .667 1" fill="freeze"/>`:''}</path>`;
  if(done)completed.set(selected,frame.score);
  figure.dataset.round=String(round);figure.dataset.phase=frame.kind;
  figure.dataset.step=String(step);figure.dataset.test='0';figure.dataset.exemplar=String(selected);
  const maps=ks.map(k=>{
   const e=learned.exemplars[k],m=test.matches[k];return new Map(e.landmarks.map(([f],i)=>[`${f}:${m.positions[i].join(':')}`,i]));
  });
  const shared=new Set();maps.forEach((map,j)=>map.forEach((_,key)=>{if(maps.some((m,i)=>i!==j&&m.has(key)))shared.add(key);}));
  const samples=ks.map((k,j)=>{
   const n=learned.exemplars[k].landmarks.length,s=new Set();
   const reference=ks.map(ref=>new Map(learned.exemplars[ref].landmarks.map(([f],i)=>[`${f}:${data.tests[0].matches[ref].positions[i].join(':')}`,i])));
   reference[j].forEach((i,key)=>{if(reference.some((m,q)=>q!==j&&m.has(key))&&s.size<7)s.add(i);});
   for(let q=0;q<8;q++)s.add(Math.floor(q*(n-1)/7));
   return [...s];
  });
  const mapsByChannel=channelMaps(test);
  const connectedKeys=new Set();
  ks.forEach((k,j)=>samples[j].forEach(i=>{const [f]=learned.exemplars[k].landmarks[i];connectedKeys.add(`${f}:${test.matches[k].positions[i].join(':')}`);}));
  // A sparse illustration of the measured positive edges. Favor examples whose
  // parent links are also illustrated; keep every shown edge paired with its OR.
  const shownEdges=mapsByChannel.map((points,f)=>{
   const ordered=[...points].sort((a,b)=>Number(connectedKeys.has(`${f}:${b.join(':')}`))-Number(connectedKeys.has(`${f}:${a.join(':')}`)));
   const chosen=[];
   ordered.forEach(([r,c])=>{
    const point=proj(r,c,74);
    if(chosen.every(([rr,cc])=>{const other=proj(rr,cc,74);return Math.hypot(point[0]-other[0],point[1]-other[1])>=10.5;}))chosen.push([r,c]);
   });
   return chosen;
  });
  const shownKeys=new Set(shownEdges.flatMap((points,f)=>points.map(([r,c])=>`${f}:${r}:${c}`)));
  const inspection=step>=1?poolInset(ex,selected,test):null;
  const plane=[proj(28,28),proj(28,172),proj(172,172),proj(172,28)];
  let s='<defs><marker id="rfg-up" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="none" stroke="#0f67a2" stroke-width="1"/></marker></defs>';
  s+=`<defs><clipPath id="rfg-image-clip"><path d="M${plane.map(xy).join('L')}Z"/></clipPath></defs>`;
  s+=`<path data-rfg-plane="image" d="M${plane.map(xy).join('L')}Z" fill="#f7fafb" stroke="#c4d1d8" stroke-width="1.3"/>`;
  s+=`<g clip-path="url(#rfg-image-clip)"><image href="${test.image}" x="0" y="0" width="200" height="200" transform="matrix(2.15 -.38 .85 .72 150 516)"/></g>`;
  // Each plane contains all spatial positions for a single orientation channel.
  // Adjacent-channel pooling mirrors Preproc(cross_channel_pooling=True).
  if(!combined){
  s+='<g class="rfg-channel-stack">';
  // The selected sheet is always on top. Preserve channel identity as the
  // stack rises; fade the outgoing sheet before revealing the new bottom one.
  const slots=swap?[swap>0?-1:3,0,1,2]:[0,1,2];
  slots.sort((a,b)=>b-a).forEach(slot=>{
   const f=(channel+slot+16)%16,active=slot===0,ghost=slot<0||slot>2;
   const before=slot+swap,wasActive=before===0,wasVisible=before>=0&&before<=2;
   const endY=slot*14,startY=before*14;
   const role=ghost?'leaving':!wasVisible?'entering':active?'arriving':'neighbor';
   const style=swap?`--rfg-from-y:${startY-endY}px;--rfg-from-opacity:${wasActive?1:wasVisible?.14:0};--rfg-to-opacity:${active?1:ghost?0:.14}`:'';
   const q=[proj(28,28,74),proj(28,172,74),proj(172,172,74),proj(172,28,74)];
   s+=`<g ${ghost?'data-rfg-departed-channel="'+f+'"':`data-rfg-channel="${f}" data-rfg-channel-active="${active}"`} transform="translate(0 ${endY})"><g class="rfg-channel-sheet${swap?' rfg-plane-slide rfg-plane-'+role:''}" data-rfg-plane-motion="${role}" style="${style}" opacity="${active?1:ghost?0:.14}"><path ${ghost?'':`data-rfg-plane="channel-${f}"`} d="M${q.map(xy).join('L')}Z" fill="#eef5f8" fill-opacity=".85" stroke="#0f67a2" stroke-width="1.4"/>`;
   if(active&&inspection)s+=inspection.cone+inspection.footprint;
   const t=f*Math.PI/8+Math.PI/2;
   shownEdges[f].forEach(([r,c])=>{
    const key=`${f}:${r}:${c}`,feat=proj(r,c,74),or=proj(r,c,96);
    s+=`<g${ghost?'':` data-rfg-edge-channel="${f}"`}>`;
    s+=path(feat,[or[0],or[1]+3.5],'#987143',.85,.65);
    const a=proj(r-3*Math.sin(t),c-3*Math.cos(t),74),b=proj(r+3*Math.sin(t),c+3*Math.cos(t),74);
    s+=`<path ${ghost?'':`data-rfg-edge-glyph="${key}" data-rfg-edge-variable="${key}" data-rfg-edge-support="1"`} d="M${xy(a)}L${xy(b)}" stroke="#032f56" stroke-width="1.8" stroke-linecap="round"/>`;
    s+=`<rect ${ghost?'':`data-rfg-or="${key}" data-rfg-shared="${shared.has(key)}"`} x="${or[0]-3.5}" y="${or[1]-3.5}" width="7" height="7" fill="#987143"/></g>`;
   });
   s+='</g></g>';
  });
  s+='</g>';
  }else{
   const corners=[proj(28,28,74),proj(28,172,74),proj(172,172,74),proj(172,28,74)];
   s+=`<g class="rfg-combined-map${round===1?' rfg-combine-in':''}" data-rfg-combined-map="true"><path data-rfg-plane="combined-features" d="M${corners.map(xy).join('L')}Z" fill="#eef5f8" fill-opacity=".85" stroke="#0f67a2" stroke-width="1.4"/>`;
   if(inspection)s+=inspection.cone+inspection.footprint;
   // All positive position-and-orientation variables are retained. Channels
   // share a drawing plane here, but their variable identities remain distinct.
   const highlighted=filteredKeys(inspectedPool),selectedGlyphs=[];
   mapsByChannel.forEach((points,f)=>points.forEach(([r,c])=>{
    const key=`${f}:${r}:${c}`,feat=proj(r,c,74),or=proj(r,c,96),t=f*Math.PI/8+Math.PI/2;
    const a=proj(r-1.8*Math.sin(t),c-1.8*Math.cos(t),74),b=proj(r+1.8*Math.sin(t),c+1.8*Math.cos(t),74);
    const sameFilter=inspectedPool===null||f===ex.landmarks[inspectedPool][0];
    s+=`<g data-rfg-edge-channel="${f}" opacity="${sameFilter?.26:.045}">`+path(feat,[or[0],or[1]+1.1],'#987143',.45,.5)+`<path data-rfg-edge-variable="${key}" data-rfg-edge-glyph="${key}" data-rfg-edge-support="1" d="M${xy(a)}L${xy(b)}" stroke="#032f56" stroke-width=".8" stroke-linecap="round"/><rect data-rfg-or="${key}" x="${or[0]-1.1}" y="${or[1]-1.1}" width="2.2" height="2.2" fill="#987143"/></g>`;
    if(highlighted.has(key))selectedGlyphs.push(`<g data-rfg-selected-or="${key}" opacity="${moving&&!inspection&&!updatingKeys.has(key)?.2:1}">`+path(feat,[or[0],or[1]+2.5],inks[focus],1.1,.85)+`<path d="M${xy(a)}L${xy(b)}" stroke="#032f56" stroke-width="1.8" stroke-linecap="round"/><rect x="${or[0]-2.7}" y="${or[1]-2.7}" width="5.4" height="5.4" fill="#987143" stroke="white" stroke-width=".6"/></g>`);
   }));
   s+=selectedGlyphs.join('')+'</g>';
  }
  // Inactive fans disappear before reaching the landmark plane. Their hidden
  // endpoints still belong to their own exemplar, not the visible pool variables.
  s+=`<defs><marker id="rfg-pool-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M1 1L5 3L1 5" fill="none" stroke="${inks[focus]}" stroke-width="1.2" stroke-linecap="round"/></marker>`;
  ks.forEach((k,j)=>{s+=`<linearGradient id="rfg-fan-fade-${k}" gradientUnits="userSpaceOnUse" x1="0" y1="158" x2="0" y2="246"><stop offset="0" stop-color="${inks[j]}" stop-opacity=".2"/><stop offset=".5" stop-color="${inks[j]}" stop-opacity=".06"/><stop offset=".85" stop-color="${inks[j]}" stop-opacity="0"/><stop offset="1" stop-color="${inks[j]}" stop-opacity="0"/></linearGradient>`;});
  s+='<marker id="rfg-message-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L4 2.5L0 5" fill="none" stroke="#0f67a2" stroke-width="1.2"/></marker></defs>';
  if(!inspection)ks.forEach((k,j)=>{
   const e=learned.exemplars[k],active=j===focus,depth=(j-focus+3)%3,and=[300+j*210,158];
   s+=`<g data-rfg-exemplar-links="${k}" data-rfg-links-active="${active}"${exemplarSwap&&active?' class="rfg-channel-wiring-in"':''}>`;
   e.landmarks.forEach(([f,r,c],i)=>{
    s+=fitLine(active?pointFor(i):poolPoint(r,c,depth),and,active?poolPoint(...previousFrame.positions[i]):poolPoint(r,c,depth),and,active?inks[j]:`url(#rfg-fan-fade-${k})`,.65,active?.16:1);
   });
   if(active&&done){const root=data.trees[k].at(-1)[1];s+=path(pointFor(root),and,messageInk,1.8,.95,true);}
   s+='</g>';
  });
  if(combined){
   ex.landmarks.forEach(([f],i)=>{
    if(inspection&&i!==inspectedPool)return;
    optionsFor(i).forEach(({r,c,q})=>{
     const from=orPoint(f,r,c),to=pointFor(i),key=`${f}:${r}:${c}`;
     const emphasized=!!inspection||moving&&updatingPools.has(i),quiet=moving&&!emphasized,weight=revealed?1:strength(i,q);
     const opacity=revealed?(inspection?1:.62):inspection?.08+.88*weight:emphasized?.08+.8*weight:quiet?.012+.035*weight:.025+.13*weight;
     const distance=Math.hypot(to[0]-from[0],to[1]-from[1]),tip=[to[0]-(to[0]-from[0])*5/distance,to[1]-(to[1]-from[1])*5/distance];
     const color=emphasized&&!inspection?messageInk:inks[focus];
     const oldTo=poolPoint(...previousFrame.positions[i]),oldDistance=Math.hypot(oldTo[0]-from[0],oldTo[1]-from[1]),oldTip=[oldTo[0]-(oldTo[0]-from[0])*5/oldDistance,oldTo[1]-(oldTo[1]-from[1])*5/oldDistance];
     s+=`<g ${revealed?`data-rfg-selected-link="${selected}:${i}"`:`data-rfg-candidate-link="${selected}:${i}" data-rfg-candidate-score="${frame.positionScores[i][q]}" data-rfg-candidate-weight="${weight}"`} data-rfg-target-or="${key}"><path data-rfg-support-focus="${emphasized?'active':quiet?'quiet':'all'}" d="M${xy([from[0],from[1]-2.7])}L${xy(tip)}" fill="none" stroke="${color}" stroke-width="${emphasized?1.5:revealed?1.1:.65}" opacity="${opacity}" ${revealed||emphasized?`marker-end="url(#${emphasized&&!inspection?'rfg-message-arrow':'rfg-pool-arrow'})"`:''}>${animateFit?`<animate attributeName="d" from="M${xy([from[0],from[1]-2.7])}L${xy(oldTip)}" to="M${xy([from[0],from[1]-2.7])}L${xy(tip)}" dur=".75s" calcMode="spline" keyTimes="0;1" keySplines=".333 0 .667 1" fill="freeze"/>`:''}</path>`;
     s+='</g>';
    });
   });
  }else{
  ex.landmarks.forEach(([f,r,c],i)=>{
   if(f!==channel||(inspection&&i!==inspectedPool))return;
   shownEdges[f].forEach(([rr,cc])=>{
    if(Math.abs(rr-r)>12||Math.abs(cc-c)>12)return;
    const from=orPoint(f,rr,cc),to=pointFor(i);
    s+=`<g data-rfg-pool-member="${selected}:${i}:${f}:${rr}:${cc}"${swap||exemplarSwap?' class="rfg-channel-wiring-in"':''}>`;
    if(inspection){
     const length=Math.hypot(to[0]-from[0],to[1]-from[1]),tip=[to[0]-(to[0]-from[0])*9/length,to[1]-(to[1]-from[1])*9/length];
     s+=`<path class="rfg-pool-focus-arrow" d="M${xy(from)}L${xy(tip)}" fill="none" stroke="${inks[focus]}" stroke-width="1.6" marker-end="url(#rfg-pool-arrow)"/>`;
    }else s+=path(from,to,frame.kind==='evidence'?messageInk:inks[focus],1.05,round===0?.3:.5,frame.kind==='evidence');
    s+='</g>';
   });
  });
  }
  // Empty context planes rise like the edge-map sheets. Only the active plane
  // carries landmarks; the outgoing set is visible solely during its fade-out.
  const poolDepths=exemplarSwap?[2,1,0,-1]:[2,1,0];
  poolDepths.forEach(depth=>{
   const leaving=depth===-1,j=leaving?previousFocus:(focus+depth)%3,k=ks[j],e=learned.exemplars[k],active=depth===0,color=inks[j];
   const role=leaving?'leaving':depth===2?'entering':active?'arriving':'neighbor';
   const fromOpacity=leaving?1:depth===2?0:.14,toOpacity=leaving?0:active?1:.14;
   const attrs=leaving?`data-rfg-leaving-exemplar="${k}"`:`data-rfg-network="${k}" data-rfg-network-active="${active}" data-rfg-pool-depth="${depth}"`;
   const corners=[proj(28,28,225-depth*14),proj(28,172,225-depth*14),proj(172,172,225-depth*14),proj(172,28,225-depth*14)];
   s+=`<g ${attrs} class="rfg-exemplar-network${exemplarSwap?' rfg-plane-slide rfg-plane-'+role:''}" style="--rfg-from-y:14px;--rfg-from-opacity:${fromOpacity};--rfg-to-opacity:${toOpacity}" opacity="${toOpacity}"${active?'':' pointer-events="none"'}><path ${leaving?'':`data-rfg-plane="pools-${k}"`} d="M${corners.map(xy).join('L')}Z" fill="#deebdf" fill-opacity=".32" stroke="#a8c4b3" stroke-width=".9"/>`;
   if(active||leaving){
    const pool=i=>active?pointFor(i):poolPoint(e.landmarks[i][1],e.landmarks[i][2],depth);
    s+=`<g${exemplarSwap&&active?' class="rfg-pool-content-reveal"':''}>`;
    let factorNodes='';
    data.trees[k].forEach(([a,b])=>{
     const pa=pool(a),pb=pool(b),x=(pa[0]+pb[0])/2,y=(pa[1]+pb[1])/2;
     const oldA=animateFit&&active?poolPoint(...previousFrame.positions[a]):pa,oldB=animateFit&&active?poolPoint(...previousFrame.positions[b]):pb;
     const oldX=(oldA[0]+oldB[0])/2,oldY=(oldA[1]+oldB[1])/2;
     const sending=active&&moving&&frame.edges.some(([aa,bb])=>aa===a&&bb===b);
     s+=`<g ${active?`data-rfg-lateral="${k}:${a}:${b}"`:''} opacity="${inspection?0:1}">`+fitLine(pa,pb,oldA,oldB,lateralInk,sending?2.5:.9,sending?1:.36);
     // The optional factor square sits on its pairwise connection, never outside it.
     factorNodes+=`<rect class="rfg-lateral-square" x="${x-2.5}" y="${y-2.5}" width="5" height="5" fill="${lateralInk}" stroke="white" stroke-width=".7" opacity="${inspection?0:1}">${animateFit?`<animate attributeName="x" from="${oldX-2.5}" to="${x-2.5}" dur=".75s" calcMode="spline" keyTimes="0;1" keySplines=".333 0 .667 1" fill="freeze"/><animate attributeName="y" from="${oldY-2.5}" to="${y-2.5}" dur=".75s" calcMode="spline" keyTimes="0;1" keySplines=".333 0 .667 1" fill="freeze"/>`:''}</rect>`;
     if(sending){const l=Math.max(1,Math.hypot(pb[0]-pa[0],pb[1]-pa[1])),tip=[pb[0]-(pb[0]-pa[0])*6/l,pb[1]-(pb[1]-pa[1])*6/l];s+=`<path data-rfg-message="${a}:${b}" d="M${xy(pa)}L${xy(tip)}" fill="none" stroke="${messageInk}" stroke-width="1.7" marker-end="url(#rfg-message-arrow)"/>${reducedMotion?'':`<circle r="3.4" fill="${messageInk}" stroke="white" stroke-width=".7"><animateMotion dur=".06s" path="M${xy(pa)}L${xy(tip)}" fill="freeze"/></circle>`}`;}
     s+='</g>';
    });
    e.landmarks.forEach(([f,r,c],i)=>{
     const point=pool(i),on=combined||f===channel,hasEvidence=active&&round>0,nodeColor=hasEvidence?(frame.evidence[i]>0?color:missInk):color;
     const stored=poolPoint(r,c),before=active?poolPoint(...previousFrame.positions[i]):point;
     if(hasEvidence&&revealed)s+=`<path d="M${xy(stored)}L${xy(point)}" stroke="#899b93" stroke-width=".8" opacity=".38"/><circle class="rfg-stored-reference" cx="${stored[0]}" cy="${stored[1]}" r="5" fill="none" stroke="#899b93" stroke-width=".8" opacity=".3"/>`;
     if(active&&moving&&frame.edges.some(([a,b])=>a===i||b===i))s+=`<circle cx="${point[0]}" cy="${point[1]}" r="8" fill="${messageInk}" fill-opacity=".15" stroke="${messageInk}" stroke-width=".9"/>`;
     const attributes=active?`data-rfg-pool="${k}:${i}" data-rfg-pool-slot="${j}" data-rfg-pool-index="${i}" tabindex="0" role="button" aria-label="Inspect landmark ${i+1}, ${f*22.5} degree filter, center row ${r} column ${c}, exemplar ${e.label}"`:'';
     s+=`<g opacity="${inspection&&i!==inspectedPool?.25:1}">`;
     if(active&&animateFit)s+=`<animateTransform attributeName="transform" type="translate" from="${xy([before[0]-point[0],before[1]-point[1]])}" to="0 0" dur=".75s" calcMode="spline" keyTimes="0;1" keySplines=".333 0 .667 1" fill="freeze"/>`;
     s+=`<circle ${attributes} ${hasEvidence?`data-rfg-supported="${frame.evidence[i]>0}"`:''} cx="${point[0]}" cy="${point[1]}" r="5" fill="${hasEvidence?(frame.evidence[i]>0?'#e4efe8':'#f7e6e1'):'white'}" stroke="${nodeColor}" stroke-opacity="${hasEvidence||on?1:.55}" stroke-width="${on?1.4:1}"/>`+poolDirection(f,point,3.6,nodeColor)+'</g>';
    });
    s+=factorNodes+'</g>';
   }
   s+='</g>';
  });
  // Distinguish learned feature levels from pooling, copies, and factor bands.
  const guide=(x,y,label,sub,end)=>`<path d="M${x+150} ${y-4}L${xy(end)}" stroke="#b9c8c0" stroke-width=".9"/><text x="${x}" y="${y}" class="rfg-layer-label">${label}</text><text x="${x}" y="${y+19}" class="rfg-layer-sub">${sub}</text>`;
  s+=`<text x="28" y="47" class="rfg-layer-label">Learned exemplars</text><text x="28" y="66" class="rfg-layer-sub">One variable per exemplar</text>`;
  // Match the edge-map brace: vertical, beside the plane's left corner.
  const poolTop=proj(28,28,225)[1]-3,poolBottom=proj(28,28,197)[1]+3,poolMid=(poolTop+poolBottom)/2;
  s+=`<path class="rfg-pools-brace" d="M226 ${poolTop}Q219 ${poolTop} 219 ${poolTop+8}L219 ${poolMid-6}Q219 ${poolMid} 213 ${poolMid}Q219 ${poolMid} 219 ${poolMid+6}L219 ${poolBottom-8}Q219 ${poolBottom} 226 ${poolBottom}" fill="none" stroke="#789c95" stroke-width="1.4" stroke-linecap="round"/>`;
  s+=guide(28,poolMid+5.5,'Landmark Pools','One edge filter per landmark',[213,poolMid]);
  const stackTop=proj(28,28,74)[1]-3,stackBottom=proj(28,28,46)[1]+3,stackMid=(stackTop+stackBottom)/2;
  s+=`<path class="rfg-feature-maps-brace" d="M226 ${stackTop}Q219 ${stackTop} 219 ${stackTop+8}L219 ${stackMid-6}Q219 ${stackMid} 213 ${stackMid}Q219 ${stackMid} 219 ${stackMid+6}L219 ${stackBottom-8}Q219 ${stackBottom} 226 ${stackBottom}" fill="none" stroke="#789c95" stroke-width="1.4" stroke-linecap="round"/>`;
  s+=guide(28,471,'Edge Feature Maps',combined?'16 directions · one view':'16 feature maps',[213,stackMid]);

  s+=`<text x="450" y="667" text-anchor="middle" class="rfg-image-label">Observed image · handwritten ${test.label}</text>`;
  ks.forEach((k,j)=>{
   const e=learned.exemplars[k],x=300+j*210,active=j===focus,color=inks[j],result=test.matches[k],score=result.score,hits=result.evidence.filter(v=>v>0).length,misses=result.evidence.filter(v=>v<0).length;
   s+=`<g data-rfg-feature="${j}" data-rfg-exemplar="${k}" tabindex="0" role="button" aria-label="Select learned ${e.label} exemplar" aria-pressed="${active}"><rect class="rfg-exemplar-card" x="${x-49}" y="3" width="98" height="100" rx="8"/><text x="${x}" y="20" text-anchor="middle" class="rfg-feature-label">Exemplar</text><image data-rfg-exemplar-image="${k}" href="${e.image}" x="${x-29}" y="25" width="58" height="58"/><text class="rfg-exemplar-action" x="${x}" y="95" text-anchor="middle">${active?'Selected ✓':'Select →'}</text><circle cx="${x}" cy="115" r="6" fill="${active?color:'#a8b8af'}"/>${completed.has(k)?`<g class="rfg-score-breakdown" role="img" aria-label="Score ${completed.get(k)} equals ${hits} matched landmarks minus ${misses} unmatched landmarks"><text data-rfg-score="${completed.get(k)}" y="120" class="rfg-feature-score"><tspan x="${x+36}" text-anchor="end">${completed.get(k)}</tspan><tspan x="${x+46}" text-anchor="middle"> = </tspan><tspan x="${x+77}" text-anchor="middle" fill="#548c87">${hits}</tspan><tspan x="${x+103}" text-anchor="middle"> − </tspan><tspan x="${x+133}" text-anchor="middle" fill="#b76356">${misses}</tspan></text><path d="M${x+15} 123q0 3 5 3h1q4 0 4 3q0-3 4-3h1q5 0 5-3" fill="none" stroke="#032f56" stroke-width=".8"/><text x="${x+25}" y="141" text-anchor="middle" class="rfg-score-caption" fill="#032f56">score</text><path d="M${x+67} 123q0 3 5 3h1q4 0 4 3q0-3 4-3h1q5 0 5-3" fill="none" stroke="#548c87" stroke-width=".8"/><path d="M${x+123} 123q0 3 5 3h1q4 0 4 3q0-3 4-3h1q5 0 5-3" fill="none" stroke="#b76356" stroke-width=".8"/><text x="${x+77}" y="141" text-anchor="middle" class="rfg-score-caption" fill="#548c87">matched</text><text x="${x+133}" y="141" text-anchor="middle" class="rfg-score-caption" fill="#b76356">unmatched</text></g>`:active&&round>0?`<text x="${x+13}" y="119" class="rfg-feature-score">Computing…</text>`:''}</g>`;
   s+=`<g data-rfg-and="${k}" opacity="${active?1:.5}">`+(inspection?'':path([x,152],[x,121],done&&active?messageInk:color,done&&active?1.8:1.2,1,done&&active))+`<rect x="${x-5}" y="153" width="10" height="10" fill="${andInk}"/><text x="${x+12}" y="162" class="rfg-layer-sub">AND</text></g>`;
  });
  if(!inspection&&round===0){
   const target=ex.landmarks.map((_,i)=>pointFor(i)).reduce((a,b)=>b[0]>a[0]?b:a);
   const [tx,ty]=target;
   s+=`<g class="rfg-explore-hint" pointer-events="none"><text x="715" y="258">Click a landmark</text><path d="M756 270C754 310 ${tx+45} ${ty-24} ${tx+10} ${ty-3}M${tx+19} ${ty-13}L${tx+10} ${ty-3}L${tx+24} ${ty-1}"/><circle cx="${tx}" cy="${ty}" r="10"/></g>`;
  }
  if(!inspection&&round>0){
   s+=`<g class="rfg-state-key"><rect x="695" y="233" width="192" height="${moving?282:140}" rx="6" fill="#fcfdfb" stroke="#c6d9cc"/><text x="710" y="256" class="rfg-pool-inset-title">${frame.kind==='settled'?'MATCHES SETTLED':revealed?'THE JOINT FIT':'CANDIDATE POSITIONS'}</text><circle cx="717" cy="280" r="5" fill="#e4efe8" stroke="#548c87"/><text x="732" y="284" class="rfg-callout-body">${revealed?'One supporting OR':'Supported best option'}</text><circle cx="717" cy="307" r="5" fill="#f7e6e1" stroke="#b76356"/><text x="732" y="311" class="rfg-callout-body">${revealed?'No supporting OR':moving?'Unsupported option leads':'No supported options'}</text><path d="M711 334h13" stroke="#0f67a2" stroke-width="1.5" marker-end="url(#rfg-message-arrow)"/><text x="732" y="338" class="rfg-callout-body">Message direction</text><text x="710" y="360" class="rfg-layer-sub">Click a pool to inspect its choices.</text>`;
   if(moving){const [a,b]=frame.edges[0];s+=`<g class="rfg-message-detail"><path d="M710 378h162" stroke="#dce6df"/><text x="710" y="398" class="rfg-pool-inset-title">LATERAL MESSAGE</text><text x="725" y="419" text-anchor="middle" class="rfg-callout-body">${a+1}</text><text x="853" y="419" text-anchor="middle" class="rfg-callout-body">${b+1}</text><path d="M733 434H846" fill="none" stroke="#0f67a2" stroke-width="2" marker-end="url(#rfg-message-arrow)"/><circle cx="725" cy="434" r="7" fill="white" stroke="#548c87" stroke-width="1.5"/><rect x="785" y="428" width="12" height="12" fill="${lateralInk}"/><circle cx="853" cy="434" r="7" fill="white" stroke="#548c87" stroke-width="1.5"/>${reducedMotion?'':`<rect x="781" y="424" width="20" height="20" rx="4" fill="#0f67a2" opacity="0"><animate attributeName="opacity" values="0;.3;0" dur=".06s" fill="freeze"/></rect><circle r="3.6" fill="#0f67a2" stroke="white" stroke-width=".8"><animateMotion path="M733 434H846" keyPoints="0;.5;.5;1" keyTimes="0;.35;.55;1" calcMode="linear" dur=".06s" fill="freeze"/></circle>`}<text x="791" y="461" text-anchor="middle" class="rfg-callout-body">Pool → lateral factor → pool</text><text x="710" y="484" class="rfg-layer-sub">Scores for all 625 positions</text><text x="710" y="500" class="rfg-layer-sub">${frame.edges.length>1?`${frame.edges.length} messages in parallel`:'One message in this wave'}</text></g>`;}
   s+='</g>';
  }
  if(inspection)s+=inspection.overlay;
  $('rfg-canvas').innerHTML=s;
  playSvgAnimations();
  $('rfg-canvas').setAttribute('aria-label',`Spatial contour hierarchy over test digit 0. Sixteen parallel edge channels at feature level one; highlighting filter ${channel*22.5} degrees. Candidate digits ${ks.map(k=>learned.exemplars[k].label).join(', ')}. Inspecting ${ex.label}, exemplar ${selected%2+1}. Stage ${step+1}.`);
  $('rfg-orientation').textContent=`${channel*22.5}° filter`;
  $('rfg-orientation').dataset.channel=String(channel);
  // Match the tangent of the edge marks, including the plane's isometric
  // projection. The numeric filter angle is the detector's normal direction.
  const tangent=channel*Math.PI/8+Math.PI/2;
  const direction=Math.atan2(.72*Math.sin(tangent)-.38*Math.cos(tangent),2.15*Math.cos(tangent)+.85*Math.sin(tangent))*180/Math.PI;
  indicatorAngle=indicatorAngle===null?direction:indicatorAngle+((direction-indicatorAngle)%360+540)%360-180;
  $('rfg-filter-direction-line').setAttribute('style',`--rfg-filter-rotation:${indicatorAngle}deg`);
  $('rfg-channel-count').textContent=combined?'All 16 directions shown':`${channel+1} / 16 filters`;
  $('rfg-channel-next').disabled=combined;
  $('rfg-exemplar-label').textContent=`Digit ${ex.label}`;
  $('rfg-exemplar-count').textContent=`${focus+1} / 3 exemplars`;
  const hits=frame.evidence.filter(v=>v>0).length,misses=frame.evidence.filter(v=>v<0).length;
  const titles={ready:'',evidence:'Keep every supported option',lateral:'Lateral messages coordinate the choices',settled:'The joint choices are settled',readout:'Reveal the chosen shape',score:'A score for this exemplar'};
  $('rfg-step-title').textContent=titles[frame.kind];
  $('rfg-story').textContent={
   ready:`Explore the ${ex.landmarks.length} pools of this learned ${ex.label}, then click “Run Forward Pass.” Each pool can choose a nearby position for one edge direction. The lateral factors constrain how far neighboring choices can move relative to one another.`,
   evidence:'Each landmark stays fixed and connects to every supported position in its window. All these +1 options begin equally good. Green means at least one supported candidate exists; red means none exists. Click a pool to isolate its candidates.',
   lateral:'The landmarks stay fixed while lateral messages change the candidate scores. Stronger connections indicate higher-scoring options within a pool; ties stay equally strong. A pool turns red if all its supported options score below an unsupported option. These preferences can still change. Blue pulses travel through lateral factors to neighboring pools; the right-hand inset magnifies one message.',
   settled:'The complete tree pass has selected one best joint arrangement. The landmarks are still at their stored locations, but their final match colors and selected connections are now fixed. Next, we reveal the geometry of those choices.',
   readout:'The landmarks now move into their selected positions. Their colors stay fixed: this is a reveal of the solution already chosen. Faint outlines mark the stored positions, just as in the preceding matching figure.',
   score:`The learned ${ex.label} explains ${hits} of its ${ex.landmarks.length} landmarks at compatible positions. ${misses} lack edge support at their chosen positions. Try another exemplar to compare its explanation of the same image.`
  }[frame.kind];
  $('rfg-equation').innerHTML=global.katex.renderToString(done?String.raw`${frame.score}=\textcolor{#548c87}{\underbrace{${hits}}_{\text{matched}}}-\textcolor{#b76356}{\underbrace{${misses}}_{\text{unmatched}}}`:moving?String.raw`\begin{aligned}m_{i\to j}(p_j)&=\max_{p_i\sim p_j}\Big[e_i(p_i)\\&\qquad+\sum_{k\ne j}m_{k\to i}(p_i)\Big]\end{aligned}`:String.raw`e_i(p_i)=\begin{cases}+1&\text{edge present}\\-1&\text{edge absent}\end{cases}`,{throwOnError:true});
  $('rfg-note').textContent=round===0?'Green: supported options. Muted red: missing support. Blue: a message being passed.':moving?'For each receiving position pⱼ, maximize edge evidence plus incoming messages over compatible sending positions pᵢ. The forward pass uses a tree of the learned constraints.':done?'A nearby edge may exist but be incompatible with the other landmark choices. The score is an unnormalized match score, not a probability.':'Unsupported positions remain possible at −1. Fading a connection does not remove it from the model. The joint arrangement is selected before its geometry is revealed.';
  if(done){$('rfg-step-title').textContent='';$('rfg-story').textContent='';$('rfg-equation').innerHTML='';$('rfg-note').textContent='';}
  $('rfg-next').textContent=timer!==null?'Pause Forward Pass':done?'Run Forward Pass ↻':round>0?'Resume Forward Pass':'Run Forward Pass ↑';
  $('rfg-reset').hidden=round===0;
  $('rfg-back-to-filters').hidden=!combined;
 }
 function tick(){
  const frames=traceFor(candidates()[focus]);
  if(round>=frames.length-1){stop();render();return;}
  round++;timer=setTimeout(tick,timing[frames[round].kind]||65);render();
 }
 // Visibility-only toggle: do not restart or interrupt an in-flight pass.
 $('rfg-show-lateral').addEventListener('change',event=>{
  figure.dataset.lateralNodes=String(event.target.checked);
 });
 $('rfg-exemplar-next').addEventListener('click',()=>{const previous=focus;reset();focus=(focus+1)%3;render(0,true,previous);});
 $('rfg-channel-next').addEventListener('click',()=>{channel=(channel+1)%16;inspectedPool=null;render(1);});
 $('rfg-next').addEventListener('click',()=>{
  if(timer!==null){stop();render();return;}
  inspectedPool=null;if(round===traceFor(candidates()[focus]).length-1){round=0;completed.delete(candidates()[focus]);}tick();
 });
 const restore=()=>{reset();completed.clear();render();};
 $('rfg-reset').addEventListener('click',restore);
 $('rfg-back-to-filters').addEventListener('click',restore);
 function select(event){
  if(event.target.closest('[data-rfg-close-inspection]')){inspectedPool=null;render();return;}
  const pool=event.target.closest('[data-rfg-pool]');
  if(pool&&pool.dataset.rfgPoolSlot!==undefined){
   stop();
   const nextFocus=Number(pool.dataset.rfgPoolSlot),nextPool=Number(pool.dataset.rfgPoolIndex);
   inspectedPool=focus===nextFocus&&inspectedPool===nextPool?null:nextPool;focus=nextFocus;
   if(inspectedPool!==null)channel=learned.exemplars[candidates()[focus]].landmarks[inspectedPool][0];
   render();return;
  }
  const feature=event.target.closest('[data-rfg-feature]');
  if(feature){const previous=focus;reset();focus=Number(feature.dataset.rfgFeature);render(0,previous!==focus,previous);return;}
  if(inspectedPool!==null){inspectedPool=null;render();}

 }
 $('rfg-canvas').addEventListener('click',select);
 $('rfg-canvas').addEventListener('keydown',event=>{if(event.key==='Escape'){inspectedPool=null;render();return;}if(event.key==='Enter'||event.key===' '){event.preventDefault();select(event);}});
 render();
})(window);
