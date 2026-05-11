/* ═══════════════════════════════════════════════════════════════════
   THIS WEB DOES NOT COMPLY — v19 (FINAL refinement)
   Surgical only. Video pipeline / paths / autoplay untouched.

   CHANGES vs v18:
   ───────────────
   • LANDING FLOW (hardened):
     scroll-snap is temporarily disabled via #sc.no-snap, then we
     directly set scrollTop to the second-from-bottom section
     (#s-theme). Two retries on rAF cover layout-not-ready cases.
     Snap re-enabled after position is locked.

   • DETAIL VIEW:
     - Smaller (CSS): .det-room 72vw (was 82), max-height 70vh.
     - No white side boxes: object-fit:cover on the focused video.
       The 16:9 room matches the video aspect ratio, so cover crops
       effectively nothing — identical composition, no letterbox.

   • ALIGN: drag spread fully unbounded. Initial scatter spans
     the WHOLE canvas (.04 → .96 horizontally, .04 → .92 vertically).
     Grab radius 380px. Stamps render with zero clipping.

   • CURSOR COLOR: dynamic — JS detects via elementFromPoint whether
     the pointer is over a lime element (#bar / lime backgrounds /
     idx-b hover lime). When over lime → pink outline; otherwise →
     lime outline. Smooth CSS transition handles the swap.

   • LOOP: time-base for stream scrolling now tied to a dedicated
     loopT counter that only advances during active drag. Without
     interaction the streams sit perfectly still.

   • CONTROL: initial state shows ONLY the unified left command stack
     + the HTML hint bar. The extra horizontal "connector row" is
     removed entirely.
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

/* Cursor colors — strong, no fill, JS swaps via #mag.style.borderColor */
const CURSOR_LIME='rgba(223,255,0,.95)';
const CURSOR_PINK='rgba(255,204,216,.95)';

const VIDEO_ROW_FRAC=(31.5/100)*(9/16);
function videoRowHeight(){return window.innerWidth*VIDEO_ROW_FRAC}
function safeStageBottom(cvH){
  const vh=videoRowHeight();
  return Math.max(40, cvH - vh - 6);
}

const VIDEO_LEFT_BOUND_FRAC = 0.054;
const VIDEO_RIGHT_BOUND_FRAC = 1 - 0.054;

const UNIFIED_CMD_X_FRAC = 0.10;
const UNIFIED_CMD_ROWS = [0.10, 0.23, 0.36];

const $=id=>document.getElementById(id);
let T=0,FC=0,MX=-1,MY=-1,magX=-200,magY=-200;
const FROZEN=false;

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

/* LOOP — dedicated time only advances on active drag */
let loopScale=1.0,loopDrag=null;
let loopT=0; /* scrolls streams only when user drags */

/* CONTROL */
const controlTraces=[];
let controlDragging=false,controlLastPt=null;
let controlInteracted=false;

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

/* ─── HARDENED START POSITION ────────────────────────────────────
   Force scroll to #s-theme (second-from-bottom) with snap disabled.
   This bypasses scroll-snap's tendency to fight initial positioning.
   Two rAF retries catch the case where layout isn't measured yet. */
function lockStartPosition(){
  const sc = $('sc');
  const target = $('s-theme');
  if(!sc || !target) return false;
  /* Disable snap during the jump */
  sc.classList.add('no-snap');
  /* offsetTop is measured against the offsetParent (#tall),
     and #tall is the scroll content of #sc → offsetTop is the
     correct scroll position. */
  const y = target.offsetTop;
  if(y < 1) return false; /* layout not ready */
  sc.scrollTop = y;
  /* Re-enable snap after the next frame */
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      sc.classList.remove('no-snap');
    });
  });
  return true;
}

