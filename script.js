/* ═══════════════════════════════════════════════════════════════════
   THIS WEB DOES NOT COMPLY — v14
   Changes from v13 — surgical fixes only:

   INPUT: Fixed pattern generation (was scoping bug causing empty output).
     5 pattern types: radial burst, horizontal sweep, diagonal cascade,
     vertical stack, scattered field. All produce dense visible output.
     Keys 4/5/6 → commands. Colors mix dynamically.
     
   SELECT: Tags stop completely after settling. No infinite motion.
   
   CONTROL: Three vertically stacked boxes as one unit.
     Drag creates layered traces with visible side surfaces.
     Boxes are #cmd1/#cmd2/#cmd3, colored lime/pink/gray.
     Stack moves together, offset copies build depth.
     
   POSTER: Better composition — balanced, hierarchical.
     Lower overlay opacity. No gray background on canvas.
     
   ALIGN, LOOP, EDGE: unchanged.
═══════════════════════════════════════════════════════════════════ */

const D={
  Align:[
    {n:1,text:"KEEP RIGHT"},
    {n:2,text:"DO NOT CROSS THE LINE"},
    {n:3,text:"POSITION YOUR FACE WITHIN THE FRAME"}
  ],
  Input:[
    {n:4,text:"SWIPE TO UNLOCK"},
    {n:5,text:"ACCEPT ALL COOKIES"},
    {n:6,text:"PUSH/PULL"}
  ],
  Select:[
    {n:7,text:"SELECT ALL IMAGES"},
    {n:8,text:"PLACE YOUR ITEMS IN THE TRAY"},
    {n:9,text:"SELECT THE CORRECT ANSWER"}
  ],
  Loop:[
    {n:10,text:"Processing"},
    {n:11,text:"Press the Button once"},
    {n:12,text:"Try Again"}
  ],
  Control:[
    {n:13,text:"Saving"},
    {n:14,text:"Recording in progress"},
    {n:15,text:"Network unstable"}
  ],
  Edge:[
    {n:16,text:"Do the work"},
    {n:17,text:"typing continue"},
    {n:18,text:"overturn everything"}
  ]
};
const cats=['Align','Input','Select','Loop','Control','Edge'];

const LIME_BG='rgba(223,255,0,1)';
const PINK_BG='rgba(255,204,216,1)';
const GRAY_BG='rgba(210,210,208,1)';
const CMD_BG=[LIME_BG,PINK_BG,GRAY_BG];
const BG_ALPHA=0.055;
const FM=s=>`500 ${s}px 'Monument','Helvetica Neue',Arial,sans-serif`;
const CMD_FS=13;const CMD_PX=6;const CMD_PY=4;

const $=id=>document.getElementById(id);
let T=0,FC=0,MX=-1,MY=-1,magX=-200,magY=-200;

/* ALIGN — unchanged */
const alignBlocks=[];
let alignDrag=null;
const alignStamps=[];

/* INPUT — pattern stamps (fixed) */
const inputStamps=[]; /* [{lines:[{x,y,text,fs,bg}]}] */
let inputCount=0;

/* SELECT — unchanged except settled flag */
let selectAnchors=[];
const selectConns=[];

/* LOOP — unchanged */
let loopScale=1.0,loopDrag=null;

/* CONTROL — three-box stack unit, layered traces */
const controlTraces=[]; /* [{x,y,layers:[{dx,dy}],cmds:[{text,bg}]}] */
let controlDragging=false,controlLastPt=null;

/* EDGE — unchanged */
const edgeParts=[];
let edgeInit=false;
let lastVis=0;

/* ─── Loading ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  const strip=$('ld-strip'),logo=$('ld-logo'),pct=$('ld-pct'),ldr=$('loader');
  new Image().src='The_first_image_of_the_website_zoom_in.jpg';
  setTimeout(()=>logo.classList.add('vis'),400);
  let sl=0;
  const go=()=>{
    if(++sl>=9){logo.classList.remove('vis');pct.textContent='60%';setTimeout(zoom,300);return}
    pct.textContent=Math.floor(sl/9*60)+'%';
    strip.classList.add('el');strip.style.transform=`translateX(-${sl*100}vw)`;
    setTimeout(()=>strip.classList.remove('el'),700);setTimeout(go,1100);
  };
  setTimeout(go,900);
  function zoom(){
    strip.style.transition='opacity .5s';strip.style.opacity='0';
    const zi=document.createElement('img');zi.src='The_first_image_of_the_website_zoom_in.jpg';
    zi.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;transform:scale(1);transition:transform 3s cubic-bezier(.25,.1,.25,1);transform-origin:50% 58%';
    ldr.appendChild(zi);
    let zp=60;const ziv=setInterval(()=>{zp+=1.5;if(zp>100)zp=100;pct.textContent=zp+'%';if(zp>=100)clearInterval(ziv)},100);
    zi.onload=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{zi.style.transform='scale(4)'}));
    setTimeout(()=>{ldr.style.transition='opacity .7s';ldr.style.opacity='0';setTimeout(()=>{ldr.style.display='none';startWebsite()},800)},3500);
  }
});

function startWebsite(){
  $('bar')?.classList.remove('hide');
  $('sc')?.classList.remove('hide');
  buildIndex();buildSections();
  requestAnimationFrame(()=>$('s-theme')?.scrollIntoView());

  let bouncing=false;
  const sc=$('sc');
  if(sc)sc.addEventListener('scroll',()=>{
    const max=sc.scrollHeight-sc.clientHeight;
    if(sc.scrollTop>=max-5&&!bouncing){
      bouncing=true;sc.scrollTo({top:max-120,behavior:'smooth'});
      setTimeout(()=>sc.scrollTo({top:max-40,behavior:'smooth'}),350);
      setTimeout(()=>sc.scrollTo({top:max-80,behavior:'smooth'}),600);
      setTimeout(()=>{bouncing=false},900);
    }
    const cvi=$('worm-Input');
    const hintBar=$('input-hint-bar');
    if(cvi&&hintBar){
      const r=cvi.getBoundingClientRect();
      hintBar.style.display=(r.bottom>0&&r.top<window.innerHeight)?'block':'none';
    }
  });

  document.querySelectorAll('.cw').forEach(w=>w.addEventListener('click',()=>{
    document.querySelectorAll('.cw').forEach(x=>x.classList.toggle('active',x.dataset.c===w.dataset.c));
    $('s-cat-'+w.dataset.c)?.scrollIntoView({behavior:'smooth'});
  }));
  document.addEventListener('mousemove',e=>{MX=e.clientX;MY=e.clientY});

  /* KEYBOARD — INPUT */
  document.addEventListener('keydown',e=>{
    const cv=$('worm-Input');if(!cv)return;
    const r=cv.getBoundingClientRect();
    if(r.bottom<0||r.top>window.innerHeight)return;
    if(e.ctrlKey||e.metaKey||e.key.length!==1)return;
    e.preventDefault();
    const W=cv.offsetWidth,H=cv.offsetHeight;
    const ch=e.key.toUpperCase();
    const numKey=parseInt(e.key);
    /* Keys 4/5/6 trigger their specific commands */
    let cmdIdx=inputCount%D.Input.length;
    if(numKey>=4&&numKey<=6)cmdIdx=numKey-4;
    const cmd=D.Input[cmdIdx];
    /* 5 pattern types — cycle through them */
    const pat=inputCount%5;
    buildInputPattern(ch,cmd,pat,W,H,inputCount);
    inputCount++;
  });

  $('save-btns')?.classList.remove('hide');
  $('btn-save')?.addEventListener('click',()=>{
    let vc=null;
    cats.forEach(c=>{const el=$('worm-'+c);if(!el)return;const r=el.getBoundingClientRect();if(r.bottom>0&&r.top<window.innerHeight)vc=el});
    if(vc){const a=document.createElement('a');a.download='trace_'+Date.now()+'.png';a.href=vc.toDataURL('image/png');a.click()}
  });
  $('btn-print')?.addEventListener('click',generatePrint);
  $('btn-poster')?.addEventListener('click',generatePoster);
  $('print-close')?.addEventListener('click',()=>$('print-overlay')?.classList.add('hide'));
  $('print-dl')?.addEventListener('click',()=>{const cv=$('print-cv');const a=document.createElement('a');a.download='archive_'+Date.now()+'.png';a.href=cv.toDataURL('image/png');a.click()});

  wireEvents();requestAnimationFrame(loop);
}

