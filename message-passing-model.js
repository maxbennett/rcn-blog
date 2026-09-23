/* Exact tree messages and a clamped triangle example. */
(function (root) {
  'use strict';
  const normalize = pair => { const z = pair[0] + pair[1]; if (!(z > 0)) throw Error('Zero message mass'); return pair.map(x => x / z); };
  function diagnosis(model) {
    const factor = id => model.factors.find(f => f.id === id);
    const priorYes = factor('fD').yes[0];
    const prior = [1 - priorYes, priorYes];
    const fever = factor('fF').yes.slice();
    const chest = factor('fY3').yes.slice();
    const coughGivenDisease = factor('fC').yes.slice();
    const coughTerms = coughGivenDisease.map(p => [(1 - p) * chest[0], p * chest[1]]);
    const cough = coughTerms.map(pair => pair[0] + pair[1]);
    const weights = prior.map((p,d) => p * fever[d] * cough[d]);
    return { prior, fever, chest, coughGivenDisease, coughTerms, cough, weights, posterior:normalize(weights), evidence:{ F:1, Y3:1 } };
  }
  // Unary evidence factors are explicit. Unknown symptoms contribute [1, 1],
  // not a second marginal prior. The schedule only sends messages toward D.
  function diagnosisHistory(model) {
    const data=diagnosis(model);
    const localFactors=model.variables.filter(v=>v.id!=='D').map(v=>({
      id:`e${v.id}`,child:v.id,variables:[v.id],local:true,
      observed:v.id in data.evidence,weights:v.id in data.evidence?[0,1]:[1,1],
      label:`Local evidence for ${model.label(v.id)}`
    }));
    const factors=[...model.factors,...localFactors];
    const messages={prior:{from:'fD',to:'D',factor:'fD',round:0,raw:data.prior,inputs:[],local:true}};
    localFactors.forEach(f=>{messages[f.id]={from:f.id,to:f.child,factor:f.id,round:0,raw:f.weights,inputs:[],local:true};});
    model.signs.forEach(sign=>{
      const key=sign.id==='Y3'?'chest':`leaf${sign.id}`;
      const evidence=localFactors.find(f=>f.child===sign.id).weights;
      messages[key]={from:sign.id,to:sign.parent,factor:`f${sign.id}`,round:sign.parent==='F'?1:2,
        raw:sign.yes.map(p=>(1-p)*evidence[0]+p*evidence[1]),inputs:[`e${sign.id}`]};
    });
    Object.values(messages).forEach(m=>{m.values=normalize(m.raw);});
    const branchKeys=node=>Object.keys(messages).filter(key=>messages[key].to===node);
    for(const [key,node,factor] of [['fever','F','fF'],['cough','C','fC']]){
      const inputs=branchKeys(node);
      const support=normalize([0,1].map(state=>inputs.reduce((p,k)=>p*messages[k].values[state],1)));
      const yes=model.factors.find(f=>f.id===factor).yes;
      const raw=yes.map(p=>(1-p)*support[0]+p*support[1]);
      messages[key]={from:node,to:'D',factor,round:node==='F'?1:3,raw,values:normalize(raw),inputs,support};
    }
    const frames=[0,1,2,3].map(round=>{
      const received=Object.keys(messages).filter(key=>messages[key].round<=round);
      const beliefs=Object.fromEntries(model.variables.map(v=>[v.id,normalize([0,1].map(state=>
        received.filter(key=>messages[key].to===v.id).reduce((p,key)=>p*messages[key].values[state],1)))]));
      return {round,received,beliefs};
    });
    return {data,factors,localFactors,messages,frames};
  }
  function diagnosisDisplay(model) {
    return {variables:model.variables,signs:model.signs,factors:model.factors};
  }
  function diagnosisLayout(model) {
    const points={D:[450,95],F:[240,290],C:[660,290],fD:[655,95],fF:[345,192.5],fC:[555,192.5]};
    diagnosisDisplay(model).signs.forEach((sign,i)=>{
      const x=(i<3?80:530)+(i%3)*145;
      points[sign.id]=[x,555];points[`f${sign.id}`]=[(x+points[sign.parent][0])/2,422.5];
    });
    return points;
  }
  // A triangle of unknown variables (including query A) and an observed leaf B.
  // Soft disagreement preferences create competing paths without zero-probability worlds.
  const names=['A','X₁','X₂','B'];
  const edges=[[0,1],[1,2],[2,0],[2,3]];
  const sameWeights=[.001,.001,.002,.9];
  const queryNode=0, observedNode=3, rounds=40;
  const unary=(node,value)=>node===observedNode?Number(value===1):1;
  const potential=(edge,a,b)=>a===b?sameWeights[edge]:1-sameWeights[edge];
  function initialLoop() {
    return Object.fromEntries(edges.flatMap(([a,b])=>[[`${a}>${b}`,[.5,.5]],[`${b}>${a}`,[.5,.5]]]));
  }
  function loopStep(previous,keep=0) {
    if(!(keep>=0&&keep<1))throw Error('Damping must retain less than one');
    const next={};
    edges.forEach(([a,b],edge)=>{
      for(const [from,to] of [[a,b],[b,a]]) {
        const incoming=edges.filter(e=>e.includes(from)).map(e=>e.find(n=>n!==from)).filter(n=>n!==to);
        const proposal=normalize([0,1].map(target=>[0,1].reduce((sum,source)=>sum+
          potential(edge,source,target)*unary(from,source)*incoming.reduce((p,n)=>p*previous[`${n}>${from}`][source],1),0)));
        const key=`${from}>${to}`;
        next[key]=normalize(proposal.map((p,i)=>keep*previous[key][i]+(1-keep)*p));
      }
    });
    return next;
  }
  // Values shown in the live message tooltip. Normalize the local factor to
  // match its displayed pair-probability table; this rescaling cancels in BP.
  function loopMessageCalculation(previous,from,to,keep=0) {
    const edge=edges.findIndex(e=>e.includes(from)&&e.includes(to));
    if(edge<0||from===to||!(keep>=0&&keep<1))throw Error('Invalid message calculation');
    const incoming=edges.filter(e=>e.includes(from)).map(e=>e.find(n=>n!==from)).filter(n=>n!==to);
    const products=[0,1].map(value=>from===observedNode?[unary(from,value)]:incoming.map(n=>previous[`${n}>${from}`][value]));
    const rawSupport=products.map(terms=>terms.reduce((p,v)=>p*v,1));
    const support=normalize(rawSupport);
    const factorTable=[0,1].map(a=>[0,1].map(b=>potential(edge,a,b)/2));
    const sums=[0,1].map(b=>factorTable.reduce((total,row,a)=>total+row[b]*support[a],0));
    const normalizer=sums[0]+sums[1],proposal=normalize(sums),old=previous[`${from}>${to}`];
    const sent=normalize(proposal.map((v,i)=>keep*old[i]+(1-keep)*v));
    return {incoming,products,rawSupport,support,factorTable,sums,normalizer,proposal,old,sent};
  }
  function loopBeliefs(messages) {
    return names.map((_,node)=>normalize([0,1].map(value=>unary(node,value)*edges.filter(e=>e.includes(node)).reduce((p,e)=>p*messages[`${e.find(n=>n!==node)}>${node}`][value],1))));
  }
  function loopHistory(count=rounds,keep=.5) {
    let raw=initialLoop(),damped=initialLoop();
    const history=[{raw:loopBeliefs(raw),damped:loopBeliefs(damped),rawMessages:raw,dampedMessages:damped}];
    for(let i=0;i<count;i++){raw=loopStep(raw,0);damped=loopStep(damped,keep);history.push({raw:loopBeliefs(raw),damped:loopBeliefs(damped),rawMessages:raw,dampedMessages:damped});}
    return {raw,damped,history};
  }
  function exactLoop() {
    const mass=names.map(()=>[0,0]);
    for(let mask=0;mask<2**names.length;mask++) {
      const state=names.map((_,i)=>(mask>>i)&1);
      if(state[observedNode]!==1)continue;
      const weight=edges.reduce((p,[a,b],i)=>p*potential(i,state[a],state[b]),1);
      state.forEach((value,i)=>{mass[i][value]+=weight;});
    }
    return mass.map(normalize);
  }
  const api={diagnosis,diagnosisHistory,diagnosisLayout,diagnosisDisplay,normalize,edges,names,sameWeights,queryNode,observedNode,rounds,initialLoop,loopStep,loopMessageCalculation,loopBeliefs,loopHistory,exactLoop};
  root.RCNMessagePassing=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