function startWebsite(){
  $('bar')?.classList.remove('hide');
  $('sc')?.classList.remove('hide');
  buildIndex();buildSections();

  /* Try to lock start position immediately, then retry if layout
     hadn't settled yet. Multiple attempts ensure it lands correctly. */
  requestAnimationFrame(()=>{
    if(!lockStartPosition()){
      requestAnimationFrame(()=>{
        if(!lockStartPosition()){
          setTimeout(lockStartPosition, 50);
        }
      });
    }
  });

  const sc=$('sc');
  if(sc)sc.addEventListener('scroll',()=>{
    const cvi=$('worm-Input');
    const inputHint=$('input-hint-bar');
    if(cvi&&inputHint){
      const r=cvi.getBoundingClientRect();
      inputHint.style.display=(r.bottom>0&&r.top<window.innerHeight)?'block':'none';
    }
    const cvc=$('worm-Control');
    const ctlHint=$('control-hint-bar');
    if(cvc&&ctlHint){
      const r=cvc.getBoundingClientRect();
      ctlHint.style.display=(r.bottom>0&&r.top<window.innerHeight)?'block':'none';
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

  wireEvents();requestAnimationFrame(loop);
}

/* ─── INPUT pattern builder ─────────────────────────────────────── */
const INPUT_ROWS=[.12,.30,.48];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

function buildInputPattern(ch,cmd,pat,W,H,idx){
  const COLORS=[LIME_BG,PINK_BG,GRAY_BG];
  const lines=[];
  const label='#'+cmd.n+' '+cmd.text;
  const stageBottom=safeStageBottom(H);

  const xL = W * 0.04;
  const xR = W * VIDEO_RIGHT_BOUND_FRAC;

  let labelW = 180;
  try{
    const probe = document.createElement('canvas').getContext('2d');
    if(probe){
      probe.font = FM(CMD_FS);
      labelW = probe.measureText(label).width + CMD_PX*2 + 4;
    }
  }catch(_){}

  const genRight = xR - labelW;
  const cols = [
    xL + (genRight - xL) * 0.02,
    xL + (genRight - xL) * 0.30,
    xL + (genRight - xL) * 0.58,
    xL + (genRight - xL) * 0.82
  ];

  const pass = Math.floor(idx/12);
  const colIdx = idx % 4;
  const rowIdx = Math.floor((idx % 12) / 4);

  const colX = cols[colIdx];
  const rowY = H * INPUT_ROWS[rowIdx];

  const nextX = colIdx < 3 ? cols[colIdx+1] : genRight;
  const cellW = Math.max(40, nextX - colX);
  const cellH = H * (INPUT_ROWS[1] - INPUT_ROWS[0]);

  const x0 = clamp(colX, xL, genRight - cellW);
  const y0 = clamp(rowY, 0, stageBottom - cellH);

  const colorIdx = (idx + pass) % 3;
  const colorB = COLORS[(colorIdx + 1) % 3];
  const colorC = COLORS[(colorIdx + 2) % 3];

  const step = CMD_FS + 4;
  const rowCount = Math.min(Math.floor(cellH / step), 4);
  const charStep = CMD_FS + 6;

  for(let ri = 0; ri < rowCount; ri++){
    const y = clamp(y0 + ri * step, 0, stageBottom - CMD_FS);
    const charCount = Math.min(Math.floor(cellW / charStep), 4);
    for(let ci = 0; ci < charCount; ci++){
      const x = clamp(x0 + ci * charStep, xL, xR - 30);
      const txt = ci % 4 === 0 ? '#' + cmd.n : ch;
      lines.push({x, y, text: txt, fs: CMD_FS, bg: COLORS[colorIdx]});
    }
  }

  const diagCount = Math.max(4, rowCount - 1);
  for(let di = 0; di < diagCount; di++){
    const t = di / (diagCount - 1);
    const baseX = colIdx % 2 === 0
      ? x0 + t * cellW * 0.6
      : x0 + cellW * (1 - t * 0.6);
    const x = clamp(baseX, xL, genRight);
    const y = clamp(y0 + di * step + step * 0.5, 0, stageBottom - CMD_FS);
    lines.push({x, y, text: label, fs: CMD_FS, bg: colorB});
  }

  const markerX = clamp(x0, xL, genRight);
  const markerY = clamp(y0 - step, 0, stageBottom - CMD_FS);
  lines.push({x: markerX, y: markerY, text: label, fs: CMD_FS, bg: colorC});

  inputStamps.push({lines, born: Date.now()});
  if(inputStamps.length > 72) inputStamps.shift();
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
    if(c==='Control')extra=`<div id="control-hint-bar">DRAG TO CONTROL ↓</div>`;
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
      'object-fit:contain;display:block;visibility:visible;opacity:1;'+
      'z-index:5;background:#f0f0ee;border:none;outline:none;'+
      'clip-path:inset(3px 1px 3px 1px);-webkit-clip-path:inset(3px 1px 3px 1px)');

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
  /* ALIGN — generous grab radius */
  const cvA=$('worm-Align');
  if(cvA){
    cvA.addEventListener('mousedown',e=>{
      const r=cvA.getBoundingClientRect();const rx=e.clientX-r.left,ry=e.clientY-r.top;
      let best=null,bd=9999;
      alignBlocks.forEach((b,i)=>{const d=Math.hypot(b.x-rx,b.y-ry);if(d<bd&&d<380){bd=d;best=i}});
      if(best!==null)alignDrag={i:best,ox:rx,oy:ry,lastSx:rx,lastSy:ry};
    });
    cvA.addEventListener('mousemove',e=>{
      if(!alignDrag)return;
      const r=cvA.getBoundingClientRect();const rx=e.clientX-r.left,ry=e.clientY-r.top;
      const dx=rx-alignDrag.ox,dy=ry-alignDrag.oy;
      const b=alignBlocks[alignDrag.i];
      b.vx=dx*.5;b.vy=dy*.5;b.x+=dx*.7;b.y+=dy*.7;b.snapped=false;
      /* Stamp drops freely — no bounds check, drag anywhere */
      if(Math.hypot(rx-alignDrag.lastSx,ry-alignDrag.lastSy)>20){
        alignStamps.push({x:b.x,y:b.y,text:'#'+b.n+' '+b.text,bgColor:b.bgColor});
        alignDrag.lastSx=rx;alignDrag.lastSy=ry;
      }
      alignDrag.ox=rx;alignDrag.oy=ry;
    });
    cvA.addEventListener('mouseup',()=>{alignDrag=null});
    cvA.addEventListener('mouseleave',()=>{alignDrag=null});
  }

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

  /* LOOP — advance loopT ONLY during active drag */
  const cvL=$('worm-Loop');
  if(cvL){
    cvL.addEventListener('mousedown',e=>{
      const r=cvL.getBoundingClientRect();
      loopDrag={ox:e.clientX-r.left, oy:e.clientY-r.top};
    });
    cvL.addEventListener('mousemove',e=>{
      if(!loopDrag)return;
      const r=cvL.getBoundingClientRect();
      const rx=e.clientX-r.left;
      const ry=e.clientY-r.top;
      const dx=rx-loopDrag.ox;
      const dy=ry-loopDrag.oy;
      /* Horizontal drag adjusts amplitude scale */
      loopScale=Math.max(.25,Math.min(3,loopScale+dx*.006));
      /* Drag motion advances stream scroll only while moving */
      loopT += (dx + dy) * 0.012;
      loopDrag.ox=rx;
      loopDrag.oy=ry;
    });
    cvL.addEventListener('mouseup',()=>{loopDrag=null});
    cvL.addEventListener('mouseleave',()=>{loopDrag=null});
  }

  const cvC=$('worm-Control');
  if(cvC){
    cvC.addEventListener('mousedown',e=>{
      controlDragging=true;
      controlInteracted=true;
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

function drawUnifiedCommandStack(ctx, W, H, dataset){
  ctx.font=FM(CMD_FS);
  ctx.textBaseline='middle';
  dataset.forEach((cmd,i)=>{
    const y = H * UNIFIED_CMD_ROWS[i];
    const x = W * UNIFIED_CMD_X_FRAC;
    const label = '#'+cmd.n+' '+cmd.text;
    const tw = ctx.measureText(label).width;
    block(ctx, x, y, tw, CMD_FS, CMD_BG[i], CMD_PX, CMD_PY);
    ctx.fillStyle='rgba(10,10,10,.92)';
    ctx.fillText(label, x, y);
    ctx.fillStyle='rgba(0,0,0,.07)';
    ctx.fillRect(x, y+CMD_FS*.7, tw, 1);
  });
}

/* ═══ ALIGN — full canvas drag range, no clipping ══════════════════ */
function initAlign(W,H){
  if(alignBlocks.length)return;
  D.Align.forEach((cmd,i)=>{
    const tx = W * UNIFIED_CMD_X_FRAC;
    const ty = H * UNIFIED_CMD_ROWS[i];
    alignBlocks.push({
      n:cmd.n,text:cmd.text,bgColor:CMD_BG[i],
      tx,ty,
      /* Initial scatter spans full canvas — nearly the entire stage */
      x: W*.04 + Math.random()*W*.92,
      y: H*.04 + Math.random()*H*.88,
      vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,
      snapped:false
    });
  });
}
function renderAlign(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initAlign(W,H);
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Align);

  /* Guide line + ticks at unified positions */
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  const guideX = W * UNIFIED_CMD_X_FRAC;
  ctx.beginPath();
  ctx.moveTo(guideX, H*UNIFIED_CMD_ROWS[0] - 30);
  ctx.lineTo(guideX, H*UNIFIED_CMD_ROWS[2] + 30);
  ctx.stroke();
  alignBlocks.forEach(b=>{
    ctx.beginPath();
    ctx.moveTo(guideX-W*.02, b.ty);
    ctx.lineTo(guideX+W*.02, b.ty);
    ctx.stroke();
  });
  ctx.restore();

  /* Physics toward unified targets */
  alignBlocks.forEach((b,i)=>{
    if(alignDrag?.i===i)return;
    const k=b.snapped?.18:.055;
    b.vx+=(b.tx-b.x)*k;b.vy+=(b.ty-b.y)*k;
    b.vx*=.8;b.vy*=.8;b.x+=b.vx;b.y+=b.vy;
    if(Math.hypot(b.x-b.tx,b.y-b.ty)<1.5&&Math.hypot(b.vx,b.vy)<.15){
      b.snapped=true;b.x=b.tx;b.y=b.ty;
    }
  });

  /* Stamps — ZERO clipping, render anywhere on canvas */
  ctx.save();ctx.globalAlpha=1;
  alignStamps.forEach(s=>{
    ctx.font=FM(CMD_FS);ctx.textBaseline='middle';
    const tw=ctx.measureText(s.text).width;
    block(ctx,s.x,s.y,tw,CMD_FS,s.bgColor,CMD_PX,CMD_PY);
    ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(s.text,s.x,s.y);
  });
  ctx.restore();

  /* Active blocks */
  ctx.textBaseline='middle';
  alignBlocks.forEach(b=>{
    const label='#'+b.n+' '+b.text;
    ctx.font=FM(CMD_FS);
    const tw=ctx.measureText(label).width;
    block(ctx,b.x,b.y,tw,CMD_FS,b.bgColor,CMD_PX,CMD_PY);
    ctx.fillStyle='rgba(10,10,10,.92)';
    ctx.fillText(label,b.x,b.y);
    ctx.fillStyle='rgba(0,0,0,.07)';
    ctx.fillRect(b.x,b.y+CMD_FS*.7,tw,1);
    if(!b.snapped&&Math.hypot(b.x-b.tx,b.y-b.ty)>20){
      ctx.strokeStyle='rgba(0,0,0,.06)';ctx.fillStyle='rgba(0,0,0,.06)';ctx.lineWidth=.7;
      arrow(ctx,b.x+tw+4,b.y,b.tx+tw*.3+4,b.ty,2.5);
    }
  });
}

/* ═══ INPUT ════════════════════════════════════════════════════════ */
function renderInput(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Input);

  const stageBottom=safeStageBottom(H);
  const xR = W * VIDEO_RIGHT_BOUND_FRAC;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, xR, stageBottom);
  ctx.clip();

  ctx.textBaseline='middle';
  for(const stamp of inputStamps){
    for(const line of stamp.lines){
      ctx.font=FM(line.fs);
      const tw=ctx.measureText(line.text).width;
      block(ctx,line.x,line.y,tw,line.fs,line.bg,5,3);
      ctx.fillStyle='rgba(10,10,10,.9)';
      ctx.fillText(line.text,line.x,line.y);
    }
  }
  ctx.restore();

  drawUnifiedCommandStack(ctx, W, H, D.Input);
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
}

/* ═══ LOOP — stream scroll tied to loopT (advances only on drag) ══ */
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
    const freq=.55+si*.22;
    const spdSign=(si%2===0?1:-1);
    const cmd=cmds[si%cmds.length];
    const unit='#'+cmd.n+' '+cmd.text+'  ';
    const fs=15;ctx.font=FM(fs);const uw=ctx.measureText(unit).width;
    ctx.textBaseline='middle';const bg=streamBg[si];
    /* scroll position from loopT (only changes on drag) */
    const scroll=(loopT*58*spdSign)%uw;
    /* Wave phase ALSO tied to loopT — fully static when no interaction */
    const phase = loopT * spdSign * 7;
    for(let sx=-uw+scroll;sx<W+uw;sx+=uw){
      const relX=sx/W;
      const y=baseY+Math.sin(relX*Math.PI*freq*2+phase)*amp;
      const dy2=Math.cos(relX*Math.PI*freq*2+phase)*amp*(Math.PI*freq*2/W);
      const ang=Math.atan2(dy2,1)*.52;
      ctx.save();ctx.translate(sx,y);ctx.rotate(ang);
      ctx.fillStyle=bg;ctx.fillRect(-2,-fs*.55-3,uw+4,fs+5);
      ctx.fillStyle='rgba(10,10,10,.88)';ctx.fillText(unit,0,0);ctx.restore();
    }
  }
}

/* ═══ CONTROL — clean initial state: ONLY left command stack ═══════
   No horizontal connector, no extra structure above. The HTML
   #control-hint-bar provides "Drag to Control" above the video row.
   First drag flips controlInteracted → chaotic layered traces. */
function renderControl(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Control);

  const boxH=CMD_FS+CMD_PY*2+2;
  ctx.font=FM(CMD_FS);ctx.textBaseline='middle';

  /* Always visible: the unified left command stack */
  drawUnifiedCommandStack(ctx, W, H, D.Control);

  if(controlInteracted){
    /* Chaotic state — layered stacks. No vertical clamp; video row
       (higher z-index) covers any visual overlap automatically. */
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
          ctx.fillStyle=box.bg;
          ctx.fillRect(bx-CMD_PX,by-boxH/2,unifiedW,boxH);
          if(li<=2){
            ctx.fillStyle='rgba(10,10,10,.92)';
            ctx.fillText(box.text,bx+CMD_PX,by);
          }
        }
      }
    }
  }
}

