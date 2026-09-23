/* The notebook's exported learning outputs; this UI reveals, never invents, the graph. */
(function(root){
 'use strict';
 const data=root.RCNLearningData;
 if(!data)return;
 const example=data.exemplars[0],palette=['#032f56','#0f67a2','#548c87','#987143'];
 const color=f=>palette[Math.floor((f%8)/2)];
 const stages=[
  {label:'Image',title:'Start with one handwritten 0',body:'This is one image from MNIST. We will turn this particular example into a representation of its shape. Learning the exemplar uses the image itself; a digit label can be associated with it separately for classification.',point:'One training image. One example of a zero.',next:'Find the edges →'},
  {label:'Edges',title:'Find changes in brightness',body:'A bank of 16 oriented filters responds to the boundaries of the ink. Different filters respond to different edge directions and contrast polarities. At this point, a boundary still produces a broad band of responses.',point:'The same image, described by its edge responses.',next:'Trace the contours →'},
  {label:'Contours',title:'Thin the responses into contours',body:'Keep the strongest responses along each edge direction, select the winning orientation at each location, and apply a threshold. The surviving edge fragments trace the inside and outside of the stroke.',point:`${data.edgelets.length} oriented edge fragments describe this image.`,next:'Choose landmarks →'},
  {label:'Landmarks',title:'Keep a sparse set of landmarks',body:'Select an edge fragment, remember its position and orientation, and suppress a small neighborhood around it. Repeat until the contour is covered. Each retained landmark will have a pool of nearby position choices during recognition.',point:`${example.landmarks.length} landmarks preserve the shape with fewer parts.`,next:'Connect the landmarks →'},
  {label:'Connections',title:'Learn which parts move together',body:'Connect landmarks with lateral constraints that remember their relative positions. Nearby parts receive tighter movement tolerances. The learner adds a connection when the existing paths do not already constrain that pair tightly enough.',point:`${example.laterals.length} pairwise constraints hold the parts together.`,next:'Save the exemplar →'},
  {label:'Save',title:'Save this exemplar alongside the others',body:'Save the landmarks and lateral constraints as one learned graph. Add it to the collection of exemplars, including other digits and other ways of writing the same digit. Recognition will ask which exemplar best explains a new image.',point:'One image becomes one graph in the collection.',next:'Restart ↺'}
 ];
 const api={data,example,stages,color,bank:count=>data.exemplars.filter((_,i)=>count===2||i%2===0)};
 root.RCNLearning=api;
 const $=id=>document.getElementById(id),figure=$('rcn-learning');
 if(!figure)return;
 const svg=$('learn-canvas'),gallery=$('learn-bank');
 let step=0,channel=-1;
 const bankCount=1;
 const math=tex=>root.katex.renderToString(tex,{throwOnError:true,output:'htmlAndMathml'});
 function storageMarkup(stage,{ex=example}={}){
  const n=ex.landmarks.length,m=ex.laterals.length;
  const field=(name,shape)=>`<div class="learn-data-field"><span class="learn-data-symbol">${math(name)}</span><span>${shape}</span></div>`;
  let content='',status=stage<3?'Intermediate data':'Learned data';
  if(stage===0){
   status='Training input';
   content=field(String.raw`I\in\mathbb{R}^{200\times200}`,'200 × 200 array')+'<p>Each entry is a pixel’s brightness. The original 28 × 28 MNIST image is resized and padded to 200 × 200. The label is supplied separately.</p>';
  }else if(stage===1){
   content=field(String.raw`R=(K_f*I)_{f=0}^{15}\in\mathbb{R}^{16\times200\times200}`,'16 × 200 × 200 array')+'<p>Convolve the image with each oriented filter '+math('K_f')+'. Store one response per filter <i>f</i>, row <i>r</i>, and column <i>c</i>. '+(channel<0?'The picture shows the largest positive response at each pixel.':`The picture shows filter ${channel} (${channel*22.5}°).`)+' These responses are temporary.</p>';
  }else if(stage===2){
   content=field(String.raw`B\in\{-1,+1\}^{16\times200\times200}`,'16 × 200 × 200 array')+`<p>+1 marks a surviving edge fragment; −1 marks background. The picture plots the ${data.edgelets.length} positive entries. Contours are represented by these oriented fragments, rather than a list of continuous curves.</p>`;
  }else if(stage===3){
   content=field(String.raw`F\in\mathbb{Z}^{`+n+String.raw`\times3}`,`${n} × 3`)+`<p>Each landmark is ${math(String.raw`F_i=(f_i,r_i,c_i)`)}: ${math('f_i')} identifies the edge filter (its direction and contrast polarity), and ${math('r_i')} and ${math('c_i')} give its row and column in the image. Together they define the center of that landmark’s pool.</p>`;
  }else if(stage===4){
   content=field(String.raw`L\in\mathbb{Z}^{`+m+String.raw`\times3}`,`${m} × 3`)+`<p>Each connection is ${math(String.raw`L_e=(i,j,\rho_{ij})`)}. The indices ${math('i')} and ${math('j')} identify two landmarks. The tolerance ${math(String.raw`\rho_{ij}`)} specifies how many pixels their relative row and column offsets may change during recognition.</p>`;
  }else{
   const count=api.bank(bankCount).length;
   content=field(String.raw`\mathcal E=(F,L)`,`${n} landmarks · ${m} connections`)+field(String.raw`\mathcal M=\{\mathcal E_1,\ldots,\mathcal E_{`+count+'}'+String.raw`\}`,`${count} exemplars`)+`<p>The collection stores each exemplar’s landmarks and lateral constraints. Original pixels and temporary edge-response maps are not saved. A digit label can be associated separately.</p>`;
  }
  return `<div class="learn-data-heading"><strong>What is represented?</strong><span>${status}</span></div>${content}`;
 }
 function renderStorage(selection){$('learn-storage').innerHTML=storageMarkup(step,selection);}
 const image=(src,opacity=1)=>`<image href="${src}" x="0" y="0" width="200" height="200" opacity="${opacity}"/>`;
 function edgelet([f,r,c],width=.8,length=1.8){
  const theta=f*Math.PI/8+Math.PI/2,dx=Math.cos(theta)*length/2,dy=Math.sin(theta)*length/2;
  return `<path d="M${c-dx},${r-dy} L${c+dx},${r+dy}" stroke="${color(f)}" stroke-width="${width}" stroke-linecap="round"/>`;
 }
 function graphParts(ex,{inspect=false,landmarks=true}={}){
  const edges=ex.laterals.map(([a,b,radius],i)=>{
   const [,y,x]=ex.landmarks[a],[,by,bx]=ex.landmarks[b];
   return `<g class="learn-lateral" ${inspect?`data-learn-edge="${i}"`:''}><path class="learn-lateral-line" d="M${x},${y} L${bx},${by}"/>${inspect?`<path class="learn-lateral-hit" d="M${x},${y} L${bx},${by}"/>`:''}</g>`;
  }).join('');
  return edges+(landmarks?ex.landmarks.map(([f,r,c],i)=>`<g class="learn-landmark" ${inspect?`data-learn-landmark="${i}"`:''}><circle cx="${c}" cy="${r}" r="${inspect?1.15:1}" fill="${color(f)}"/>${edgelet([f,r,c],.75,3.3)}${inspect?`<circle class="learn-landmark-hit" cx="${c}" cy="${r}" r="2.4"/>`:''}</g>`).join(''):'');
 }
 function resetInspector(){
  svg.querySelectorAll('.is-inspected').forEach(el=>el.classList.remove('is-inspected'));
  const marks=svg.querySelector('#learn-inspection-mark');if(marks)marks.innerHTML='';
  $('learn-inspection').textContent=step===3?'Hover a landmark to see its position, orientation, and neighborhood.':step>=4?'Hover a landmark or a connection to inspect what was stored.':'Colors distinguish edge directions within the site’s palette.';
  renderStorage();
 }
 function renderGraph(){
  let content='';
  if(step===0)content=image(example.image);
  if(step===1)content=image(channel<0?data.responseMax:data.responseImages[channel]);
  if(step===2)content=data.edgelets.map(e=>edgelet(e)).join('');
  if(step===3){
   content=`<g opacity=".2">${data.edgelets.map(e=>edgelet(e)).join('')}</g>`;
   content+=example.landmarks.map(([f,r,c],i)=>`<g class="learn-landmark" data-learn-landmark="${i}"><circle cx="${c}" cy="${r}" r="1.5" fill="${color(f)}" stroke="white" stroke-width=".35"/>${edgelet([f,r,c],.6,3.1)}<circle class="learn-landmark-hit" cx="${c}" cy="${r}" r="2.4"/></g>`).join('');
  }
  if(step===4)content=`<g opacity=".12">${data.edgelets.map(e=>edgelet(e)).join('')}</g>`+graphParts(example,{inspect:true});
  svg.innerHTML=`<title>${stages[step].title}</title>${content}<g id="learn-inspection-mark" pointer-events="none"></g>`;
  svg.setAttribute('aria-label',`${stages[step].title}: the same MNIST training image, label 0.`);
  resetInspector();
 }
 function renderBank(){
  const examples=api.bank(bankCount);
  gallery.classList.toggle('is-expanded',bankCount===2);
  gallery.innerHTML=examples.map(ex=>`<button type="button" class="learn-exemplar-card${ex===example?' is-selected':''}" data-learn-example="${data.exemplars.indexOf(ex)}" aria-label="Inspect exemplar ${data.exemplars.indexOf(ex)%2+1} of digit ${ex.label}"><svg viewBox="${data.viewBox.join(' ')}" aria-hidden="true">${graphParts(ex)}</svg><span>${ex.label}<small>${ex===example?'just learned':bankCount===2?`example ${data.exemplars.indexOf(ex)%2+1}`:'one example'}</small></span></button>`).join('');
  $('learn-stat').textContent=`${examples.length} training images → ${examples.length} exemplars · 10 digit classes`;
  renderStorage();
 }
 function render(){
  const stage=stages[step];
  figure.dataset.stage=String(step);
  $('learn-step-title').textContent=stage.title;$('learn-step-body').textContent=stage.body;$('learn-step-point').textContent=stage.point;
  $('learn-progress').textContent=`Step ${step+1} of ${stages.length}`;
  $('learn-step-dots').innerHTML=stages.map((_,i)=>`<i class="${i===step?'is-current':i<step?'is-complete':''}"></i>`).join('');
  $('learn-next').textContent=stage.next;$('learn-back').disabled=step===0;
  $('learn-original').hidden=step===0||step===5;
  $('learn-plot').hidden=step===5;gallery.hidden=step!==5;
  $('learn-edge-control').hidden=step!==1;
  $('learn-inspection').hidden=step<2||step===5;
  $('learn-orientation-key').hidden=step<2||step===5;

  $('learn-stat').textContent=[
   'One MNIST image · a handwritten 0','16 oriented filters · broad edge responses',
   `${data.edgelets.length} edge fragments · location + orientation`,
   `${example.landmarks.length} selected landmarks · a sparse shape description`,
   `${example.laterals.length} lateral constraints · relative position + tolerance`,
   `${example.landmarks.length} landmarks + ${example.laterals.length} constraints · label 0`,''
  ][step];
  if(step===5)renderBank();else renderGraph();
 }
 // Measure every stage at the current width so text remains readable without layout jumps.
 function sizeWalkthrough(){
  const narrative=figure.querySelector('.learn-narrative');
  const width=narrative.getBoundingClientRect().width;
  if(!width)return;
  const probe=narrative.cloneNode(false);
  probe.removeAttribute('aria-live');
  Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',width:width+'px',display:'block',visibility:'hidden',pointerEvents:'none'});
  figure.appendChild(probe);
  const heights={title:0,body:0,point:0,storage:0};
  stages.forEach((stage,index)=>{
   probe.innerHTML=`<h5>${stage.title}</h5><p>${stage.body}</p><p class="learn-takeaway">${stage.point}</p><aside class="learn-storage">${storageMarkup(index)}</aside>`;
   [...probe.children].forEach((el,i)=>{
    el.style.height='auto';el.style.minHeight='0';el.style.margin='0';
    const key=['title','body','point','storage'][i];
    heights[key]=Math.max(heights[key],Math.ceil(el.getBoundingClientRect().height));
   });
  });
  probe.remove();
  Object.entries(heights).forEach(([key,value])=>figure.style.setProperty(`--learn-${key}-height`,`${value+2}px`));
 }
 let resizeFrame;
 const scheduleSize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(sizeWalkthrough);};
 new ResizeObserver(scheduleSize).observe(figure.querySelector('.learn-narrative'));
 document.fonts.ready.then(scheduleSize);
 window.addEventListener('resize',scheduleSize);
 $('learn-next').addEventListener('click',()=>{step=(step+1)%stages.length;if(step===0){channel=-1;$('learn-edge-channel').value='-1';}render();});
 $('learn-back').addEventListener('click',()=>{step=Math.max(0,step-1);render();});
 $('learn-edge-channel').addEventListener('change',event=>{channel=Number(event.target.value);renderGraph();});
 gallery.addEventListener('click',event=>{
  const card=event.target.closest('[data-learn-example]');if(!card)return;
  const index=Number(card.dataset.learnExample),ex=data.exemplars[index];
  gallery.querySelectorAll('[data-learn-example]').forEach(el=>el.classList.toggle('is-selected',el===card));
  renderStorage({ex});
 });
 svg.addEventListener('pointerover',event=>{
  if(step<3||step>4)return;
  const target=event.target.closest('[data-learn-landmark], [data-learn-edge]');if(!target){resetInspector();return;}
  resetInspector();target.classList.add('is-inspected');
  if(target.dataset.learnLandmark!==undefined){
   const index=Number(target.dataset.learnLandmark),[f,r,c]=example.landmarks[index];
   renderStorage({landmark:index});
   $('learn-inspection').textContent=step===3?`Landmark ${index+1}: keep this edge fragment and skip its 7 × 7 neighborhood. The selection records position and orientation.`:`Landmark ${index+1}: an edge feature at (${c}, ${r}), detected by the ${f*22.5}° filter. Its connections constrain relative movement.`;
   svg.querySelector('#learn-inspection-mark').innerHTML=`<rect class="learn-selection-window" x="${c-3.5}" y="${r-3.5}" width="7" height="7"/>`;
   if(step>=4)svg.querySelectorAll('[data-learn-edge]').forEach(el=>{const [a,b]=example.laterals[Number(el.dataset.learnEdge)];el.classList.toggle('is-inspected',a===index||b===index);});
  }else{
   const [a,b,radius]=example.laterals[Number(target.dataset.learnEdge)];
   renderStorage({edge:Number(target.dataset.learnEdge)});
   $('learn-inspection').textContent=`Landmarks ${a+1} ↔ ${b+1}: their relative horizontal and vertical offsets may each change by up to ${radius} pixels from this example.`;
   svg.querySelectorAll('[data-learn-landmark]').forEach(el=>el.classList.toggle('is-inspected',[a,b].includes(Number(el.dataset.learnLandmark))));
  }
 });
 svg.addEventListener('pointerleave',resetInspector);
 render();
})(window);
