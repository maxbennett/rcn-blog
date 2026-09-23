/* Max-sum inference on the exported forward tree. Integer pool displacements,
   ±1 edge evidence, and adjacent orientation pooling match the reference code. */
(function(global){
 'use strict';
 const N=25,CENTER=12;
 function makeUnary(test,exemplars){
  const seen=new Set(test.edgelets.map(([f,r,c])=>(f*200+r)*200+c));
  return exemplars.map(ex=>ex.landmarks.map(([f,r,c])=>{
   const u=new Float64Array(N*N);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const rr=r+y-CENTER,cc=c+x-CENTER;
    u[y*N+x]=[f,(f+15)%16,(f+1)%16].some(ch=>seen.has((ch*200+rr)*200+cc))?1:-1;
   }
   return u;
  }));
 }
 function dilate(values,r){
  r=Math.min(24,r);
  if(r===0)return values;
  const horizontal=new Float64Array(N*N),out=new Float64Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   let v=-Infinity;for(let xx=Math.max(0,x-r);xx<=Math.min(24,x+r);xx++)v=Math.max(v,values[y*N+xx]);
   horizontal[y*N+x]=v;
  }
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   let v=-Infinity;for(let yy=Math.max(0,y-r);yy<=Math.min(24,y+r);yy++)v=Math.max(v,horizontal[yy*N+x]);
   out[y*N+x]=v;
  }
  return out;
 }
 function trace(ex,tree,unary,scale){
  const aggregated=unary.map(u=>u.slice()),radii=tree.map(e=>Math.floor(e[2]*scale+.5));
  tree.forEach(([a,b],i)=>{const message=dilate(aggregated[a],radii[i]);for(let q=0;q<N*N;q++)aggregated[b][q]+=message[q];});
  const root=tree[tree.length-1][1],state=new Int32Array(ex.landmarks.length);
  for(let q=1;q<N*N;q++)if(aggregated[root][q]>aggregated[root][state[root]])state[root]=q;
  const score=aggregated[root][state[root]];
  for(let i=tree.length-1;i>=0;i--){
   const [a,b]=tree[i],r=radii[i],y=Math.floor(state[b]/N),x=state[b]%N;
   let best=-Infinity;
   for(let yy=Math.max(0,y-r);yy<=Math.min(24,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(24,x+r);xx++){
    const q=yy*N+xx;if(aggregated[a][q]>best){best=aggregated[a][q];state[a]=q;}
   }
  }
  return {score,positions:ex.landmarks.map(([,r,c],i)=>[r+Math.floor(state[i]/N)-CENTER,c+state[i]%N-CENTER]),evidence:unary.map((u,i)=>u[state[i]]),localSupport:unary.map(u=>Math.max(...u))};
 }
 const unaryCache=new WeakMap();
 function evaluate(test,exemplars,trees,scale=1){
  if(!unaryCache.has(test))unaryCache.set(test,makeUnary(test,exemplars));
  const unary=unaryCache.get(test),matches=exemplars.map((ex,k)=>trace(ex,trees[k],unary[k],scale));
  return {...test,matches,ranking:matches.map((_,k)=>k).sort((a,b)=>matches[b].score-matches[a].score||a-b)};
 }
 // Record the real forward messages in dependency waves. Each message is a
 // 25x25 score array, not a committed landmark position. Intermediate markers
 // show candidate support without choosing a tied maximum; the final assignment is decoded
 // jointly from the tree, after its root score has been computed.
 function progression(test,ex,tree){
  const unary=makeUnary(test,[ex])[0],aggregated=unary.map(u=>u.slice());
  const depth=new Int32Array(ex.landmarks.length);
  tree.forEach(([a,b])=>{depth[b]=Math.max(depth[b],depth[a]+1);});
  const centers=ex.landmarks.map(([,r,c])=>[r,c]);
  const candidates=unary.map((u,i)=>Array.from(u,(value,q)=>value>0?{q,r:ex.landmarks[i][1]+Math.floor(q/N)-CENTER,c:ex.landmarks[i][2]+q%N-CENTER}:null).filter(Boolean));
  // Preserve every tied option. The display stays at the stored centers until
  // joint traceback; no arbitrary argmax is drawn as an intermediate choice.
  const snapshot=(kind,edges=[])=>{
   const positionScores=aggregated.map(u=>Float32Array.from(u));
   const bestScores=aggregated.map(u=>Math.max(...u));
   const evidence=candidates.map((options,i)=>options.some(p=>aggregated[i][p.q]===bestScores[i])?1:-1);
   return {kind,edges,positions:centers,evidence,candidates,positionScores,bestScores};
  };
  const frames=[{kind:'ready',edges:[],positions:centers,evidence:[]},snapshot('evidence')];
  for(let wave=0;wave<Math.max(...depth);wave++){
   const edges=tree.filter(([a])=>depth[a]===wave);
   edges.forEach(([a,b,r])=>{const message=dilate(aggregated[a],r);for(let q=0;q<N*N;q++)aggregated[b][q]+=message[q];});
   frames.push(snapshot('lateral',edges));
  }
  const result=trace(ex,tree,unary,1);
  const finalScores=snapshot('readout');
  // Resolve the joint traceback before animating geometry. Displaying the
  // settled assignment at the stored centers keeps match colors stable
  // throughout the subsequent reveal.
  frames.push({...finalScores,...result,kind:'settled',positions:centers,chosenPositions:result.positions});
  frames.push({...finalScores,...result});
  frames.push({...finalScores,kind:'score',...result});
  return frames;
 }
 global.RCNForwardModel={evaluate,progression};
})(typeof window==='undefined'?globalThis:window);