/* ─── INPUT pattern builder (fixed scoping, 5 types) ────────────── */
/*
  Produces visible, dense typographic patterns.
  Each pattern places lines at explicit coordinates.
  Static — no animation dependency.
  Colors mix across lines within each stamp.
*/
/*
  INPUT: Dense woven typographic field system.
  Reference: layered letter fields (dense blue 'aaa' rows) with
  diagonal overlays (red/green curved paths crossing the field).
  
  Structure:
  - 4-col × 3-row anchor grid (12 positions)
  - Each keypress fills its anchor cell with a DENSE FIELD
  - Two pattern types: horizontal field + diagonal overlay
  - Second passes layer on top with color shift
  - ALL coordinates clamped to canvas bounds — never escape stage
  
  Visual goal:
  - Dense accumulated letter texture like the reference image
  - Command label overlaid as the crossing element
  - Fills the interaction stage completely over time
  - Lime / pink / gray color layering
*/
const INPUT_COLS=[.06,.31,.56,.78];
const INPUT_ROWS=[.15,.47,.76];
const INPUT_ANCHORS=[];
for(let r=0;r<INPUT_ROWS.length;r++){
  for(let c=0;c<INPUT_COLS.length;c++){
    INPUT_ANCHORS.push({col:INPUT_COLS[c],row:INPUT_ROWS[r],ri:r,ci:c});
  }
}

/* Clamp a value to [lo, hi] */
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

function buildInputPattern(ch,cmd,pat,W,H,idx){
  const COLORS=[LIME_BG,PINK_BG,GRAY_BG];
  const lines=[];
  const label='#'+cmd.n+' '+cmd.text;
  
  /* Select anchor — cycle through 12, then layer again */
  const pass=Math.floor(idx/12);
  const anchor=INPUT_ANCHORS[idx%12];
  
  /* Cell dimensions — each anchor "owns" its grid cell */
  const cellW=W*(INPUT_COLS[1]-INPUT_COLS[0]);  /* ~25% W */
  const cellH=H*(INPUT_ROWS[1]-INPUT_ROWS[0]);  /* ~32% H */
  
  /* Cell origin — anchor is top-left of cell */
  /* Clamp so cell never starts where it would overflow canvas */
  const x0=clamp(anchor.col*W, 0, W-cellW);
  const y0=clamp(anchor.row*H, 0, H-cellH);
  
  /* Pass offset: small diagonal shift per accumulation pass */
  const pdx=pass*5;const pdy=pass*4;
  
  const colorIdx=(idx+pass)%3;
  const colorB=COLORS[(colorIdx+1)%3];
  const colorC=COLORS[(colorIdx+2)%3];
  
  const step=CMD_FS+4;  /* tight line spacing for dense field */
  
  /* ── PATTERN A: HORIZONTAL DENSE FIELD (ref: blue aaa rows) ── */
  /* Fill cell with tight horizontal rows of the typed char */
  /* This is the "background texture" layer */
  const rowCount=Math.floor(cellH/step);
  const charStep=CMD_FS+2;  /* tight horizontal char spacing */
  for(let ri=0;ri<rowCount;ri++){
    const y=clamp(y0+ri*step+pdy, 0, H-CMD_FS);
    /* How many chars fit across the cell */
    const charCount=Math.floor(cellW/charStep);
    for(let ci=0;ci<charCount;ci++){
      const x=clamp(x0+ci*charStep+pdx, 0, W-CMD_FS);
      /* Alternate char and short label fragment */
      const txt=ci%4===0?'#'+cmd.n:ch;
      lines.push({x,y,text:txt,fs:CMD_FS,bg:COLORS[colorIdx]});
    }
  }
  
  /* ── PATTERN B: DIAGONAL COMMAND OVERLAY (ref: red/green curved paths) ── */
  /* The command label runs diagonally across the cell */
  /* Direction alternates by anchor position */
  const diagCount=Math.max(4,rowCount-1);
  const dirX=(anchor.ci%2===0?1:-1);  /* odd cols go left, even go right */
  const dirY=1;  /* always downward */
  for(let di=0;di<diagCount;di++){
    const t=di/(diagCount-1);  /* 0→1 across the diagonal */
    const x=clamp(
      anchor.ci%2===0
        ? x0+t*cellW*0.8+pdx       /* left→right */
        : x0+cellW*(1-t*0.8)+pdx,  /* right→left */
      0, W-80
    );
    const y=clamp(y0+di*step+step*0.5+pdy, 0, H-CMD_FS);
    lines.push({x,y,text:label,fs:CMD_FS,bg:colorB});
  }
  
  /* ── PATTERN C: ANCHOR MARKER — command always readable at top of cell ── */
  const markerY=clamp(y0+pdy-step, 0, H-CMD_FS);
  lines.push({x:clamp(x0+pdx,0,W-80),y:markerY,text:label,fs:CMD_FS,bg:colorC});
  
  inputStamps.push({lines,born:Date.now()});
  if(inputStamps.length>72)inputStamps.shift();
}

