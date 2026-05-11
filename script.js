/* ═══════════════════════════════════════════════════════════════════
   THIS WEB DOES NOT COMPLY — v15 (refinement pass)
   Surgical changes only — structure preserved.

   ALIGN:
     - Commands lifted higher (rows ~.18 / .30 / .42 instead of .32/.49/.66)
     - Interaction draw range expanded (drag farther outward)
   INPUT:
     - Pattern grid raised — third row no longer collides with video row
     - Rows now .12 / .30 / .48 (was .16/.45/.74)
     - "Type to Insert" label uses CMD_FS / Monument styling (in CSS)
   LOOP:
     - Bottom arrow grid removed
   CONTROL:
     - INITIAL state: clean horizontal alignment of the 3 boxes
       (a calm "rest row" rendered before any interaction)
     - After interaction: existing chaotic layered stacks
     - All graphics clamped above video row
   EDGE:
     - Particles accumulate (no aggressive shrinking of array)
     - Slower decay → traces remain and build
     - Clamped above the video row
   DETAIL VIEW:
     - Back, Sound, STOP grouped in a single .det-ui-cluster (bottom-right)
     - Global floating STOP hidden while detail is open (body.detail-open)
   STOP BUTTON: now pale-gray (handled in CSS .sys-btn)
   CURSOR: larger + thicker outlined circle (handled in CSS #mag)
   VIDEO LIME: unified filter across all three panels (CSS)
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
const BG_ALPHA=0.028;
const FM=s=>`500 ${s}px 'Monument','Helvetica Neue',Arial,sans-serif`;
const CMD_FS=13;const CMD_PX=6;const CMD_PY=4;

/* The video row height ratio is calc(30vw*9/16) in CSS; mirror here.
   Use this when clamping graphics so they don't overlap the video row. */
const VIDEO_ROW_FRAC=(30/100)*(9/16); /* fraction of viewport WIDTH used as height */
function videoRowHeight(){
  return window.innerWidth*VIDEO_ROW_FRAC;
}
/* Returns Y coordinate (within a worm canvas) of the top of the video row.
   Everything above this Y is safe stage space. */
function safeStageBottom(cvH){
  /* worm canvas is full-section; video row bottoms at section bottom */
  const vh=videoRowHeight();
  /* leave a tiny breathing strip of 6px above the row */
  return Math.max(40, cvH - vh - 6);
}

const $=id=>document.getElementById(id);
let T=0,FC=0,MX=-1,MY=-1,magX=-200,magY=-200;
let FROZEN=false;

/* ALIGN */
const alignBlocks=[];
let alignDrag=null;
const alignStamps=[];

/* INPUT */
const inputStamps=[];
let inputCount=0;

/* SELECT */
let selectAnchors=[];
const selectConns=[];

/* LOOP */
let loopScale=1.0,loopDrag=null;

/* CONTROL */
const controlTraces=[];
let controlDragging=false,controlLastPt=null;
let controlInteracted=false; /* NEW: tracks first user interaction for calm→chaotic transition */

/* EDGE */
const edgeParts=[];
let edgeInit=false;
let lastVis=0;

/* ─── Loading ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  const strip=$('ld-strip'),logo=$('ld-logo'),pct=$('ld-pct'),ldr=$('loader');
  new Image().src='The_first_image_of_the_website_zoom_in.jpg';
  setTimeout(()=>{if(logo)logo.classList.add('vis')},400);
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
    let cmdIdx=inputCount%D.Input.length;
    if(numKey>=4&&numKey<=6)cmdIdx=numKey-4;
    const cmd=D.Input[cmdIdx];
    const pat=inputCount%5;
    buildInputPattern(ch,cmd,pat,W,H,inputCount);
    inputCount++;
  });

  $('save-btns')?.classList.remove('hide');
  $('btn-stop')?.addEventListener('click',()=>{
    FROZEN=!FROZEN;
    const btn=$('btn-stop');
    if(btn)btn.textContent=FROZEN?'RESUME':'STOP';
  });

  wireEvents();requestAnimationFrame(loop);
}

/* ─── INPUT pattern builder — rows lifted higher ────────────────── */
const INPUT_COLS=[.16,.33,.50,.65];
/* Rows raised so 3rd row sits well above video row */
const INPUT_ROWS=[.12,.30,.48];
const INPUT_ANCHORS=[];
for(let r=0;r<INPUT_ROWS.length;r++){
  for(let c=0;c<INPUT_COLS.length;c++){
    INPUT_ANCHORS.push({col:INPUT_COLS[c],row:INPUT_ROWS[r],ri:r,ci:c});
  }
}

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

