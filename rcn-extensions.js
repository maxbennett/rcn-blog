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
    let bias=0,selected=0,stage=3,timer=null,model=M.ambiguity(),previous=model;
    function stop(){clearInterval(timer);timer=null;}
    function cube(z,observed=false){
      let s='';
      if(!observed){
        const ids=z===0?[0,1,2,3]:[4,5,6,7];
        s+=`<polygon points="${ids.map(i=>M.vertices[i].join(',')).join(' ')}" fill="${z===0?'#dceee8':'#e0ebf6'}" fill-opacity=".88"/>`;
      }
      M.cubeEdges.forEach(([a,b],i)=>{
        const front=!observed&&(z===0?i<4:i>=4&&i<8);
        s+=line(M.cubeInput[i],observed?'#263b40':front?(z===0?'#45827b':'#0f67a2'):'#a9bbb4',front?4:2);
      });
      s+=text(40,206,'A','rx-small')+text(220,40,'B','rx-small');
      return s;
    }
    const delta=m=>m[1]-m[0];
    function render(){
      const z=stage>=3?model.selected:previous.selected;
      $('ra-input').innerHTML=cube(0,true);$('ra-output').innerHTML=cube(z);
      $('ra-output-label').textContent=`${z===0?'A · lower-left':'B · upper-right'} face interpreted as nearer`;
      $('ra-bias').value=bias;$('ra-bias-value').textContent=score(bias);
      document.querySelectorAll('[data-ra-bias]').forEach(b=>b.setAttribute('aria-pressed',String(Math.sign(Number(b.dataset.raBias))===Math.sign(bias))));
      ['a','b'].forEach((name,i)=>{
        $('ra-score-'+name).textContent=score(model.scores[i]);
        $('ra-prior-'+name).textContent=`image fit 12 + bias ${score(model.unary[i])}`;
        $('ra-card-'+name).classList.toggle('is-selected',stage>=3&&model.selected===i);
      });
      const messages=['The top-down bias changes','Feedback reaches the faces','Feedback reaches the junctions','One coherent interpretation'];
      const stories=[
        'Only the prior at the top changes. The twelve projected lines still give exactly the same image evidence to both explanations.',
        'The two face variables receive different support for their near/far roles. Their depth ordering must agree with the whole-cube interpretation.',
        'The face messages constrain their junctions. Each outgoing message excludes the evidence it received from that same junction.',
        model.tied?'Both joint explanations score 12. The display retains the previously selected tied solution; the model has no preference.':`A bias of ${Math.abs(bias).toFixed(2)} score units favors ${model.selected===0?'A':'B'}. Its whole depth assignment wins, even though the image has not changed.`
      ];
      $('ra-stage').textContent=messages[stage];$('ra-story').textContent=stories[stage];
      $('ra-status').textContent=model.tied?'Equal scores · two valid explanations':`Selected explanation: ${model.selected===0?'A':'B'}`;
      $('ra-replay').disabled=timer!==null;
      let g='';
      [200,480].forEach((x,f)=>{
        g+=path(`M340 78 L${x} 157`,stage>=1?'rx-line rx-feedback':'rx-line')+factor((340+x)/2,118);
        [x-65,x+65].forEach((xx,k)=>{
          g+=path(`M${x} 195 L${xx} 274`,stage>=2?'rx-line rx-feedback':'rx-line')+factor((x+xx)/2,232);
          g+=path(`M${xx} 304 V343`,'rx-line')+node(xx,291,15,stage>=2);
          const state=stage>=2?model.junctions[2*f+k]:previous.junctions[2*f+k];
          g+=text(xx,296,state?'N':'F');
          g+=text(xx,325,`j${2*f+k+1} · ${stage>=2?score(delta(model.junctionDown[2*f+k])):'0.00'}`,'rx-small');
          g+=`<rect x="${xx-35}" y="350" width="70" height="28" rx="4" fill="#eef2ed"/>`+text(xx,369,'3 edges','rx-small');
        });
        g+=node(x,176,21,stage>=1);
        const state=stage>=1?model.faces[f]:previous.faces[f];
        g+=text(x,182,state?'near':'far');
        g+=text(x,216,`Face ${f===0?'A':'B'}`,'rx-small');
        g+=text(x+(f===0?-55:55),150,stage>=1?score(delta(model.faceDown[f])):'0.00','rx-score');
      });
      g+=node(340,53,26,true)+text(340,59,model.selected===0?'A':'B');
      g+=text(340,16,'WHOLE-CUBE INTERPRETATION','rx-small');
      g+=text(455,57,`B − A = ${score(bias)}`,'rx-score');
      g+=text(340,408,'SAME TWELVE PROJECTED LINES','rx-small');
      $('ra-graph').innerHTML=g;
      $('ra-message-table').innerHTML=model.faceDown.map((m,f)=>`<tr><td>Face ${f===0?'A':'B'}</td><td>${score(m[0])}</td><td>${score(m[1])}</td><td>${score(delta(m))}</td></tr>`).join('');
    }
    function change(value,animate=true){
      stop();previous=M.ambiguity(0,selected);bias=value;model=M.ambiguity(bias,selected);
      if(animate&&!reduced()){
        stage=0;timer=setInterval(()=>{stage++;if(stage===3){stop();selected=model.selected;}render();},650);
      }else{stage=3;selected=model.selected;}
      render();
    }
    document.querySelectorAll('[data-ra-bias]').forEach(b=>b.addEventListener('click',()=>change(Number(b.dataset.raBias))));
    $('ra-bias').addEventListener('input',()=>change(Number($('ra-bias').value),false));
    $('ra-replay').addEventListener('click',()=>change(bias));
    render();
  }
})();
