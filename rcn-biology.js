/* Schematic bridge to Bio-RCN (George et al. 2025, Figs. 2B, 4, 6, 7).
   A graph variable is implemented by several message-specific populations.
   Each highlighted graph edge maps to distinct, directed axonal pathways.
   Cells stand for populations; upper interfaces are abbreviated; a retinal-contrast input level illustrates shared LGN/TRN gating.
   This is a pedagogical adaptation, not a fitted retinal model or measured wiring. */
(function(){
 'use strict';
 const original=document.getElementById('biology-figure');if(!original)return;
 original.classList.add('biology-figure');
 original.querySelectorAll('[id]').forEach(el=>{el.dataset.bioSlot=el.id;});
 mount(original);
 function mount(figure){
 const get=id=>figure.querySelector(`[data-bio-slot="${id}"]`);
 const scopedId=id=>id;
 const colors={evidence:'#0f67a2',context:'#548c87',feedback:'#8d7598',gate:'#b07843',neutral:'#032f56'};
 // Horizontal candidates are different spatial features, not three clones of one location.
 const features=[
  {id:'hl',x:65,angle:0,name:'Horizontal, x−1',short:'x−1'},
  {id:'h',x:135,angle:0,name:'Horizontal, x',short:'x'},
  {id:'hr',x:205,angle:0,name:'Horizontal, x+1',short:'x+1'},
  {id:'v',x:285,angle:90,name:'Vertical',short:'Vertical'},
  {id:'d',x:365,angle:-55,name:'Diagonal',short:'Diagonal'}
 ];
 // Two example contrast components per edge; neighboring hypotheses share one.
 // The sparse wiring teaches convergence and explaining away, not actual RF fits.
 const contrasts=[40,108,176,244,312,380].map((x,i)=>({id:'c'+(i+1),x,label:'c'+['₁','₂','₃','₄','₅','₆'][i]}));
 features.forEach((f,i)=>{f.contrasts=contrasts.slice(i,i+2);});
 const channels=contrasts.map(c=>({...c,parents:features.filter(f=>f.contrasts.includes(c))}));
 const circuitTargets=new Map();
 const channelID=(c,f)=>`${c.id}-${f.id}`;
 const relayX=(c,f)=>f.x+(f.contrasts[0].id===c.id?-9:9);
 const motifs={
  T:{name:'T',part:'vertical',points:[{id:'h',x:130,y:282,candidates:['hl','h','hr']},{id:'v',x:280,y:282,candidates:['v']}],parent:170,poolY:165,factorY:235},
  7:{name:'7',part:'diagonal',points:[{id:'h',x:140,y:330,candidates:['hl','h','hr']},{id:'d',x:370,y:330,candidates:['d']}],parent:320,poolY:205,factorY:273}
 };
 const candidate=(key,fid)=>{
  const f=features.find(f=>f.id===fid),pool=motifs[key].points.find(p=>p.candidates.includes(fid));
  return {id:key+'-'+fid,f,pool,x:f.x+(key==='T'?-5:5),y:pool.y};
 };
 let selected='overview',exemplar='7';
 const mappings=new Map();
 const txt=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;
 const route=(key,body)=>`<g class="bio-route" data-bio-route="${key}" style="--route:${colors[key]}">${body}</g>`;
 const context=(key,body)=>`<g class="bio-context" data-bio-context="${key}">${body}</g>`;
 const path=(d,cls='')=>`<path class="bio-wire bio-flow ${cls}" d="${d}"/>`;
 const part=(id,body,direction='')=>`<g class="bio-part" data-bio-part="${id}" data-direction="${direction}">${body}</g>`;
 const axon=(id,d,direction)=>part(id,path(d),direction);
 const neuron=(x,y,type='pyramid',apicalY=null)=>`<g class="bio-neuron" transform="translate(${x} ${y})">${type==='retina'?'<circle r="6"/><path d="M0 6V16M0 11L-12 18M0 11L12 18M-7 15L-12 11M7 15L12 11"/>':type==='relay'?'<circle r="4"/><path d="M0-10V-4M-7-5L-3-2M7-5L3-2M-7 6L-3 3M7 6L3 3"/>':type==='stellate'?'<path d="M0-16V-7 M-13-10L-5-4 M-15 3L-6 1 M-9 13L-4 5 M6 14L3 6 M14 7L6 3 M13-9L5-4"/><circle r="6"/>':type==='inhibit'?'<circle r="6"/><path d="M-12-8L-4-3M-12 5L-5 2M0-15V-6M12-8L4-3"/>':`<path class="bio-dendrite" d="M0-9V${apicalY===null?-24:apicalY-y+8}M-7 ${apicalY===null?-31:apicalY-y}L0 ${apicalY===null?-24:apicalY-y+8}L7 ${apicalY===null?-31:apicalY-y} M-11 11L-5 5M11 11L5 5"/><path class="bio-soma" d="M0-9L-8 7H8Z"/>`}</g>`;
 const edge=(x,y,angle)=>`<g class="bio-variable" transform="translate(${x} ${y})"><circle r="12"/><path class="bio-edge-symbol" d="M-7 0H7" transform="rotate(${angle})"/></g>`;
 const variable=(x,y,label)=>`<g class="bio-variable" transform="translate(${x} ${y})"><circle r="15"/>${txt(0,5,label,'','middle')}</g>`;
 const factor=(x,y,type)=>`<g class="bio-factor bio-factor-${type}" transform="translate(${x} ${y})"><rect x="-6" y="-6" width="12" height="12" rx="1"/></g>`;
 const featureGroup=(id,body)=>`<g class="bio-feature" data-bio-feature="${id}">${body}</g>`;
 const svg=(baseId,title,body)=>{const id=scopedId(baseId);return `<svg id="${id}" viewBox="0 0 420 756" role="group" aria-labelledby="${id}-title"><title id="${id}-title">${title}</title>${body}</svg>`;};
 function target(id,body,parts,title,circuit,kind='node'){
  mappings.set(id,{parts,title,circuit,kind});
  return `<g class="bio-target bio-target-${kind}" data-bio-target="${id}" tabindex="0" role="button" aria-label="${title}. Show corresponding circuit populations.">${body}</g>`;
 }
 function link(id,d,parts,title,circuit){
  return target(id,`<path class="bio-hit" d="${d}"/>`+path(d)+`<path class="bio-bidirectional bio-up" d="${d}"/><path class="bio-bidirectional bio-down" d="${d}"/>`,parts,title,circuit,'edge');
 }
 const node=(id,body,parts,title,description,graphDescription)=>{const bodySVG=target(id,body,parts,title,description);mappings.get(id).graph=graphDescription;return bodySVG;};
 const layers=[['I',146,45],['II/III',191,164],['IV',355,69],['V',424,91],['VI',515,53]];
 let circuit=txt(208,14,'HIGHER-LEVEL EXEMPLARS','bio-eyebrow','middle');
 let graph=txt(208,14,'LEARNED EXEMPLARS','bio-eyebrow','middle');
 const clickHint=(tipX,tipY)=>`<g class="bio-explore-hint" pointer-events="none" aria-hidden="true"><text x="9" y="43">Click an exemplar</text><path d="M98 53C103 76 ${tipX-13} 74 ${tipX} ${tipY}M${tipX-8} ${tipY+2}L${tipX} ${tipY}L${tipX-1} ${tipY+9}"/></g>`;
 circuit+=clickHint(132,54);
 graph+=clickHint(150,54);
 const parentParts=k=>[k+'-parent-up',k+'-parent-down'];
 const stem=(k,p)=>k+'-'+p.id;
 const copyParts=id=>[id+'-copy-up',id+'-copy-down'];
 const poolParts=id=>[id+'-pool-up',id+'-pool-down'];
 const parentWires=id=>[id+'-to-parent',id+'-from-parent',...poolParts(id)];
 const poolWires=(id,poolId=id)=>[id+'-pooling',id+'-unpooling',...copyParts(id),...poolParts(poolId)];
 const featureWires=(k,p)=>[stem(k,p)+'-evidence',stem(k,p)+'-to-belief',...copyParts(stem(k,p)),p.id+'-l4',p.id+'-l5-belief'];
 ['T','7'].forEach(key=>{
  const m=motifs[key];
  circuit+=context(key,`<rect class="bio-region" x="${m.parent-32}" y="26" width="64" height="76" rx="10"/>`+txt(m.parent,49,key,'bio-exemplar-label','middle')+
   route('context',part(key+'-parent-up',neuron(m.parent-10,85),'up'))+route('feedback',part(key+'-parent-down',neuron(m.parent+14,85),'down')));
  const parts=m.points.flatMap(p=>parentWires(stem(key,p))).concat(parentParts(key));
  graph+=context(key,route('context',
   link(key+'-and-parent',`M${m.parent} 94V64`,parts,`${key}: AND ↔ exemplar`,'Superficial output axons carry pooled evidence to the higher area (blue). A different higher-area population sends contextual feedback to layer I (purple), where deep and superficial pyramidal cells receive it on their apical dendrites.')+
   node(key+'-parent',variable(m.parent,48,key),parentParts(key),`Exemplar ${key}: separate message populations`,'The abbreviated higher area receives direct forward evidence from superficial cortical output cells. A separate layer-VI population sends contextual feedback to the lower region’s layer I. A circle in the graph is not a single neuron.')+
   node(key+'-and',factor(m.parent,100,'and'),parts,`${key}: AND computation`,'Converging feed-forward inputs and separate feedback projections implement the two directions of this AND computation; the factor is not a single extra neuron.')+txt(m.parent+15,104,'AND','bio-small')));
 });
 circuit+=txt(135,126,'Horizontal edge · three positions','bio-small','middle');
 circuit+=`<rect class="bio-thalamus" x="32" y="586" width="383" height="70" rx="30"/>`+txt(33,581,'LGN / TRN','bio-eyebrow');
 circuit+=`<rect class="bio-region bio-retina-band" x="18" y="671" width="392" height="53" rx="10"/>`+txt(210,742,'RETINA · LOCAL CONTRAST SIGNALS','bio-eyebrow','middle');
 features.forEach((f,i)=>{
  circuit+=featureGroup(f.id,`<rect class="bio-column" x="${f.x-27}" y="145" width="54" height="423" rx="16"/>`);
  layers.forEach(([,y,h])=>{circuit+=`<path d="M${f.x-26} ${y+h}H${f.x+26}" class="bio-layer-rule"/>`;});
  circuit+=featureGroup(f.id,route('evidence',part(f.id+'-l4',neuron(f.x,392,'stellate'),'up')));
  // Fig. 6g: feature belief is a distinct layer-V population downstream
  // of the context-specific deep copies. Layer VI computes component feedback.
  circuit+=featureGroup(f.id,route('feedback',
   part(f.id+'-l5-belief',neuron(f.x-13,501,'pyramid',480),'down')+
   axon(f.id+'-belief-to-l6',`M${f.x-13} 509Q${f.x-13} 522 ${f.x+15} 528`,'down')));
  circuitTargets.set(f.id+'-belief-to-l6',f.id+'-feature-or');
  circuit+=featureGroup(f.id,route('feedback',part(f.id+'-l6',neuron(f.x+22,539),'down')));
  circuit+=txt(f.x,142,f.short,'bio-copy-label','middle');
  f.contrasts.forEach(c=>{
   const id=channelID(c,f),x=relayX(c,f);
   circuit+=route('gate',part(id+'-relay',neuron(x,623,'relay'),'up')+
    axon(id+'-relay-up',`M${x} 613V424Q${x} 410 ${f.x+(x<f.x?-5:5)} 403`,'up'));
   circuitTargets.set(id+'-relay',c.id+'-gate');
   circuitTargets.set(id+'-relay-up',id+'-edge');
   if(c.id!=='c3'){
    circuit+=route('feedback',axon(id+'-feedback',`M${f.x+22} 547V577Q${f.x+22} 590 ${x+8} 605L${x+4} 618`,'down'));
    circuitTargets.set(id+'-feedback',id+'-edge');
   }
  });
  graph+=featureGroup(f.id,`<rect class="bio-feature-lane" x="${f.x-25}" y="253" width="50" height="196" rx="12"/>`);
 });
 channels.forEach(c=>{
  circuit+=route('evidence',part(c.id+'-retina',neuron(c.x,695,'retina'),'up'));
  circuitTargets.set(c.id+'-retina',c.id+'-evidence');
  c.parents.forEach(f=>{
   const id=channelID(c,f),x=relayX(c,f);
   circuit+=route('evidence',axon(id+'-input',`M${c.x} 689V670Q${c.x} 648 ${x} 631`,'up'));
   circuitTargets.set(id+'-input',c.id+'-observation-edge');
   if(c.id==='c3'){
    const rival=c.parents.find(q=>q.id!==f.id),rx=relayX(c,rival),tx=f.x+30;
    circuit+=route('feedback',part(id+'-trn',neuron(tx,599,'inhibit'),'down')+
     axon(id+'-feedback',`M${f.x+22} 547V570Q${f.x+22} 579 ${tx} 583V593`,'down')+
     part(id+'-inhibit',`<path class="bio-wire bio-flow" d="M${tx} 605Q${tx} ${f.id==='h'?654:647} ${rx+7} 623" marker-end="url(#${scopedId('bio-inhibition')})"/>`,'down'));
    circuitTargets.set(id+'-trn',c.id+'-gate');circuitTargets.set(id+'-feedback',id+'-edge');circuitTargets.set(id+'-inhibit',c.id+'-gate');
   }
  });
 });
 layers.forEach(([label,y,h])=>{circuit+=txt(43,y+h/2+4,label,'bio-layer','end');});
 graph+=txt(19,112,'LANDMARK VARIABLE NODES','bio-vertical bio-landmark-title')+txt(20,269,'FEATURE COPIES','bio-vertical');
 let cEvidence='',cContext='',cFeedback='',gContext='',gCopies='',gEvidence='',gGate='';
 ['T','7'].forEach(key=>{
  const m=motifs[key];let c='',fb='',g='',copies='';const [a,b]=m.points;
  m.points.forEach(p=>{
   const f=features.find(f=>f.id===p.id),id=stem(key,p),poolDeepY=key==='T'?448:466,tuftY=key==='T'?163:178;
   const candidates=p.candidates.map(fid=>candidate(key,fid));
   const allPoolParts=candidates.flatMap(q=>poolWires(q.id,id));
   const multi=candidates.length>1;
   const poolDescription=multi
    ?'Three spatially distinct candidate populations converge on one superficial pooling population (blue). A separate deep population sends feedback back to those candidates (purple). Moving to a neighboring candidate does not create a new landmark.'
    :'The superficial population carries the pooled forward result; a separate deep population carries feedback. This companion landmark is collapsed to one candidate to keep the drawing readable.';
   const poolExplanation=multi
    ?`One ${key} landmark, three possible positions: x−1, x, or x+1. Each candidate is a separate ${key}-specific feature copy. The pool preserves a choice among positions; its lateral constraints favor choices compatible with the other landmark. These are alternatives, not three required parts.`
    :'Only this companion pool is abbreviated to one candidate. The expanded horizontal pool shows what pooling normally does across multiple positions.';
   c+=part(id+'-pool-up',neuron(p.x,p.y-64,'pyramid',tuftY),'up')+
    axon(id+'-to-parent',`M${p.x+8} ${p.y-59}C${p.x+25} ${p.y-96} ${m.parent-10} 133 ${m.parent-10} 98`,'up');
   fb+=axon(id+'-from-parent',`M${m.parent+14} 93V${tuftY-8}Q${m.parent+14} ${tuftY-3} ${m.parent+19} ${tuftY-3}H${p.x-20}M${p.x-20} ${tuftY-3}H${p.x+7}`,'down')+
    part(id+'-pool-down',neuron(p.x-13,poolDeepY,'pyramid',tuftY),'down');
   g+=`<rect class="bio-candidate-set" data-bio-candidate-group="${id}" x="${multi?40:p.x-20}" y="${p.y-20}" width="${multi?186:40}" height="40" rx="20"/>`;
   g+=link(id+'-and-pool',`M${p.x} ${m.poolY-13}L${m.parent} 106`,parentWires(id).concat(parentParts(key)),`${key}: landmark pool ↔ AND`,'Superficial pool-output neurons send position-tolerant evidence to the exemplar (blue). Separate higher-area axons terminate in layer I (purple), contacting apical tufts whose dendrites extend down to superficial and layer-V populations.')+
    node(id+'-pool',edge(p.x,m.poolY,f.angle),allPoolParts,`${key}: one ${p.id==='h'?'horizontal':f.short.toLowerCase()} landmark${multi?', three candidate positions':''}`,poolDescription,poolExplanation)+
    link(id+'-pool-factor',`M${p.x} ${m.factorY-7}V${m.poolY+13}`,allPoolParts,`${key}: POOL ↔ landmark pool`,poolDescription)+
    node(id+'-pool-computation',factor(p.x,m.factorY,'pool'),allPoolParts,`${key}: ${multi?'many candidates → one pool':'pooling and unpooling'}`,poolDescription,poolExplanation)+txt(p.x+13,m.factorY+4,'POOL','bio-small');
   const graphCandidates=[id+'-pool',id+'-pool-factor',id+'-pool-computation',...candidates.flatMap(q=>[q.id+'-copy',q.id+'-copy-factor'])];
   [id+'-pool',id+'-pool-computation'].forEach(target=>{mappings.get(target).related=graphCandidates;mappings.get(target).groups=[id];});
   candidates.forEach(q=>{
    const deepY=key==='T'?483:503;
    cEvidence+=context(key,axon(q.id+'-evidence',`M${q.f.x} 383V366Q${q.f.x} 350 ${q.x} ${q.y+11}`,'up'));
    c+=axon(q.id+'-pooling',`M${q.x} ${q.y-10}Q${q.x} ${q.y-39} ${p.x} ${p.y-53}`,'up')+
     part(q.id+'-copy-up',neuron(q.x,q.y),'up');
    // A pool can span columns. Copies within a column share a location, but differ in context.
    fb+=axon(q.id+'-unpooling',`M${p.x-13} ${poolDeepY+8}Q${q.x+13} ${poolDeepY+10} ${q.x+13} ${deepY-13}`,'down')+
     part(q.id+'-copy-down',neuron(q.x+13,deepY),'down')+
     axon(q.id+'-to-belief',`M${q.x+13} ${deepY+7}Q${q.f.x+1} ${deepY+14} ${q.f.x-13} 489`,'down');
    g+=link(q.id+'-copy-factor',`M${q.x} ${q.y-13}Q${q.x} ${q.y-36} ${p.x} ${m.factorY+7}`,poolWires(q.id,id),`${key}: candidate ${q.f.short} ↔ POOL`,
     `The ${q.f.name.toLowerCase()} candidate sends its own evidence to the shared pooling population (blue). Separate feedback axons return from that pool to this candidate (purple).`)+
     node(q.id+'-copy',edge(q.x,q.y,q.f.angle),copyParts(q.id),`${key} copy · ${q.f.name.toLowerCase()}`,
      `These superficial and deep populations represent ${q.f.name.toLowerCase()} in the ${key} context. A neighboring position has a different feature column. The other exemplar has another copy within this same column.`,
      `This copy asks whether the edge at this particular location participates in ${key}. Its POOL factor groups it with the other allowed locations for the same landmark. Copying separates contexts; pooling groups alternatives.`);
    if(multi){g+=txt(q.x,q.y+32,q.f.short,'bio-candidate-label','middle');}
    else {g+=txt(q.x+14,q.y+4,key+' copy','bio-copy-label');}
    c+=txt(q.x+9,q.y+5,key,'bio-copy-label');
    copies+=link(q.id+'-copy-or',`M${q.f.x} 380V367Q${q.f.x} 358 ${q.x} ${q.y+13}`,featureWires(key,{id:q.f.id}),`${key}: ${q.f.short} OR ↔ feature copy`,
     'Layer 4 at this location supplies the same evidence to the T and 7 copies (blue). Deep copy populations converge on the shared layer-V feature-belief population (purple), following Fig. 6g. Copies share input at one position; the pool above combines candidates from different positions.');
   });
  });
  const lateralParts=[];
  a.candidates.forEach(fid=>{
   const left=candidate(key,fid),right=candidate(key,b.candidates[0]);
   const forward=key+'-'+fid+'-lateral-right',backward=key+'-'+fid+'-lateral-left';
   c+=axon(forward,`M${left.x+8} ${left.y+3}Q${(left.x+right.x)/2} ${left.y+20} ${right.x-11} ${right.y+3}`,'up')+
      axon(backward,`M${right.x-8} ${right.y-7}Q${(left.x+right.x)/2} ${left.y-25} ${left.x+10} ${left.y-7}`,'down');
   lateralParts.push(forward,backward,left.id+'-copy-up',right.id+'-copy-up');
  });
  const lateralText='Reciprocal lateral projections carry compatibility information between candidate populations. Different candidate positions can receive different lateral support. The pool gathers these context-sensitive alternatives; it does not treat every position as an equally good fit.';
  // In this expanded representation the lateral factor acts on the
  // categorical candidate sets, not on their scalar pooled outputs above.
  const leftBoundary=226,rightBoundary=b.x-20,mid=(leftBoundary+rightBoundary)/2,lateralY=a.y;
  const lateralGraph='The outlined groups contain candidate feature copies. This factor compares choices across those groups—before their evidence is pooled upward. Its connections meet the group boundaries because it acts on the candidate sets, not just the nearest circle.';
  g+=link(key+'-lateral-a',`M${leftBoundary} ${lateralY}H${mid-7}`,lateralParts,`${key}: candidate group ↔ lateral factor`,lateralText)+
    link(key+'-lateral-b',`M${mid+7} ${lateralY}H${rightBoundary}`,lateralParts,`${key}: lateral factor ↔ candidate group`,lateralText)+
    node(key+'-lateral',factor(mid,lateralY,'lateral'),lateralParts,`${key}: lateral compatibility before pooling`,lateralText,lateralGraph);
  const lateralTargets=[key+'-lateral-a',key+'-lateral-b',key+'-lateral'];
  const candidateTargets=m.points.flatMap(p=>p.candidates.map(fid=>candidate(key,fid).id+'-copy'));
  lateralTargets.forEach(id=>{
   const mapping=mappings.get(id);
   mapping.related=[...lateralTargets,...candidateTargets];
   mapping.groups=m.points.map(p=>stem(key,p));
   mapping.graph=lateralGraph;
  });
  cContext+=context(key,c);cFeedback+=context(key,fb);gContext+=context(key,g);gCopies+=context(key,copies);
 });
 features.forEach((f,i)=>{
  const related=['T','7'].flatMap(k=>motifs[k].points.filter(p=>p.candidates.includes(f.id)).flatMap(()=>featureWires(k,{id:f.id})));
  gEvidence+=featureGroup(f.id,link(f.id+'-feature-or',`M${f.x} 418V394`,related,`${f.name} feature ↔ OR`,'Layer IV broadcasts feature evidence to superficial contextual copies (Fig. 6b). In the feedback pathway, deep copies converge on the layer-V feature-belief population, BEL_feat (Fig. 6g). Layer VI subsequently computes feedback to the feature’s components.')+
   node(f.id+'-or',factor(f.x,387,'or'),related,`${f.name}: shared-feature OR`,'One factor, separate forward and feedback computations: layer IV broadcasts feature evidence to contextual copies (Fig. 6b); layer V combines evidence from the deep copies into the feature’s overall belief, BEL_feat (Fig. 6g). These are the paper’s schematic population mappings, not a fully specified interneuron circuit.')+txt(f.x+13,391,'OR','bio-small')+
   node(f.id+'-feature',edge(f.x,432,f.angle),[f.id+'-l4',f.id+'-l5-belief',f.id+'-l6'],`${f.name}: one feature, multiple populations`,'Layer-IV stellate cells carry forward feature evidence. A distinct layer-V population combines contextual copy signals into the feature belief, BEL_feat. Layer VI computes feedback to child components. These populations represent different computations associated with the same feature.'));
 });
 const partsForChannel=(c,f)=>{
  const id=channelID(c,f),parts=[c.id+'-retina',id+'-input',id+'-relay',id+'-relay-up',id+'-feedback',f.id+'-l4',f.id+'-l6'];
  if(c.id==='c3')c.parents.forEach(parent=>{const cid=channelID(c,parent);parts.push(parent.id+'-l6',cid+'-feedback',cid+'-trn',cid+'-inhibit',cid+'-relay');});
  return parts;
 };
 channels.forEach(c=>{
  const shared=c.parents.length>1,allParts=[...new Set(c.parents.flatMap(f=>partsForChannel(c,f)))];
  const explanation=shared
   ?`${c.label} is local contrast evidence shared by ${c.parents.map(f=>f.name.toLowerCase()).join(' and ')}. If one edge is supported by the rest of the image, this shared observation supplies less extra evidence for the alternative. The central c₃ circuit expands the proposed layer-VI → TRN → competing relay mechanism; other channels abbreviate it.`
   :`${c.label} is one local contrast input to ${c.parents[0].name.toLowerCase()}. That cortical feature also receives a second contrast component. Only a small sample of its inputs is drawn.`;
  c.parents.forEach(f=>{
   const id=channelID(c,f);
   gGate+=link(id+'-edge',`M${c.x} 613L${f.x+(c.x<f.x?-5:5)} 449`,partsForChannel(c,f),`${c.label} ↔ ${f.name}: one of several inputs`,explanation);
  });
  gGate+=node(c.id+'-gate',factor(c.x,620,'or'),allParts,`${c.label}: ${shared?'shared':'input'} Noisy-OR`,explanation,
   'Each cortical edge feature combines more than one contrast input. Each shared contrast input can be explained by more than one edge. The OR describes a collection of relay/TRN operations, not a single thalamic neuron. This is a sparse illustrative input level, not a fitted retinal receptive-field model.');
  gGate+=link(c.id+'-observation-edge',`M${c.x} 678V627`,[c.id+'-retina',...c.parents.flatMap(f=>[channelID(c,f)+'-input',channelID(c,f)+'-relay'])],`${c.label}: observed retinal contrast → LGN`,
   'A retinal ganglion-cell population supplies local center-surround contrast evidence to relay channels. This input is observed: cortical feedback changes how its evidence is used at the LGN/TRN interface, not the retinal observation. No returning cortical axon to the retina is drawn.');
  mappings.get(c.id+'-observation-edge').observed=true;
  gGate+=node(c.id+'-evidence',variable(c.x,691,c.label),[c.id+'-retina'],`${c.label}: observed local contrast`,
   'A retinal ganglion-cell population reports local contrast between a receptive-field center and its surround. It is neither an image pixel nor an oriented cortical edge detector.',
   'This observed variable supplies evidence. Candidate cortical edges are the explanations above it. The drawing abbreviates ON/OFF channels and uses only a few illustrative receptive fields.');
  const related=[c.id+'-gate',c.id+'-observation-edge',c.id+'-evidence',...c.parents.flatMap(f=>[channelID(c,f)+'-edge',f.id+'-feature'])];
  [c.id+'-gate',...c.parents.map(f=>channelID(c,f)+'-edge')].forEach(id=>{mappings.get(id).related=related;});
 });
 // Feature hover reveals convergence of multiple relay inputs, not a 1:1 pair.
 features.forEach(f=>{
  const m=mappings.get(f.id+'-feature');m.parts=[...new Set(f.contrasts.flatMap(c=>partsForChannel(channels.find(q=>q.id===c.id),f)))];
  m.related=[f.id+'-feature',...f.contrasts.flatMap(c=>[channelID(c,f)+'-edge',c.id+'-gate',c.id+'-evidence'])];
  m.circuit='Several LGN inputs converge on cortical circuitry that computes edge evidence. Two example relay channels are drawn for this feature; a real population has many more inputs. Layer IV participates in the forward computation, a distinct layer-V population computes the feature belief (BEL_feat), and layer VI sends feedback toward LGN/TRN. A feature variable is represented across these populations.';
 });

 circuit+=route('evidence',cEvidence)+route('context',cContext)+route('feedback',cFeedback);
 graph+=route('context',gContext)+route('evidence',gCopies+gEvidence)+route('gate',gGate);
 graph+=txt(210,467,'Shared edge-feature variables','bio-small','middle')+txt(210,738,'Observed local contrast · retinal input','bio-small','middle');
 circuit=`<defs><marker id="${scopedId('bio-inhibition')}" markerWidth="5" markerHeight="12" refX="2" refY="6" orient="auto"><path d="M2 1V11" stroke="context-stroke" stroke-width="2"/></marker></defs>`+circuit;
 get('bio-circuit').innerHTML=svg('bio-circuit-svg','Separate neuronal pathways for both message directions',circuit);
 graph+=`<g id="bio-hover-hint" class="bio-explore-hint" pointer-events="none" aria-hidden="true"><text x="204" y="654">Hover over a node</text><path d="M195 648C163 670 144 641 165 624M156 624L165 624L162 633"/></g>`;
 get('bio-graph').innerHTML=svg('bio-graph-svg','Hover either a neuron or a graph variable or edge to locate its counterpart',graph);
 // Keep somata above crossing axons so a cell remains easy to pick.
 const circuitSVG=get('bio-circuit').querySelector('svg');
 const neuronLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
 neuronLayer.classList.add('bio-neuron-layer');
 Array.from(circuitSVG.querySelectorAll('[data-bio-part]')).filter(p=>p.querySelector('.bio-neuron')).forEach(p=>{
  const route=p.closest('[data-bio-route]'),context=p.closest('[data-bio-context]');
  const routeCopy=route.cloneNode(false);
  if(context){const contextCopy=context.cloneNode(false);contextCopy.append(p);routeCopy.append(contextCopy);}
  else routeCopy.append(p);
  neuronLayer.append(routeCopy);
 });
 circuitSVG.append(neuronLayer);
 const labels={overview:'Overview',evidence:'Shared evidence',context:'Copies & pools',feedback:'Feedback',gate:'Explaining away'};
 const controls=get('bio-controls');
 controls.innerHTML=Object.entries(labels).map(([key,label])=>`<button type="button" data-bio-select="${key}" aria-pressed="${key===selected}" style="--route:${colors[key]||colors.neutral}">${label}</button>`).join('');
 // Exemplar selection is part of each drawing, rather than a remote toolbar.
 ['T','7'].forEach(key=>{
  const graphParent=figure.querySelector(`[data-bio-target="${key}-parent"]`);
  const graphRoute=graphParent.closest('[data-bio-route]').cloneNode(false);graphRoute.classList.add('bio-selector-route');
  const graphContext=graphParent.closest('[data-bio-context]').cloneNode(false);
  graphContext.classList.add('bio-selector-context');graphRoute.append(graphParent);graphContext.append(graphRoute);
  get('bio-graph').querySelector('svg').append(graphContext);
  const region=figure.querySelector(`[data-bio-slot="bio-circuit"] [data-bio-context="${key}"] .bio-region`);
  region.closest('[data-bio-context]').classList.add('bio-selector-context');
  region.parentNode.querySelector('.bio-exemplar-label').style.pointerEvents='none';
  [region,graphParent].forEach(el=>{
   el.dataset.bioExemplar=key;el.classList.add('bio-exemplar-pick');
   el.setAttribute('role','button');el.setAttribute('tabindex','0');
   el.setAttribute('aria-label',`Select exemplar ${key}`);
   const choose=e=>{e.stopImmediatePropagation();exemplar=key;render(selected);};
   el.addEventListener('click',choose);
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(e);}});
  });
 });
 function render(key){
  clearMapping();
  figure.dataset.active=key;figure.dataset.exemplar=exemplar;
  figure.querySelectorAll('[data-bio-context]').forEach(g=>g.classList.toggle('is-unselected',g.dataset.bioContext!==exemplar));
  figure.querySelectorAll('[data-bio-target],[data-bio-circuit-target]').forEach(el=>{const enabled=el.hasAttribute('data-bio-exemplar')||isAvailable(el);el.setAttribute('tabindex',enabled?'0':'-1');el.setAttribute('aria-disabled',String(!enabled));});
  figure.querySelectorAll('[data-bio-route]').forEach(g=>{
   const graphRoute=!!g.closest('[data-bio-slot="bio-graph"]');
   const active=key==='overview'||g.dataset.bioRoute===key||(key==='context'&&g.dataset.bioRoute==='evidence')||(key==='feedback'&&graphRoute&&['context','evidence'].includes(g.dataset.bioRoute));
   g.classList.toggle('is-muted',!active);g.classList.toggle('is-active',key!=='overview'&&active);
  });
  figure.querySelectorAll('[data-bio-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bioSelect===selected)));
  figure.querySelectorAll('[data-bio-exemplar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bioExemplar===exemplar)));
  if(key==='gate')inspect(figure.querySelector('[data-bio-target="c3-gate"]'));
 }
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-bio-select]');if(b){selected=b.dataset.bioSelect;render(selected);}});

 // A factor and every incident edge form one inspection target. Build the
 // adjacency once from the drawn endpoints; crossings never count as joins.
 const factorEdges=new Map(),edgeFactor=new Map();
 const factors=Array.from(figure.querySelectorAll('.bio-target-node')).filter(el=>el.querySelector('.bio-factor'));
 factors.forEach(factor=>factorEdges.set(factor,[]));
 figure.querySelectorAll('.bio-target-edge').forEach(edge=>{
  const wire=edge.querySelector('.bio-hit');
  const ends=[wire.getPointAtLength(0),wire.getPointAtLength(wire.getTotalLength())];
  const nearest=factors.map(factor=>{
   const at=factor.querySelector('.bio-factor').transform.baseVal.consolidate().matrix;
   return {factor,distance:Math.min(...ends.map(p=>Math.hypot(p.x-at.e,p.y-at.f)))};
  }).sort((a,b)=>a.distance-b.distance)[0];
  if(nearest&&nearest.distance<13){
   edgeFactor.set(edge,nearest.factor);factorEdges.get(nearest.factor).push(edge);
   edge.dataset.bioFactor=nearest.factor.dataset.bioTarget;
  }
 });

 function isAvailable(el){return !el.closest('[data-bio-context].is-unselected');}
 function clearMapping(){
  figure.classList.remove('bio-inspecting');
  figure.querySelectorAll('.is-mapped, .is-endpoint, .is-related').forEach(el=>el.classList.remove('is-mapped','is-endpoint','is-related'));
 }
 function inspect(el){
  if(!isAvailable(el))return;
  el=edgeFactor.get(el)||el;
  if(!isAvailable(el))return;
  clearMapping();
  const mapping=mappings.get(el.dataset.bioTarget);if(!mapping)return;
  figure.classList.add('bio-inspecting');el.classList.add('is-mapped');if(mapping.observed)el.classList.add('bio-observed-message');
  const variableOnly=!!el.querySelector('.bio-variable');
  const parts=new Set(mapping.parts);
  if(variableOnly){
   parts.clear();
   figure.querySelectorAll('[data-bio-part]').forEach(p=>{if(p.dataset.bioCircuitTarget===el.dataset.bioTarget&&p.querySelector('.bio-neuron'))parts.add(p.dataset.bioPart);});
  }
  if(factorEdges.has(el)){
   factorEdges.get(el).forEach(edge=>{
    if(!isAvailable(edge))return;
    edge.classList.add('is-mapped');
    const connected=mappings.get(edge.dataset.bioTarget);
    if(connected.observed)edge.classList.add('bio-observed-message');
    connected.parts.forEach(id=>parts.add(id));
   });
  }
  (variableOnly?[]:mapping.related||[]).forEach(id=>{const related=figure.querySelector(`[data-bio-target="${id}"]`);if(related&&isAvailable(related))related.classList.add('is-related');});
  (variableOnly?[]:mapping.groups||[]).forEach(id=>{figure.querySelector(`[data-bio-candidate-group="${id}"]`)?.classList.add('is-related');});
  if(mapping.kind==='edge'){
   const wire=el.querySelector('.bio-hit');
   const endpoints=[wire.getPointAtLength(0),wire.getPointAtLength(wire.getTotalLength())];
   figure.querySelectorAll('.bio-target-node').forEach(n=>{
    const glyph=n.querySelector('.bio-variable,.bio-factor');
    const at=glyph.transform.baseVal.consolidate().matrix;
    if(isAvailable(n)&&endpoints.some(p=>Math.hypot(p.x-at.e,p.y-at.f)<20))n.classList.add('is-endpoint');
   });
  }
  const ids=parts;
  figure.querySelectorAll('[data-bio-part]').forEach(p=>{
   if(isAvailable(p)&&ids.has(p.dataset.bioPart))p.classList.add('is-mapped');
  });
 }
 figure.querySelectorAll('[data-bio-target]').forEach(el=>{
  if(el.hasAttribute('data-bio-exemplar'))return;
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')inspect(el);});
  el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')render(selected);});
  el.addEventListener('focus',()=>inspect(el));
  el.addEventListener('blur',()=>render(selected));
  el.addEventListener('click',()=>inspect(el));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(el);}if(e.key==='Escape'){el.blur();render(selected);}});
 });
 // Reverse lookup favors the corresponding variable over every edge that uses it.
 function counterpart(id){
  if(circuitTargets.has(id))return circuitTargets.get(id);
  const exact=id.match(/^(T|7)-(parent|(?:hl|h|hr|v|d)-(?:pool|copy))-(up|down)$/);
  if(exact)return exact[1]+'-'+exact[2];
  const shared=id.match(/^(hl|h|hr|v|d)-(l4|l5-belief|l6)$/);
  if(shared)return shared[1]+'-feature';
  const wire=id.match(/^(T|7)-(hl|h|hr|v|d)-(to-parent|from-parent|pooling|unpooling|evidence|to-belief|lateral-right|lateral-left)$/);
  if(wire){
   const [,key,fid,role]=wire;
   if(role.startsWith('lateral'))return key+'-lateral';
   return key+'-'+fid+'-'+({'to-parent':'and-pool','from-parent':'and-pool',pooling:'copy-factor',unpooling:'copy-factor',evidence:'copy-or','to-belief':'copy-or'}[role]);
  }

 }
 figure.querySelectorAll('[data-bio-slot="bio-circuit"] [data-bio-part]').forEach(el=>{
  // The neurons inside an exemplar card belong to its selection control.
  if(/^(T|7)-parent-(up|down)$/.test(el.dataset.bioPart))return;
  const id=counterpart(el.dataset.bioPart),target=figure.querySelector(`[data-bio-target="${id}"]`);
  if(!target)return;
  el.dataset.bioCircuitTarget=id;
  el.setAttribute('role','button');el.setAttribute('tabindex','0');
  el.setAttribute('aria-label',mappings.get(id).title+'. Show corresponding factor graph element.');
  const neuron=el.querySelector('.bio-neuron');
  if(neuron){
   const hit=document.createElementNS('http://www.w3.org/2000/svg','circle');
   hit.setAttribute('r','11');hit.setAttribute('class','bio-neuron-hit');neuron.append(hit);
  }else{
   el.querySelectorAll('.bio-wire').forEach(wire=>{
    const hit=wire.cloneNode(false);hit.removeAttribute('marker-end');hit.setAttribute('class','bio-circuit-hit');el.prepend(hit);
   });
  }
  const show=()=>{if(isAvailable(el)){inspect(target);el.classList.add('is-mapped');}};
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show();});
  el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')render(selected);});
  el.addEventListener('focus',show);el.addEventListener('blur',()=>render(selected));
  el.addEventListener('click',show);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}if(e.key==='Escape'){el.blur();render(selected);}});
 });
 figure.addEventListener('click',e=>{if(!e.target.closest('[data-bio-target],[data-bio-circuit-target],[data-bio-exemplar]'))render(selected);});
 render(selected);
 }
})();