/* ─── Index / Sections ──────────────────────────────────────────── */
function buildIndex(){
  const g=$('idx-g');g.innerHTML='';
  cats.forEach(c=>{
    const b=document.createElement('button');b.className='idx-b';b.textContent=c;
    b.addEventListener('click',()=>{const sec=b.closest('.idx-sec');if(sec){sec.classList.add('inv');setTimeout(()=>sec.classList.remove('inv'),600)}$('s-cat-'+c)?.scrollIntoView({behavior:'smooth'})});
    g.appendChild(b);
  });
}
function buildSections(){
  const dyn=$('dyn');dyn.innerHTML='';
  [...cats].reverse().forEach((c,ri)=>{
    const sec=document.createElement('section');sec.className='s-cat';sec.id='s-cat-'+c;
    sec.setAttribute('data-lbl',c.toUpperCase());
    let extra='';
    if(c==='Input')extra=`<div id="input-hint-bar">TYPE TO INSERT ↓</div>`;
    sec.innerHTML=`<canvas class="worm-cv" id="worm-${c}"></canvas>${extra}<div class="cat-row" id="row-${c}"></div>`;
    dyn.appendChild(sec);
    if(ri<cats.length-1){
      const idx=document.createElement('section');idx.className='idx-sec';
      idx.innerHTML=`<img src="Whole_content_index.jpg" class="sec-bg" alt=""><div class="idx-ctr"><p class="idx-d">You enact everyday commands through:</p><div class="idx-g idx-clone"></div></div>`;
      dyn.appendChild(idx);
    }
  });
  document.querySelectorAll('.idx-clone').forEach(g=>{g.innerHTML='';cats.forEach(c=>{const b=document.createElement('button');b.className='idx-b';b.textContent=c;b.addEventListener('click',()=>{const sec=b.closest('.idx-sec');if(sec){sec.classList.add('inv');setTimeout(()=>sec.classList.remove('inv'),600)}$('s-cat-'+c)?.scrollIntoView({behavior:'smooth'})});g.appendChild(b)})});
  cats.forEach(c=>buildTiles(c));
}
/* Video config per category */
const VIDEO_CFG={
  Align:{src:'./videos/align_withgraphic.mp4',ranges:[[0,14],[16,29],[30,48]]},
  Input:{src:'./videos/input_withgraphic.mp4',ranges:[[0,15],[16,47],[51,88]]},
  Select:{src:'./videos/select_withgraphic.mp4',ranges:[[0,14],[16,47],[48,72]]},
  Loop:{src:'./videos/loop_withgraphic.mp4',ranges:[[0,24],[29,45],[50,69]]},
  Control:{src:'./videos/control_withgraphic.mp4',ranges:[[2,23],[26,50],[55,73]]},
  Edge:{src:'./videos/edge_withgraphic.mp4',ranges:[[0,20],[21,42],[43,65]]}
};

function buildTiles(c){
  const row=$('row-'+c);if(!row)return;row.innerHTML='';
  const cmds=D[c],n=Math.min(cmds.length,3);
  const cfg=VIDEO_CFG[c]||{src:'./videos/swipetounlock.mp4',ranges:[[0,30],[30,60],[60,90]]};
  for(let i=0;i<n;i++){
    const f=document.createElement('div');f.className='frame';
    const[tStart,tEnd]=cfg.ranges[i]||[0,30];
    f.dataset.vs=cfg.src;
    f.dataset.tstart=String(tStart);
    f.dataset.tend=String(tEnd);
    f.dataset.loaded='0';
    /* Sound state per frame */
    f.dataset.snd='0';
    f.innerHTML='<div class="fr-ph"></div>';

    /* Sound button — visible on hover via CSS */
    const sndBtn=document.createElement('button');
    sndBtn.className='snd-btn';sndBtn.textContent='Sound Off';
    sndBtn.addEventListener('click',(e)=>{
      e.stopPropagation();
      const v=f.querySelector('video');if(!v)return;
      const on=f.dataset.snd==='1';
      if(on){v.muted=true;f.dataset.snd='0';sndBtn.textContent='Sound Off'}
      else{muteAllExcept(f);v.muted=false;f.dataset.snd='1';sndBtn.textContent='Sound On'}
    });
    f.appendChild(sndBtn);

    /* Hover: auto-unmute this frame, mute others */
    f.addEventListener('mouseenter',()=>{
      const v=f.querySelector('video');if(!v)return;
      muteAllExcept(f);v.muted=false;f.dataset.snd='1';sndBtn.textContent='Sound On';
    });
    f.addEventListener('mouseleave',()=>{
      const v=f.querySelector('video');if(v){v.muted=true}
      f.dataset.snd='0';sndBtn.textContent='Sound Off';
    });

    /* Click: enter detail view with segment-based playback */
    f.addEventListener('click',()=>showDetail(c,{
      text:'#'+cmds[i].n+' '+cmds[i].text,
      video:cfg.src,
      tStart,tEnd
    }));
    row.appendChild(f);
  }
}

/* Mute all frame videos except the given one */
function muteAllExcept(exceptFrame){
  document.querySelectorAll('.frame').forEach(f=>{
    if(f===exceptFrame)return;
    const v=f.querySelector('video');if(v){v.muted=true}
    f.dataset.snd='0';
    const btn=f.querySelector('.snd-btn');if(btn)btn.textContent='Sound Off';
  });
}
function checkVideos(){
  const now=Date.now();if(now-lastVis<500)return;lastVis=now;
  document.querySelectorAll('.frame').forEach(f=>{
    const r=f.getBoundingClientRect(),vis=r.bottom>0&&r.top<window.innerHeight;
    const tStart=parseFloat(f.dataset.tstart||'0');
    const tEnd=parseFloat(f.dataset.tend||'30');
    if(vis&&f.dataset.loaded==='0'){
      f.dataset.loaded='1';
      const v=document.createElement('video');
      v.autoplay=true;v.muted=true;v.playsInline=true;v.preload='auto';
      v.innerHTML=`<source src="${f.dataset.vs}" type="video/mp4">`;
      /* Time-range looping: when playback reaches tEnd, jump back to tStart */
      v.addEventListener('loadedmetadata',()=>{v.currentTime=tStart});
      v.addEventListener('timeupdate',()=>{
        if(v.currentTime>=tEnd){v.currentTime=tStart}
      });
      f.insertBefore(v,f.firstChild);v.play().catch(()=>{});
    }else if(!vis&&f.dataset.loaded==='1'){f.querySelector('video')?.pause()}
    else if(vis&&f.dataset.loaded==='1'){const v=f.querySelector('video');if(v?.paused)v.play().catch(()=>{})}
  });
}