/* ═══ EDGE ═════════════════════════════════════════════════════════ */
function initEdge(W,H){
  if(edgeInit)return;edgeInit=true;
  const stageBottom=safeStageBottom(H);
  D.Edge.forEach((cmd,ci)=>{
    for(let j=0;j<6;j++){
      edgeParts.push({
        text:'#'+cmd.n+' '+cmd.text,
        x:W*.20+Math.random()*W*.60,
        y:H*.15+Math.random()*(stageBottom*.55),
        vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,
        rot:(Math.random()-.5)*.05,vrot:(Math.random()-.5)*.002,
        bgColor:CMD_BG[ci%CMD_BG.length]
      });
    }
  });
}
function edgeExplode(ex,ey,W,H){
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
  if(edgeParts.length>400)edgeParts.splice(0,edgeParts.length-400);
}
function renderEdge(cv){
  const r=sz(cv);if(!r)return;const{ctx,W,H}=r;
  initEdge(W,H);ctx.fillStyle='#f0f0ee';ctx.fillRect(0,0,W,H);
  drawBg(ctx,W,H,D.Edge);

  const stageBottom=safeStageBottom(H);
  ctx.save();
  ctx.beginPath();ctx.rect(0,0,W,stageBottom);ctx.clip();
  ctx.strokeStyle='rgba(0,0,0,.04)';ctx.fillStyle='rgba(0,0,0,.04)';ctx.lineWidth=.5;
  for(let gx=55;gx<W;gx+=65){for(let gy=55;gy<stageBottom;gy+=65){
    const dx=gx-W/2,dy=gy-stageBottom/2,d=Math.max(Math.hypot(dx,dy),1);
    arrow(ctx,gx,gy,gx+dx/d*14,gy+dy/d*14,2.5);
  }}
  ctx.restore();

  ctx.textBaseline='middle';
  edgeParts.forEach(p=>{
    p.vx*=.992;p.vy*=.992;p.vrot*=.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;
    if(p.x<0){p.x=0;p.vx=Math.abs(p.vx)*.6}
    if(p.x>W){p.x=W;p.vx=-Math.abs(p.vx)*.6}
    if(p.y<0){p.y=0;p.vy=Math.abs(p.vy)*.6}
    if(p.y>H){p.y=H;p.vy=-Math.abs(p.vy)*.6}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
    ctx.font=FM(CMD_FS);const tw=ctx.measureText(p.text).width;
    ctx.fillStyle=p.bgColor;ctx.fillRect(-tw/2-CMD_PX,-(CMD_FS*.55+CMD_PY),tw+CMD_PX*2,CMD_FS+CMD_PY*2);
    ctx.fillStyle='rgba(10,10,10,.9)';ctx.fillText(p.text,-tw/2,0);
    ctx.restore();
  });
}

