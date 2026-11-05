(function(){
  'use strict';
  const M=globalThis.RCNExtensions;if(!M)return;
  const $=id=>document.getElementById(id),fmt=n=>(n>0?'+':'')+n.toFixed(0),score=n=>(n>=0?'+':'')+n.toFixed(2);
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const line=(p,color,width=3,dash='')=>`<line x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  const path=(d,cls='rx-line')=>`<path d="${d}" class="${cls}"/>`;
  const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${s}</text>`;
  const factor=(x,y)=>`<rect x="${x-5}" y="${y-5}" width="10" height="10" class="rx-factor"/>`;
  const and=(x,y)=>`<path d="M${x-8},${y+6} L${x},${y-8} L${x+8},${y+6}Z" class="rx-factor"/>`;
  const node=(x,y,r,active)=>`<circle cx="${x}" cy="${y}" r="${r}" class="${active?'rx-node-lit':'rx-node'}"/>`;
  const signedShift=q=>q===0?'0':fmt(q);

  if($('rcn-hierarchy')){
    let stage=0,focus=0,timer=null,model=M.hierarchy();
    const xs=[105,260,415,570];
    const titles=['Start with observed edges','Each edge pool searches nearby','Compatible edges form a corner','Pool over corner placements','Coordinate the four corners','A score for the whole shape','Feedback chooses corner placements','Each corner chooses its edge placements','A complete contour explanation'];
    const stories=[
      'These eight edge fragments are the fixed observation. Each pair can support a corner; four corners can support a square.',
      'An edge pool considers three local offsets. Matching the observed fragment contributes +1; predicting an absent fragment contributes −1.',
      'The two edges must meet. A lateral factor allows only equal local offsets, so two individually good matches may not form a legal corner.',
      'Each corner is itself pooled over three placements. The next level receives a score for each possible placement of this reusable part.',
      'The upper lateral ring constrains neighboring corner offsets to differ by at most one step. The model evaluates their compatible combinations.',
      'The upward calculation finds the highest-scoring legal arrangement. Feedback can now trace which placements produced that score.',
      'Condition on the whole shape. The maximizing joint arrangement selects one placement in each of its four corner pools.',
      'Each selected corner sends its choice downward. Its two edge pools select local offsets that respect the corner constraint.',
      'The decoded contour is now shown beside the input. Green edges match observations; dashed rust edges are predictions without a matching observation.'
    ];
    function stop(){clearInterval(timer);timer=null;}
    function drawScene(inferred){
      let s='';
      for(let i=0;i<4;i++)for(let o=0;o<2;o++){
        const ready=!inferred||stage>=8,p=inferred?model.selected[i].position:model.observed[i][o];
        const color=!inferred?'#263b40':!ready?'#cad4ce':model.selected[i].matches[o]?'#45827b':'#b35f50';
        s+=line(M.edgeGeometry(i,o,ready?p:0),color,inferred&&!ready?2:3.5,inferred&&(!ready||!model.selected[i].matches[o])?'5 4':'');
      }
      const p=M.edgeGeometry(focus,0,model.observed[focus][0]);
      if(!inferred)s+=`<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="none" stroke="#0f67a2" stroke-width="1.3" stroke-dasharray="2 3"/>`;
      return s;
    }
    function render(){
      $('rh-input').innerHTML=drawScene(false);$('rh-output').innerHTML=drawScene(true);
      $('rh-output-label').textContent=stage>=8?`${model.matches} of 8 fragments matched`:'Feedback reveals the selected placements';
      $('rh-stage').textContent=titles[stage];$('rh-step').textContent=`${stage+1} / 9`;
      $('rh-story').textContent=stories[stage];
      $('rh-forward').textContent=timer?'Pause':stage>=5?'Replay forward ↑':'Run forward ↑';
      $('rh-feedback').disabled=stage<5||timer!==null;
      $('rh-next').disabled=stage===8||timer!==null;
      $('rh-back').disabled=stage===0||timer!==null;
      $('rh-displacement-value').textContent=$('rh-displacement').value;
      document.querySelectorAll('[data-rh-corner]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.rhCorner)===focus)));
      const active=n=>stage>=n,cl=n=>active(n)?(stage>=6?'rx-line rx-feedback':'rx-line rx-lit'):'rx-line';
      let g=text(340,20,'WHOLE SHAPE','rx-small');
      g+=path('M340 74 V100',cl(5))+and(340,100);
      xs.forEach(x=>{g+=path(`M340 107 L${x} 145`,cl(5));});
      g+=node(340,53,24,active(5))+text(340,59,active(5)?fmt(model.score):'□','rx-score');
      g+=text(435,57,active(5)?'best joint score':'square hypothesis','rx-small');
      // Upper laterals form a ring across the four corner-placement pools.
      for(let i=0;i<3;i++)g+=path(`M${xs[i]+39} 150 H${xs[i+1]-39}`,cl(4))+factor((xs[i]+xs[i+1])/2,150);
      g+=path(`M${xs[0]} 160 V182 H${xs[3]} V160`,cl(4))+factor(337,182);
      xs.forEach((x,i)=>{
        const selected=model.selected[i],q=selected.q,m=model.messages[i];
        g+=`<rect x="${x-44}" y="135" width="88" height="30" rx="15" class="rx-pool"/>`;
        M.shifts.forEach((v,k)=>{
          const cx=x+(k-1)*25;
          if(stage>=6&&q===v)g+=`<circle cx="${cx}" cy="150" r="11" fill="#d9ebf5"/>`;
          g+=text(cx,154,signedShift(v),'rx-small');
        });
        g+=path(`M${x} 165 V210`,cl(3))+factor(x,197);
        g+=node(x,234,23,active(2));
        const shapes=['M8 -7 H-8 V9','M-8 -7 H8 V9','M-8 7 H8 V-9','M8 7 H-8 V-9'];
        g+=`<g transform="translate(${x} 234)">${path(shapes[i],active(2)?'rx-line rx-lit':'rx-line')}</g>`;
        g+=text(x,278,M.corners[i],'rx-small');
        g+=text(x,295,active(3)?`scores: ${m.map(v=>fmt(v.score)).join(' / ')}`:'corner feature','rx-small');
        g+=path(`M${x} 257 V315`,cl(2))+and(x,315);
        [-1,1].forEach((side,o)=>{
          const xx=x+side*35;
          g+=path(`M${x} 322 L${xx} 346`,cl(2));
          g+=`<ellipse cx="${xx}" cy="359" rx="25" ry="13" class="rx-pool"/>`+text(xx,363,stage>=7?signedShift(selected.r):'−1 0 +1','rx-small');
          g+=path(`M${xx} 373 V433`,cl(1))+factor(xx,402);
          g+=node(xx,449,13,active(1));
          g+=o===0?line([xx-7,449,xx+7,449],'#334d45',2):line([xx,442,xx,456],'#334d45',2);
          g+=text(xx,482,`offset ${signedShift(model.observed[i][o])}`,'rx-small');
          if(stage>=7)g+=text(xx,503,selected.matches[o]?'+1':'−1','rx-score');
        });
        g+=path(`M${x-10} 359 H${x+10}`,cl(2))+factor(x,359);
        if(i===focus)g+=`<rect x="${x-72}" y="204" width="144" height="99" rx="5" fill="none" stroke="#0f67a2" stroke-dasharray="3 4"/>`;
      });
      g+=text(337,530,'OBSERVED EDGE EVIDENCE','rx-small');
      $('rh-graph').innerHTML=g;
      $('rh-inspect-title').textContent=`Inspect ${M.corners[focus].toLowerCase()}`;
      $('rh-table').innerHTML=model.messages[focus].map(m=>`<tr><td>${signedShift(m.q)}</td><td>${m.edge[0].map(fmt).join(', ')}</td><td>${m.edge[1].map(fmt).join(', ')}</td><td>${fmt(m.score)}</td></tr>`).join('');
      $('rh-result').textContent=`Whole-shape score: ${fmt(model.score)}. Selected corner offsets: ${model.selected.map(s=>signedShift(s.q)).join(', ')}. Local edge offsets: ${model.selected.map(s=>signedShift(s.r)).join(', ')}.`;
    }
    function play(to){stop();if(reduced()){stage=to;render();return;}timer=setInterval(()=>{stage++;if(stage>=to)stop();render();},800);render();}
    $('rh-forward').addEventListener('click',()=>{if(timer){stop();render();return;}if(stage>=5)stage=0;play(5);});
    $('rh-feedback').addEventListener('click',()=>{stage=5;play(8);});
    $('rh-next').addEventListener('click',()=>{stop();stage=Math.min(8,stage+1);render();});
    $('rh-back').addEventListener('click',()=>{stop();stage=Math.max(0,stage-1);render();});
    $('rh-reset').addEventListener('click',()=>{stop();stage=0;render();});
    for(const id of ['rh-displacement','rh-break'])$(id).addEventListener('input',()=>{stop();stage=0;model=M.hierarchy(Number($('rh-displacement').value),$('rh-break').checked);render();});
    document.querySelectorAll('[data-rh-corner]').forEach(b=>b.addEventListener('click',()=>{focus=Number(b.dataset.rhCorner);render();}));
    render();
  }

  if($('rcn-ambiguity')){
    const inks=['#45827b','#0f67a2','#a97735'],xs=[160,340,520],strokeXs=[90,190,290,390,490,590];
    let bias=-.4,selected=1,stage=2,timer=null,model=M.ambiguity(bias,selected),previous=model;
    const reading=mask=>mask===1?'B':'1 + 3';
    function stop(){clearInterval(timer);timer=null;}
    function character(result,observed=false){
      let s='';
      if(!observed){
        const groups=result.selected===1?[[65,132,0]]:[[66,31,1],[98,99,2]];
        groups.forEach(([x,w,i])=>{s+=`<rect x="${x}" y="29" width="${w}" height="173" rx="7" fill="${inks[i]}" fill-opacity=".045" stroke="${inks[i]}" stroke-opacity=".35"/>`;});
      }
      M.characterParts.forEach((part,j)=>{
        const owner=result.owners[j][0],ink=observed?'#263b40':inks[owner];
        s+=`<path data-ra-stroke="${j}" data-owner="${observed?'input':M.characterNames[owner]}" d="${part.d}" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
      });
      if(!observed){
        if(result.selected===1)s+=text(130,222,'B · one character','rx-small');
        else s+=text(83,222,'1','rx-small')+text(146,222,'3','rx-small');
      }
      return s;
    }
    function render(){
      const decoded=stage>=2?model:previous,active=stage>=1?model:previous;
      $('rcn-ambiguity').dataset.stage=String(stage);
      $('rcn-ambiguity').dataset.reading=String(decoded.selected);
      $('ra-input').innerHTML=character(model,true);$('ra-output').innerHTML=character(decoded);
      $('ra-output').setAttribute('aria-label',decoded.selected===1?'The same strokes grouped into one B exemplar':'The same strokes split between a 1 exemplar and a 3 exemplar');
      $('ra-output-label').textContent=decoded.selected===1?'One B owns all six stroke parts':'1 owns the stem; 3 owns the two lobes';
      document.querySelectorAll('[data-ra-bias]').forEach(b=>b.setAttribute('aria-pressed',String(Math.sign(Number(b.dataset.raBias))===Math.sign(bias))));
      const titles=['A small preference changes at the top','The exemplar selection switches','The strokes acquire one coherent grouping'];
      const stories=[
        `The observation stays fixed. Only the preference for a letter or a pair of digits changes.`,
        model.selected===1?'B becomes active; the 1 and 3 exemplars become inactive.':'The 1 and 3 exemplars become active together; B becomes inactive.',
        model.tied?'Both readings explain every stroke equally well. With no preference, the display keeps the last selected reading.':model.selected===1?'Feedback groups the entire contour under B. The competing 1 and 3 explanation remains possible.':'Feedback assigns the stem to 1 and both lobes to 3. The input itself has not moved or changed.'
      ];
      $('ra-stage').textContent=titles[stage];$('ra-story').textContent=stories[stage];
      $('ra-status').textContent=model.tied?'Equal support · both readings are valid':`Preference favors ${reading(model.selected)}`;
      let g=text(340,19,'EXEMPLARS','rx-small');
      // Each observed part has a shared OR factor. All alternative explanations
      // remain visible; selection changes which exemplar-to-evidence links light.
      M.characterFeatures.forEach((parts,i)=>parts.forEach(j=>{
        const xx=strokeXs[j],on=stage>=2?model.exemplars[i]:previous.exemplars[i];
        const flow=timer!==null&&stage===1&&model.exemplars[i];
        g+=`<path data-ra-link="${i}:${j}" data-active="${Boolean(on)}" d="M${xs[i]} 115 L${xx} 226" fill="none" stroke="${inks[i]}" stroke-width="${on||flow?2.5:1}" opacity="${on||flow?.8:.13}" ${flow?'class="ra-flow"':''}/>`;
      }));
      xs.forEach((x,i)=>{
        const on=active.exemplars[i];
        g+=`<g data-ra-exemplar="${i}" data-active="${Boolean(on)}"><path d="M${x} 88 V107" fill="none" stroke="${inks[i]}" stroke-width="1.5" opacity="${on?1:.25}"/>`;
        g+=`<path d="M${x-7} 116 L${x} 104 L${x+7} 116Z" fill="${on?inks[i]:'#e2e8e2'}"/>`;
        g+=`<circle cx="${x}" cy="62" r="26" fill="${on?'#f0f6f2':'white'}" stroke="${on?inks[i]:'#d2ddd7'}" stroke-width="${on?2.4:1.3}"/>`;
        g+=`<text x="${x}" y="70" style="font-size:23px;fill:${on?inks[i]:'#9aa9a2'}">${M.characterNames[i]}</text>`;
        g+=text(x,141,on?'ON':'off','rx-small')+'</g>';
      });
      strokeXs.forEach((x,j)=>{
        const owner=decoded.owners[j][0],ink=inks[owner];
        g+=`<rect x="${x-15}" y="226" width="30" height="21" rx="3" fill="white" stroke="#b6c7bd"/>`+text(x,241,'OR','rx-small');
        g+=`<path d="M${x} 247 V272" fill="none" stroke="${ink}" stroke-width="2"/><circle cx="${x}" cy="273" r="4" fill="${ink}"/>`;
        const part=M.characterParts[j];
        g+=`<rect x="${x-32}" y="289" width="64" height="47" rx="4" fill="#f5f8f4" stroke="#e3e9e4"/><svg x="${x-24}" y="297" width="48" height="31" viewBox="${part.viewBox}"><path d="${part.d}" fill="none" stroke="#263b40" stroke-width="5" stroke-linecap="round"/></svg>`;
        g+=text(x,356,`owned by ${M.characterNames[owner]}`,'rx-small');
      });
      g+=text(340,388,'SAME OBSERVED STROKE PARTS','rx-small');
      $('ra-graph').innerHTML=g;
      $('ra-graph').setAttribute('aria-label',`Shared-evidence graph. ${reading(active.selected)} active. Each stroke is explained once; inactive alternative connections remain faint.`);
    }
    function change(value,animate=true){
      const visible=stage>=2?model:previous;
      stop();previous=visible;selected=visible.selected;bias=value;model=M.ambiguity(bias,selected);
      if(animate&&!reduced()){
        stage=0;timer=setInterval(()=>{stage++;if(stage===2){stop();selected=model.selected;}render();},600);
      }else{stage=2;selected=model.selected;}
      render();
    }
    document.querySelectorAll('[data-ra-bias]').forEach(b=>b.addEventListener('click',()=>change(Number(b.dataset.raBias))));
    render();
  }
})();