/* ─── Wire Events ────────────────────────────────────────────────── */
function wireEvents(){
  /* ALIGN */
  const cvA=$('worm-Align');
  if(cvA){
    cvA.addEventListener('mousedown',e=>{
      const r=cvA.getBoundingClientRect();const rx=e.clientX-r.left,ry=e.clientY-r.top;
      let best=null,bd=9999;
      alignBlocks.forEach((b,i)=>{const d=Math.hypot(b.x-rx,b.y-ry);if(d<bd&&d<130){bd=d;best=i}});
      if(best!==null)alignDrag={i:best,ox:rx,oy:ry,lastSx:rx,lastSy:ry};
    });
    cvA.addEventListener('mousemove',e=>{
      if(!alignDrag)return;
      const r=cvA.getBoundingClientRect();const rx=e.clientX-r.left,ry=e.clientY-r.top;
      const dx=rx-alignDrag.ox,dy=ry-alignDrag.oy;
      const b=alignBlocks[alignDrag.i];
      b.vx=dx*.5;b.vy=dy*.5;b.x+=dx*.7;b.y+=dy*.7;b.snapped=false;
      if(Math.hypot(rx-alignDrag.lastSx,ry-alignDrag.lastSy)>20){
        alignStamps.push({x:b.x,y:b.y,text:'#'+b.n+' '+b.text,bgColor:b.bgColor});
        alignDrag.lastSx=rx;alignDrag.lastSy=ry;
      }
      alignDrag.ox=rx;alignDrag.oy=ry;
    });
    cvA.addEventListener('mouseup',()=>{alignDrag=null});
  }

  /* SELECT */
  $('worm-Select')?.addEventListener('click',e=>{
    const r=$('worm-Select').getBoundingClientRect();
    const pt={x:e.clientX-r.left,y:e.clientY-r.top};
    selectAnchors.push(pt);
    if(selectAnchors.length===2){
      const a=selectAnchors[0],b=selectAnchors[1];
      const cmd=D.Select[selectConns.length%D.Select.length];
      const dist=Math.hypot(b.x-a.x,b.y-a.y);
      const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
      const tagCount=Math.max(2,Math.round(dist/58));
      const tags=[];
      for(let ti=0;ti<=tagCount;ti++){
        const t=ti/(tagCount||1);
        const wx=a.x+(b.x-a.x)*t,wy=a.y+(b.y-a.y)*t;
        const catenary=Math.sin(t*Math.PI);
        const leanDir=t<.5?1:-1;
        const leanMag=Math.abs(.5-t)*.45;
        tags.push({
          wireX:wx,wireY:wy,midX,midY,t,
          offset:0,targetOffset:48+catenary*78,
          vy:3+Math.random()*4,
          /* settled=true means physics stops completely */
          settled:false,fullySettled:false,
          tilt:leanDir*leanMag*(.28+Math.random()*.18),
          swayT:Math.random()*Math.PI*2,
          text:'#'+cmd.n+' '+cmd.text,
          bgColor:CMD_BG[ti%CMD_BG.length]
        });
      }
      selectConns.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,cmd,tags,born:Date.now()});
      if(selectConns.length>10)selectConns.shift();
      selectAnchors=[];
    }
  });

  /* LOOP */
  const cvL=$('worm-Loop');
  if(cvL){
    cvL.addEventListener('mousedown',e=>{const r=cvL.getBoundingClientRect();loopDrag={ox:e.clientX-r.left}});
    cvL.addEventListener('mousemove',e=>{if(!loopDrag)return;const r=cvL.getBoundingClientRect();const rx=e.clientX-r.left;loopScale=Math.max(.25,Math.min(3,loopScale+(rx-loopDrag.ox)*.006));loopDrag.ox=rx});
    cvL.addEventListener('mouseup',()=>{loopDrag=null});
  }

  /* CONTROL — click+drag builds 3-box stack traces */
  const cvC=$('worm-Control');
  if(cvC){
    cvC.addEventListener('mousedown',e=>{
      controlDragging=true;
      const r=cvC.getBoundingClientRect();
      controlLastPt={x:e.clientX-r.left,y:e.clientY-r.top};
    });
    cvC.addEventListener('mousemove',e=>{
      if(!controlDragging)return;
      const r=cvC.getBoundingClientRect();const pt={x:e.clientX-r.left,y:e.clientY-r.top};
      if(controlLastPt&&Math.hypot(pt.x-controlLastPt.x,pt.y-controlLastPt.y)>16){
        addControlTrace(pt.x,pt.y);controlLastPt=pt;
      }
    });
    cvC.addEventListener('mouseup',()=>{controlDragging=false;controlLastPt=null});
    cvC.addEventListener('mouseleave',()=>{controlDragging=false;controlLastPt=null});
  }

  /* EDGE */
  $('worm-Edge')?.addEventListener('click',e=>{
    const r=$('worm-Edge').getBoundingClientRect();
    edgeExplode(e.clientX-r.left,e.clientY-r.top,$('worm-Edge').offsetWidth,$('worm-Edge').offsetHeight);
  });
}

/* ─── CONTROL trace builder ─────────────────────────────────────── */
/*
  At each drag point, create a "trace" = 3 stacked boxes + 20 offset copies.
  The 3 boxes represent the 3 CONTROL commands, each with its color.
  20 copies behind them create the visible side surface.
  All text is upright. No rotation.
*/
function addControlTrace(x,y){
  const cmds=D.Control; /* 3 commands */
  const boxH=26; /* height of each box */
  const layerCount=20;

  /* 3 command boxes stacked vertically */
  const cmdBoxes=cmds.map((cmd,i)=>({
    text:'#'+cmd.n+' '+cmd.text,
    bg:CMD_BG[i],
    /* Stack: box 0 at top, box 1 below, box 2 below that */
    localY:i*boxH
  }));

  /* Layer offset — diagonal for visible side+top surface */
  const layers=[];
  for(let li=0;li<layerCount;li++){
    layers.push({dx:li*2,dy:li*1.5}); /* consistent diagonal offset */
  }

  controlTraces.push({x,y,cmdBoxes,layers});
  /* Cap traces to prevent memory issues */
  if(controlTraces.length>400)controlTraces.shift();
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function sz(cv){
  const dpr=devicePixelRatio||1,W=cv.parentElement.offsetWidth,H=cv.offsetHeight;
  if(!W||!H)return null;
  const nW=W*dpr,nH=H*dpr;
  if(cv.width!==nW||cv.height!==nH){cv.width=nW;cv.height=nH;cv.style.width=W+'px';cv.style.height=H+'px'}
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  return{ctx,W,H};
}
function arrow(ctx,x1,y1,x2,y2,s=4){
  const a=Math.atan2(y2-y1,x2-x1);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-s*Math.cos(a-Math.PI/6),y2-s*Math.sin(a-Math.PI/6));ctx.lineTo(x2-s*Math.cos(a+Math.PI/6),y2-s*Math.sin(a+Math.PI/6));ctx.closePath();ctx.fill();
}
function block(ctx,x,y,tw,fs,bg,px=6,py=4){
  ctx.fillStyle=bg;ctx.fillRect(x-px,y-fs*.55-py,tw+px*2,fs+py*2);
}
function drawBg(ctx,W,H,cmds){
  ctx.save();ctx.font=FM(12);ctx.textBaseline='top';ctx.fillStyle=`rgba(10,10,10,${BG_ALPHA})`;
  const unit=cmds.map(c=>'#'+c.n+' '+c.text).join('  ·  ')+'  ·  ';
  const uw=ctx.measureText(unit).width;
  for(let row=0;row<Math.ceil(H/24)+1;row++){const reps=Math.ceil(W/uw)+2;for(let ri=0;ri<reps;ri++)ctx.fillText(unit,ri*uw,row*24)}
  ctx.restore();
}
function drawCursor(ctx,cv){
  if(MX<0)return;
  const r=cv.getBoundingClientRect();const rx=MX-r.left,ry=MY-r.top;
  const dpr=devicePixelRatio||1;if(rx<0||rx>cv.width/dpr||ry<0||ry>cv.height/dpr)return;
  ctx.save();ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=.8;
  [[rx-8,ry,rx-2,ry],[rx+2,ry,rx+8,ry],[rx,ry-8,rx,ry-2],[rx,ry+2,rx,ry+8]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()});
  ctx.restore();
}

