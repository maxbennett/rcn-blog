(function(root){
 'use strict';
 const $=id=>document.getElementById(id),figure=$('rcn-forward-graph-prime'),M=root.RCNHierarchyMaps;
 if(!figure||!M||!root.RCNLearningData||!root.RCNForwardData)return;
 const learned=root.RCNLearningData,test=root.RCNForwardData.tests[0],model=M.create(learned.edgelets,test.edgelets);
 const blue='#0f67a2',teal='#548c87',navy='#032f56',gold='#987143';
 const inks=[blue,teal,gold],heights={image:0,edge:155,part:345,pool:545};
 let feature=6,stage=0,timer=null,response=model.pools[6].candidates[0]||model.input.responses[6].points[0],links=true;
 const proj=(r,c,z=0)=>[500+2.15*(c-100)+.85*(r-100),755+.72*(r-100)-.38*(c-100)-z];
 const xy=p=>p.map(v=>v.toFixed(2)).join(' ');
 const line=(a,b,ink,width=1,opacity=1,pulse=false)=>`<path d="M${xy(a)}L${xy(b)}" fill="none" stroke="${ink}" stroke-width="${width}" opacity="${opacity}" ${pulse?'class="rfp-pulse"':''}/>`;
 const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;
 const plane=(z,fill,stroke,opacity=1)=>`<path d="M${[proj(28,28,z),proj(28,172,z),proj(172,172,z),proj(172,28,z)].map(xy).join('L')}Z" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1"/>`;
 function edge(f,r,c,z,ink,width=1.5,len=2.6){
  const t=f*Math.PI/8+Math.PI/2;
  return line(proj(r-len*Math.sin(t),c-len*Math.cos(t),z),proj(r+len*Math.sin(t),c+len*Math.cos(t),z),ink,width);
 }
 function glyph(id,r,c,z,ink,width=1.4){return M.features[id].parts.map(p=>edge(p.f,r+p.dr,c+p.dc,z,ink,width,2)).join('');}
 function sample(points,gap=12,preferred=null){
  const chosen=[];
  const sorted=preferred?[...points].sort((a,b)=>Math.hypot(a[0]-preferred[0],a[1]-preferred[1])-Math.hypot(b[0]-preferred[0],b[1]-preferred[1])):points;
  for(const p of sorted){const q=proj(...p);if(chosen.every(a=>{const b=proj(...a);return Math.hypot(q[0]-b[0],q[1]-b[1])>=gap;}))chosen.push(p);}
  return chosen;
 }
 const edgeMaps=Array.from({length:16},(_,f)=>{
  const points=new Set([...model.input.raw[f],...model.input.raw[(f+15)%16],...model.input.raw[(f+1)%16]]);
  return [...points].map(k=>[Math.floor(k/200),k%200]);
 });
 function stop(){clearInterval(timer);timer=null;}
 function select(id){stop();feature=id;response=model.pools[id].candidates[0]||model.input.responses[id].points[0];render();}
 function render(){
  const F=M.features[feature],pool=model.pools[feature],center=proj(pool.r,pool.c,heights.pool);
  const partIds=[feature,(feature+1)%8,(feature+2)%8],channels=[F.f,(F.f+2)%16,(F.f+14)%16];
  const witnesses=M.witnesses(model.input,F,...response),point=proj(...response,heights.part);
  const inPool=Math.abs(response[0]-pool.r)<=12&&Math.abs(response[1]-pool.c)<=12;
  figure.dataset.stage=String(stage);figure.dataset.feature=String(feature);figure.dataset.pool=String(feature);
  let s='<defs><clipPath id="rfp-image-clip"><path d="M'+[proj(28,28),proj(28,172),proj(172,172),proj(172,28)].map(xy).join('L')+'Z"/></clipPath></defs>';
  s+=plane(0,'#f7fafb','#c4d1d8');
  // Matrix maps the very same 200×200 test image onto the shared spatial plane.
  s+=`<g clip-path="url(#rfp-image-clip)"><image href="${test.image}" width="200" height="200" transform="matrix(2.15 -.38 .85 .72 200 721)"/></g>`;

  // Edge maps: three relevant sheets from the sixteen-channel bank.
  for(let slot=2;slot>=0;slot--){
   const f=channels[slot],z=heights.edge-slot*17;
   s+=`<g data-rfp-edge-map="${f}" opacity="${slot===0?1:.5}">`+plane(z,'#eef5f8',blue,.75);
   for(const [r,c] of sample(edgeMaps[f],6))s+=edge(f,r,c,z,stage===1?blue:navy,slot===0?1.7:1.1);
   const p=proj(170,170,z);s+=text(p[0]+10,p[1]+4,`${f*22.5}°`,'rfp-sub')+'</g>';
  }

  // Compose one feature from three oriented edge components, each at its own
  // spatial offset. Witnesses are real edge observations, never drawn ad hoc.
  if(links)witnesses.forEach((w,i)=>{
   const slot=channels.indexOf(w.expected.f),from=proj(w.observed.r,w.observed.c,heights.edge-slot*17);
   s+=line(from,point,inks[i],stage===2?2:1.3,stage===2?1:.55,stage===2);
   s+=`<circle data-rfp-witness="${w.observed.f}:${w.observed.r}:${w.observed.c}" cx="${from[0]}" cy="${from[1]}" r="4" fill="white" stroke="${inks[i]}" stroke-width="1.5"/>`;
  });

  // Higher-level maps: map identity = a bend type, position = where it occurs.
  for(let slot=2;slot>=0;slot--){
   const id=partIds[slot],z=heights.part-slot*17,active=slot===0;
   s+=`<g data-rfp-feature-map="${id}" opacity="${active?1:.3}">`+plane(z,'#f2f6ec',teal,.8);
   if(active){
    const q=[proj(pool.r-12.5,pool.c-12.5,z),proj(pool.r-12.5,pool.c+12.5,z),proj(pool.r+12.5,pool.c+12.5,z),proj(pool.r+12.5,pool.c-12.5,z)];
    s+=`<path data-rfp-footprint="${feature}" d="M${q.map(xy).join('L')}Z" fill="#548c87" fill-opacity=".12" stroke="${teal}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
   }
   for(const [r,c] of sample(model.input.responses[id].points,19,active?response:null)){
    const p=proj(r,c,z);
    s+=`<g ${active?`data-rfp-response="${r}:${c}" role="button" tabindex="0" aria-label="Inspect ${F.name} response at row ${r}, column ${c}"`:''}>`;
    if(active)s+=`<circle cx="${p[0]}" cy="${p[1]}" r="10" fill="transparent"/>`;
    s+=glyph(id,r,c,z,active?teal:'#8ba59a',active?1.7:1.1)+'</g>';
   }
   const p=proj(170,170,z);s+=text(p[0]+10,p[1]+4,`Bend ${id+1}`,'rfp-sub')+'</g>';
  }
  s+=`<circle cx="${point[0]}" cy="${point[1]}" r="15" fill="white" fill-opacity=".8" stroke="${blue}" stroke-width="1.3"/>`+glyph(feature,...response,heights.part,blue,2);
  // Only links from the selected map are expanded. Other landmark pools refer
  // to their own maps; no landmark connects directly to the edge-map bank.
  if(links){
   for(const [r,c] of pool.candidates){
    const from=proj(r,c,heights.part),selected=r===response[0]&&c===response[1];
    s+=`<g data-rfp-pool-link="${feature}:${r}:${c}" data-rfp-source-level="higher">`+line(from,center,teal,selected?1.7:.7,selected?.8:.13,stage===3&&selected)+'</g>';
   }
  }
  s+=plane(heights.pool,'#eaf2eb','#a8c4b3',.25);
  model.pools.forEach((p,i)=>{
   const a=proj(p.r,p.c,heights.pool),next=model.pools[(i+1)%8],b=proj(next.r,next.c,heights.pool);
   s+=line(a,b,blue,.9,.3);
   s+=line(a,[500,97],teal,.8,.22,stage===4);
  });
  model.pools.forEach((p,i)=>{
   const q=proj(p.r,p.c,heights.pool),active=i===feature,fill=stage>=3?(p.candidates.length?'#e4efe8':'#f7e6e1'):'white';
   s+=`<g data-rfp-pool="${i}" role="button" tabindex="0" aria-label="Inspect landmark ${i+1}, pool over Bend ${i+1} positions" aria-pressed="${active}"><circle cx="${q[0]}" cy="${q[1]}" r="${active?13:10}" fill="${fill}" stroke="${active?blue:teal}" stroke-width="${active?2:1.4}"/>`;
   const a=M.features[i].f*Math.PI/8;
   const ps=[-1,0,1].map(k=>[q[0]+5*Math.cos(a+k*Math.PI/4),q[1]+5*Math.sin(a+k*Math.PI/4)]);
   s+=`<path d="M${xy(ps[0])}Q${xy(ps[1])} ${xy(ps[2])}" fill="none" stroke="${active?blue:teal}" stroke-width="1.8"/>`;
   s+=text(q[0]+16,q[1]+4,`${i+1}`,'rfp-small')+'</g>';
  });
  // An illustrative exemplar atop the expanded feature hierarchy. No digit
  // classification score is claimed for this feature-bank visualization.
  s+=`<rect x="467" y="6" width="66" height="65" rx="5" fill="white" stroke="#b8cdbf"/><image href="${learned.exemplars[0].image}" x="476" y="9" width="48" height="48"/>`;
  s+=text(500,66,'Exemplar 0','rfp-small','middle')+line([500,72],[500,88],teal,1.5)+`<rect x="495" y="89" width="10" height="10" fill="${navy}"/>`+text(515,98,'AND','rfp-sub');
  const guide=(y,label,sub,z)=>{
   const p=proj(28,28,z);return text(24,y,label,'rfp-label')+text(24,y+20,sub,'rfp-sub')+line([205,y-4],[p[0]-10,p[1]],'#b9c8c0',.9);
  };
  s+=text(24,40,'Exemplar','rfp-label')+text(24,60,'An arrangement of bend landmarks','rfp-sub');
  s+=guide(205,'Landmark pools','Nearby positions of a bend feature',heights.pool);
  s+=guide(404,'Higher-level feature maps',`8 bend types · ${F.name} selected`,heights.part);
  s+=guide(602,'Edge feature maps','16 filters · 3 relevant maps shown',heights.edge);
  s+=text(500,863,'Observed image · the same handwritten zero','rfp-title','middle');

  // Compact explanation of the new level, alongside the existing spatial view.
  s+=`<rect x="757" y="321" width="185" height="354" rx="6" fill="#fcfdfb" stroke="#c6d9cc"/>`;
  s+=text(771,343,'ONE COMPOSITE FEATURE','rfp-mini')+text(771,364,`${F.name} = three edge parts`,'rfp-title');
  F.parts.forEach((p,i)=>{
   const t=p.f*Math.PI/8+Math.PI/2,cc=847+p.dc*2.1,rr=412+p.dr*2.1;
   s+=line([cc-7*Math.cos(t),rr-7*Math.sin(t)],[cc+7*Math.cos(t),rr+7*Math.sin(t)],inks[i],3);
  });
  s+=text(771,456,`Response at (${response[0]}, ${response[1]})`)+text(771,476,'Its three edge parts are present.','rfp-sub');
  s+=text(771,504,`Landmark ${feature+1} → ${F.name}`,'rfp-title');
  const cell=4.5,gx=792,gy=517;
  for(let y=0;y<25;y++)for(let x=0;x<25;x++){
   const r=pool.r+y-12,c=pool.c+x-12,on=model.input.responses[feature].values[r*200+c];
   s+=`<rect x="${gx+x*cell}" y="${gy+y*cell}" width="4" height="4" fill="${on?teal:'#e7ede7'}"/>`;
  }
  if(inPool)s+=`<rect x="${gx+(response[1]-pool.c+12)*cell-.5}" y="${gy+(response[0]-pool.r+12)*cell-.5}" width="5" height="5" fill="none" stroke="${blue}" stroke-width="1.5"/>`;
  s+=text(771,649,`${pool.candidates.length} supported positions · 25 × 25`,'rfp-sub');
  s+=text(771,666,inPool?'Outline: inspected response':'Inspected response is outside pool','rfp-small');
  $('rfp-canvas').innerHTML=s;
  $('rfp-canvas').setAttribute('aria-label',`Fig. 6 prime. Observed image to edge feature maps to eight higher-level bend feature maps to landmark pools and exemplar. ${F.name} selected, ${pool.candidates.length} supported positions in landmark ${feature+1}.`);
  const labels=['An extra feature level, in the same spatial graph','Edge maps represent local orientation','Combine edge parts into a bend','Landmark pools now read the bend maps','Pooled part evidence travels to the exemplar'];
  const body=[
   'Browse the bend maps, click a landmark, or click a response to trace its three supporting edge parts. The dashed footprint is the landmark’s search window.',
   `The three sheets shown here contain the orientation channels used by ${F.name}. The full first level still has sixteen edge feature maps.`,
   `At each image location, ${F.name} checks three edge parts in a fixed relative arrangement. Matching all three creates one response in this higher-level map.`,
   `Landmark ${feature+1} asks for ${F.name} near its stored location. Its 25 × 25 window contains ${pool.candidates.length} supported positions in that map.`,
   'The exemplar receives evidence about its larger contour parts. This view traces the added feature level; it does not compute a new digit-classification score.'
  ];
  $('rfp-stage-title').textContent=labels[stage];$('rfp-story').textContent=body[stage];
  $('rfp-run').textContent=timer?'Pause':stage===4?'Replay forward ↑':stage>0?'Resume forward ↑':'Trace forward ↑';
  $('rfp-feature-name').textContent=`${F.name} / 8`;
 }
 $('rfp-run').addEventListener('click',()=>{
  if(timer){stop();render();return;}if(stage===4)stage=0;
  if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){stage=4;render();return;}
  stage++;timer=setInterval(()=>{stage++;if(stage===4)stop();render();},1000);if(stage===4)stop();render();
 });
 $('rfp-reset').addEventListener('click',()=>{stop();stage=0;render();});
 $('rfp-next-feature').addEventListener('click',()=>select((feature+1)%8));
 $('rfp-prev-feature').addEventListener('click',()=>select((feature+7)%8));
 $('rfp-links').addEventListener('change',e=>{links=e.target.checked;render();});
 function pick(e){
  const p=e.target.closest('[data-rfp-pool]'),q=e.target.closest('[data-rfp-response]');
  if(p)select(Number(p.dataset.rfpPool));
  else if(q){stop();response=q.dataset.rfpResponse.split(':').map(Number);render();}
 }
 $('rfp-canvas').addEventListener('click',pick);
 $('rfp-canvas').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}});
 render();
})(window);