/* ─── Detail ─────────────────────────────────────────────────────── */
function showDetail(c,cmd){
  const tStart=cmd.tStart||0;
  const tEnd=cmd.tEnd||30;

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
  /* Detail video — object-fit:cover removes the letterbox/white sides.
     The 16:9 room matches the 16:9 video exactly, so cover crops
     effectively zero pixels while eliminating the side boxes. */
  vid.style.cssText=
    'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;'+
    'display:block;z-index:1;border:none!important;outline:none!important;'+
    'background:#f0f0ee;clip-path:inset(3px 1px 3px 1px);'+
    '-webkit-clip-path:inset(3px 1px 3px 1px)';
  vid.innerHTML=`<source src="${cmd.video}" type="video/mp4">`;
  vid.addEventListener('loadedmetadata',()=>{vid.currentTime=tStart});
  vid.addEventListener('timeupdate',()=>{if(vid.currentTime>=tEnd)vid.currentTime=tStart});

  /* Detail room smaller (72vw) — matches CSS */
  const rm=$('det-room');
  rm.style.cssText=
    'border:none!important;outline:none!important;box-shadow:none!important;'+
    'position:relative;z-index:2;'+
    'width:72vw;height:calc(72vw*9/16);'+
    'max-height:70vh;max-width:calc(70vh*16/9);'+
    'overflow:hidden;background:transparent';
  rm.innerHTML='';
  rm.appendChild(vid);
  vid.play().catch(()=>{vid.muted=true;vid.play().catch(()=>{})});

  muteAllExcept(null);

  let cluster=det.querySelector('.det-ui-cluster');
  if(!cluster){
    cluster=document.createElement('div');
    cluster.className='det-ui-cluster';
    det.appendChild(cluster);
  }
  cluster.innerHTML='';

  const backBtn=document.createElement('button');
  backBtn.textContent='Back';
  backBtn.onclick=()=>{
    vid.muted=true;vid.pause();
    document.body.classList.remove('detail-open');
    $('s-cat-'+c)?.scrollIntoView({behavior:'smooth'});
  };
  cluster.appendChild(backBtn);

  const sndBtn=document.createElement('button');
  sndBtn.textContent='Sound On';
  sndBtn.onclick=()=>{
    if(vid.muted){vid.muted=false;sndBtn.textContent='Sound On'}
    else{vid.muted=true;sndBtn.textContent='Sound Off'}
  };
  cluster.appendChild(sndBtn);

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

/* ─── CURSOR COLOR — pink over lime areas, lime otherwise ──────────
   Sampling strategy: temporarily hide #mag (so it's not the target),
   then elementFromPoint(MX,MY) returns the real element under the
   pointer. Walk ancestors checking for known lime backgrounds:
   - the top bar (#bar — bright lime)
   - any element with computed bg matching lime
   We cache the result and only re-evaluate every few frames to keep
   CPU usage minimal. */
function isOverLime(){
  if(MX<0||MY<0) return false;
  const mag = $('mag');
  if(!mag) return false;
  const prevDisplay = mag.style.display;
  mag.style.display = 'none';
  let el = null;
  try{
    el = document.elementFromPoint(MX, MY);
  }catch(_){}
  mag.style.display = prevDisplay;
  if(!el) return false;

  /* Walk up to 6 ancestors */
  let cur = el;
  for(let i=0;i<6 && cur;i++){
    if(cur.id === 'bar') return true;
    /* Read computed background color */
    try{
      const bg = getComputedStyle(cur).backgroundColor;
      /* Lime is rgb(223, 255, 0). Match with tolerance. */
      const m = bg && bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if(m){
        const rr = parseInt(m[1]), gg = parseInt(m[2]), bb = parseInt(m[3]);
        /* Bright yellow-green family: high R, very high G, very low B */
        if(rr>200 && gg>240 && bb<60){
          /* Also check alpha is not 0 */
          const am = bg.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)/);
          const a = am ? parseFloat(am[1]) : 1;
          if(a > 0.3) return true;
        }
      }
    }catch(_){}
    cur = cur.parentElement;
  }
  return false;
}

let magOverLime = false;
function updateMagColor(){
  /* Only sample occasionally — every ~6 frames is plenty */
  const nowOverLime = isOverLime();
  if(nowOverLime !== magOverLime){
    magOverLime = nowOverLime;
    const mag = $('mag');
    if(mag){
      mag.style.borderColor = magOverLime ? CURSOR_PINK : CURSOR_LIME;
    }
  }
}

function renderMag(){
  const mag=$('mag');if(!mag)return;
  if(MX<0){mag.style.left='-200px';return}
  magX+=(MX-magX)*.22;magY+=(MY-magY)*.22;
  mag.style.left=(magX-21)+'px';mag.style.top=(magY-21)+'px';
  if(FC%6===0) updateMagColor();
}