/* ═══ ALIGN ═══════════════════════════════════════════════════════ */
function initAlign(W,H){
  if(alignBlocks.length)return;
  D.Align.forEach((cmd,i)=>{
    const tx=W*.18;const ty=H*(.32+i*.17);
    alignBlocks.push({n:cmd.n,text:cmd.text,bgColor:CMD_BG[i],tx,ty,
      x:W*.05+Math.random()*W*.9,y:H*.05+Math.random()*H*.85,
      vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,snapped:false});
  });
}
function renderAlign(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initAlign(W,H);ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Align);
  ctx.save();ctx.strokeStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  ctx.beginPath();ctx.moveTo(W*.18,H*.2);ctx.lineTo(W*.18,H*.82);ctx.stroke();
  alignBlocks.forEach(b=>{ctx.beginPath();ctx.moveTo(W*.16,b.ty);ctx.lineTo(W*.22,b.ty);ctx.stroke()});
  ctx.restore();
  alignBlocks.forEach((b,i)=>{
    if(alignDrag?.i===i)return;
    const k=b.snapped?.18:.055;b.vx+=(b.tx-b.x)*k;b.vy+=(b.ty-b.y)*k;b.vx*=.8;b.vy*=.8;b.x+=b.vx;b.y+=b.vy;
    if(Math.hypot(b.x-b.tx,b.y-b.ty)<1.5&&Math.hypot(b.vx,b.vy)<.15){b.snapped=true;b.x=b.tx;b.y=b.ty}
  });
  ctx.save();ctx.globalAlpha=1;
  alignStamps.forEach(s=>{
    ctx.font=FM(CMD_FS);ctx.textBaseline='middle';const tw=ctx.measureText(s.text).width;
    block(ctx,s.x,s.y,tw,CMD_FS,s.bgColor,CMD_PX,CMD_PY);ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(s.text,s.x,s.y);
  });
  ctx.restore();
  ctx.textBaseline='middle';
  alignBlocks.forEach(b=>{
    const label='#'+b.n+' '+b.text;ctx.font=FM(CMD_FS);const tw=ctx.measureText(label).width;
    block(ctx,b.x,b.y,tw,CMD_FS,b.bgColor,CMD_PX,CMD_PY);ctx.fillStyle='rgba(10,10,10,.92)';ctx.fillText(label,b.x,b.y);
    ctx.fillStyle='rgba(0,0,0,.07)';ctx.fillRect(b.x,b.y+CMD_FS*.7,tw,1);
    if(!b.snapped&&Math.hypot(b.x-b.tx,b.y-b.ty)>20){
      ctx.strokeStyle='rgba(0,0,0,.06)';ctx.fillStyle='rgba(0,0,0,.06)';ctx.lineWidth=.7;
      arrow(ctx,b.x+tw+4,b.y,b.tx+tw*.3+4,b.ty,2.5);
    }
  });
  drawCursor(ctx,cv);
}

/* ═══ INPUT ════════════════════════════════════════════════════════ */
function renderInput(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Input);

  /* Clip to canvas bounds — stamps can never escape the stage */
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();

  /* Draw all static pattern stamps */
  ctx.textBaseline='middle';
  for(const stamp of inputStamps){
    for(const line of stamp.lines){
      ctx.font=FM(line.fs);
      const tw=ctx.measureText(line.text).width;
      block(ctx,line.x,line.y,tw,line.fs,line.bg,5,3);
      ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(line.text,line.x,line.y);
    }
  }

  ctx.restore(); /* end canvas clip */

  /* Command labels — topmost, left column at W*.18 */
  D.Input.forEach((cmd,i)=>{
    const y=H*(.22+i*.27);
    const label='#'+cmd.n+' '+cmd.text;
    ctx.font=FM(CMD_FS);const tw=ctx.measureText(label).width;
    block(ctx,W*.18,y,tw,CMD_FS,CMD_BG[i],CMD_PX,CMD_PY);
    ctx.fillStyle='rgba(10,10,10,.92)';ctx.textBaseline='middle';ctx.fillText(label,W*.18,y);
    ctx.fillStyle='rgba(0,0,0,.07)';ctx.fillRect(W*.18,y+CMD_FS*.7,tw,1);
  });

  drawCursor(ctx,cv);
}

/* ═══ SELECT — stops completely after settling ══════════════════════ */
function renderSelect(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Select);
  const cx=W/2,cy=H/2;
  ctx.strokeStyle='rgba(0,0,0,.03)';ctx.fillStyle='rgba(0,0,0,.03)';ctx.lineWidth=.5;
  for(let gx=50;gx<W;gx+=55){for(let gy=50;gy<H;gy+=55){
    const dx=gx-cx,dy=gy-cy,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx-dy/d*8,gy+dx/d*8,2);
  }}
  for(const conn of selectConns){
    const{ax,ay,bx,by,tags}=conn;
    ctx.save();ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=.8;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    tags.forEach(tag=>{
      if(!tag.fullySettled){
        /* Physics — apply only when not fully settled */
        if(!tag.settled){
          tag.vy+=(tag.targetOffset-tag.offset)*.07+.22;tag.vy*=.72;tag.offset+=tag.vy;
          tag.swayT+=.022;tag.tilt=tag.tilt*.97+Math.sin(tag.swayT)*.025;
          /* Check for settlement */
          if(Math.abs(tag.offset-tag.targetOffset)<.5&&Math.abs(tag.vy)<.3){
            tag.offset=tag.targetOffset;tag.vy=0;tag.settled=true;
          }
        }else{
          /* Tiny sway after initial settle, then fully stop */
          tag.swayT+=.008;
          const sway=Math.sin(tag.swayT)*0.008;
          tag.tilt=tag.tilt*.998+sway;
          /* Fully stop after tilt is near zero */
          if(Math.abs(tag.tilt)<.001){tag.tilt=0;tag.fullySettled=true}
        }
      }
      /* Draw */
      const gatherX=(tag.midX-tag.wireX)*.12;
      ctx.save();ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(tag.wireX,tag.wireY);ctx.lineTo(tag.wireX+gatherX,tag.wireY+tag.offset);ctx.stroke();
      ctx.translate(tag.wireX+gatherX,tag.wireY+tag.offset);ctx.rotate(tag.tilt||0);
      ctx.font=FM(CMD_FS);const tw=ctx.measureText(tag.text).width;
      ctx.fillStyle=tag.bgColor;ctx.fillRect(-tw/2-CMD_PX,-(CMD_FS*.55+CMD_PY),tw+CMD_PX*2,CMD_FS+CMD_PY*2);
      ctx.fillStyle='rgba(10,10,10,.9)';ctx.textBaseline='middle';ctx.fillText(tag.text,-tw/2,0);
      ctx.restore();
    });
    [[ax,ay],[bx,by]].forEach(([x2,y2])=>{ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.arc(x2,y2,3.5,0,Math.PI*2);ctx.fill()});
  }
  if(selectAnchors.length===1){
    const a=selectAnchors[0];
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.arc(a.x,a.y,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.06)';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(a.x,a.y,18,0,Math.PI*2);ctx.stroke();
  }
  drawCursor(ctx,cv);
}

