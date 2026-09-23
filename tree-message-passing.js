/* Figure 2: a scheduled inward pass on the diagnosis tree. */
(function(){
 'use strict';
 const visibleMessages=new Set(['prior','chest','fever','cough']);
 const engine=window.RCNMessagePassing,model=window.RCNFactorExplorer;
 const slider=document.getElementById('bp-round-slider');
 if(!engine||!model||!slider)return;
 const display=engine.diagnosisDisplay(model);
 const tree=engine.diagnosisHistory(model),graph=document.getElementById('bp-graph');
 const inspector=document.getElementById('bp-tree-inspector');
 const controls=[...document.getElementById('message-passing').querySelectorAll('[data-tree-round-action]')];
 document.body.appendChild(inspector);
 const relevantVars=new Set(['D','F','C','Y3']);
 const relevantFactors=new Set(['fD','fF','fC','fY3']);
 let round=0,active=null;
 const percent=p=>`${(p*100+1e-10).toFixed(0)}%`;
 const decimal=p=>String(Number(p.toFixed(4)));
 const texPercent=p=>String.raw`${(p*100+1e-10).toFixed(0)}\%`;
 const math=tex=>`<span class="bp-calculation-term">${window.katex.renderToString(tex,{throwOnError:true,output:'htmlAndMathml'})}</span>`;
 const symbol=(key,state=1)=>{const m=tree.messages[key];return String.raw`m^{(${m.round})}_{${key==='prior'?'f_D':m.local?String.raw`E_{${model.variables.filter(v=>v.id!=='D').findIndex(v=>v.id===m.to)}}`:model.latex(m.from)}\to ${model.latex(m.to)}}(${state})`;};
 const under=(value,label)=>String.raw`\underbrace{${value}}_{\text{${label}}}`;
 const over=(value,label)=>String.raw`\overbrace{${value}}^{${label}}`;
 function fit(container){
  container.querySelectorAll('.bp-simple-calculation > .bp-calculation-term').forEach(line=>{
   line.style.fontSize='';
   if(line.parentElement.id==='bp-disease-calculation')return;
   const box=line.parentElement,css=window.getComputedStyle(box);
   const available=box.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),natural=line.getBoundingClientRect().width;
   if(available>0&&natural>available)line.style.fontSize=`${available/natural*100}%`;
  });
 }
 function hide(){if(active)active.removeAttribute('aria-describedby');active=null;inspector.hidden=true;}
 function render(){
  hide();round=Math.max(0,Math.min(3,Math.round(Number(slider.value))));slider.value=String(round);
  const frame=tree.frames[round];
  controls.forEach(button=>{
   const previous=button.dataset.treeRoundAction==='previous';
   button.disabled=previous&&round===0;
   if(!previous)button.textContent=round===3?'Restart ↺':'Propagate beliefs →';
  });
  slider.style.setProperty('--round-fill',`${round/3*100}%`);
  slider.setAttribute('aria-valuetext',`Step ${round} of 3`);
  document.getElementById('bp-round-label').textContent=`Step ${round} / 3`;
  graph.querySelectorAll('[data-tree-variable]').forEach(node=>{
   const id=node.dataset.treeVariable,p=frame.beliefs[id][1];
   node.querySelector('.bp-tree-probability').textContent=`${(p*100+1e-10).toFixed(0)}%`;
   node.classList.toggle('is-focused',[['F','Y3'],['F','D'],['Y3','C'],['C','D']][round].includes(id));
   if(['D','C'].includes(id)){
    const low=[248,246,239],high=[129,177,167];
    node.querySelector('circle').style.fill=`rgb(${low.map((v,i)=>Math.round(v+(high[i]-v)*p)).join(',')})`;
   }
  });
  graph.querySelectorAll('[data-tree-message]').forEach(node=>{
   const message=tree.messages[node.dataset.treeMessage],visible=message.round<=round;
   if(visible)node.removeAttribute('hidden');else node.setAttribute('hidden','');
   node.classList.toggle('is-new',message.round===round);
   node.classList.toggle('is-current',node.dataset.treeMessage===[null,'fever','chest','cough'][round]);
   node.classList.toggle('is-past',message.round<round);
  });
  const steps=[
   {title:'Observe fever and chest pain',text:'We observe fever and chest pain, so those variables are fixed to 1. The other symptoms are unknown. We want to infer whether the patient has the disease.',tex:String.raw`S_0=1\qquad S_7=1`,outcome:'The highlighted observations are the evidence we will pass through the graph.'},
   {title:'Pass fever’s evidence to disease',text:'The fever–disease factor tells us how compatible the observed fever is with each disease state. It sends that evidence to D, which combines it with P(D).',tex:String.raw`S_0\longrightarrow D`,outcome:`Disease rises from 10% to ${Math.round(frame.beliefs.D[1]*100)}%. The chest-pain evidence has not reached it yet.`},
   {title:'Pass chest-pain evidence to cough',text:'Chest pain sends its evidence through the chest-pain–cough factor. Cough is unobserved, so both cough states remain possible; this message makes coughing more plausible.',tex:String.raw`S_7\longrightarrow S_1`,outcome:`Cough now has ${Math.round(frame.beliefs.C[1]*100)}% support from the received evidence. Disease stays at ${Math.round(frame.beliefs.D[1]*100)}% until this branch reaches it.`},
   {title:'Pass cough’s evidence to disease',text:'The cough–disease factor sums over the two possible cough states and sends a message to D. Disease combines both branches with P(D), then normalizes.',tex:String.raw`S_1\longrightarrow D`,outcome:`All evidence has reached disease: ${Math.round(frame.beliefs.D[1]*100)}%. On this tree, that is the exact answer, rounded to a whole percent.`}
  ];
  const step=steps[round];
  document.getElementById('bp-step-eyebrow').textContent=round===0?'Start with the observations':`Propagation ${round} of 3`;
  document.getElementById('bp-step-title').textContent=step.title;
  document.getElementById('bp-round-description').textContent=step.text;
  document.getElementById('bp-step-route').innerHTML=math(step.tex);
  document.getElementById('bp-step-outcome').textContent=step.outcome;
  fit(document.getElementById('message-passing'));
 }
 function miniMap(node,keys,outgoing=null){
  keys=keys.filter(key=>visibleMessages.has(key));
  const points=engine.diagnosisLayout(model);
  const marker='bp-tree-mini-arrow';
  const connections=display.factors.flatMap(f=>f.variables.map(id=>`<path class="bp-mini-edge" d="M${points[id]} L${points[f.id]}"/>`)).join('');
  const route=(from,to,factor,stopAtFactor=false)=>{
   const [x,y]=points[from],[tx,ty]=points[stopAtFactor?factor:to],length=Math.hypot(tx-x,ty-y),ux=(tx-x)/length,uy=(ty-y)/length;
   if(!length)return '';
   const stop=stopAtFactor?17:37;
   const start=from===factor?15:35;
   return `<path class="bp-mini-route" d="M${x+ux*start},${y+uy*start} L${tx-ux*stop},${ty-uy*stop}" marker-end="url(#${marker})"/>`;
  };
  const incoming=keys.map(key=>tree.messages[key]);
  const arrows=incoming.map(m=>route(m.from,m.to,m.factor)).join('')+(outgoing?route(outgoing.from,outgoing.to,outgoing.factor,true):'');
  const used=new Set([...incoming.map(m=>m.factor),...(outgoing?[outgoing.factor]:[])]);
  const factors=display.factors.map(f=>{const [x,y]=points[f.id];return `<rect class="bp-mini-factor${used.has(f.id)?' is-active':''}" x="${x-10}" y="${y-10}" width="20" height="20"/>`;}).join('');
  const vars=display.variables.map(v=>{const [x,y]=points[v.id];return `<g class="bp-mini-variable${v.id===node?' is-receiver':incoming.some(m=>m.from===v.id)?' is-source':''}" transform="translate(${x} ${y})"><circle r="32"/><text dy=".35em">${model.symbol(v.id)}</text></g>`;}).join('');
  const compact=keys.length>2;
  const labels=keys.filter(key=>!compact||!tree.messages[key].local).map(key=>{const m=tree.messages[key],[x,y]=points[m.factor];return `<foreignObject class="bp-mini-message-label" x="${compact?x-70:x+(key==='fever'?-220:20)}" y="${y-45}" width="${compact?140:360}" height="90"><div style="font-size:${compact?32:52}px" xmlns="http://www.w3.org/1999/xhtml">${math(symbol(key))}</div></foreignObject>`;}).join('');
  return `<svg class="bp-inbox-map bp-tree-mini-map" viewBox="0 20 950 630" role="img" aria-label="Incoming evidence at ${model.label(node)}${outgoing?', then toward the next factor':''}"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="25" markerHeight="25" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#0f67a2"/></marker></defs>${connections}${arrows}${factors}${vars}${labels}</svg>`;
 }
 function inbox(node,keys,outgoing=null,showMap=true){
  keys=keys.filter(key=>visibleMessages.has(key));
  return `<div class="bp-inbox"><div class="bp-inbox-rows">${keys.map(key=>`<div class="bp-inbox-row"><span class="bp-inbox-token">${math(symbol(key))}</span><strong>= ${percent(tree.messages[key].values[1])}</strong></div>`).join('')}</div>${showMap?miniMap(node,keys,outgoing):''}</div>`;
 }
 function messageTooltip(key){
  const m=tree.messages[key];
  const overview=`<div class="bp-tree-tooltip-overview"><div><h5 class="bp-inspector-message-title">${math(symbol(key))}</h5><p class="bp-inspector-arrival">Message to ${model.label(m.to).toLowerCase()} · received in step ${m.round}</p></div>${miniMap(m.local?m.to:m.from,m.local?[key]:key==='cough'?['chest']:[],m.local?null:m)}</div>`;
  if(m.local){
   const description=key==='prior'?'P(D) is the disease prior factor. It sends its distribution directly to D.':m.raw[0]===0?'This evidence factor fixes the observed symptom to 1. Its weights are [0, 1].':'This symptom is unobserved. Its evidence factor has weights [1, 1]: both states remain possible. Normalizing gives [½, ½], a neutral message—not an independent symptom prior.';
   return `${overview}<p>${description}</p><div class="bp-simple-calculation">${math(String.raw`${symbol(key)}=\frac{${decimal(m.raw[1])}}{${decimal(m.raw[0])}+${decimal(m.raw[1])}}=${texPercent(m.values[1])}`)}</div>`;
  }
  const inputs=key==='cough'?[tree.messages.chest.values]:[[0,1]];
  const products=[0,1].map(state=>inputs.reduce((v,pair)=>v*pair[state],1));
  const support=engine.normalize(products),f=tree.factors.find(f=>f.id===m.factor);
  const sums=f.yes.map(p=>(1-p)*support[0]+p*support[1]);
  const product=state=>inputs.map(pair=>decimal(pair[state])).join(String.raw`\cdot`);
  const supportEq=inputs.length===1
   ?math(String.raw`\text{Support}(${model.latex(m.from)}=1)=${over(texPercent(support[1]),key==='cough'?symbol('chest'):String.raw`\text{observed}`)}`)
   :math(String.raw`\begin{aligned}\text{Support}(${model.latex(m.from)}=1)&\approx\frac{${product(1)}}{\begin{gathered}${product(0)}\\{}+${product(1)}\end{gathered}}\\[.4em]&\approx${texPercent(support[1])}\end{aligned}`);
  const terms=under(decimal(1-f.yes[1]),'factor')+String.raw`\cdot`+over(decimal(support[0]),String.raw`\text{support for }${model.latex(m.from)}=0`)+
   '+'+under(decimal(f.yes[1]),'factor')+String.raw`\cdot`+over(decimal(support[1]),String.raw`\text{support for }${model.latex(m.from)}=1`);
  const equation=math(String.raw`\begin{aligned}${symbol(key)}&\approx\frac{${terms}}{\underbrace{${decimal(sums[0])}}_{\text{for }${model.latex(m.to)}=0}+\underbrace{${decimal(sums[1])}}_{\text{for }${model.latex(m.to)}=1}}\\[.5em]&\approx${texPercent(m.values[1])}\end{aligned}`);
  return `${overview}<ol class="bp-message-steps"><li><h6>Gather incoming messages</h6><div class="bp-tree-gather">${key==='cough'?inbox(m.from,['chest'],m,false)+'<p class="bp-tree-tooltip-note">S₅ and S₆ are unobserved. Summing over each gives 1 for either cough state, so their messages leave this evidence unchanged.</p>':`<p>${model.label(m.from)} is observed as 1.</p>`}</div></li><li><h6>Multiply inputs and normalize support</h6><div class="bp-simple-calculation">${supportEq}</div></li><li><h6>Use the factor to calculate the message</h6><div class="bp-simple-calculation">${equation}</div></li></ol>`;
 }
 function variableTooltip(id){
  const frame=tree.frames[round],keys=frame.received.filter(key=>tree.messages[key].to===id);
  const description=id==='D'?(round===3?'All evidence has reached disease. This is its exact posterior.':'Disease is still waiting for the two symptom branches.'):
   id in tree.data.evidence?'This symptom is observed and fixed to 1.':
   id==='C'?(round>=2?'Chest pain supplies evidence for cough. The other two unobserved symptoms contribute neutral messages. No disease-side message has been sent in this inward pass.':'No informative message has arrived yet. The initial belief is neutral.'):
   'No informative message has arrived yet. An outward pass would bring evidence from the rest of the graph.';
  return `<h5>${model.label(id)} · ${model.symbol(id)}</h5><p class="bp-inspector-route">Step ${round} · messages received</p>${inbox(id,keys)}<div class="bp-inbox-belief"><span>Combined belief</span><strong>${percent(frame.beliefs[id][1])}</strong></div><p>${description}</p>`;
 }
 function factorTooltip(id){
  const f=tree.factors.find(f=>f.id===id);
  if(f.local)return `<h5>Local evidence · ${model.symbol(f.child)}</h5><p>${f.observed?'Observed present: only state 1 is allowed.':'Unobserved: both states have weight 1. This factor supplies no additional preference.'}</p><table><thead><tr><th>${model.symbol(f.child)}</th><th>0</th><th>1</th></tr></thead><tbody><tr><th>Evidence weight</th><td>${f.weights[0]}</td><td>${f.weights[1]}</td></tr></tbody></table>`;
  return `<h5 class="bp-inspector-probability">${math(f.parent?String.raw`P(${model.latex(f.child)}\mid ${model.latex(f.parent)})`:String.raw`P(${model.latex(f.child)})`)}</h5><table><thead><tr><th>${f.parent?'Given':'Prior'}</th><th>${model.symbol(f.child)} = 0</th><th>${model.symbol(f.child)} = 1</th></tr></thead><tbody>${model.rows(id).map(row=>`<tr><th>${f.parent?`${model.symbol(f.parent)} = ${row.parent}`:'Disease'}</th><td>${percent(row.no)}</td><td>${percent(row.yes)}</td></tr>`).join('')}</tbody></table>`;
 }
 function show(target){
  if(target.dataset.treeMessage&&tree.messages[target.dataset.treeMessage].round>round)return;
  hide();active=target;target.setAttribute('aria-describedby','bp-tree-inspector');
  inspector.classList.toggle('has-calculation',Boolean(target.dataset.treeMessage||target.dataset.treeVariable));
  inspector.style.setProperty('--inspector-color',target.dataset.treeMessage==='fever'?'#548c87':'#032f56');
  inspector.innerHTML=target.dataset.treeMessage?messageTooltip(target.dataset.treeMessage):target.dataset.treeVariable?variableTooltip(target.dataset.treeVariable):factorTooltip(target.dataset.treeFactor);
  inspector.hidden=false;fit(inspector);
  const anchor=target.querySelector('.bp-tree-message-box')||target.querySelector('.bp-tree-factor-hit')||target.querySelector('circle')||target;
  const bounds=anchor.getBoundingClientRect(),width=inspector.offsetWidth,height=inspector.offsetHeight,gap=12,pad=12;
  let left=bounds.right+gap,top=bounds.top-height*.2;
  if(left+width>window.innerWidth-pad)left=bounds.left-gap-width;
  if(left<pad){left=(bounds.left+bounds.right-width)/2;top=bounds.bottom+gap+height<=window.innerHeight-pad?bounds.bottom+gap:bounds.top-height-gap;}
  inspector.style.left=`${Math.max(pad,Math.min(window.innerWidth-width-pad,left))}px`;
  inspector.style.top=`${Math.max(pad,Math.min(window.innerHeight-height-pad,top))}px`;
 }
 graph.querySelectorAll('[data-tree-message], [data-tree-variable], [data-tree-factor]').forEach(target=>{
  if(target.dataset.treeVariable&&!relevantVars.has(target.dataset.treeVariable))return;
  if(target.dataset.treeFactor&&!relevantFactors.has(target.dataset.treeFactor))return;
  if(target.dataset.treeMessage){const m=tree.messages[target.dataset.treeMessage];if(!relevantVars.has(m.to)||(!m.local&&!relevantVars.has(m.from)))return;}
  target.addEventListener('pointerenter',()=>show(target));target.addEventListener('pointerleave',hide);
  target.addEventListener('focus',()=>show(target));target.addEventListener('blur',hide);target.addEventListener('click',()=>show(target));
  target.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hide();}});
 });
 document.addEventListener('pointerdown',event=>{if(active&&!active.contains(event.target))hide();});
 document.addEventListener('scroll',hide,true);
 window.addEventListener('resize',()=>{hide();fit(document.getElementById('message-passing'));});
 controls.forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.treeRoundAction==='next';
  slider.value=String(next&&round===3?0:Math.max(0,Math.min(3,round+(next?1:-1))));
  render();
 }));
 slider.addEventListener('input',render);render();
})();
