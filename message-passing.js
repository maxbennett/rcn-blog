(function () {
 'use strict';
 const engine=window.RCNMessagePassing;
 if(!engine)return;
 // The header range control selects the round shown by the chart cursor and network.
 const slider=document.getElementById('loop-damping');
 if(!slider)return;
 const chart=document.getElementById('loop-chart');
 const roundSlider=document.getElementById('loop-round-slider');
 const network=document.getElementById('loop-model');
 const inspector=document.getElementById('loop-inspector');
 // The wide figure is transformed; keep the fixed-position card outside that containing block.
 document.body.appendChild(inspector);
 let activeInspector=null;
 const count=engine.rounds,query=engine.queryNode;
 let selected=0,history=[];
 const xy=(i,p)=>[60+i/count*340,16+(1-p)*200];
 function inspectRound(round) {
  selected=Math.max(0,Math.min(count,Math.round(round)));
  hideInspector();
  const beliefs=history[selected].damped,probability=beliefs[query][1];
  const [x,y]=xy(selected,probability);
  document.getElementById('loop-cursor').setAttribute('x1',x);
  document.getElementById('loop-cursor').setAttribute('x2',x);
  document.getElementById('loop-selected-point').setAttribute('cx',x);
  document.getElementById('loop-selected-point').setAttribute('cy',y);
  roundSlider.value=String(selected);
  roundSlider.style.setProperty('--round-fill',`${selected/count*100}%`);
  roundSlider.setAttribute('aria-valuetext',`Round ${selected} of ${count}`);
  chart.setAttribute('aria-label',`Probability of A across message-passing rounds. Selected round ${selected}: ${(probability*100).toFixed(1)} percent; B is observed as one`);
  document.getElementById('loop-inspected-round').textContent=`Round ${selected} / ${count}`;
  document.getElementById('loop-query-readout').textContent=`P(A = 1) ≈ ${(probability*100).toFixed(1)}%`;
  network.querySelectorAll('[data-loop-variable]').forEach(node=>{
   const i=Number(node.dataset.loopVariable),p=beliefs[i][1];
   node.querySelector('.loop-node-probability').textContent=`${Math.round(p*100)}%`;
   if(i!==engine.observedNode) {
    const low=[248,246,239],high=[129,177,167];
    const color=low.map((v,j)=>Math.round(v+(high[j]-v)*p));
    node.querySelector('circle').style.fill=`rgb(${color.join(',')})`;
   }
  });
  // Preview the actual outgoing messages that will produce the next round.
  const currentMessages=history[selected].dampedMessages;
  const nextMessages=engine.loopStep(currentMessages,Number(slider.value)/100);
  network.querySelectorAll('[data-loop-message]').forEach(node=>{
   const key=node.dataset.loopMessage,next=nextMessages[key][1];
   const change=Math.abs(next-currentMessages[key][1]);
   node.querySelector('.loop-message-value').textContent=`${(next*100).toFixed(1)}%`;
   node.classList.toggle('is-changing',change>.0005);
  });

 }
 function hideInspector() {
  if(activeInspector)activeInspector.removeAttribute('aria-describedby');
  activeInspector=null;inspector.hidden=true;
 }
 const symbols=['A','X_1','X_2','B'];
 const math=tex=>`<span class="bp-calculation-term">${window.katex.renderToString(tex,{throwOnError:true,output:'htmlAndMathml'})}</span>`;
 // m^(t) is indexed by the round it is received, after crossing the pair factor.
 const messageSymbol=(from,to,round=selected)=>String.raw`m^{(${round})}_{${symbols[from]}\to ${symbols[to]}}(1)`;
 const neighbors=node=>engine.edges.filter(e=>e.includes(node)).map(e=>e.find(n=>n!==node));
 function incomingMap(node,included,outgoing=null) {
  // Preserve the full-size graph's layout so each blue route is easy to locate.
  const points=[[65,235],[250,55],[435,235],[675,235]];
  const marker=`inbox-arrow-${node}`;
  const connections=engine.edges.map(([a,b])=>`<path class="bp-mini-edge" d="M${points[a]} L${points[b]}"/>`).join('');
  const routes=included.map(from=>{
   const [x,y]=points[from],[tx,ty]=points[node],length=Math.hypot(tx-x,ty-y),ux=(tx-x)/length,uy=(ty-y)/length;
   return `<path class="bp-mini-route" data-incoming-route="${from}>${node}" d="M${x+ux*33},${y+uy*33} L${tx-ux*39},${ty-uy*39}" marker-end="url(#${marker})"/>`;
  }).join('');
  let towardFactor='';
  if(outgoing!==null) {
   const [x,y]=points[node],[tx,ty]=points[outgoing],length=Math.hypot(tx-x,ty-y),ux=(tx-x)/length,uy=(ty-y)/length;
   towardFactor=`<path class="bp-mini-route" data-outgoing-factor="${node}>${outgoing}" d="M${x+ux*33},${y+uy*33} L${(x+tx)/2-ux*18},${(y+ty)/2-uy*18}" marker-end="url(#${marker})"/>`;
  }
  const factors=engine.edges.map(([a,b])=>{
   const active=(a===node&&(included.includes(b)||b===outgoing))||(b===node&&(included.includes(a)||a===outgoing));
   return `<rect class="bp-mini-factor${active?' is-active':''}" x="${(points[a][0]+points[b][0])/2-9}" y="${(points[a][1]+points[b][1])/2-9}" width="18" height="18"/>`;
  }).join('');
  const labelPositions=[[110,132],[390,132],[250,308],[555,308]];
  const labels=included.map(from=>{
   const edge=engine.edges.findIndex(e=>e.includes(from)&&e.includes(node));
   const [x,y]=labelPositions[edge];
   return `<foreignObject class="bp-mini-message-label" data-route-label="${from}>${node}" x="${x-140}" y="${y-38}" width="280" height="76"><div xmlns="http://www.w3.org/1999/xhtml">${math(messageSymbol(from,node))}</div></foreignObject>`;
  }).join('');
  const variables=points.map(([x,y],i)=>`<g class="bp-mini-variable${i===node?' is-receiver':included.includes(i)?' is-source':''}" transform="translate(${x} ${y})"><circle r="31"/><text dy=".35em">${engine.names[i]}</text></g>`).join('');
  return `<svg class="bp-inbox-map" viewBox="-35 5 780 345" role="img" aria-label="${included.map(i=>engine.names[i]).join(' and ')} send messages through their factors to ${engine.names[node]}${outgoing!==null?`, then ${engine.names[node]} sends support into the factor connecting it to ${engine.names[outgoing]}`:''}"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="24" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#0f67a2"/></marker></defs>${connections}${routes}${towardFactor}${factors}${variables}${labels}</svg>`;
 }
 function messageInbox(node,excluded=null) {
  const current=history[selected].dampedMessages;
  const included=node===engine.observedNode?[]:neighbors(node).filter(from=>from!==excluded);
  if(!included.length&&excluded===null)return '';
  return `<div class="bp-inbox"><div class="bp-inbox-rows">${included.map(from=>`<div class="bp-inbox-row" data-inbox-message="${from}>${node}"><span class="bp-inbox-token">${math(messageSymbol(from,node))}</span><strong>= ${(current[`${from}>${node}`][1]*100).toFixed(1)}%</strong></div>`).join('')}</div>${incomingMap(node,included,excluded)}</div>`;
 }
 function fitInspectorEquations() {
  // Keep one intact math line; shrink only equations wider than their container.
  inspector.querySelectorAll('.bp-simple-calculation > .bp-calculation-term').forEach(line=>{
   line.style.fontSize='';
   const box=line.parentElement,style=window.getComputedStyle(box);
   const available=box.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   const natural=line.getBoundingClientRect().width;
   if(available>0&&natural>available)line.style.fontSize=`${available/natural*100}%`;
  });
 }
 function showInspector(target) {
  if(!history.length)return;
  activeInspector=target;target.setAttribute('aria-describedby','loop-inspector');
  const percent=p=>`${(p*100).toFixed(1)}%`;
  const factorPercent=p=>`${Number((p*100).toFixed(1))}%`;
  inspector.classList.toggle('has-calculation',Boolean(target.dataset.loopMessage)||target.dataset.loopVariable!==undefined);
  if(target.dataset.loopMessage) {
   const key=target.dataset.loopMessage,[from,to]=key.split('>').map(Number);
   const current=history[selected].dampedMessages,keep=Number(slider.value)/100;
   const c=engine.loopMessageCalculation(current,from,to,keep),sent=c.sent;
   const edge=engine.edges.findIndex(e=>e.includes(from)&&e.includes(to));
   const same=engine.sameWeights[edge],equality=same>.5;
   const decimal=value=>String(Number(value.toFixed(3)));
   const source=symbols[from],destination=symbols[to];
   const texPercent=value=>percent(value).replace('%',String.raw`\%`);
   const factorTex=value=>factorPercent(value).replace('%',String.raw`\%`);
   const brace=(value,label,state)=>String.raw`\underbrace{${value}}_{\substack{\text{${label}}\\${state}}}`;
   const labeled=(value,label)=>String.raw`\underbrace{${value}}_{${label}}`;
   // Use the received messages from this round, omitting the recipient's factor.
   // The denominator normalizes across both states; only support for state 1 is shown.
   const supportDecimal=value=>String(Number(value.toFixed(4)));
   const above=(value,label)=>String.raw`\overbrace{${value}}^{${label}}`;
   const receivedTerm=n=>above(supportDecimal(current[`${n}>${from}`][1]),messageSymbol(n,from));
   const product=state=>c.incoming.map(n=>supportDecimal(current[`${n}>${from}`][state])).join(String.raw`\times`);
   const supportCalculation=from===engine.observedNode?math(String.raw`${source}=1\;\Longrightarrow\;100\%`):math(c.incoming.length===1?
    above(texPercent(c.support[1]),messageSymbol(c.incoming[0],from)):
    String.raw`\displaystyle\frac{${c.incoming.map(receivedTerm).join(String.raw`\times`)}}{${labeled(product(1),String.raw`\text{for }${source}=1`)}+${labeled(product(0),String.raw`\text{for }${source}=0`)}}\approx${texPercent(c.support[1])}`);
   const supportLabel=from===engine.observedNode?'observed':'incoming support';
   const outgoing=messageSymbol(from,to,selected+1);
   const candidate=keep?outgoing.replace(/^m/,String.raw`\widehat m`):outgoing;
   const calculation=math([
    String.raw`${candidate}=`,
    String.raw`${brace(decimal(c.support[0]),supportLabel,`${source}=0`)}\times${brace(factorTex(1-same),'factor table',String.raw`P(${destination}=1\mid ${source}=0)`)}`,
    String.raw`+\;${brace(decimal(c.support[1]),supportLabel,`${source}=1`)}\times${brace(factorTex(same),'factor table',String.raw`P(${destination}=1\mid ${source}=1)`)}`,
    String.raw`\approx${labeled(texPercent(c.proposal[1]),String.raw`\text{new message}`)}`
   ].join(''));
   const blend=keep?math([
    String.raw`${outgoing}=`,
    String.raw`${labeled(decimal(keep),String.raw`\lambda`)}\times${brace(texPercent(c.old[1]),'prev message',messageSymbol(from,to))}`,
    String.raw`+\;${labeled(decimal(1-keep),String.raw`1-\lambda`)}\times${labeled(texPercent(c.proposal[1]),String.raw`\text{new message}`)}`,
    String.raw`\approx${texPercent(sent[1])}`
   ].join('')):'';
   inspector.style.setProperty('--inspector-color',equality?'#0f67a2':'#987143');
   inspector.innerHTML=`<h5 class="bp-inspector-message-title">${math(outgoing)}</h5><p class="bp-inspector-arrival">Message to ${engine.names[to]} to arrive on round ${selected+1}</p><ol class="bp-message-steps"><li><h6>${from===engine.observedNode?'Start with the observation':'Gather incoming messages'}</h6>${from===engine.observedNode?`<p>${engine.names[from]} is observed as 1.</p>`:''}${messageInbox(from,to)}</li><li><h6>Calculate support for ${engine.names[from]} = 1</h6><div class="bp-simple-calculation bp-support-calculation">${supportCalculation}</div></li><li><h6>Use the factor to calculate the message</h6><div class="bp-simple-calculation">${calculation}</div>${keep?`<p class="bp-inspector-calculation-label">Apply damping · λ = ${keep.toFixed(2)}</p><div class="bp-simple-calculation">${blend}</div>`:''}</li></ol>`;
  }else if(target.dataset.loopVariable!==undefined) {
   const node=Number(target.dataset.loopVariable),observed=node===engine.observedNode;
   const belief=history[selected].damped[node][1];
   inspector.style.setProperty('--inspector-color',observed?'#032f56':'#548c87');
   inspector.innerHTML=`<h5>Messages received by ${engine.names[node]}</h5><p class="bp-inspector-route">Round ${selected}${selected===0?' · initial messages':''}</p><p>Each ${math(String.raw`m^{(${selected})}_{U\to ${symbols[node]}}(1)`)} is one input through its factor, supporting ${engine.names[node]} = 1.</p>${messageInbox(node)}<div class="bp-inbox-belief"><span>${observed?'Observed value':'Combined node belief'}</span><strong>${percent(belief)}</strong></div><p>${observed?`${engine.names[node]} is fixed at 1; received messages cannot change that observation.`:`The node multiplies all received messages and normalizes. An outgoing message uses only the other inputs, leaving out the input through its destination’s factor.`}</p>`;
  }else {
   const i=Number(target.dataset.loopFactor),[a,b]=engine.edges[i],same=engine.sameWeights[i],equality=same>.5;
   const value=(x,y)=>factorPercent(x===y?same:1-same);
   inspector.style.setProperty('--inspector-color',equality?'#0f67a2':'#987143');
   inspector.innerHTML=`<h5 class="bp-inspector-probability">P(${engine.names[b]} | ${engine.names[a]})</h5><table><caption>${equality?'Soft equality · matching values are more likely':'Soft XOR · opposite values are more likely'}</caption><thead><tr><th>Given</th><th>${engine.names[b]} = 0</th><th>${engine.names[b]} = 1</th></tr></thead><tbody>${[0,1].map(x=>`<tr><th>${engine.names[a]} = ${x}</th>${[0,1].map(y=>`<td class="${(x===y)===equality?'is-supported':''}">${value(x,y)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  inspector.hidden=false;
  fitInspectorEquations();
  const anchor=target.querySelector('.loop-message-box')||target.querySelector('.loop-factor-hit')||target.querySelector('circle')||target;
  const bounds=anchor.getBoundingClientRect(),width=inspector.offsetWidth,height=inspector.offsetHeight;
  const gap=12,pad=12,viewWidth=window.innerWidth,viewHeight=window.innerHeight;
  let left,top;
  if(bounds.right+gap+width<=viewWidth-pad){
   left=bounds.right+gap;top=bounds.top-height*.2;
  }else if(bounds.left-gap-width>=pad){
   left=bounds.left-gap-width;top=bounds.top-height*.2;
  }else{
   left=(bounds.left+bounds.right-width)/2;
   top=bounds.bottom+gap+height<=viewHeight-pad?bounds.bottom+gap:bounds.top-height-gap;
  }
  left=Math.max(pad,Math.min(viewWidth-width-pad,left));
  top=Math.max(pad,Math.min(viewHeight-height-pad,top));
  inspector.style.left=`${left}px`;inspector.style.top=`${top}px`;
 }
 network.querySelectorAll('[data-loop-message], [data-loop-factor], [data-loop-variable]').forEach(target=>{
  target.addEventListener('pointerenter',()=>showInspector(target));
  target.addEventListener('pointerleave',hideInspector);
  target.addEventListener('focus',()=>showInspector(target));
  target.addEventListener('blur',hideInspector);
  target.addEventListener('click',()=>showInspector(target));
  target.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hideInspector();}});
 });
 document.addEventListener('pointerdown',event=>{if(activeInspector&&!activeInspector.contains(event.target))hideInspector();});
 document.addEventListener('scroll',hideInspector,true);
 window.addEventListener('resize',hideInspector);
 function renderLoop() {
  const keep=Number(slider.value)/100;
  history=engine.loopHistory(count,keep).history;
  document.getElementById('loop-damping-value').textContent=`λ = ${keep.toFixed(2)}`;
  slider.setAttribute('aria-valuetext',`${Math.round(keep*100)} percent of the previous message retained`);
  slider.style.setProperty('--damping-fill',`${Number(slider.value)/Number(slider.max)*100}%`);
  document.getElementById('loop-trace').setAttribute('d',history.map((row,i)=>`${i?'L':'M'}${xy(i,row.damped[query][1]).join(',')}`).join(' '));
  document.getElementById('loop-chart-points').innerHTML=history.map((row,i)=>{const [x,y]=xy(i,row.damped[query][1]);return `<circle cx="${x}" cy="${y}" r="2" fill="#548c87"/>`;}).join('');
  inspectRound(selected);
 }
 roundSlider.addEventListener('input',()=>inspectRound(Number(roundSlider.value)));
 slider.addEventListener('input',renderLoop);
 renderLoop();
})();