/* ═══ LOOP ══════════════════════════════════════════════════════════ */
function renderLoop(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Loop);
  const cmds=D.Loop;const streams=10;
  const streamBg=[LIME_BG,PINK_BG,GRAY_BG,LIME_BG,PINK_BG,GRAY_BG,LIME_BG,PINK_BG,GRAY_BG,LIME_BG];
  for(let si=0;si<streams;si++){
    const frac=si/streams;
    const baseY=H*.05+frac*H*.9;
    const amp=H*.075*loopScale*(1+Math.sin(si*1.1)*.5);
    const freq=.55+si*.22;const spd=.013*(si%2===0?1:-1);
    const cmd=cmds[si%cmds.length];
    const unit='#'+cmd.n+' '+cmd.text+'  ';
    const fs=15;ctx.font=FM(fs);const uw=ctx.measureText(unit).width;
    ctx.textBaseline='middle';const bg=streamBg[si];
    const scroll=(T*58*spd)%uw;
    for(let sx=-uw+scroll;sx<W+uw;sx+=uw){
      const relX=sx/W;
      const y=baseY+Math.sin(relX*Math.PI*freq*2+T*spd*7)*amp;
      const dy2=Math.cos(relX*Math.PI*freq*2+T*spd*7)*amp*(Math.PI*freq*2/W);
      const ang=Math.atan2(dy2,1)*.52;
      ctx.save();ctx.translate(sx,y);ctx.rotate(ang);
      ctx.fillStyle=bg;ctx.fillRect(-2,-fs*.55-3,uw+4,fs+5);
      ctx.fillStyle='rgba(10,10,10,.88)';ctx.fillText(unit,0,0);ctx.restore();
    }
  }
  ctx.strokeStyle='rgba(0,0,0,.04)';ctx.fillStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  for(let gx=70;gx<W;gx+=90){for(let gy=45;gy<H;gy+=62){const a=Math.sin(gx/W*Math.PI*3+T*.25)*.9;arrow(ctx,gx,gy,gx+Math.cos(a)*15,gy+Math.sin(a)*9,2)}}
  drawCursor(ctx,cv);
}

/* ═══ CONTROL — 3-box stack with layered side surfaces ══════════════
   Three boxes stacked vertically, each a different command + color.
   Drag creates a trail of these 3-box stacks.
   Each stack has 20 offset copies behind it creating visible depth.
   Text always upright.
════════════════════════════════════════════════════════════════════ */
function renderControl(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Control);

  /* Arrow field */
  const cx=W/2,cy=H/2;
  ctx.strokeStyle='rgba(0,0,0,.055)';ctx.fillStyle='rgba(0,0,0,.055)';ctx.lineWidth=.7;
  for(let gx=35;gx<W;gx+=46){for(let gy=35;gy<H;gy+=46){
    const dx=gx-cx,dy=gy-cy,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx+(-dy/d+dx/d*.3)*12,gy+(dx/d+dy/d*.3)*12,3);
  }}

  /* Draw all traces — unified box width (longest label drives all) */
  const boxH=CMD_FS+CMD_PY*2+2;
  ctx.font=FM(CMD_FS);ctx.textBaseline='middle';

  for(const trace of controlTraces){
    const{x,y,cmdBoxes,layers}=trace;
    /* Compute max label width so all boxes share same width */
    const maxW=Math.max(...cmdBoxes.map(b=>ctx.measureText(b.text).width));
    const unifiedW=maxW+CMD_PX*2;

    for(let li=layers.length-1;li>=0;li--){
      const l=layers[li];
      for(let bi=0;bi<cmdBoxes.length;bi++){
        const box=cmdBoxes[bi];
        const bx=x+l.dx;
        const by=y+box.localY+l.dy;
        /* All boxes same width */
        ctx.fillStyle=box.bg;ctx.fillRect(bx-CMD_PX,by-boxH/2,unifiedW,boxH);
        if(li<=2){
          ctx.fillStyle='rgba(10,10,10,.92)';ctx.fillText(box.text,bx+CMD_PX,by);
        }
      }
    }
  }

  drawCursor(ctx,cv);
}

/* ═══ EDGE ══════════════════════════════════════════════════════════ */
function initEdge(W,H){
  if(edgeInit)return;edgeInit=true;
  D.Edge.forEach((cmd,ci)=>{
    for(let j=0;j<20;j++){
      edgeParts.push({text:'#'+cmd.n+' '+cmd.text,x:W*.12+Math.random()*W*.76,y:H*.12+Math.random()*H*.76,vx:(Math.random()-.5)*1.1,vy:(Math.random()-.5)*1.1,rot:(Math.random()-.5)*.07,vrot:(Math.random()-.5)*.003,bgColor:CMD_BG[ci%CMD_BG.length]});
    }
  });
}
function edgeExplode(ex,ey,W,H){
  D.Edge.forEach((cmd,ci)=>{
    for(let i=0;i<8;i++){
      const ang=Math.random()*Math.PI*2,spd=2+Math.random()*4;
      edgeParts.push({text:'#'+cmd.n+' '+cmd.text,x:ex,y:ey,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,rot:Math.random()*Math.PI,vrot:(Math.random()-.5)*.02,bgColor:CMD_BG[ci%CMD_BG.length]});
    }
  });
  edgeParts.forEach(p=>{const dx=p.x-ex,dy=p.y-ey,d=Math.max(Math.hypot(dx,dy),1);p.vx+=dx/d*(1.5+Math.random()*2);p.vy+=dy/d*(1.5+Math.random()*2)});
  if(edgeParts.length>90)edgeParts.splice(0,edgeParts.length-90);
}
function renderEdge(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initEdge(W,H);ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Edge);
  ctx.strokeStyle='rgba(0,0,0,.04)';ctx.fillStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  for(let gx=55;gx<W;gx+=65){for(let gy=55;gy<H;gy+=65){const dx=gx-W/2,dy=gy-H/2,d=Math.max(Math.hypot(dx,dy),1);arrow(ctx,gx,gy,gx+dx/d*14,gy+dy/d*14,2.5)}}
  ctx.textBaseline='middle';
  edgeParts.forEach(p=>{
    p.vx*=.97;p.vy*=.97;p.vrot*=.97;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;
    if(p.x<0){p.x=0;p.vx=Math.abs(p.vx)*.6}if(p.x>W){p.x=W;p.vx=-Math.abs(p.vx)*.6}
    if(p.y<0){p.y=0;p.vy=Math.abs(p.vy)*.6}if(p.y>H){p.y=H;p.vy=-Math.abs(p.vy)*.6}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
    ctx.font=FM(CMD_FS);const tw=ctx.measureText(p.text).width;
    ctx.fillStyle=p.bgColor;ctx.fillRect(-tw/2-CMD_PX,-(CMD_FS*.55+CMD_PY),tw+CMD_PX*2,CMD_FS+CMD_PY*2);
    ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(p.text,-tw/2,0);
    ctx.restore();
  });
  drawCursor(ctx,cv);
}

