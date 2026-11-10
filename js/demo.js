'use strict';
// English Quest - World 2.0. Corrected graphics test.
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const TILE = 64, WIDTH = 124, HEIGHT = 94, ZOOM = 1.15, SPEED = 5;
const SCALE = { grass: .25, path: .25, water: .25 };
const images = {}, patterns = {}, pressed = new Set();
const player = { x: 17, y: 18, dir: 'down', moving: false };
const stickState = { x: 0, y: 0 };
let pointer = null, last = 0, steps = 0, ring = 0, hintTimer;
const rand = (x,y,s=0) => { const v=Math.sin(x*127.1+y*311.7+s*47.9)*43758.5453; return v-Math.floor(v); };
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const zoneList = [
  { name:'Blomsterlandsbyen', emoji:'🏡', x:0, end:31, tint:'#a3cb80' },
  { name:'Den ville skogen', emoji:'🌲', x:31, end:52, tint:'#507d51' },
  { name:'Elvedalen', emoji:'🌊', x:52, end:72, tint:'#84bd91' },
  { name:'De gamle ruinene', emoji:'🪨', x:72, end:91, tint:'#9eaa82' },
  { name:'Den magiske skogen', emoji:'✨', x:91, end:108, tint:'#8ea6a0' },
  { name:'Slottsområdet', emoji:'🏰', x:108, end:124, tint:'#b9a7c9' }
];
const zone = x => zoneList.find(z => x < z.end) || zoneList.at(-1);
const paths = {
  grass:'assets/terrain/grass_base.png', path:'assets/terrain/dirt_path.png', water:'assets/terrain/water_base.png',
  oak:'assets/nature/tree_oak.png', spruce:'assets/nature/tree_spruce.png', birch:'assets/nature/tree_birch.png',
  blossom:'assets/nature/tree_blossom.png', bush:'assets/nature/bush_berries.png', rock:'assets/nature/rock_moss.png',
  home:'assets/buildings/building_home.png', library:'assets/buildings/building_library.png',
  shop:'assets/buildings/building_shop.png', school:'assets/buildings/building_school.png',
  castle:'assets/buildings/building_castle.png', wizard:'assets/buildings/building_wizard_tower.png'
};
const questTypes = ['chest','crystal','runestone','magic_book','quest_board','magic_mushroom','locked_gate','star_altar'];
for (const type of questTypes) paths[type] = `assets/objects/${type}.png`;
for (const type of ['new','retry','cooldown','done','special']) paths[`status_${type}`] = `assets/status/status_${type}.png`;
const detailNames = ['reeds','pebbles','grass_tuft','daisies','mushrooms','fern','log','pink_flowers','fallen_leaves','water_lily','dry_grass','magic_flowers'];
for (const name of detailNames) paths[`detail_${name}`] = `assets/nature/details/${name}.png`;
for (const d of ['down','up','left','right']) for (const p of ['idle','step_left','step_right'])
  paths[`avatar_${d}_${p}`] = `assets/avatar/avatar_${d}_${p}.png`;
