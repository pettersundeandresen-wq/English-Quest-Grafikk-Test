export const TILE=40, W=180, H=130;
const rand=(x,y,z=0)=>{let n=Math.sin(x*127.1+y*311.7+z*83.13)*43758.5453;return n-Math.floor(n)};
const grid=Array.from({length:H},()=>Array(W).fill('grass'));
const paths=[[7,7],[20,9],[29,19],[46,19],[46,9],[68,9],[68,28],[88,28],[88,12],[111,12],[111,34],[135,34],[135,17],[165,17],[165,55],[146,55],[146,86],[165,86],[165,114],[125,114],[125,95],[95,95],[95,118],[58,118],[58,95],[26,95],[26,118],[8,118],[8,68],[28,68],[28,45],[7,45],[7,7]];
function carve(x,y,r=2,t='path'){for(let yy=Math.max(1,y-r);yy<Math.min(H-1,y+r+1);yy++)for(let xx=Math.max(1,x-r);xx<Math.min(W-1,x+r+1);xx++)if(Math.hypot(xx-x,yy-y)<=r+.2)grid[yy][xx]=t;}
function route(a,b,r=2){let n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*2);for(let i=0;i<=n;i++){let t=i/n;carve(Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),r)}}
for(let i=1;i<paths.length;i++)route(paths[i-1],paths[i]);
for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
 if(grid[y][x]==='path')continue;
 if((x>=73&&x<=79&&y<67)||(x>=115&&x<=121&&y>55)){grid[y][x]='water';continue;}
 let q=rand(x,y), forest=x>32||y>33, ruins=x>110&&y>75;
 if(ruins&&q<.32)grid[y][x]='rock';else if(forest&&q<.41)grid[y][x]='tree';else if(q<.10)grid[y][x]='bush';
}
// Bridges and scenic side paths keep every region connected.
for(const [a,b] of [[[75,26],[77,33]],[[118,92],[119,101]]])route(a,b,3);
const branchPoints=[[20,9],[29,19],[46,19],[68,28],[88,28],[111,34],[135,34],[146,55],[146,86],[125,95],[95,95],[58,95],[26,95],[28,68]];
for(let i=0;i<branchPoints.length;i++){const a=branchPoints[i],dx=(i%2?1:-1)*(8+i%5),dy=(i%3-1)*10;route(a,[Math.max(4,Math.min(W-5,a[0]+dx)),Math.max(4,Math.min(H-5,a[1]+dy))],1);}
export const entrances=[
 {id:'home',name:'Mitt hjem',x:13,y:10,icon:'🏠'},
 {id:'library',name:'Det magiske biblioteket',x:44,y:19,icon:'📚'},
 {id:'maze',name:'Labyrinten',x:91,y:29,icon:'🧩'},
 {id:'tower',name:'Trollmannstårnet',x:133,y:35,icon:'🧙'},
 {id:'cave',name:'Ekko-hulen',x:147,y:87,icon:'🔔'}
];
for(const e of entrances){carve(e.x,e.y,4,'clearing');}
export const objects=[];
// Stable IDs: 0..123 outdoors; 124..179 remain indoors.
const candidates=[];
for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++)if(['path','clearing'].includes(grid[y][x]))candidates.push({x,y});
candidates.sort((a,b)=>rand(a.x,a.y,77)-rand(b.x,b.y,77));
for(const c of candidates){if(objects.length>=124)break;
 if(entrances.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<6))continue;
 if(objects.some(o=>Math.hypot(c.x-o.x,c.y-o.y)<5.8))continue;
 objects.push({...c,id:objects.length,type:['chest','crystal','rune','bell','portal'][objects.length%5]});carve(c.x,c.y,1,'clearing');
}
if(objects.length!==124)throw new Error('Not enough quest positions: '+objects.length);
export const landmarks=[{x:7,y:7,name:'Landsbyen'},{x:50,y:19,name:'Skogstien'},{x:87,y:28,name:'Elvedalen'},{x:130,y:40,name:'Nordskogen'},{x:155,y:95,name:'Ruinene'},{x:28,y:110,name:'Magisk lysning'}];
export function tile(x,y){return grid[Math.floor(y)]?.[Math.floor(x)]||'water'}
export function walkable(x,y){return !['water','tree','rock'].includes(tile(x,y))}
export function region(x,y){if(x>115&&y>72)return 'Steinruinene';if(y>75)return 'Den magiske lysningen';if(x>77)return 'Elvedalen';if(y>32||x>33)return 'Den ville skogen';return 'Landsbyen'}
export function drawWorld(ctx,camera,time,done){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.fillStyle='#8bc985';ctx.fillRect(0,0,w,h);
 const x0=Math.max(0,Math.floor(camera.x/TILE)-2),x1=Math.min(W,Math.ceil((camera.x+w)/TILE)+2),y0=Math.max(0,Math.floor(camera.y/TILE)-2),y1=Math.min(H,Math.ceil((camera.y+h)/TILE)+2);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
 const px=x*TILE-camera.x,py=y*TILE-camera.y,t=grid[y][x],q=rand(x,y);
 ctx.fillStyle=t==='path'?'#d9ba84':t==='clearing'?'#b0d89a':t==='water'?'#4eaccd':q>.5?'#8bc782':'#85c17b';ctx.fillRect(px,py,TILE+1,TILE+1);
 if(t==='path'){ctx.fillStyle='#bb9c70';for(let i=0;i<3;i++){const xx=px+rand(x,y,i+2)*34,yy=py+rand(x,y,i+5)*34;ctx.fillRect(xx,yy,3,2)}}
 if(t==='grass'||t==='clearing'||t==='bush'){ctx.fillStyle='#539f61';for(let i=0;i<3;i++){const xx=px+rand(x,y,i+7)*35,yy=py+rand(x,y,i+10)*35;ctx.fillRect(xx,yy,2,5)}if(q>.84){ctx.fillStyle=q>.93?'#f4d0ed':'#fff0a6';ctx.beginPath();ctx.arc(px+20,py+18,3,0,7);ctx.fill()}}
 if(t==='water'){ctx.fillStyle='#79d5e6';ctx.fillRect(px+4+Math.sin(time/450+x+y)*3,py+10,22,3);ctx.fillRect(px+18,py+29,13,2)}
 if(t==='tree'){ctx.fillStyle='#4a6037';ctx.fillRect(px+16,py+19,8,20);ctx.fillStyle='#225d40';ctx.beginPath();ctx.arc(px+22,py+20,18,0,7);ctx.fill();ctx.fillStyle='#3b9360';ctx.beginPath();ctx.arc(px+15,py+13,15,0,7);ctx.fill();ctx.fillStyle='#72b87b';ctx.beginPath();ctx.arc(px+11,py+8,7,0,7);ctx.fill()}
 if(t==='rock'){ctx.fillStyle='#607a76';ctx.beginPath();ctx.ellipse(px+21,py+25,18,12,-.3,0,7);ctx.fill();ctx.fillStyle='#9db2a8';ctx.beginPath();ctx.ellipse(px+15,py+18,9,4,-.3,0,7);ctx.fill()}
 if(t==='bush'){ctx.fillStyle='#3d8b53';ctx.beginPath();ctx.arc(px+17,py+24,12,0,7);ctx.arc(px+27,py+22,10,0,7);ctx.fill()}
 }
 for(const e of entrances){const px=(e.x+.5)*TILE-camera.x,py=(e.y+.5)*TILE-camera.y;if(px<-70||py<-80||px>w+70||py>h+80)continue;ctx.save();ctx.translate(px,py);ctx.fillStyle='#4c3938';ctx.fillRect(-27,-20,54,45);ctx.fillStyle=e.id==='home'?'#f2d8b2':'#d9b989';ctx.fillRect(-24,-19,48,40);ctx.fillStyle=e.id==='home'?'#a86aaf':'#ad5554';ctx.beginPath();ctx.moveTo(-32,-20);ctx.lineTo(0,-48);ctx.lineTo(32,-20);ctx.fill();ctx.fillStyle='#5b4037';ctx.fillRect(-9,0,18,21);ctx.fillStyle='#cde8fa';ctx.fillRect(-19,-11,10,9);ctx.fillRect(10,-11,10,9);ctx.font='23px system-ui';ctx.textAlign='center';ctx.fillText(e.icon,0,-20);ctx.restore()}
 for(const p of objects){const px=(p.x+.5)*TILE-camera.x,py=(p.y+.5)*TILE-camera.y;if(px<-40||py<-40||px>w+40||py>h+40)continue;const completed=!!done[p.id];ctx.font='28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(completed?{chest:'📭',crystal:'◈',rune:'▣',bell:'🔕',portal:'◌'}[p.type]:{chest:'🎁',crystal:'💎',rune:'🪨',bell:'🔔',portal:'🌀'}[p.type],px,py);ctx.fillStyle=completed?'#e9f9eb':'#fff2a2';ctx.font='bold 17px system-ui';ctx.fillText(completed?'✓':'!',px+14,py-16)}
}