function buildInputPattern(ch,cmd,pat,W,H,idx){
  const COLORS=[LIME_BG,PINK_BG,GRAY_BG];
  const lines=[];
  const label='#'+cmd.n+' '+cmd.text;

  /* Stage upper bound — never draw below this */
  const stageBottom=safeStageBottom(H);

  const pass=Math.floor(idx/12);
  const anchor=INPUT_ANCHORS[idx%12];

  /* Tighter cell heights so 3 rows fit above the video stage */
  const cellW=W*(INPUT_COLS[1]-INPUT_COLS[0]);
  const cellH=H*(INPUT_ROWS[1]-INPUT_ROWS[0]);

  const x0=clamp(anchor.col*W, 0, W-cellW);
  const y0=clamp(anchor.row*H, 0, stageBottom-cellH);

  const pdx=0;const pdy=0;

  const colorIdx=(idx+pass)%3;
  const colorB=COLORS[(colorIdx+1)%3];
  const colorC=COLORS[(colorIdx+2)%3];

  const step=CMD_FS+4;
  const rowCount=Math.min(Math.floor(cellH/step),4);
  const charStep=CMD_FS+6;
  for(let ri=0;ri<rowCount;ri++){
    const y=clamp(y0+ri*step+pdy, 0, stageBottom-CMD_FS);
    const charCount=Math.min(Math.floor(cellW/charStep),4);
    for(let ci=0;ci<charCount;ci++){
      const x=clamp(x0+ci*charStep+pdx, 0, W-CMD_FS);
      const txt=ci%4===0?'#'+cmd.n:ch;
      lines.push({x,y,text:txt,fs:CMD_FS,bg:COLORS[colorIdx]});
    }
  }

  const diagCount=Math.max(4,rowCount-1);
  for(let di=0;di<diagCount;di++){
    const t=di/(diagCount-1);
    const x=clamp(
      anchor.ci%2===0
        ? x0+t*cellW*0.8+pdx
        : x0+cellW*(1-t*0.8)+pdx,
      0, W-80
    );
    const y=clamp(y0+di*step+step*0.5+pdy, 0, stageBottom-CMD_FS);
    lines.push({x,y,text:label,fs:CMD_FS,bg:colorB});
  }

  const markerY=clamp(y0+pdy-step, 0, stageBottom-CMD_FS);
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

const VIDEO_CFG={
  Align:{src:'./videos/align_withgraphic.mp4',ranges:[[0,14],[16,29],[30,48]]},
  Input:{src:'./videos/input_withgraphic.mp4',ranges:[[0,15],[16,47],[51,88]]},
  Select:{src:'./videos/select_withgraphic.mp4',ranges:[[0,14],[16,47],[48,72]]},
  Loop:{src:'./videos/loop_withgraphic.mp4',ranges:[[0,24],[29,45],[50,69]]},
  Control:{src:'./videos/control_withgraphic.mp4',ranges:[[2,23],[26,50],[55,73]]},
  Edge:{src:'./videos/edge_withgraphic.mp4',ranges:[[0,20],[21,42],[43,65]]}
};

function buildTiles(c){
  const row=$('row-'+c);
  if(!row)return;
  row.innerHTML='';

  const cmds=D[c];
  if(!cmds||!cmds.length)return;
  const n=Math.min(cmds.length,3);
  const cfg=VIDEO_CFG[c]||{src:'./videos/align_withgraphic.mp4',ranges:[[0,30],[30,60],[60,90]]};

  for(let i=0;i<n;i++){
    const tStart=parseFloat((cfg.ranges[i]||[0,30])[0]);
    const tEnd  =parseFloat((cfg.ranges[i]||[0,30])[1]);
    const src   =cfg.src;
    const cmdText='#'+cmds[i].n+' '+cmds[i].text;

    const f=document.createElement('div');
    f.className='frame';
    f.dataset.tstart=String(tStart);
    f.dataset.tend  =String(tEnd);
    f.dataset.snd   ='0';

    const ph=document.createElement('div');
    ph.className='fr-ph';
    f.appendChild(ph);

    const vid=document.createElement('video');
    vid.autoplay   =true;
    vid.muted      =true;
    vid.playsInline=true;
    vid.preload    ='auto';
    vid.loop       =false;
    vid.setAttribute('style',
      'position:absolute;inset:0;width:100%;height:100%;'+
      'object-fit:cover;display:block;visibility:visible;opacity:1;'+
      'z-index:5;background:#ccc;border:none;outline:none');

    const srcEl=document.createElement('source');
    srcEl.src =''+src;
    srcEl.type='video/mp4';
    vid.appendChild(srcEl);

    vid.addEventListener('loadedmetadata',function(){
      if(this.currentTime<tStart||this.currentTime>tEnd)this.currentTime=tStart;
    });
    vid.addEventListener('timeupdate',function(){
      if(this.currentTime>=tEnd-0.05)this.currentTime=tStart;
    });

    f.appendChild(vid);
    vid.play().catch(function(){});

    const sndBtn=document.createElement('button');
    sndBtn.className='snd-btn';
    sndBtn.textContent='Sound Off';
    sndBtn.addEventListener('click',function(e){
      e.stopPropagation();
      if(f.dataset.snd==='1'){
        vid.muted=true;f.dataset.snd='0';sndBtn.textContent='Sound Off';
      }else{
        muteAllExcept(f);vid.muted=false;f.dataset.snd='1';sndBtn.textContent='Sound On';
      }
    });

    f.appendChild(sndBtn);

    f.addEventListener('mouseenter',function(){
      muteAllExcept(f);vid.muted=false;f.dataset.snd='1';sndBtn.textContent='Sound On';
    });
    f.addEventListener('mouseleave',function(){
      vid.muted=true;f.dataset.snd='0';sndBtn.textContent='Sound Off';
    });

    f.addEventListener('click',function(){
      showDetail(c,{text:cmdText,video:src,tStart:tStart,tEnd:tEnd});
    });

    row.appendChild(f);
  }
}


function muteAllExcept(exceptFrame){
  document.querySelectorAll('.frame').forEach(f=>{
    if(f===exceptFrame)return;
    const v=f.querySelector('video');if(v){v.muted=true}
    f.dataset.snd='0';
    const btn=f.querySelector('.snd-btn');if(btn)btn.textContent='Sound Off';
  });
}
function checkVideos(){
  const now=Date.now();if(now-lastVis<300)return;lastVis=now;
  document.querySelectorAll('.frame').forEach(f=>{
    const r=f.getBoundingClientRect();
    const vis=r.bottom>0&&r.top<window.innerHeight;
    const v=f.querySelector('video');if(!v)return;
    if(vis&&v.paused)v.play().catch(()=>{});
    else if(!vis&&!v.paused)v.pause();
  });
}

/* ─── Wire Events ────────────────────────────────────────────────── */
function wireEvents(){
  /* ALIGN — wider draggable range */
  const cvA=$('worm-Align');
  if(cvA){
    cvA.addEventListener('mousedown',e=>{
      const r=cvA.getBoundingClientRect();const rx=e.clientX-r.left,ry=e.clientY-r.top;
      let best=null,bd=9999;
      /* Expanded grab radius from 130 → 200 for easier far-out grabs */
      alignBlocks.forEach((b,i)=>{const d=Math.hypot(b.x-rx,b.y-ry);if(d<bd&&d<200){bd=d;best=i}});
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

  /* CONTROL — flips controlInteracted true on first drag */
  const cvC=$('worm-Control');
  if(cvC){
    cvC.addEventListener('mousedown',e=>{
      controlDragging=true;
      controlInteracted=true; /* leave calm state */
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
function addControlTrace(x,y){
  const cmds=D.Control;
  const boxH=CMD_FS+CMD_PY*2+2;
  const intensity=Math.min(1,controlTraces.length/60);
  const layerCount=Math.round(2+intensity*18);
  const dxPerLayer=intensity*2.5;
  const dyPerLayer=intensity*1.8;

  const cmdBoxes=cmds.map((cmd,i)=>({
    text:'#'+cmd.n+' '+cmd.text,
    bg:CMD_BG[i],
    localY:i*boxH
  }));

  const layers=[];
  for(let li=0;li<layerCount;li++){
    layers.push({dx:li*dxPerLayer,dy:li*dyPerLayer});
  }

  controlTraces.push({x,y,cmdBoxes,layers,intensity});
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

/* ═══ ALIGN — commands lifted higher ═══════════════════════════════ */
function initAlign(W,H){
  if(alignBlocks.length)return;
  D.Align.forEach((cmd,i)=>{
    /* Targets lifted from .32/.49/.66 → .18/.30/.42 */
    const tx=W*.18;const ty=H*(.18+i*.12);
    alignBlocks.push({n:cmd.n,text:cmd.text,bgColor:CMD_BG[i],tx,ty,
      x:W*.05+Math.random()*W*.9,y:H*.05+Math.random()*H*.50,
      vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,snapped:false});
  });
}
function renderAlign(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initAlign(W,H);ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Align);
  ctx.save();ctx.strokeStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  /* Vertical guide and target ticks adjusted to new positions */
  ctx.beginPath();ctx.moveTo(W*.18,H*.10);ctx.lineTo(W*.18,H*.50);ctx.stroke();
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

  const stageBottom=safeStageBottom(H);

  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();

  ctx.textBaseline='middle';
  for(const stamp of inputStamps){
    for(const line of stamp.lines){
      ctx.font=FM(line.fs);
      const tw=ctx.measureText(line.text).width;
      block(ctx,line.x,line.y,tw,line.fs,line.bg,5,3);
      ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(line.text,line.x,line.y);
    }
  }

  ctx.restore();

  /* Command labels — left column, raised to match new row positions */
  D.Input.forEach((cmd,i)=>{
    const y=H*(.10+i*.13);
    const label='#'+cmd.n+' '+cmd.text;
    ctx.font=FM(CMD_FS);const tw=ctx.measureText(label).width;
    block(ctx,W*.18,y,tw,CMD_FS,CMD_BG[i],CMD_PX,CMD_PY);
    ctx.fillStyle='rgba(10,10,10,.92)';ctx.textBaseline='middle';ctx.fillText(label,W*.18,y);
    ctx.fillStyle='rgba(0,0,0,.07)';ctx.fillRect(W*.18,y+CMD_FS*.7,tw,1);
  });

  drawCursor(ctx,cv);
}

/* ═══ SELECT ════════════════════════════════════════════════════════ */
function renderSelect(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Select);
  const cx=W/2,cy=H/2;
  const stageBottom=safeStageBottom(H);
  ctx.strokeStyle='rgba(0,0,0,.03)';ctx.fillStyle='rgba(0,0,0,.03)';ctx.lineWidth=.5;
  for(let gx=50;gx<W;gx+=55){for(let gy=50;gy<stageBottom;gy+=55){
    const dx=gx-cx,dy=gy-cy,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx-dy/d*8,gy+dx/d*8,2);
  }}
  for(const conn of selectConns){
    const{ax,ay,bx,by,tags}=conn;
    ctx.save();ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=.8;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    tags.forEach(tag=>{
      if(!tag.fullySettled){
        if(!tag.settled){
          tag.vy+=(tag.targetOffset-tag.offset)*.07+.22;tag.vy*=.72;tag.offset+=tag.vy;
          tag.swayT+=.022;tag.tilt=tag.tilt*.97+Math.sin(tag.swayT)*.025;
          if(Math.abs(tag.offset-tag.targetOffset)<.5&&Math.abs(tag.vy)<.3){
            tag.offset=tag.targetOffset;tag.vy=0;tag.settled=true;
          }
        }else{
          tag.swayT+=.008;
          const sway=Math.sin(tag.swayT)*0.008;
          tag.tilt=tag.tilt*.998+sway;
          if(Math.abs(tag.tilt)<.001){tag.tilt=0;tag.fullySettled=true}
        }
      }
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

/* ═══ LOOP — bottom arrow grid REMOVED ══════════════════════════════ */
function renderLoop(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Loop);

  const stageBottom=safeStageBottom(H);
  const cmds=D.Loop;const streams=10;
  const streamBg=[LIME_BG,PINK_BG,GRAY_BG,LIME_BG,PINK_BG,GRAY_BG,LIME_BG,PINK_BG,GRAY_BG,LIME_BG];

  /* Clip streams to safe stage so they don't run over video row */
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();

  for(let si=0;si<streams;si++){
    const frac=si/streams;
    /* Distribute streams within the safe stage area */
    const baseY=stageBottom*.05+frac*stageBottom*.9;
    const amp=stageBottom*.075*loopScale*(1+Math.sin(si*1.1)*.5);
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

  ctx.restore();
  /* Bottom arrow grid removed entirely per spec */
  drawCursor(ctx,cv);
}

/* ═══ CONTROL — calm initial state, chaotic after interaction ═══════ */
function renderControl(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Control);

  const stageBottom=safeStageBottom(H);

  /* Subtle arrow field — clipped to safe stage */
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();
  const cx=W/2,cy=stageBottom/2;
  ctx.strokeStyle='rgba(0,0,0,.055)';ctx.fillStyle='rgba(0,0,0,.055)';ctx.lineWidth=.7;
  for(let gx=35;gx<W;gx+=46){for(let gy=35;gy<stageBottom;gy+=46){
    const dx=gx-cx,dy=gy-cy,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx+(-dy/d+dx/d*.3)*12,gy+(dx/d+dy/d*.3)*12,3);
  }}
  ctx.restore();

  const boxH=CMD_FS+CMD_PY*2+2;
  ctx.font=FM(CMD_FS);ctx.textBaseline='middle';

  /* ── INITIAL CALM STATE — before any interaction ──
     Render the 3 command boxes in a single clean horizontal row,
     centered, quiet, controlled. */
  if(!controlInteracted){
    const cmds=D.Control;
    const labels=cmds.map((c,i)=>({
      text:'#'+c.n+' '+c.text,
      bg:CMD_BG[i]
    }));
    /* Measure widths to space evenly */
    const widths=labels.map(l=>ctx.measureText(l.text).width+CMD_PX*2);
    const totalW=widths.reduce((a,b)=>a+b,0)+ (widths.length-1)*24;
    let xCursor=(W-totalW)/2;
    const yCenter=stageBottom*0.42;
    ctx.save();
    /* clip to stage */
    ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();
    labels.forEach((l,i)=>{
      const w=widths[i];
      ctx.fillStyle=l.bg;
      ctx.fillRect(xCursor,yCenter-boxH/2,w,boxH);
      ctx.fillStyle='rgba(10,10,10,.92)';
      ctx.fillText(l.text,xCursor+CMD_PX,yCenter);
      xCursor+=w+24;
    });
    /* Soft instruction beneath, in Monument */
    ctx.font=FM(10);
    ctx.fillStyle='rgba(10,10,10,.35)';
    ctx.textBaseline='top';
    const hint='Drag to control';
    const hw=ctx.measureText(hint).width;
    ctx.fillText(hint,(W-hw)/2,yCenter+boxH/2+14);
    ctx.restore();
  } else {
    /* ── POST-INTERACTION CHAOTIC STATE — existing layered stacks ── */
    ctx.save();
    ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();

    const visTraces=controlTraces.length>2?controlTraces.slice(2):controlTraces;
    for(const trace of visTraces){
      const{x,y,cmdBoxes,layers}=trace;
      const maxW=Math.max(...cmdBoxes.map(b=>ctx.measureText(b.text).width));
      const unifiedW=maxW+CMD_PX*2;

      for(let li=layers.length-1;li>=0;li--){
        const l=layers[li];
        for(let bi=0;bi<cmdBoxes.length;bi++){
          const box=cmdBoxes[bi];
          const bx=x+l.dx;
          const by=y+box.localY+l.dy;
          /* Skip drawing any portion that crosses into video row */
          if(by-boxH/2 > stageBottom) continue;
          ctx.fillStyle=box.bg;ctx.fillRect(bx-CMD_PX,by-boxH/2,unifiedW,boxH);
          if(li<=2){
            ctx.fillStyle='rgba(10,10,10,.92)';ctx.fillText(box.text,bx+CMD_PX,by);
          }
        }
      }
    }
    ctx.restore();
  }

  drawCursor(ctx,cv);
}

/* ═══ EDGE — accumulates, less decay, stays above video row ═════════ */
function initEdge(W,H){
  if(edgeInit)return;edgeInit=true;
  const stageBottom=safeStageBottom(H);
  D.Edge.forEach((cmd,ci)=>{
    for(let j=0;j<20;j++){
      edgeParts.push({
        text:'#'+cmd.n+' '+cmd.text,
        x:W*.12+Math.random()*W*.76,
        y:H*.12+Math.random()*(stageBottom*.62),
        vx:(Math.random()-.5)*1.1,vy:(Math.random()-.5)*1.1,
        rot:(Math.random()-.5)*.07,vrot:(Math.random()-.5)*.003,
        bgColor:CMD_BG[ci%CMD_BG.length]
      });
    }
  });
}
function edgeExplode(ex,ey,W,H){
  /* MORE particles per click — accumulation feel */
  D.Edge.forEach((cmd,ci)=>{
    for(let i=0;i<14;i++){
      const ang=Math.random()*Math.PI*2,spd=2+Math.random()*4;
      edgeParts.push({
        text:'#'+cmd.n+' '+cmd.text,
        x:ex,y:ey,
        vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        rot:Math.random()*Math.PI,vrot:(Math.random()-.5)*.02,
        bgColor:CMD_BG[ci%CMD_BG.length]
      });
    }
  });
  edgeParts.forEach(p=>{
    const dx=p.x-ex,dy=p.y-ey,d=Math.max(Math.hypot(dx,dy),1);
    p.vx+=dx/d*(1.5+Math.random()*2);
    p.vy+=dy/d*(1.5+Math.random()*2);
  });
  /* Generous cap — accumulation up to 400 particles */
  if(edgeParts.length>400)edgeParts.splice(0,edgeParts.length-400);
}
function renderEdge(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initEdge(W,H);ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Edge);

  const stageBottom=safeStageBottom(H);
  /* Subtle radial arrow field — clipped to safe stage */
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();
  ctx.strokeStyle='rgba(0,0,0,.04)';ctx.fillStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  for(let gx=55;gx<W;gx+=65){for(let gy=55;gy<stageBottom;gy+=65){
    const dx=gx-W/2,dy=gy-stageBottom/2,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx+dx/d*14,gy+dy/d*14,2.5);
  }}
  ctx.restore();

  /* Clip particle rendering to stage — slight allowed overflow near bottom (8px) */
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom+8);ctx.clip();
  ctx.textBaseline='middle';
  edgeParts.forEach(p=>{
    /* Slower decay → particles persist longer, accumulate */
    p.vx*=.992;p.vy*=.992;p.vrot*=.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;
    /* Bounce off bounds — keep within stage vertically */
    if(p.x<0){p.x=0;p.vx=Math.abs(p.vx)*.6}
    if(p.x>W){p.x=W;p.vx=-Math.abs(p.vx)*.6}
    if(p.y<0){p.y=0;p.vy=Math.abs(p.vy)*.6}
    if(p.y>stageBottom){p.y=stageBottom;p.vy=-Math.abs(p.vy)*.6}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
    ctx.font=FM(CMD_FS);const tw=ctx.measureText(p.text).width;
    ctx.fillStyle=p.bgColor;ctx.fillRect(-tw/2-CMD_PX,-(CMD_FS*.55+CMD_PY),tw+CMD_PX*2,CMD_FS+CMD_PY*2);
    ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(p.text,-tw/2,0);
    ctx.restore();
  });
  ctx.restore();
  drawCursor(ctx,cv);
}

/* ─── Detail ─────────────────────────────────────────────────────── */
function showDetail(c,cmd){
  const tStart=cmd.tStart||0;
  const tEnd=cmd.tEnd||30;
  const cmdText=cmd.text||'';

  document.body.classList.add('detail-open');

  let det=document.querySelector('.s-det');
  if(!det){
    det=document.createElement('section');det.className='s-det';
    det.style.cssText='border:none!important;outline:none!important;position:relative';
    det.innerHTML='<div class="det-room" id="det-room"></div>';
    $('dyn').prepend(det);
  }

  let bgCv=det.querySelector('#det-bg-canvas');
  if(!bgCv){
    bgCv=document.createElement('canvas');bgCv.id='det-bg-canvas';
    det.insertBefore(bgCv,det.firstChild);
  }
  bgCv.style.display='block';
  const allCmds=D[c]?D[c].map(d=>'#'+d.n+' '+d.text).join('  ·  '):'';
  requestAnimationFrame(()=>drawDetBgTexture(bgCv,allCmds));

  const vid=document.createElement('video');
  vid.autoplay=true;
  vid.muted=false;
  vid.playsInline=true;vid.preload='auto';
  vid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;border:none!important;outline:none!important';
  vid.innerHTML=`<source src="${cmd.video}" type="video/mp4">`;
  vid.addEventListener('loadedmetadata',()=>{vid.currentTime=tStart});
  vid.addEventListener('timeupdate',()=>{if(vid.currentTime>=tEnd)vid.currentTime=tStart});

  const rm=$('det-room');
  rm.style.cssText='border:none!important;outline:none!important;box-shadow:none!important;position:relative;z-index:2;width:82vw;height:calc(82vw*9/16);max-height:78vh;max-width:calc(78vh*16/9);overflow:hidden';
  rm.innerHTML='';
  rm.appendChild(vid);
  vid.play().catch(()=>{vid.muted=true;vid.play().catch(()=>{})});

  muteAllExcept(null);

  /* ── DETAIL UI CLUSTER — Back / Sound / STOP grouped at lower-right ── */
  let cluster=det.querySelector('.det-ui-cluster');
  if(!cluster){
    cluster=document.createElement('div');
    cluster.className='det-ui-cluster';
    det.appendChild(cluster);
  }
  cluster.innerHTML='';

  /* BACK */
  const backBtn=document.createElement('button');
  backBtn.textContent='← BACK';
  backBtn.onclick=()=>{
    vid.muted=true;vid.pause();
    document.body.classList.remove('detail-open');
    $('s-cat-'+c)?.scrollIntoView({behavior:'smooth'});
  };
  cluster.appendChild(backBtn);

  /* SOUND */
  const sndBtn=document.createElement('button');
  sndBtn.textContent='SOUND ON';
  sndBtn.onclick=()=>{
    if(vid.muted){vid.muted=false;sndBtn.textContent='SOUND ON'}
    else{vid.muted=true;sndBtn.textContent='SOUND OFF'}
  };
  cluster.appendChild(sndBtn);

  /* STOP — moved into cluster while detail is open */
  const stopBtn=document.createElement('button');
  stopBtn.textContent=FROZEN?'RESUME':'STOP';
  stopBtn.onclick=()=>{
    FROZEN=!FROZEN;
    stopBtn.textContent=FROZEN?'RESUME':'STOP';
    /* Mirror to global */
    const gBtn=$('btn-stop');if(gBtn)gBtn.textContent=FROZEN?'RESUME':'STOP';
  };
  cluster.appendChild(stopBtn);

  /* Remove any legacy back/sound buttons that may exist from prior session */
  det.querySelectorAll('.det-back-btn, #det-sound').forEach(el=>el.remove());

  det.scrollIntoView({behavior:'smooth'});
}

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
  ctx.font=`500 14px 'Monument','Helvetica Neue',Arial,sans-serif`;
  ctx.fillStyle='rgba(0,0,0,.025)';
  ctx.textBaseline='top';
  const unit=cmdText+'  ';
  const uw=ctx.measureText(unit).width;
  const rowH=22;
  for(let row=-2;row<Math.ceil(H/rowH)+2;row++){
    const yBase=row*rowH;
    const xOffset=-(row%Math.ceil(W/uw))*uw*.5;
    const reps=Math.ceil(W/uw)+4;
    for(let ri=0;ri<reps;ri++){
      ctx.fillText(unit,xOffset+ri*uw,yBase);
    }
  }
}

function loop(){
  try{
    if(!FROZEN){T+=.016;FC++;}
    if(!FROZEN&&FC%2===0){
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

const MAG_COLORS={
  Align:'rgba(223,255,0,.7)',
  Input:'rgba(255,204,216,.8)',
  Select:'rgba(170,170,168,.85)',
  Loop:'rgba(223,255,0,.65)',
  Control:'rgba(255,204,216,.75)',
  Edge:'rgba(170,170,168,.75)',
  _default:'rgba(170,170,168,.85)'
};
let magCurrentColor='rgba(170,170,168,.85)';
let magTargetColor='rgba(170,170,168,.85)';

function updateMagColor(){
  let found=null;
  cats.forEach(c=>{
    const cv=$('worm-'+c);if(!cv)return;
    const r=cv.getBoundingClientRect();
    if(r.top<window.innerHeight*.5&&r.bottom>window.innerHeight*.5)found=c;
  });
  const target=found?MAG_COLORS[found]:MAG_COLORS._default;
  if(target!==magTargetColor){
    magTargetColor=target;
    const mag=$('mag');if(mag)mag.style.borderColor=target;
  }
}

function renderMag(){
  const mag=$('mag');if(!mag)return;
  if(MX<0){mag.style.left='-200px';return}
  magX+=(MX-magX)*.22;magY+=(MY-magY)*.22;
  /* Updated offset — cursor is now 38px so center is 19px in */
  mag.style.left=(magX-19)+'px';mag.style.top=(magY-19)+'px';
  if(FC%30===0)updateMagColor();
}