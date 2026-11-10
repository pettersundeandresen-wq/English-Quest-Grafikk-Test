// English Quest graphics test – uses only the actual uploaded PNG files.
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const T=64, W=112, H=82, ZOOM=1.15;
const images={}, keys=new Set();
let last=0,walkClock=0,joy={x:0,y:0},activePointer=null,noticeUntil=0;
const player={x:18,y:19,dir:'down',moving:false};
let ringStrength=0; // Smoothly increases when scenery hides the avatar.
const files={
 oak:'assets/nature/tree_oak.png',spruce:'assets/nature/tree_spruce.png',birch:'assets/nature/tree_birch.png',blossom:'assets/nature/tree_blossom.png',bush:'assets/nature/bush_berries.png',rock:'assets/nature/rock_moss.png',house:'assets/buildings/house_cottage.png',chest:'assets/objects/chest_open.png'
};
for(const dir of ['down','up','left','right'])for(const pose of ['idle','step_left','step_right'])files[`avatar_${dir}_${pose}`]=`assets/avatar/avatar_${dir}_${pose}.png`;
const rand=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*47.9)*43758.5453;return n-Math.floor(n)};
const grass=(x,y)=>x<36?'#a3ca88':x<66?'#81b38a':x<88?'#8cbb8a':'#9aa991';
const terrain=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>({kind:'grass'})));
function paintDisk(x,y,r,kind){for(let yy=Math.max(0,Math.floor(y-r));yy<=Math.min(H-1,Math.ceil(y+r));yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<=Math.min(W-1,Math.ceil(x+r));xx++)if(Math.hypot(xx-x,yy-y)<=r)terrain[yy][xx].kind=kind}
function route(points,r=2.3,kind='path'){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3);for(let j=0;j<=steps;j++){const q=j/steps;paintDisk(a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q,r,kind)}}}
// A continuous main route and several shortcuts through the forest.
route([[7,17],[18,19],[31,18],[43,26],[55,35],[68,40],[79,38],[96,48],[104,67]],2.6);
route([[31,18],[40,9],[56,11],[70,20],[79,38]],2.1);
route([[43,26],[45,48],[63,57],[83,54],[96,48]],2.1);
route([[18,19],[14,37],[31,54],[63,57]],2.0);
route([[68,40],[69,65],[88,71],[104,67]],1.8);
route([[79,38],[93,22],[104,16]],1.9);
// A small river with two bridges.
for(let x=55;x<70;x++)for(let y=0;y<H;y++){const cx=61+3*Math.sin(y/8);if(Math.abs(x-cx)<2.5)terrain[y][x].kind='water'}
route([[55,35],[68,40]],2.3,'bridge');route([[60,57],[65,57]],2.1,'bridge');
const house={x:16,y:14,type:'house',title:'Hjemmet',w:6.3,h:5.0};
const objects=[{x:25,y:23,type:'chest',title:'Skattekiste'},{x:43,y:34,type:'chest',title:'Skattekiste'},{x:79,y:35,type:'chest',title:'Skattekiste'},{x:98,y:57,type:'chest',title:'Skattekiste'}];
const nature=[];
for(let y=3;y<H-2;y+=2)for(let x=3;x<W-2;x+=2){
 const q=rand(x,y,9),r=rand(x,y,10),kind=terrain[y][x].kind;
 if(kind!=='grass'||Math.hypot(x-house.x,y-house.y)<9||objects.some(o=>Math.hypot(x-o.x,y-o.y)<3.5))continue;
 let type=null;
 if(x<36){if(q>.87)type=r>.75?'blossom':'birch';else if(q>.76)type='bush';else if(q>.72)type='rock'}
 else if(x<88){if(q>.71)type=r>.63?'spruce':r>.30?'oak':'birch';else if(q>.65)type='bush';else if(q>.60)type='rock'}
 else {if(q>.78)type=r>.55?'rock':'spruce';else if(q>.68)type='bush'}
 if(type)nature.push({x,y,type});
}
const blockers=nature.filter(o=>['oak','birch','blossom','spruce','rock'].includes(o.type));
function walkable(x,y){if(x<1.2||y<1.2||x>W-1.2||y>H-1.2)return false;
 const t=terrain[Math.floor(y)]?.[Math.floor(x)]?.kind;if(t==='water')return false;
 if(x>house.x-2.1&&x<house.x+2.1&&y>house.y-1.5&&y<house.y+1.1)return false;
 return !blockers.some(o=>Math.hypot(x-o.x,y-o.y)<(o.type==='rock'?.67:.52));
}
function loadAll(){const entries=Object.entries(files);let count=0;const status=document.getElementById('loadStatus');return Promise.all(entries.map(([key,url])=>new Promise(resolve=>{const im=new Image();images[key]=im;im.onload=()=>{count++;status.textContent=`Grafikk ${count}/${entries.length}`;resolve()};im.onerror=()=>{count++;console.warn('Kunne ikke laste',url);resolve()};im.src=url}))).then(()=>{status.textContent=`${entries.length} bildefiler kontrollert`;setTimeout(()=>status.textContent='Grafikkprototype',1600)})}
function drawAsset(type,x,y,w,h,alpha=1){const im=images[type];if(!im?.complete||!im.naturalWidth)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x-w/2,y-h,w,h);ctx.restore()}
function region(){return player.x<36?'🏡 Landsbyen':player.x<66?'🌲 Den ville skogen':player.x<88?'🌿 Elvedalen':'🪨 Steinmarken'}
function drawGround(x,y){const t=terrain[y][x].kind,X=x*T,Y=y*T;ctx.fillStyle=grass(x,y);ctx.fillRect(X,Y,T+1,T+1);
 if(t==='water'){ctx.fillStyle='#4a9ab1';ctx.fillRect(X,Y,T+1,T+1);ctx.strokeStyle='#a3e0e4';ctx.globalAlpha=.45;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X+8,Y+24);ctx.quadraticCurveTo(X+24,Y+19,X+39,Y+24);ctx.stroke();ctx.globalAlpha=1}
 else if(t==='path'||t==='bridge'){ctx.fillStyle=t==='bridge'?'#b58d59':'#d9bd87';ctx.fillRect(X,Y,T+1,T+1);if(t==='bridge'){ctx.strokeStyle='#795c39';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X,Y+16);ctx.lineTo(X+T,Y+16);ctx.moveTo(X,Y+47);ctx.lineTo(X+T,Y+47);ctx.stroke()}}
 else{const r=rand(x,y,13);if(r>.77){ctx.fillStyle=r>.9?'#dbe9a7':'#75ab75';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(X+15+r*20,Y+22,2.3,0,7);ctx.fill();ctx.globalAlpha=1}}
}
function draw(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;const dx=(keys.has('right')?1:0)-(keys.has('left')?1:0)+joy.x,dy=(keys.has('down')?1:0)-(keys.has('up')?1:0)+joy.y,mag=Math.hypot(dx,dy);player.moving=mag>.12;
 if(player.moving){const ux=dx/Math.max(1,mag),uy=dy/Math.max(1,mag);player.dir=Math.abs(ux)>Math.abs(uy)?ux>0?'right':'left':uy>0?'down':'up';const speed=5.2;let nx=player.x+ux*dt*speed,ny=player.y+uy*dt*speed;if(walkable(nx,player.y))player.x=nx;if(walkable(player.x,ny))player.y=ny;walkClock+=dt}
 const vw=canvas.width,vh=canvas.height;let camx=player.x*T-vw/(2*ZOOM),camy=player.y*T-vh/(2*ZOOM);camx=Math.max(0,Math.min(W*T-vw/ZOOM,camx));camy=Math.max(0,Math.min(H*T-vh/ZOOM,camy));ctx.clearRect(0,0,vw,vh);ctx.save();ctx.scale(ZOOM,ZOOM);ctx.translate(-camx,-camy);
 const x0=Math.max(0,Math.floor(camx/T)-2),y0=Math.max(0,Math.floor(camy/T)-2),x1=Math.min(W,x0+Math.ceil(vw/ZOOM/T)+5),y1=Math.min(H,y0+Math.ceil(vh/ZOOM/T)+5);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)drawGround(x,y);
 const drawables=[];for(const o of nature)if(o.x>=x0-4&&o.x<x1+4&&o.y>=y0-4&&o.y<y1+4)drawables.push(o);
 drawables.push(house,...objects,{...player,type:'player'});drawables.sort((a,b)=>a.y-b.y);
 // An object can obscure the avatar only when it is drawn after the player.
 // Use a conservative visual footprint around the upper body, rather than
 // making an entire tree transparent merely because it is nearby.
 const avatarTop=player.y*T-88, avatarBottom=player.y*T-12;
 const avatarLeft=player.x*T-25, avatarRight=player.x*T+25;
 let hidden=false;
 const playerIndex=drawables.findIndex(o=>o.type==='player');
 for(let i=playerIndex+1;i<drawables.length;i++){
   const o=drawables[i];
   if(o.type==='chest')continue;
   const X=o.x*T,Y=o.y*T;
   let w,h,bottom;
   if(o.type==='house'){w=410;h=295;bottom=Y+55}
   else {const dims={oak:[235,215],birch:[218,230],spruce:[180,235],blossom:[220,220],bush:[106,79],rock:[124,83]}[o.type];if(!dims)continue;[w,h]=dims;bottom=Y}
   const left=X-w*.43,right=X+w*.43,top=bottom-h*.91,low=bottom-h*.07;
   const overlapX=Math.max(0,Math.min(avatarRight,right)-Math.max(avatarLeft,left));
   const overlapY=Math.max(0,Math.min(avatarBottom,low)-Math.max(avatarTop,top));
   if(overlapX>18&&overlapY>25){hidden=true;break}
 }
 ringStrength+=((hidden?1:0)-ringStrength)*Math.min(1,dt*9);
 for(const o of drawables){const X=o.x*T,Y=o.y*T;
 if(o.type==='player'){
 ctx.fillStyle='#1a4b4170';ctx.beginPath();ctx.ellipse(X,Y+3,18,7,0,0,7);ctx.fill();
 const pose=!player.moving?'idle':Math.floor(walkClock*7)%2?'step_left':'step_right';drawAsset(`avatar_${player.dir}_${pose}`,X,Y,74,95);
 }else if(o.type==='house'){const w=410,h=295;drawAsset('house',X,Y+55,w,h)}
 else if(o.type==='chest')drawAsset('chest',X,Y,110,82);
 else{const dims={oak:[235,215],birch:[218,230],spruce:[180,235],blossom:[220,220],bush:[106,79],rock:[124,83]}[o.type];drawAsset(o.type,X,Y,dims[0],dims[1])}
 }
 // Draw the location ring LAST so it stays visible above every object.
 // No transparency is applied to trees or buildings.
 const PX=player.x*T,PY=player.y*T;
 const pulse=(Math.sin(now*.005)+1)*.5;
 ctx.save();
 ctx.strokeStyle='#fff2b0';
 ctx.lineWidth=2+ringStrength*(2.5+.6*pulse);
 ctx.globalAlpha=.72+ringStrength*.28;
 ctx.beginPath();ctx.ellipse(PX,PY,22+ringStrength*(3+pulse*2),10+ringStrength*(2+pulse),0,0,Math.PI*2);ctx.stroke();
 if(ringStrength>.06){
   ctx.globalAlpha=ringStrength*(.45+.15*pulse);
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.ellipse(PX,PY,29+ringStrength*3,14+ringStrength*2,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
 ctx.restore();document.getElementById('region').textContent=region();document.getElementById('position').textContent=`${Math.floor(player.x)}, ${Math.floor(player.y)}`;requestAnimationFrame(draw)
}
const dirs={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'){e.preventDefault();toggleMap();return}const d=dirs[e.key.toLowerCase()];if(d){keys.add(d);e.preventDefault()}});
addEventListener('keyup',e=>{const d=dirs[e.key.toLowerCase()];if(d)keys.delete(d)});
const stick=document.getElementById('joystick'),knob=document.getElementById('knob');function resetStick(){joy={x:0,y:0};knob.style.transform='translate(-50%,-50%)'}
function updateStick(e){const r=stick.getBoundingClientRect(),radius=r.width*.29;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const m=Math.hypot(x,y),f=Math.min(1,radius/(m||1));x*=f;y*=f;joy={x:x/radius,y:y/radius};if(Math.hypot(joy.x,joy.y)<.13)joy={x:0,y:0};knob.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`}
stick.addEventListener('pointerdown',e=>{e.preventDefault();activePointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e)});
stick.addEventListener('pointermove',e=>{if(activePointer===e.pointerId)updateStick(e)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(activePointer===e.pointerId){activePointer=null;resetStick()}});
stick.addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',()=>{keys.clear();resetStick()});
const overlay=document.getElementById('overlay');function toggleMap(){if(overlay.classList.contains('hidden')){overlay.classList.remove('hidden');showMap()}else overlay.classList.add('hidden')}
function showMap(){const c=document.getElementById('map'),g=c.getContext('2d'),sx=c.width/W,sy=c.height/H;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=terrain[y][x].kind;g.fillStyle=t==='water'?'#4d9fb5':t==='path'?'#dfc28f':t==='bridge'?'#a98757':grass(x,y);g.fillRect(x*sx,y*sy,sx+1,sy+1)}g.fillStyle='#be5b48';g.fillRect((house.x-3)*sx,(house.y-3)*sy,6*sx,5*sy);for(const o of objects){g.fillStyle='#efb83b';g.beginPath();g.arc(o.x*sx,o.y*sy,4,0,7);g.fill()}g.fillStyle='#2264c4';g.beginPath();g.arc(player.x*sx,player.y*sy,8,0,7);g.fill();g.strokeStyle='white';g.lineWidth=3;g.stroke()}
document.getElementById('mapBtn').onclick=toggleMap;document.getElementById('close').onclick=toggleMap;overlay.addEventListener('click',e=>{if(e.target===overlay)toggleMap()});
document.getElementById('interact').onclick=()=>{const nearest=[house,...objects].map(o=>({...o,dist:Math.hypot(player.x-o.x,player.y-o.y)})).sort((a,b)=>a.dist-b.dist)[0];const hint=document.getElementById('hint');hint.textContent=nearest.dist<5?`✨ ${nearest.title}: grafikkdemo – oppgaver kommer senere`:'Gå nærmere huset eller en skattekiste for å undersøke.';clearTimeout(noticeUntil);noticeUntil=setTimeout(()=>hint.textContent='Utforsk de nye illustrasjonene og prøv å gå bak trærne.',4500)};
loadAll().then(()=>requestAnimationFrame(draw));
