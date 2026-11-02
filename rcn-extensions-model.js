/* Small, hand-specified teaching models. No trained MNIST weights are used.
 * Hierarchy: exact max-sum over discrete placements and compatibility factors.
 * Ambiguity: exact tree messages over explicit cube-depth interpretation variables.
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

  const vertices=[[55,90],[155,90],[155,190],[55,190],[105,40],[205,40],[205,140],[105,140]];
  const cubeEdges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const cubeInput=Object.freeze(cubeEdges.map(([a,b])=>Object.freeze([...vertices[a],...vertices[b]])));
  // z: which projected square is nearer (0=A, 1=B).
  // face states: 1=near, 0=far. fA=1-z; fB=z.
  // Two junction variables per face copy its depth role. Projected edge evidence
  // is identical for both roles: each junction receives three +1 edge scores.
  const faceFor=(z,f)=>f===0?1-z:z;
  function ambiguity(bias=0,previous=0){
    if(!Number.isFinite(bias)||Math.abs(bias)>.6)throw new RangeError('Bias must be within ±0.6.');
    const unary=[-bias/2,bias/2],leafUp=Array.from({length:4},()=>[3,3]);
    const faceUp=[0,1].map(f=>[0,1].map(z=>leafUp[2*f][faceFor(z,f)]+leafUp[2*f+1][faceFor(z,f)]));
    const scores=unary.map((v,z)=>v+faceUp[0][z]+faceUp[1][z]);
    const tied=Math.abs(scores[0]-scores[1])<1e-10;
    const selected=tied?(previous===1?1:0):(scores[1]>scores[0]?1:0);
    // Downward messages exclude the receiving branch's upward message.
    const faceDown=[0,1].map(f=>[0,1].map(state=>{
      const z=f===0?1-state:state;
      return unary[z]+faceUp[1-f][z];
    }));
    const junctionDown=leafUp.map((_,j)=>[0,1].map(state=>faceDown[Math.floor(j/2)][state]+leafUp[j^1][state]));
    const faces=[faceFor(selected,0),faceFor(selected,1)];
    const junctions=faces.flatMap(s=>[s,s]);
    return {bias,unary,scores,tied,selected,faces,junctions,leafUp,faceUp,faceDown,junctionDown,input:cubeInput,
      trace:[{stage:'top',messages:unary},{stage:'faces',messages:faceDown},{stage:'junctions',messages:junctionDown},{stage:'decode',faces,junctions}]};
  }
  root.RCNExtensions={hierarchy,ambiguity,observations,evidence,compatible,edgeGeometry,corners,shifts,vertices,cubeEdges,cubeInput};
})(globalThis);
