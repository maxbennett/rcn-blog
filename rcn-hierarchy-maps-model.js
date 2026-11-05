/* Fig. 6′: illustrative higher-level contour maps on the exported edge input.
   Fixed corner, arc, and long-line templates; NOT the published hierarchy learner.
   Each component permits ±1 filter and ±2 pixels around its specified offset.
   A composite is ON only when all three components are supported. */
(function(root){
 'use strict';
 const size=200,area=size*size,radius=14,poolRadius=12;
 const families=['corner','arc','line'];
 const features=families.flatMap((family,group)=>Array.from({length:8},(_,rotation)=>{
  const f=rotation*2,a=f*Math.PI/8,rotate=(r,c)=>({dr:Math.round(r*Math.cos(a)+c*Math.sin(a)),dc:Math.round(c*Math.cos(a)-r*Math.sin(a))});
  let parts;
  if(family==='corner')parts=[[-12,-12,-2],[-5,-5,-2],[5,-5,2],[12,-12,2]].map(([r,c,df])=>({f:(f+df+16)%16,...rotate(r,c)}));
  else if(family==='arc')parts=[-1,0,1].map(k=>({f:(f+2*k+16)%16,...rotate(radius*Math.sin(k*Math.PI/4),radius*(Math.cos(k*Math.PI/4)-1))}));
  else parts=[-10,0,10].map(r=>({f,...rotate(r,0)}));
  const localOutline=family==='corner'?[[-14,-14],[0,0],[14,-14]]:family==='line'?[[-13,0],[13,0]]:Array.from({length:13},(_,i)=>{const t=-Math.PI/4+i*Math.PI/24;return [radius*Math.sin(t),radius*(Math.cos(t)-1)];});
  const outline=localOutline.map(([r,c])=>rotate(r,c));
  const title={corner:'Corner',arc:'Arc',line:'Long line'}[family];
  return {id:group*8+rotation,f,family,rotation,parts,outline,name:`${title} · ${rotation*45}°`};
 }));
 function indexEdges(edges){
  const raw=Array.from({length:16},()=>new Set()),support=new Uint8Array(16*area);
  edges.forEach(([f,r,c])=>{
   raw[f].add(r*size+c);
   for(let df=-1;df<=1;df++)for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){
    const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<size&&cc>=0&&cc<size)support[((f+df+16)%16)*area+rr*size+cc]=1;
   }
  });
  return {raw,support};
 }
 function maps(edges){
  const indexed=indexEdges(edges);
  const responses=features.map(feature=>{
   const values=new Uint8Array(area),points=[];
   for(let r=20;r<180;r++)for(let c=20;c<180;c++){
    const on=feature.parts.every(p=>indexed.support[p.f*area+(r+p.dr)*size+c+p.dc]);
    if(on){values[r*size+c]=1;points.push([r,c]);}
   }
   return {values,points};
  });
  return {...indexed,responses};
 }
 function witnesses(indexed,feature,r,c){
  return feature.parts.map(p=>{
   const rr=r+p.dr,cc=c+p.dc,options=[];
   for(let df=-1;df<=1;df++)for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){
    const f=(p.f+df+16)%16,y=rr+dr,x=cc+dc;
    if(y>=0&&y<size&&x>=0&&x<size&&indexed.raw[f].has(y*size+x))options.push({f,r:y,c:x,distance:dr*dr+dc*dc+df*df});
   }
   options.sort((a,b)=>a.distance-b.distance);
   return {expected:{f:p.f,r:rr,c:cc},observed:options[0]||null};
  });
 }
 // Select representative training locations by local response density, with
 // spatial suppression only. There is no one-landmark-per-feature limit.
 // All response pixels remain in the feature maps and in each pool's candidates.
 function locations(points,minSeparation=12){
  const ranked=points.map(p=>({p,density:points.filter(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=3).length}));
  ranked.sort((a,b)=>b.density-a.density||a.p[0]-b.p[0]||a.p[1]-b.p[1]);
  const selected=[];
  for(const {p} of ranked)if(selected.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=minSeparation))selected.push(p);
  return selected;
 }
 function create(trainingEdges,testEdges){
  const training=maps(trainingEdges),input=maps(testEdges);
  // Each spatial occurrence in the TRAINING image can become a landmark.
  // Several landmarks may reuse the same feature map; test detections never
  // determine the stored locations.
  const pools=features.flatMap(feature=>{
   const points=training.responses[feature.id].points;
   return locations(points).map(([r,c])=>{
    const candidates=input.responses[feature.id].points.filter(([rr,cc])=>Math.abs(rr-r)<=poolRadius&&Math.abs(cc-c)<=poolRadius);
    candidates.sort((a,b)=>Math.hypot(a[0]-r,a[1]-c)-Math.hypot(b[0]-r,b[1]-c));
    return {feature:feature.id,r,c,candidates};
   });
  });
  return {training,input,pools};
 }
 function progression(model,laterals){
  const landmarks=model.pools.map(p=>[p.feature,p.r,p.c]);
  if(JSON.stringify(landmarks)!==JSON.stringify(laterals.landmarks))throw new Error('Hierarchy lateral export is out of date; rerun export-rcn-hierarchy.py');
  // Composite channels are feature identities; never pool across neighboring
  // identities. Edge-orientation tolerance was already applied within each part.
  const test={edgelets:model.input.responses.flatMap((map,f)=>map.points.map(([r,c])=>[f,r,c]))};
  return root.RCNHierarchyInference.progression(test,{landmarks},laterals.tree);
 }
 root.RCNHierarchyMaps={size,area,families,features,poolRadius,maps,indexEdges,witnesses,locations,create,progression};
})(globalThis);
