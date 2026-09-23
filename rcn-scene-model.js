/* A spatial teaching variant of the notebook's T / 7 / bar toy.
   Forward: search translated, orientation-specific templates, +1 match / -1 miss.
   Recurrent inference: actual max-product messages, with adjustable OR log-score damping (default 1/2).
   Relative support is softmax(scores), a ranking display, NOT posterior marginals. */
(function(root){
 'use strict';
 const toy=root.RCNToy;if(!toy)return;
 const prior=-1,evidence=1,damping=.5;
 const edges=[...Array.from({length:6},(_,c)=>({r:0,c,dr:0,dc:.5,kind:'horizontal'})),
  {r:1,c:1,dr:.5,dc:0,kind:'vertical'},
  {r:1,c:4.75,dr:.5,dc:-.25,kind:'diagonal'},
  {r:2,c:1,dr:.5,dc:0,kind:'vertical'},
  {r:2,c:4.25,dr:.5,dc:-.25,kind:'diagonal'}];
 const templates=toy.templates.map((_,h)=>edges.filter((_,k)=>toy.claims[k].includes(h)).map(e=>({...e,c:e.c+(h===0?1.5:h===1?-1.5:0)})));
 const candidates=[-1.5,-1,-.5,0,.5,1,1.5];
 function placement(h,shift){
  const locations=templates[h].map(e=>({...e,c:e.c+shift}));
  const matches=locations.map(e=>edges.findIndex(o=>o.kind===e.kind&&Math.abs(o.r-e.r)<1e-9&&Math.abs(o.c-e.c)<1e-9));
  const valid=locations.every(e=>e.c-Math.abs(e.dc)>=-.5&&e.c+Math.abs(e.dc)<=5.5);
  return {shift,locations,matches,valid,score:prior+matches.reduce((sum,k)=>sum+(k>=0?1:-1),0)};
 }
 const fits=templates.map((_,h)=>candidates.map(x=>placement(h,x)).filter(f=>f.valid).sort((a,b)=>b.score-a.score||Math.abs(a.shift)-Math.abs(b.shift))[0]);
 const claims=edges.map((_,k)=>fits.flatMap((fit,h)=>fit.matches.includes(k)?[h]:[]));
 const incident=h=>claims.flatMap((hs,k)=>hs.includes(h)?[k]:[]);
 const copy=m=>m.map(row=>row.slice());
 function support(messages,h,excluded=null){
  const inputs=incident(h).filter(k=>k!==excluded).map(k=>({k,value:messages[k][claims[k].indexOf(h)]}));
  return {inputs,score:prior+inputs.reduce((a,x)=>a+x.value,0)};
 }
 const scores=m=>toy.names.map((_,h)=>support(m,h).score);
 function relative(values){const top=Math.max(...values),weights=values.map(x=>Math.exp(x-top)),total=weights.reduce((a,b)=>a+b,0);return weights.map(x=>x/total);}
 function reply(messages,k,h,keep=damping){
  const rival=claims[k].find(i=>i!==h),gathered=rival===undefined?null:support(messages,rival,k),q=gathered?.score;
  const on=evidence+(q===undefined?0:Math.max(0,q)),off=q===undefined?0:Math.max(0,evidence+q),proposal=on-off;
  const old=messages[k][claims[k].indexOf(h)];
  return {k,h,rival,gathered,q,on,off,proposal,old,sent:keep*old+(1-keep)*proposal};
 }
 function residualOf(m){return Math.max(...claims.flatMap((hs,k)=>hs.map(h=>{const c=reply(m,k,h);return Math.abs(c.proposal-c.old);})));}
 function run({keep=damping,rounds=60,untilConverged=true,schedule='sequential'}={}){
  if(!Number.isFinite(keep)||keep<0||keep>=1)throw new RangeError("Damping must be in [0, 1).");
  if(!['sequential','parallel'].includes(schedule))throw new RangeError('Unknown message schedule.');
  let messages=claims.map(hs=>hs.map(()=>evidence));
  const initial=scores(messages),frames=[{round:0,recipient:null,messages:copy(messages),scores:initial,relative:relative(initial),residual:residualOf(messages),changes:[]}];
  for(let round=1;round<=rounds;round++){
   let residual=0;
   for(const recipients of schedule==='parallel'?[[0,1,2]]:[[0],[2],[1]]){
    const before=copy(messages),changes=recipients.flatMap(h=>incident(h).map(k=>reply(before,k,h,keep)));
    changes.forEach(c=>{residual=Math.max(residual,Math.abs(c.proposal-c.old));messages[c.k][claims[c.k].indexOf(c.h)]=c.sent;});
    const values=scores(messages);
    frames.push({round,recipient:recipients.length===1?recipients[0]:null,recipients,before,messages:copy(messages),scores:values,relative:relative(values),residual:residualOf(messages),changes});
   }
   if(untilConverged&&residual<1e-5)break;
  }
  return frames;
 }
 // Both factor layers read the previous round; no freshly computed reply is
 // reused in that round. Degree-two landmark variables relay the other input.
 function runFactorRounds({keep=damping,rounds=50}={}){
  if(!Number.isFinite(keep)||keep<0||keep>=1)throw new RangeError("Damping must be in [0, 1).");
  let messages=claims.map(hs=>hs.map(()=>evidence));
  let contexts=claims.map((hs,k)=>hs.map(h=>support(messages,h,k).score));
  let values=scores(messages);
  const frames=[{round:0,messages:copy(messages),contexts:copy(contexts),scores:values,relative:relative(values),changes:[],residual:1,sourceRound:0}];
  for(let round=1;round<=rounds;round++){
   const before=copy(messages),previousContexts=copy(contexts);
   const changes=claims.flatMap((hs,k)=>hs.map(h=>{
    const rival=hs.find(i=>i!==h),q=rival===undefined?undefined:previousContexts[k][hs.indexOf(rival)];
    const on=evidence+(q===undefined?0:Math.max(0,q)),off=q===undefined?0:Math.max(0,evidence+q),proposal=on-off,old=before[k][hs.indexOf(h)];
    return {k,h,rival,q,on,off,proposal,old,sent:keep*old+(1-keep)*proposal};
   }));
   contexts=claims.map((hs,k)=>hs.map(h=>support(before,h,k).score));
   messages=copy(before);changes.forEach(c=>{messages[c.k][claims[c.k].indexOf(c.h)]=c.sent;});
   const nextScores=scores(before);
   const residual=Math.max(...changes.map(c=>Math.abs(c.proposal-c.old)),...contexts.flatMap((row,k)=>row.map((v,i)=>Math.abs(v-previousContexts[k][i]))),...nextScores.map((v,h)=>Math.abs(v-values[h])));
   values=nextScores;
   frames.push({round,before,previousContexts,messages:copy(messages),contexts:copy(contexts),scores:values,relative:relative(values),changes,residual,sourceRound:round-1});
  }
  return frames;
 }
 function worlds(){return Array.from({length:8},(_,mask)=>{const active=[0,1,2].filter(h=>mask&(1<<h));return {active,score:prior*active.length+claims.filter(hs=>hs.some(h=>active.includes(h))).length*evidence};}).sort((a,b)=>b.score-a.score);}
 root.RCNSceneModel={prior,evidence,damping,edges,templates,candidates,placement,fits,claims,incident,support,scores,relative,reply,run,runFactorRounds,worlds};
})(globalThis);
