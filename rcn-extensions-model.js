/* Small, hand-specified teaching models. No trained MNIST weights are used.
 * Hierarchy: exact max-sum over discrete placements and compatibility factors.
 * Ambiguity: exact joint inference over B, 1, and 3 with shared OR evidence.
 * All numbers are log scores, not posterior probabilities or neural firing rates. */
(function(root){
  'use strict';
  const shifts=[-1,0,1], corners=['Upper left','Upper right','Lower right','Lower left'];
  const bases=[[65,65],[175,65],[175,175],[65,175]];
  const directions=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const combinations=n=>n===0?[[]]:combinations(n-1).flatMap(a=>shifts.map(x=>[...a,x]));
  const placements=combinations(4);
  const compatible=q=>q.every((v,i)=>Math.abs(v-q[(i+1)%4])<=1);
  function observations(displacement=0,broken=false){
    if(!Number.isInteger(displacement)||displacement<0||displacement>3)throw new RangeError('Displacement must be 0–3.');
    return [[displacement,broken?displacement+1:displacement],[0,0],[0,0],[0,0]];
  }
  const evidence=(observed,position)=>observed===position?1:-1;
  function hierarchy(displacement=0,broken=false){
    const observed=observations(displacement,broken);
    // Each corner placement q has two edge pools. Local lateral compatibility
    // requires their residual displacements r to agree: the edgelets must meet.
    const messages=observed.map(pair=>shifts.map(q=>{
      const edge=pair.map(o=>shifts.map(r=>evidence(o,q+r)));
      const alternatives=shifts.map((r,k)=>({r,score:edge[0][k]+edge[1][k]}));
      alternatives.sort((a,b)=>b.score-a.score||Math.abs(a.r)-Math.abs(b.r));
      return {q,edge,alternatives,score:alternatives[0].score,r:alternatives[0].r};
    }));
    // The upper lateral ring is small enough to eliminate exactly. Forward
    // score = max_q [sum_i cornerMessage_i(q_i) + upperCompatibility(q)].
    const worlds=placements.filter(compatible).map(q=>({q,score:q.reduce((s,v,i)=>s+messages[i][v+1].score,0)}));
    worlds.sort((a,b)=>b.score-a.score||a.q.reduce((s,x)=>s+Math.abs(x),0)-b.q.reduce((s,x)=>s+Math.abs(x),0));
    const best=worlds[0];
    const selected=best.q.map((q,i)=>{
      const m=messages[i][q+1],position=q+m.r;
      return {q,r:m.r,position,score:m.score,matches:observed[i].map(o=>o===position)};
    });
    // Max-marginals expose the effect of the upper constraints on each pool.
    const maxMarginals=corners.map((_,i)=>shifts.map(q=>Math.max(...worlds.filter(w=>w.q[i]===q).map(w=>w.score))));
    return {observed,messages,worlds,selected,maxMarginals,score:best.score,matches:selected.flatMap(s=>s.matches).filter(Boolean).length};
  }
  function edgeGeometry(corner,orientation,position){
    const b=bases[corner],d=directions[corner],x=b[0]+d[0]*position*12,y=b[1]+d[1]*position*12;
    return orientation===0?[x,y,x-d[0]*55,y]:[x,y,x,y-d[1]*55];
  }

  // One fixed, slightly separated stem and two lobes can be grouped as B or 13.
  // Six contour parts are shared observations, not six independent copies per
  // exemplar. Paths are immutable and identical in both interpretations.
  const characterParts=Object.freeze([
    {id:'stem-top',d:'M83 45 L83 116',viewBox:'75 40 16 82'},
    {id:'stem-bottom',d:'M83 116 L83 187',viewBox:'75 110 16 83'},
    {id:'upper-out',d:'M92 45 C128 38 174 43 174 80',viewBox:'85 35 96 52'},
    {id:'upper-in',d:'M174 80 C174 104 146 116 94 116',viewBox:'87 73 94 50'},
    {id:'lower-out',d:'M94 116 C146 116 180 123 176 154',viewBox:'87 109 96 52'},
    {id:'lower-in',d:'M176 154 C173 190 132 198 92 187',viewBox:'85 147 98 53'}
  ].map(Object.freeze));
  const characterNames=Object.freeze(['B','1','3']);
  const characterFeatures=Object.freeze([[0,1,2,3,4,5],[0,1],[2,3,4,5]].map(Object.freeze));
  const characterCosts=Object.freeze([1,.5,.5]);
  function ambiguity(bias=0,previous=1,observation=[1,1,1,1,1,1]){
    if(!Number.isFinite(bias)||Math.abs(bias)>.6)throw new RangeError('Bias must be within ±0.6.');
    if(observation.length!==6||observation.some(v=>v!==0&&v!==1))throw new RangeError('Expected six binary observations.');
    const prior=[-bias/2,bias/4,bias/4];
    // Three binary exemplar variables give eight possible joint explanations.
    // OR evidence is counted once, however many active exemplars predict it.
    // Equal total costs make B and 1+3 equally plausible before adding context.
    const worlds=Array.from({length:8},(_,mask)=>{
      const exemplars=characterNames.map((_,i)=>(mask>>i)&1);
      const owners=characterParts.map((_,j)=>characterNames.map((_,i)=>i).filter(i=>exemplars[i]&&characterFeatures[i].includes(j)));
      const predicted=owners.map(a=>Number(a.length>0));
      const imageScore=predicted.reduce((v,on,j)=>v+(on===observation[j]?1:-1),0);
      const cost=exemplars.reduce((v,on,i)=>v+on*characterCosts[i],0);
      const preference=exemplars.reduce((v,on,i)=>v+on*prior[i],0);
      return {mask,exemplars,owners,predicted,imageScore,cost,preference,score:imageScore-cost+preference};
    });
    const best=Math.max(...worlds.map(w=>w.score)),optimal=worlds.filter(w=>Math.abs(w.score-best)<1e-10);
    // Retaining a previous tied MAP solution is a display convention, not a
    // dynamical model of perceptual persistence or spontaneous switching.
    const chosen=optimal.find(w=>w.mask===previous)||optimal[0];
    const maxMarginals=characterNames.map((_,i)=>[0,1].map(on=>Math.max(...worlds.filter(w=>w.exemplars[i]===on).map(w=>w.score))));
    return {bias,prior,worlds,scores:[worlds[1].score,worlds[6].score],optimal:optimal.map(w=>w.mask),tied:optimal.length>1,
      selected:chosen.mask,exemplars:chosen.exemplars,owners:chosen.owners,predicted:chosen.predicted,score:chosen.score,
      maxMarginals,input:characterParts,observation:[...observation],
      trace:[{stage:'prior',prior},{stage:'exemplars',exemplars:chosen.exemplars},{stage:'strokes',owners:chosen.owners}]};
  }
  root.RCNExtensions={hierarchy,ambiguity,observations,evidence,compatible,edgeGeometry,corners,shifts,
    characterParts,characterNames,characterFeatures,characterCosts};
})(globalThis);