// Retain compatibility with older asset names if the new files are not present.
const fallback = { home:'assets/buildings/house_cottage.png', chest:'assets/objects/chest_open.png' };
const terrain = Array.from({length:HEIGHT}, () => Array(WIDTH).fill('grass'));
const kind = (x,y) => terrain[y]?.[x] || 'grass';
function disk(cx,cy,r,t) {
  for (let y=Math.max(0,Math.floor(cy-r));y<=Math.min(HEIGHT-1,Math.ceil(cy+r));y++)
    for (let x=Math.max(0,Math.floor(cx-r));x<=Math.min(WIDTH-1,Math.ceil(cx+r));x++)
      if (Math.hypot(x-cx,y-cy)<=r) terrain[y][x]=t;
}
function route(points,r=2.3,t='path') {
  for (let i=1;i<points.length;i++) {
    const [ax,ay]=points[i-1], [bx,by]=points[i], n=Math.ceil(Math.hypot(bx-ax,by-ay)*4);
    for (let j=0;j<=n;j++) { const f=j/n; disk(ax+(bx-ax)*f,ay+(by-ay)*f,r,t); }
  }
}
const mainRoad = [[8,18],[17,18],[29,21],[39,28],[48,39],[58,43],[69,43],[79,48],[90,43],[99,37],[110,29],[117,27]];
route(mainRoad,2.7);
[
 [[16,18],[16,31],[31,37],[42,46],[48,39]],
 [[29,21],[37,13],[49,14],[58,26],[58,43]],
 [[39,28],[39,62],[56,71],[78,64],[90,43]],
 [[69,43],[78,25],[89,22],[99,37]],
 [[79,48],[84,74],[101,77],[113,61],[117,27]],
 [[99,37],[104,15],[116,14],[117,27]]
].forEach(p=>route(p,1.9));
// A winding north-south river, with two clear crossings.
for(let y=0;y<HEIGHT;y++) {
  const center=61+3.8*Math.sin(y/10)+1.7*Math.sin(y/3.8);
  for(let x=0;x<WIDTH;x++) if(Math.abs(x-center)<3.2) terrain[y][x]='water';
}
const bridges=[];
for(const by of [43,70]) {
  const bx=61+3.8*Math.sin(by/10)+1.7*Math.sin(by/3.8);
  for(let y=by-2;y<=by+2;y++) for(let x=Math.floor(bx-5);x<=Math.ceil(bx+5);x++)
    if(kind(x,y)==='water') { terrain[y][x]='bridge'; bridges.push({x,y}); }
}
const buildings = [
 {type:'home',name:'Hjemmet',x:14,y:14,w:390,h:290,r:2.25},
 {type:'library',name:'Biblioteket',x:25,y:14,w:420,h:300,r:2.35},
 {type:'shop',name:'Butikken',x:12,y:29,w:410,h:310,r:2.3},
 {type:'school',name:'Skolen',x:29,y:29,w:430,h:320,r:2.4},
 {type:'wizard',name:'Magikertårnet',x:101,y:33,w:350,h:420,r:2.2},
 {type:'castle',name:'Eventyrslottet',x:116,y:24,w:570,h:440,r:3.1}
];
// Keep front doors approachable, and do not scatter nature in building yards.
for(const b of buildings) {
  disk(b.x,b.y+1.6,2.4,'path');
  route([[b.x,b.y+1.6],[b.x,b.y+5.2]],1.35);
}
const blockedByBuilding = (x,y) => buildings.some(b => Math.abs(x-b.x)<b.r && y>b.y-1.6 && y<b.y+.55);
const inYard = (x,y) => buildings.some(b => Math.hypot((x-b.x)*.8,y-b.y)<b.r+3.4);
const near = (x,y,type,r=1) => { for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) if((dx||dy)&&kind(x+dx,y+dy)===type) return true; return false; };
const clearGrass = (x,y,r=1) => { for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) if(kind(x+dx,y+dy)!=='grass') return false; return true; };
const nature=[], decorations=[], quests=[];
const treeSizes = {oak:[260,238],spruce:[182,246],birch:[222,234],blossom:[238,223],bush:[113,85],rock:[132,91]};
for(let y=3;y<HEIGHT-3;y+=2) for(let x=3;x<WIDTH-3;x+=2) {
  if(!clearGrass(x,y,1)||inYard(x,y)||Math.hypot(x-player.x,y-player.y)<5) continue;
  const q=rand(x,y,4), r=rand(x,y,5), z=zone(x).name;
  let type=null;
  if(z==='Blomsterlandsbyen') type=q>.87?(r>.55?'blossom':'birch'):q>.77?'bush':q>.73?'rock':null;
  if(z==='Den ville skogen') type=q>.69?(r>.42?'spruce':'oak'):q>.61?'bush':q>.57?'rock':null;
  if(z==='Elvedalen') type=q>.84?(r>.5?'birch':'oak'):q>.74?'bush':null;
  if(z==='De gamle ruinene') type=q>.80?'rock':q>.75?'spruce':null;
  if(z==='Den magiske skogen') type=q>.79?(r>.4?'blossom':'oak'):q>.68?'bush':null;
  if(z==='Slottsområdet') type=q>.89?'blossom':q>.79?'birch':null;
  if(type) nature.push({type,x,y,...Object.fromEntries([['w',treeSizes[type][0]],['h',treeSizes[type][1]]])});
}
// Fixed quest sites near traversable routes; no tasks in water or building entrances.
const sites = [
 [21,25],[9,37],[31,17],[36,34],[41,51],[47,18],[51,61],[54,34],
 [68,35],[70,51],[74,24],[79,60],[84,40],[88,68],[93,31],[96,55],
 [102,21],[104,66],[111,42],[117,50],[114,70],[25,47],[38,70],[77,76]
];
function nearestSafe(x,y) {
  for(let radius=0;radius<12;radius++) for(let dy=-radius;dy<=radius;dy++) for(let dx=-radius;dx<=radius;dx++) {
    const nx=x+dx,ny=y+dy;
    if(nx<3||ny<3||nx>=WIDTH-3||ny>=HEIGHT-3||blockedByBuilding(nx,ny)) continue;
    if(kind(nx,ny)==='water'||kind(nx,ny)==='bridge'||inYard(nx,ny)) continue;
    if(nature.some(n=>Math.hypot(nx-n.x,ny-n.y)<1.5)) continue;
    return {x:nx,y:ny};
  }
  return {x,y};
}
const statuses=['new','new','new','retry','done','cooldown','special'];
sites.forEach(([x,y],i)=> {
  const p=nearestSafe(x,y), type=questTypes[i%questTypes.length];
  quests.push({...p,type,quest:true,id:i+1,status:statuses[i%statuses.length],name:type.replaceAll('_',' ')});
});
for(let y=2;y<HEIGHT-2;y++) for(let x=2;x<WIDTH-2;x++) {
  if(inYard(x,y)||quests.some(q=>Math.hypot(q.x-x,q.y-y)<1.4)) continue;
  const t=kind(x,y), q=rand(x,y,18), r=rand(x,y,19), z=zone(x).name;
  let type=null, scale=.5;
  if(t==='water') { if(near(x,y,'grass',2)&&q>.975) type='water_lily'; }
  else if(t==='bridge') continue;
  else if(t==='path') { if(q>.987) {type='pebbles';scale=.35;} }
  else if(near(x,y,'water')) { if(q>.72) type=r>.3?'reeds':'pebbles'; }
  else if(near(x,y,'path')||near(x,y,'bridge')) { if(q>.82) type=r>.55?'grass_tuft':'pebbles'; }
  else if(z==='Den ville skogen') { if(q>.86) type=r>.65?'fern':r>.35?'mushrooms':'fallen_leaves'; }
  else if(z==='De gamle ruinene') { if(q>.88) type=r>.5?'pebbles':'dry_grass'; }
  else if(z==='Den magiske skogen') { if(q>.88) type=r>.6?'magic_flowers':'pink_flowers'; }
  else if(q>.91) type=r>.6?'daisies':r>.3?'pink_flowers':'grass_tuft';
  if(type && !nature.some(n=>Math.hypot(n.x-x,n.y-y)<1)) decorations.push({x:x+.25,y:y+.25,type:`detail_${type}`,detail:true,scale});
}
const blockers=nature.filter(o=>['oak','spruce','birch','blossom','rock'].includes(o.type));
function walkable(x,y) {
  if(x<1||y<1||x>WIDTH-1||y>HEIGHT-1) return false;
  if(kind(Math.floor(x),Math.floor(y))==='water'||blockedByBuilding(x,y)) return false;
  return !blockers.some(o=>Math.hypot(o.x-x,o.y-y)<(o.type==='rock'?.7:.55));
}
function loadImage(key,url) {
  return new Promise(resolve=>{
    const img=new Image(); images[key]=img;
    img.onload=()=>resolve(true);
    img.onerror=()=>{
      if(fallback[key]) { img.src=fallback[key]; delete fallback[key]; }
      else {console.warn('Missing asset:',url);resolve(false);}
    };
    img.src=url;
  });
}
async function loadAssets() {
  const entries=Object.entries(paths); let count=0;
  await Promise.all(entries.map(async ([key,url])=>{
    await loadImage(key,url);count++;
    if($('loadStatus')) $('loadStatus').textContent=`Grafikk ${count}/${entries.length}`;
  }));
  for(const type of ['grass','path','water']) {
    const img=images[type];if(!img?.naturalWidth) continue;
    const tile=document.createElement('canvas');tile.width=Math.max(1,Math.round(img.naturalWidth*SCALE[type]));
    tile.height=Math.max(1,Math.round(img.naturalHeight*SCALE[type]));
    const c=tile.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(img,0,0,tile.width,tile.height);
    patterns[type]=ctx.createPattern(tile,'repeat');
  }
  if($('loadStatus')) $('loadStatus').textContent='Verden 2.0';
}
function asset(type,x,y,w,h) { const img=images[type]; if(img?.naturalWidth) ctx.drawImage(img,x-w/2,y-h,w,h); }
function ground(x0,y0,x1,y1,camx,camy,vw,vh) {
  ctx.fillStyle=patterns.grass||'#89b971';ctx.fillRect(camx,camy,vw,vh);
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
    const t=kind(x,y);if(t==='grass') continue;
    ctx.fillStyle=patterns[t==='bridge'?'path':t]||(t==='water'?'#2c91a9':'#c99c65');
    ctx.fillRect(x*TILE,y*TILE,TILE+.2,TILE+.2);
  }
  // Gentle regional color atmosphere; transparent overlays do not change the base assets.
  for(const z of zoneList) {
    const x=z.x*TILE, width=(z.end-z.x)*TILE;
    if(x+width<camx||x>camx+vw) continue;
    ctx.fillStyle=z.tint;ctx.globalAlpha=.055;ctx.fillRect(x,camy,width,vh);ctx.globalAlpha=1;
  }
}
const dims={
  chest:[112,98],crystal:[114,119],runestone:[105,128],magic_book:[112,92],
  quest_board:[122,120],magic_mushroom:[114,110],locked_gate:[155,143],star_altar:[138,136]
};
function hiddenBehind(list) {
  const i=list.findIndex(o=>o.type==='player'), px=player.x*TILE,py=player.y*TILE;
  for(const o of list.slice(i+1)) {
    if(o.detail||o.quest) continue;
    const w=o.w,h=o.h;if(!w||!h) continue;
    const X=o.x*TILE,Y=o.y*TILE+(o.building?48:0);
    const ox=Math.max(0,Math.min(px+25,X+w*.43)-Math.max(px-25,X-w*.43));
    const oy=Math.max(0,Math.min(py-12,Y-h*.07)-Math.max(py-88,Y-h*.91));
    if(ox>18&&oy>25) return true;
  }
  return false;
}
function drawRing(now) {
  const x=player.x*TILE,y=player.y*TILE,p=(Math.sin(now*.005)+1)/2;
  ctx.save();ctx.strokeStyle='#fff1aa';ctx.globalAlpha=.8+ring*.2;ctx.lineWidth=2+ring*(2.5+.7*p);
  ctx.beginPath();ctx.ellipse(x,y,22+ring*(3+2*p),10+ring*(2+p),0,0,Math.PI*2);ctx.stroke();
  if(ring>.05) {ctx.globalAlpha=ring*(.45+.2*p);ctx.strokeStyle='white';ctx.lineWidth=1.7;
    ctx.beginPath();ctx.ellipse(x,y,30+ring*3,14+ring*2,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function render(now) {
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  const dx=(+pressed.has('right'))-(+pressed.has('left'))+stickState.x;
  const dy=(+pressed.has('down'))-(+pressed.has('up'))+stickState.y;
  const mag=Math.hypot(dx,dy);player.moving=mag>.12;
  if(player.moving) {
    const ux=dx/Math.max(1,mag),uy=dy/Math.max(1,mag);
    player.dir=Math.abs(ux)>Math.abs(uy)?(ux>0?'right':'left'):(uy>0?'down':'up');
    const nx=player.x+ux*dt*SPEED,ny=player.y+uy*dt*SPEED;
    if(walkable(nx,player.y))player.x=nx;if(walkable(player.x,ny))player.y=ny;steps+=dt;
  }
  const vw=canvas.width,vh=canvas.height,viewW=vw/ZOOM,viewH=vh/ZOOM;
  const camx=Math.max(0,Math.min(WIDTH*TILE-viewW,player.x*TILE-viewW/2));
  const camy=Math.max(0,Math.min(HEIGHT*TILE-viewH,player.y*TILE-viewH/2));
  const x0=Math.max(0,Math.floor(camx/TILE)-3),y0=Math.max(0,Math.floor(camy/TILE)-3);
  const x1=Math.min(WIDTH,Math.ceil((camx+viewW)/TILE)+3),y1=Math.min(HEIGHT,Math.ceil((camy+viewH)/TILE)+3);
  ctx.clearRect(0,0,vw,vh);ctx.save();ctx.scale(ZOOM,ZOOM);ctx.translate(-camx,-camy);
  ground(x0,y0,x1,y1,camx,camy,viewW,viewH);
  const visible=o=>o.x>x0-6&&o.x<x1+6&&o.y>y0-7&&o.y<y1+7;
  const drawables=[...decorations.filter(visible),...nature.filter(visible),
    ...buildings.filter(visible).map(b=>({...b,building:true})),...quests.filter(visible),{...player,type:'player'}];
  drawables.sort((a,b)=>a.y-b.y);
  ring+=(Number(hiddenBehind(drawables))-ring)*Math.min(1,dt*9);
  for(const o of drawables) {
    const x=o.x*TILE,y=o.y*TILE;
    if(o.type==='player') {
      ctx.fillStyle='rgba(20,55,35,.25)';ctx.beginPath();ctx.ellipse(x,y+3,18,7,0,0,Math.PI*2);ctx.fill();
      const pose=player.moving?(Math.floor(steps*7)%2?'step_left':'step_right'):'idle';
      asset(`avatar_${player.dir}_${pose}`,x,y,74,95);
    } else if(o.building) asset(o.type,x,y+48,o.w,o.h);
    else if(o.quest) {
      const [w,h]=dims[o.type];asset(o.type,x,y,w,h);
      const bounce=o.status==='new'||o.status==='special'?Math.sin(now*.004+o.id)*5:0;
      const iconSize=o.status==='done'?48:57;
      asset(`status_${o.status}`,x,y-h+10+bounce,iconSize,iconSize);
    } else if(o.detail) {
      const w=74*o.scale,h=67*o.scale;asset(o.type,x,y,w,h);
    } else asset(o.type,x,y,o.w,o.h);
  }
  drawRing(now);ctx.restore();
  if($('region')) $('region').textContent=`${zone(player.x).emoji} ${zone(player.x).name}`;
  if($('position')) $('position').textContent=`${Math.floor(player.x)}, ${Math.floor(player.y)}`;
  requestAnimationFrame(render);
}
const dirs={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='m'){e.preventDefault();toggleMap();return;}
  const d=dirs[e.key.toLowerCase()];if(d){pressed.add(d);e.preventDefault();}
});
addEventListener('keyup',e=>{const d=dirs[e.key.toLowerCase()];if(d)pressed.delete(d);});
const joystick=$('joystick'),knob=$('knob');
function resetJoystick(){stickState.x=stickState.y=0;if(knob)knob.style.transform='translate(-50%,-50%)';}
function moveJoystick(e){
  const r=joystick.getBoundingClientRect(),radius=r.width*.29;
  let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
  const f=Math.min(1,radius/(Math.hypot(x,y)||1));x*=f;y*=f;
  stickState.x=x/radius;stickState.y=y/radius;
  if(Math.hypot(stickState.x,stickState.y)<.13)stickState.x=stickState.y=0;
  knob.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
}
if(joystick&&knob){
  joystick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture(pointer);moveJoystick(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)moveJoystick(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) joystick.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;resetJoystick();}});
  joystick.addEventListener('contextmenu',e=>e.preventDefault());
}
addEventListener('blur',()=>{pressed.clear();resetJoystick();});
const overlay=$('overlay');
function toggleMap(){if(!overlay)return;const open=overlay.classList.contains('hidden');overlay.classList.toggle('hidden');if(open)showMap();}
function showMap(){
  const c=$('map');if(!c)return;const g=c.getContext('2d'),sx=c.width/WIDTH,sy=c.height/HEIGHT;
  const colors={grass:'#80ad70',path:'#c99b65',water:'#398fa8',bridge:'#a98757'};
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    g.fillStyle=colors[kind(x,y)];g.fillRect(x*sx,y*sy,sx+1,sy+1);
  }
  for(const z of zoneList){g.fillStyle=z.tint;g.globalAlpha=.13;g.fillRect(z.x*sx,0,(z.end-z.x)*sx,c.height);g.globalAlpha=1;}
  for(const b of buildings){g.fillStyle='#b15d50';g.fillRect((b.x-1.5)*sx,(b.y-1.2)*sy,3*sx,2.4*sy);}
  for(const q of quests){g.fillStyle=q.status==='done'?'#56b577':'#edc34f';g.beginPath();g.arc(q.x*sx,q.y*sy,3,0,Math.PI*2);g.fill();}
  g.fillStyle='#2866d2';g.beginPath();g.arc(player.x*sx,player.y*sy,7,0,Math.PI*2);g.fill();
  g.strokeStyle='white';g.lineWidth=2;g.stroke();
}
if($('mapBtn'))$('mapBtn').onclick=toggleMap;
if($('close'))$('close').onclick=toggleMap;
if(overlay)overlay.addEventListener('click',e=>{if(e.target===overlay)toggleMap();});
if($('interact'))$('interact').onclick=()=>{
  const targets=[...buildings,...quests].map(o=>({...o,dist:distance(o,player)})).sort((a,b)=>a.dist-b.dist);
  const nearest=targets[0],hint=$('hint');if(!hint)return;
  if(nearest.dist<4.5) {
    hint.textContent=nearest.building||buildings.includes(nearest)
      ? `🚪 ${nearest.name}: innendørskart kommer i neste fase.`
      : `✨ Oppgave ${nearest.id}: ${nearest.name} (${nearest.status}). Oppgavesystemet kobles til senere.`;
  } else hint.textContent='Utforsk seks områder. Finn bygninger og oppdragsobjekter med statusikoner.';
  clearTimeout(hintTimer);hintTimer=setTimeout(()=>hint.textContent='Utforsk den store verdenen og finn nye oppdrag.',5000);
};
loadAssets().then(()=>requestAnimationFrame(render));
