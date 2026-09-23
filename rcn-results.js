(function(root){
 'use strict';
 const $=id=>document.getElementById(id);if(!$('results'))return;
 const ink={rcn:'#548c87',cnn:'#b76356'},spacing=[0,5,10,15,20,25],rcn=[90.4,92.4,93.7,94.3,93.1,93.3],cnn=[89.9,80.5,61.6,38.4,14.4,7.0];
 const line=(x1,y1,x2,y2,color,extra='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" ${extra}/>`;
 function drawTraining(){
  const chart=$('rcn-results-chart');let out='';
   const x=n=>90+(Math.log10(n)-2)/4.5*550;
   [100,1000,10000,100000,1000000].forEach((n,i)=>{out+=line(x(n),35,x(n),231,'#e3ebe5')+`<text x="${x(n)}" y="253" text-anchor="middle">${['100','1k','10k','100k','1m'][i]}</text>`;});
   out+=`<text x="15" y="86" style="fill:${ink.rcn}">RCN</text><text x="15" y="181" style="fill:${ink.cnn}">CNN</text>`;
   out+=line(90,82,x(260),82,ink.rcn,'stroke-width="3"')+`<circle cx="${x(260)}" cy="82" r="6" fill="${ink.rcn}"/><text class="results-number" x="${x(260)+13}" y="77" style="fill:${ink.rcn}">260</text><text x="${x(260)+13}" y="97">clean character images</text>`;
   out+=line(90,177,x(79000),177,ink.cnn,'stroke-width="3"')+`<circle cx="${x(79000)}" cy="177" r="6" fill="${ink.cnn}"/><text class="results-number" x="${x(79000)}" y="135" text-anchor="middle" style="fill:${ink.cnn}">79,000</text><text x="${x(79000)}" y="152" text-anchor="middle">CAPTCHA strings</text>`;
   out+=line(x(79000)+8,177,x(2300000),177,ink.cnn,'stroke-width="1.5" stroke-dasharray="4 4"')+`<circle cx="${x(2300000)}" cy="177" r="6" fill="white" stroke="${ink.cnn}" stroke-width="2"/><text class="results-number" x="${x(2300000)}" y="205" text-anchor="end" style="fill:${ink.cnn}">over 2.3 million</text><text x="${x(2300000)}" y="222" text-anchor="end">after translated crops</text><text x="345" y="280" text-anchor="middle">Training images · logarithmic scale · different image types</text>`;
   $('results-chart-note').textContent='The CNN’s 79,000 strings became over 2.3 million translated training images. Clean characters and full strings are different training units; the horizontal axis uses a logarithmic scale.';
   chart.setAttribute('aria-label','RCN: 260 clean character training images and 90.4% string accuracy. CNN: 79,000 CAPTCHA strings, over 2.3 million images after augmentation, and 89.9% accuracy.');
  chart.innerHTML=out;
 }
 function drawSpacing(){
  const chart=$('rcn-spacing-chart');let out='';
  const x=n=>62+n*111,y=v=>235-v*2;
  [0,25,50,75,100].forEach(v=>out+=line(62,y(v),617,y(v),'#e3ebe5')+`<text x="50" y="${y(v)+4}" text-anchor="end">${v}%</text>`);
  spacing.forEach((v,k)=>out+=`<text x="${x(k)}" y="255" text-anchor="middle">${v===0?'Original':'+'+v+'%'}</text>`);
  out+=`<text x="62" y="19">Whole-string accuracy</text><text x="345" y="320" text-anchor="middle">Extra spacing between characters at test time</text>`;
  [[rcn,ink.rcn,'RCN'],[cnn,ink.cnn,'CNN']].forEach(([values,color,name])=>{
   out+=`<path d="${values.map((v,k)=>(k?'L':'M')+x(k)+' '+y(v)).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
   values.forEach((v,k)=>out+=`<circle cx="${x(k)}" cy="${y(v)}" r="3" fill="${color}" stroke="white" stroke-width="1.5"/>`);
   out+=`<text x="632" y="${y(values[5])+4}" style="fill:${color};font-weight:600">${name}</text>`;
  });
  [0,5].forEach(k=>{
   const advance=9.6*(1+spacing[k]/100);
   out+=`<g class="results-spacing-example" aria-label="VISION at ${spacing[k]===0?'original':'+25 percent'} character spacing">`;
   [...'VISION'].forEach((letter,j)=>out+=`<text x="${x(k)+(j-2.5)*advance}" y="288" text-anchor="middle" style="font:16px var(--mono);fill:#032f56">${letter}</text>`);
   out+='</g>';
  });
  chart.setAttribute('aria-label','Published whole-string accuracy at original through 25 percent extra character spacing. RCN stays near 90 percent; CNN falls from 89.9 to 7 percent. VISION examples illustrate original and 25 percent wider spacing.');
  chart.innerHTML=out;
 }
 drawTraining();drawSpacing();
 const data=root.RCNCaptchaExamples,canvas=$('captcha-canvas'),ctx=canvas.getContext('2d');
 const spacings=[25,40,60,80,100],images=new Map();let revision=0;
 function loadImage(src){
  if(!images.has(src))images.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;}));
  return images.get(src);
 }
 async function showExample(){
  const current=++revision,expected=$('captcha-example').value,spacing=spacings[Number($('captcha-spacing').value)];
  const frame=data.frames.find(f=>f.expected===expected&&f.spacing===spacing);
  $('captcha-spacing-value').textContent=spacing+'%';
  $('captcha-spacing').setAttribute('aria-valuetext',spacing+'% of original spacing');
  $('captcha-status').textContent='Loading recorded example…';
  $('captcha-result').hidden=true;
  try{
   const img=await loadImage(frame.image);if(current!==revision)return;
   canvas.width=frame.width;canvas.height=frame.height;ctx.drawImage(img,0,0);
   canvas.setAttribute('aria-label',`Handwritten ${expected}, at ${spacing}% spacing. Recorded model prediction: ${frame.result.text}.`);
   const result=frame.result,correct=expected===result.text;
   $('captcha-prediction').textContent=result.text;
   $('captcha-comparison').classList.toggle('is-mismatch',!correct);
   $('captcha-comparison').textContent=correct?'Matches the input digits':`Input: ${expected} · incorrect prediction`;
   $('captcha-breakdown').innerHTML=result.results.map((r,i)=>`<div class="captcha-readout"><small>Region ${i+1}</small><div class="captcha-digit"><strong>${r.label===null?'?':r.label}</strong><span>${r.score===null?'—':(r.score>=0?'+':'')+r.score.toFixed(1)}</span></div><small>${r.score===null?'No valid lateral fit':'Final model score'}</small></div>`).join('');
   result.results.forEach((r,i)=>{const b=r.box;ctx.strokeStyle=['#548c87','#0f67a2','#987143','#b76356'][i%4];ctx.lineWidth=1.5;ctx.strokeRect(b.x0-3,b.y0-3,b.x1-b.x0+6,b.y1-b.y0+6);ctx.font='12px sans-serif';ctx.fillStyle=ctx.strokeStyle;ctx.fillText(String(i+1),b.x0-2,Math.max(12,b.y0-7));});
   $('captcha-result').hidden=false;
   $('captcha-status').textContent=result.results.length<expected.length?`The digit-separation step found ${result.results.length} regions for ${expected.length} digits. Overlapping digits can merge.`:'Recorded full inference · 100 exemplars';
  }catch(error){if(current===revision)$('captcha-status').textContent='This recorded image could not be loaded. Please reload the page.';}
 }
 $('captcha-example').addEventListener('change',showExample);
 $('captcha-spacing').addEventListener('input',showExample);
 showExample();root.RCNResults={spacing,rcn,cnn,showExample};
})(globalThis);
