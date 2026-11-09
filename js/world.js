export const TILE=40,W=180,H=130;
const rnd=(x,y,z=0)=>{const n=Math.sin(x*127.1+y*311.7+z*83.13)*43758.5453;return n-Math.floor(n)};
const grid=Array.from({length:H},()=>Array(W).fill('grass'));
export function region(x,y){if(x>115&&y>72)return 'Steinruinene';if(y>75)return 'Den magiske lysningen';if(x>77)return 'Elvedalen';if(y>32||x>33)return 'Den ville skogen';return 'Landsbyen'}
export function biome(x,y){const r=region(x,y);return r==='Landsbyen'?'village':r==='Den ville skogen'?'forest':r==='Elvedalen'?'river':r==='Steinruinene'?'ruins':'magic'}
function carve(x,y,r=2,t='path'){for(let yy=Math.max(1,y-r);yy<Math.min(H-1,y+r+1);yy++)for(let xx=Math.max(1,x-r);xx<Math.min(W-1,x+r+1);xx++)if(Math.hypot(xx-x,yy-y)<=r+.25)grid[yy][xx]=t}
function route(a,b,r=2){const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*2));for(let i=0;i<=n;i++){const t=i/n;carve(Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),r)}}
// Two connected routes through the world: no forest can seal off a destination.
const main=[[7,7],[20,9],[29,19],[46,19],[46,9],[68,9],[68,28],[88,28],[88,12],[111,12],[111,34],[135,34],[135,17],[165,17],[165,55],[146,55],[146,86],[165,86],[165,114],[125,114],[125,95],[95,95],[95,118],[58,118],[58,95],[26,95],[26,118],[8,118],[8,68],[28,68],[28,45],[7,45],[7,7]];
const short=[[7,7],[28,45],[58,95],[95,95],[125,95],[146,55],[111,34],[88,28],[68,9],[46,19],[20,9],[7,7]];
for(let i=1;i<main.length;i++)route(main[i-1],main[i],2);
for(let i=1;i<short.length;i++)route(short[i-1],short[i],1);
for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
 if(grid[y][x]==='path')continue;
 const b=biome(x,y),q=rnd(x,y),q2=rnd(Math.floor(x/5),Math.floor(y/5),6);
 if(b==='river'&&((x>=73&&x<=79&&y<67)||(x>=115&&x<=121&&y>55))){grid[y][x]='water';continue}
 if(b==='ruins'){if(q<.24)grid[y][x]='rock';else if(q<.35)grid[y][x]='tree';else if(q<.45)grid[y][x]='bush'}
 else if(b==='forest'){if(q<.38 || (q2<.19&&q<.64))grid[y][x]='tree';else if(q<.49)grid[y][x]='bush'}
 else if(b==='magic'){if(q<.23)grid[y][x]='tree';else if(q<.42)grid[y][x]='bush'}
 else if(b==='river'){if(q<.23)grid[y][x]='tree';else if(q<.34)grid[y][x]='bush'}
 else if(q<.07)grid[y][x]='tree';else if(q<.17)grid[y][x]='bush';
}
// Bridges across the water; reinforce main roads and shortcuts after vegetation.
for(let i=1;i<main.length;i++)route(main[i-1],main[i],2);
for(let i=1;i<short.length;i++)route(short[i-1],short[i],1);
export const entrances=[{id:'home',name:'Mitt hjem',x:13,y:10,icon:'🏠'},{id:'library',name:'Det magiske biblioteket',x:44,y:19,icon:'📚'},{id:'maze',name:'Labyrinten',x:91,y:29,icon:'🧩'},{id:'tower',name:'Trollmannstårnet',x:133,y:35,icon:'🧙'},{id:'cave',name:'Ekko-hulen',x:147,y:87,icon:'🔔'}];
for(const e of entrances){carve(e.x,e.y,5,'clearing');route([e.x,e.y],[e.x,e.y+7],2)}
export const objects=[];const candidates=[];
for(let y=5;y<H-5;y++)for(let x=5;x<W-5;x++)if(['path','clearing'].includes(grid[y][x]))candidates.push({x,y});
candidates.sort((a,b)=>rnd(a.x,a.y,77)-rnd(b.x,b.y,77));
for(const c of candidates){if(objects.length>=124)break;if(entrances.some(e=>Math.hypot(c.x-e.x,c.y-e.y)<7))continue;if(objects.some(o=>Math.hypot(c.x-o.x,c.y-o.y)<6))continue;objects.push({...c,id:objects.length,type:['chest','crystal','rune','bell','portal'][objects.length%5]})}
export const landmarks=[{x:7,y:7,name:'Landsbyen'},{x:50,y:19,name:'Skogstien'},{x:87,y:28,name:'Elvedalen'},{x:130,y:40,name:'Nordskogen'},{x:155,y:95,name:'Ruinene'},{x:28,y:110,name:'Magisk lysning'}];
export function tile(x,y){return grid[Math.floor(y)]?.[Math.floor(x)]||'water'}
export function walkable(x,y){return !['water','tree','rock'].includes(tile(x,y))}