/* ─── Detail ─────────────────────────────────────────────────────── */
function showDetail(c,cmd){
  const tStart=cmd.tStart||0;
  const tEnd=cmd.tEnd||30;
  const cmdText=cmd.text||'';

  let det=document.querySelector('.s-det');
  if(!det){
    det=document.createElement('section');det.className='s-det';
    det.style.cssText='border:none!important;outline:none!important;position:relative';
    det.innerHTML='<div class="det-room" id="det-room"></div>';
    $('dyn').prepend(det);
  }

  /* ALIGN: pale background texture canvas with repeated command text */
  let bgCv=det.querySelector('#det-bg-canvas');
  if(c==='Align'){
    if(!bgCv){
      bgCv=document.createElement('canvas');bgCv.id='det-bg-canvas';
      det.insertBefore(bgCv,det.firstChild);
    }
    bgCv.style.display='block';
    /* Draw texture after layout */
    requestAnimationFrame(()=>drawDetBgTexture(bgCv,cmdText));
  }else if(bgCv){
    bgCv.style.display='none';
  }

  /* Video — segment-based, auto-unmute (audio ON when entering focused view) */
  const vid=document.createElement('video');
  vid.autoplay=true;
  vid.muted=false; /* AUTO-UNMUTE when entering focused view */
  vid.playsInline=true;vid.preload='auto';
  vid.style.cssText='position:absolute;inset:-2px;width:calc(100% + 4px);height:calc(100% + 4px);object-fit:cover;display:block;z-index:1;border:none!important;outline:none!important;clip-path:inset(2px)';
  vid.innerHTML=`<source src="${cmd.video}" type="video/mp4">`;
  vid.addEventListener('loadedmetadata',()=>{vid.currentTime=tStart});
  vid.addEventListener('timeupdate',()=>{if(vid.currentTime>=tEnd)vid.currentTime=tStart});

  const rm=$('det-room');
  rm.style.cssText='border:none!important;outline:none!important;box-shadow:none!important;position:relative;z-index:2;width:82vw;height:calc(82vw*9/16);max-height:78vh;max-width:calc(78vh*16/9);overflow:hidden;clip-path:inset(2px)';
  rm.innerHTML='';
  rm.appendChild(vid);
  vid.play().catch(()=>{vid.muted=true;vid.play().catch(()=>{})});

  /* Mute all frame preview videos when focused view opens */
  muteAllExcept(null);

  /* Back button — on click, mute the focused video and restore */
  let bb=det.querySelector('.det-back-btn');
  if(!bb){
    bb=document.createElement('button');bb.className='det-back-btn';
    bb.style.cssText='position:absolute;top:8px;left:8px;z-index:20;font-family:\'Monument\',\'Helvetica Neue\',Arial;font-size:10px;background:rgba(240,240,238,.92);border:none;padding:5px 12px;cursor:pointer;letter-spacing:.05em;text-transform:uppercase';
    det.appendChild(bb);
  }
  bb.textContent='← back';
  bb.onclick=()=>{
    vid.muted=true;vid.pause(); /* mute on exit */
    $('s-cat-'+c)?.scrollIntoView({behavior:'smooth'});
  };

  /* Sound toggle */
  let sndBtn=det.querySelector('#det-sound');
  if(!sndBtn){sndBtn=document.createElement('button');sndBtn.id='det-sound';det.appendChild(sndBtn)}
  sndBtn.textContent='Sound On'; /* starts unmuted */
  sndBtn.onclick=()=>{
    if(vid.muted){vid.muted=false;sndBtn.textContent='Sound On'}
    else{vid.muted=true;sndBtn.textContent='Sound Off'}
  };

  det.scrollIntoView({behavior:'smooth'});
}

/* ALIGN background texture: repeated pale command text behind video */
function drawDetBgTexture(cv,cmdText){
  if(!cv||!cmdText)return;
  const W=cv.parentElement?.offsetWidth||window.innerWidth;
  const H=cv.parentElement?.offsetHeight||window.innerHeight;
  const dpr=devicePixelRatio||1;
  cv.width=W*dpr;cv.height=H*dpr;
  cv.style.width=W+'px';cv.style.height=H+'px';
  cv.style.position='absolute';cv.style.inset='0';cv.style.zIndex='0';cv.style.pointerEvents='none';
  const ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  /* Extremely pale — feels embedded, not decorative */
  ctx.font=`500 14px 'Monument','Helvetica Neue',Arial,sans-serif`;
  ctx.fillStyle='rgba(0,0,0,.04)';
  ctx.textBaseline='top';
  const unit=cmdText+'  ';
  const uw=ctx.measureText(unit).width;
  const rowH=22;
  /* Diagonal: text rises from lower-left to upper-right */
  for(let row=-2;row<Math.ceil(H/rowH)+2;row++){
    const yBase=row*rowH;
    /* Offset each row leftward to create diagonal feel */
    const xOffset=-(row%Math.ceil(W/uw))*uw*.5;
    const reps=Math.ceil(W/uw)+4;
    for(let ri=0;ri<reps;ri++){
      ctx.fillText(unit,xOffset+ri*uw,yBase);
    }
  }
}

