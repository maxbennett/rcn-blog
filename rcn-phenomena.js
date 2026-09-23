/* Interactive comparisons of published RCN panels.
   No live model inference is implied. */
(function(){
 'use strict';
 const base='assets/phenomena/';
 const image=(id,file,alt)=>{const el=document.getElementById(id);el.src=base+file+'.png';el.alt=alt;};
 const contours=document.getElementById('phenomena-contours');if(!contours)return;
 contours.querySelectorAll('[data-contour]').forEach(button=>button.addEventListener('click',()=>{
  const shape=button.dataset.contour;
  contours.querySelectorAll('[data-contour]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  image('phenomena-contour-input','contour-'+shape+'-input',`Published ${shape} stimulus without a complete visible outline`);
  image('phenomena-contour-output','contour-'+shape+'-inference',`Published RCN ${shape} contours: green has local evidence; magenta bridges missing boundaries`);
 }));
 const occlusion=document.getElementById('phenomena-occlusion');
 occlusion.querySelectorAll('[data-occlusion]').forEach(button=>button.addEventListener('click',()=>{
  const mode=button.dataset.occlusion;
  occlusion.querySelectorAll('[data-occlusion]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  image('phenomena-occlusion-input','digit-'+mode+'-input',`Published digit-five fragments with the missing region ${mode==='occluded'?'covered by a square':'deleted'}`);
  image('phenomena-occlusion-output','digit-'+mode+'-inference',`Published RCN MAP contour explanation for the ${mode} digit`);
  document.getElementById('phenomena-occlusion-explanation').textContent=mode==='occluded'
   ?'The foreground square accounts for the absent strokes, allowing the model to support the partly hidden five.'
   :'The visible digit strokes are unchanged, but the square is gone. Now the missing parts count against the five, and the inferred explanation changes.';
 }));
})();