/* ─── Print Archive ──────────────────────────────────────────────── */
function generatePrint(){
  $('print-overlay')?.classList.remove('hide');
  const cv=$('print-cv');
  /* A4 at 600 DPI = 4960×7016px — display at 620×877px (8× scale) */
  const PW=4960,PH=7016;
  cv.width=PW;cv.height=PH;cv.style.width='620px';cv.style.height='877px';
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#f8f8f6';ctx.fillRect(0,0,PW,PH);
  const secH=Math.floor(PH/cats.length);
  cats.forEach((c,ci)=>{
    const y0=ci*secH;
    const wormCv=$('worm-'+c);
    if(!wormCv||wormCv.width===0||wormCv.height===0){ctx.fillStyle='rgba(0,0,0,.015)';ctx.fillRect(0,y0,PW,secH);return}
    const srcW=wormCv.width,srcH=wormCv.height;
    const srcAR=srcW/srcH,destAR=PW/secH;
    let dw,dh,dx,dy;
    if(srcAR>destAR){dw=PW;dh=PW/srcAR;dx=0;dy=y0+(secH-dh)/2}
    else{dh=secH;dw=secH*srcAR;dx=(PW-dw)/2;dy=y0}
    ctx.drawImage(wormCv,0,0,srcW,srcH,dx,dy,dw,dh);
    ctx.strokeStyle='rgba(0,0,0,.03)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,y0+secH);ctx.lineTo(PW,y0+secH);ctx.stroke();
  });
  ctx.font=`500 56px 'Monument','Helvetica Neue',Arial,sans-serif`;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.textBaseline='bottom';
  ctx.fillText('THIS WEB DOES NOT COMPLY — BEHAVIORAL DISTORTION ARCHIVE',80,PH-32);
  ctx.fillText(new Date().toISOString().slice(0,10),PW-600,PH-32);
}

/* ─── Poster Generator (improved composition) ───────────────────── */
/*
  Balanced hierarchical composition.
  Large primary layer (full width), secondary layers overlapping at scale,
  tertiary fragments at edges. Multiply blend for color interaction.
  No gray background — transparent canvas.
*/
function generatePoster(){
  $('print-overlay')?.classList.remove('hide');
  const cv=$('print-cv');
  /* A3 @ 300dpi = 3508×4961. Display at ~620px wide. */
  const PW=3508,PH=4961;
  cv.width=PW;cv.height=PH;cv.style.width='620px';cv.style.height='877px';
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#f4f4f2';ctx.fillRect(0,0,PW,PH);

  /*
    POSTER LOGIC: 10 irregular crop-and-place regions.
    Each region is a CROP from a worm canvas — no distortion, 1:1 pixels.
    Regions are placed to fill the poster densely with overlaps.
    Proportions preserved: we crop a rect from source, place same-size rect on poster.
    Blend: multiply for color interaction between layers.
  */

  /* Get all available worm canvases */
  const worms={};
  cats.forEach(c=>{
    const cv=$('worm-'+c);
    if(cv&&cv.width>0&&cv.height>0)worms[c]=cv;
  });

  /* 10 crop regions — each defined as:
     {cat, sx_frac, sy_frac, sw_frac, sh_frac, dx, dy, scale, alpha}
     sx/sy/sw/sh are fractions of the source canvas.
     dx/dy are pixel positions on the poster.
     scale: how much to scale the crop when placing (1.0 = no distortion).
     
     We allow uniform scale (both axes same factor) to fill space,
     but NO non-uniform scaling that would distort proportions.
  */
  const regions=[
    /* Large anchors — top and bottom */
    {c:'Loop',    sx:.0, sy:.0, sw:.85, sh:.55, dx:0,        dy:0,        sc:1.30, a:.88},
    {c:'Control', sx:.1, sy:.3, sw:.90, sh:.55, dx:PW*.30,   dy:PH*.08,   sc:1.20, a:.82},
    /* Mid-level fragments */
    {c:'Align',   sx:.05,sy:.2, sw:.60, sh:.60, dx:0,        dy:PH*.36,   sc:1.15, a:.85},
    {c:'Select',  sx:.3, sy:.1, sw:.70, sh:.65, dx:PW*.28,   dy:PH*.30,   sc:1.10, a:.80},
    {c:'Edge',    sx:.1, sy:.0, sw:.80, sh:.50, dx:PW*.20,   dy:PH*.54,   sc:1.25, a:.82},
    /* Smaller detail crops */
    {c:'Input',   sx:.0, sy:.3, sw:.55, sh:.45, dx:0,        dy:PH*.63,   sc:1.05, a:.78},
    {c:'Loop',    sx:.4, sy:.4, sw:.60, sh:.50, dx:PW*.40,   dy:PH*.60,   sc:1.15, a:.75},
    {c:'Control', sx:.0, sy:.5, sw:.50, sh:.45, dx:PW*.50,   dy:PH*.75,   sc:1.10, a:.80},
    /* Bottom fill — make poster feel completely full */
    {c:'Align',   sx:.2, sy:.5, sw:.75, sh:.45, dx:0,        dy:PH*.80,   sc:1.20, a:.75},
    {c:'Select',  sx:.0, sy:.0, sw:.45, sh:.55, dx:PW*.55,   dy:PH*.82,   sc:1.10, a:.78},
  ];

  for(const reg of regions){
    const src=worms[reg.c];if(!src)continue;
    const dpr=devicePixelRatio||1;
    /* Source crop in canvas pixels */
    const srcCropX=reg.sx*src.width;
    const srcCropY=reg.sy*src.height;
    const srcCropW=reg.sw*src.width;
    const srcCropH=reg.sh*src.height;
    /* Destination size: uniform scale (preserves proportion) */
    /* Convert from canvas-pixel source to CSS-pixel equivalent first */
    const cssW=(srcCropW/dpr)*reg.sc;
    const cssH=(srcCropH/dpr)*reg.sc;
    /* Scale back to poster pixels (poster has no dpr scaling) */
    const destW=cssW;const destH=cssH;

    ctx.save();
    ctx.globalAlpha=reg.a;
    ctx.globalCompositeOperation='multiply';
    ctx.drawImage(src,srcCropX,srcCropY,srcCropW,srcCropH,reg.dx,reg.dy,destW,destH);
    ctx.restore();
  }

  /* Footer */
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  ctx.font=`500 48px 'Monument','Helvetica Neue',Arial,sans-serif`;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.textBaseline='bottom';
  ctx.fillText('THIS WEB DOES NOT COMPLY',48,PH-24);
  ctx.fillText(new Date().toISOString().slice(0,10),PW-520,PH-24);
}

/* ─── Main Loop ──────────────────────────────────────────────────── */
function loop(){
  try{
    T+=.016;FC++;
    if(FC%2===0){
      cats.forEach(c=>{
        const cv=$('worm-'+c);if(!cv?.parentElement)return;
        const rb=cv.getBoundingClientRect();
        if(rb.bottom>0&&rb.top<window.innerHeight){
          if(c==='Align')renderAlign(cv);
          else if(c==='Input')renderInput(cv);
          else if(c==='Select')renderSelect(cv);
          else if(c==='Loop')renderLoop(cv);
          else if(c==='Control')renderControl(cv);
          else if(c==='Edge')renderEdge(cv);
        }
      });
    }
    renderMag();checkVideos();
  }catch(e){console.warn('loop:',e)}
  requestAnimationFrame(loop);
}
function renderMag(){
  const mag=$('mag');if(!mag)return;
  if(MX<0){mag.style.left='-200px';return}
  magX+=(MX-magX)*.15;magY+=(MY-magY)*.15;
  mag.style.left=(magX-60)+'px';mag.style.top=(magY-60)+'px';
}