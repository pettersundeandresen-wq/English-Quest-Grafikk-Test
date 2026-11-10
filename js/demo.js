
'use strict';

// ENGLISH QUEST - GRAFIKKPROTOTYPE
// Terreng, natur, dekorasjoner, avatar og verdenskart

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const T = 64, W = 112, H = 82, ZOOM = 1.15;

const SCALE = {
    grass: 0.25,
    path: 0.25,
    water: 0.25
};

const DENSITY = {
    trees: 1.0,
    details: 0.65,
    shore: 0.80
};

const SPEED = 5.2;
const images = {}, patterns = {}, keys = new Set();
const player = { x: 18, y: 19, dir: 'down', moving: false };
const joy = { x: 0, y: 0 };

let last = 0, walkClock = 0, ringStrength = 0;
let pointerId = null, hintTimer = null;

const $ = id => document.getElementById(id);
const rnd = (x, y, s = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 47.9) * 43758.5453;
    return n - Math.floor(n);
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const files = {
    grass: 'assets/terrain/grass_base.png',
    path: 'assets/terrain/dirt_path.png',
    water: 'assets/terrain/water_base.png',

    oak: 'assets/nature/tree_oak.png',
    spruce: 'assets/nature/tree_spruce.png',
    birch: 'assets/nature/tree_birch.png',
    blossom: 'assets/nature/tree_blossom.png',
    bush: 'assets/nature/bush_berries.png',
    rock: 'assets/nature/rock_moss.png',

    house: 'assets/buildings/house_cottage.png',
    chest: 'assets/objects/chest_open.png'
};

const details = {
    reeds: 'reeds',
    pebbles: 'pebbles',
    tuft: 'grass_tuft',
    daisies: 'daisies',
    mushrooms: 'mushrooms',
    fern: 'fern',
    log: 'log',
    pink: 'pink_flowers',
    leaves: 'fallen_leaves',
    lily: 'water_lily',
    dry: 'dry_grass',
    magic: 'magic_flowers'
};

for (const [key, name] of Object.entries(details))
    files[key] = `assets/nature/details/${name}.png`;

for (const dir of ['down', 'up', 'left', 'right'])
    for (const pose of ['idle', 'step_left', 'step_right'])
        files[`avatar_${dir}_${pose}`] =
            `assets/avatar/avatar_${dir}_${pose}.png`;

// --------------------------------------------------
// TERRENGKART
// --------------------------------------------------

const terrain = Array.from({ length: H }, () => Array(W).fill('grass'));

function kind(x, y) {
    return terrain[y]?.[x] || 'grass';
}

function disk(cx, cy, radius, type) {
    for (let y = Math.max(0, Math.floor(cy-radius)); y <= Math.min(H-1, Math.ceil(cy+radius)); y++)
        for (let x = Math.max(0, Math.floor(cx-radius)); x <= Math.min(W-1, Math.ceil(cx+radius)); x++)
            if (Math.hypot(x-cx, y-cy) <= radius) terrain[y][x] = type;
}

function route(points, radius = 2, type = 'path') {
    for (let i = 1; i < points.length; i++) {
        const [ax, ay] = points[i-1], [bx, by] = points[i];
        const steps = Math.ceil(Math.hypot(bx-ax, by-ay) * 4);
        for (let j = 0; j <= steps; j++) {
            const f = j / steps;
            disk(ax+(bx-ax)*f, ay+(by-ay)*f, radius, type);
        }
    }
}

const routes = [
    [[[7,17],[18,19],[31,18],[43,26],[55,35],[68,40],[79,38],[96,48],[104,67]], 2.6],
    [[[31,18],[40,9],[56,11],[70,20],[79,38]], 2.1],
    [[[43,26],[45,48],[63,57],[83,54],[96,48]], 2.1],
    [[[18,19],[14,37],[31,54],[63,57]], 2.0],
    [[[68,40],[69,65],[88,71],[104,67]], 1.8],
    [[[79,38],[93,22],[104,16]], 1.9]
];

routes.forEach(([points, r]) => route(points, r));

// Elven legges over stiene.
for (let y = 0; y < H; y++) {
    const center = 61 + 3 * Math.sin(y / 8);
    for (let x = 0; x < W; x++)
        if (Math.abs(x-center) < 2.5) terrain[y][x] = 'water';
}

// Broer over elven. Kun vannruter endres.
function bridge(points, radius = 1.7) {
    const before = terrain.map(row => [...row]);
    route(points, radius, 'bridge');

    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
            if (terrain[y][x] === 'bridge' && before[y][x] !== 'water')
                terrain[y][x] = before[y][x];
}

bridge([[57,37],[65,37]], 1.7);
bridge([[60,57],[65,57]], 1.7);

const house = { x: 16, y: 14, type: 'house', title: 'Hjemmet' };
const objects = [
    { x: 25, y: 23, type: 'chest', title: 'Skattekiste' },
    { x: 43, y: 34, type: 'chest', title: 'Skattekiste' },
    { x: 79, y: 35, type: 'chest', title: 'Skattekiste' },
    { x: 98, y: 57, type: 'chest', title: 'Skattekiste' }
];

// --------------------------------------------------
// TERRENGANALYSE
// --------------------------------------------------

function near(x, y, type, radius = 1) {
    for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
            if ((dx || dy) && kind(x+dx, y+dy) === type)
                return true;
    return false;
}

function openArea(x, y, radius = 1) {
    for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
            if (kind(x+dx, y+dy) !== 'grass') return false;
    return true;
}

function protectedArea(x, y) {
    if (Math.hypot(x-player.x, y-player.y) < 3) return true;
    if (Math.abs(x-house.x) < 5 && Math.abs(y-house.y) < 5) return true;
    return objects.some(o => Math.hypot(x-o.x, y-o.y) < 2.5);
}

// --------------------------------------------------
// NATUR OG DEKORASJONER
// --------------------------------------------------

const nature = [], decorations = [];

function addDetail(x, y, type, scale = 1) {
    decorations.push({ x, y, type, scale });
}

function addNature(x, y, type) {
    nature.push({ x, y, type });
}

// Store objekter plasseres først.
for (let y = 3; y < H-2; y += 2) {
    for (let x = 3; x < W-2; x += 2) {
        if (!openArea(x,y,1) || protectedArea(x,y)) continue;

        const q = rnd(x,y,9), r = rnd(x,y,10);
        let type = null;

        if (x < 36) {
            if (q > 1-.13*DENSITY.trees) type = r > .75 ? 'blossom' : 'birch';
            else if (q > .76) type = 'bush';
            else if (q > .72) type = 'rock';
        } else if (x < 88) {
            if (q > 1-.29*DENSITY.trees)
                type = r > .63 ? 'spruce' : r > .30 ? 'oak' : 'birch';
            else if (q > .65) type = 'bush';
            else if (q > .60) type = 'rock';
        } else {
            if (q > 1-.22*DENSITY.trees) type = r > .55 ? 'rock' : 'spruce';
            else if (q > .68) type = 'bush';
        }

        if (type) addNature(x,y,type);
    }
}

// Små detaljer plasseres etter terrengtype.
for (let y = 1; y < H-1; y++) {
    for (let x = 1; x < W-1; x++) {
        const t = kind(x,y), q = rnd(x,y,31), r = rnd(x,y,32);
        const shore = near(x,y,'water');
        const pathEdge = near(x,y,'path') || near(x,y,'bridge');
        const forest = x >= 36 && x < 88;

        if (protectedArea(x,y)) continue;

        // VANN: Bare vannplanter.
        if (t === 'water') {
            if (q > .965 && near(x,y,'grass',2))
                addDetail(x+.25,y+.25,'lily',.85);
            continue;
        }

        // BRO: Ingen dekorasjoner.
        if (t === 'bridge') continue;

        // STI: Hold hoveddelen av stien fri.
        if (t === 'path') {
            if (q > .985 && !near(x,y,'water'))
                addDetail(x+.3,y+.3,'pebbles',.45);
            continue;
        }

        // GRESS VED VANN: Siv og steiner.
        if (shore) {
            if (q > 1-.27*DENSITY.shore)
                addDetail(x+.3,y+.35, r > .35 ? 'reeds' : 'pebbles',.65);
            continue;
        }

        // GRESS VED STI: Små dekorasjoner langs kanten.
        if (pathEdge) {
            if (q > 1-.20*DENSITY.details) {
                const type = r < .45 ? 'tuft' : r < .75 ? 'pebbles' : 'dry';
                addDetail(x+.25,y+.35,type,.55);
            }
            continue;
        }

        // SKOG: Bregner, sopp, stokker og løv.
        if (forest) {
            if (q > 1-.15*DENSITY.details) {
                const type = r < .30 ? 'fern' :
                    r < .52 ? 'mushrooms' :
                    r < .72 ? 'leaves' :
                    r < .88 ? 'log' : 'tuft';
                addDetail(x+.25,y+.3,type,.65);
            }
            continue;
        }

        // LANDSBY OG ÅPNE OMRÅDER.
        if (q > 1-.11*DENSITY.details) {
            const type = r < .25 ? 'daisies' :
                r < .45 ? 'pink' :
                r < .65 ? 'tuft' :
                r < .85 ? 'pebbles' : 'magic';
            addDetail(x+.25,y+.3,type,.55);
        }
    }
}

// Fjern detaljer som ligger for tett på store objekter.
const filteredDetails = decorations.filter(d =>
    !nature.some(o => Math.hypot(d.x-o.x,d.y-o.y) < .85)
);

// --------------------------------------------------
// KOLLISJON
// --------------------------------------------------

const blockers = nature.filter(o =>
    ['oak','spruce','birch','blossom','rock'].includes(o.type)
);

function walkable(x,y) {
    if (x < 1.2 || y < 1.2 || x > W-1.2 || y > H-1.2) return false;
    if (kind(Math.floor(x),Math.floor(y)) === 'water') return false;

    if (x > house.x-2.1 && x < house.x+2.1 &&
        y > house.y-1.5 && y < house.y+1.1) return false;

    return !blockers.some(o =>
        Math.hypot(x-o.x,y-o.y) < (o.type === 'rock' ? .67 : .52)
    );
}

// --------------------------------------------------
// BILDER
// --------------------------------------------------

async function loadAll() {
    let count = 0;
    const entries = Object.entries(files);

    await Promise.all(entries.map(([key,url]) => new Promise(resolve => {
        const img = new Image();
        images[key] = img;

        img.onload = img.onerror = () => {
            if (!img.naturalWidth) console.warn('Mangler:',url);
            if ($('loadStatus')) $('loadStatus').textContent =
                `Grafikk ${++count}/${entries.length}`;
            resolve();
        };
        img.src = url;
    })));

    for (const type of ['grass','path','water']) {
        const img = images[type];
        if (!img?.naturalWidth) continue;

        const scale = SCALE[type];
        const tile = document.createElement('canvas');
        tile.width = Math.max(1,Math.round(img.naturalWidth*scale));
        tile.height = Math.max(1,Math.round(img.naturalHeight*scale));

        const g = tile.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img,0,0,tile.width,tile.height);

        patterns[type] = ctx.createPattern(tile,'repeat');
        console.log(type,scale,tile.width,tile.height);
    }

    if ($('loadStatus')) $('loadStatus').textContent = 'Grafikkprototype';
}

function asset(type,x,y,w,h) {
    const img = images[type];
    if (img?.naturalWidth) ctx.drawImage(img,x-w/2,y-h,w,h);
}

// --------------------------------------------------
// TERRENGTEGNING - UTEN SPREKKER
// --------------------------------------------------

function drawTerrain(x0,y0,x1,y1,camx,camy,vw,vh) {
    ctx.fillStyle = patterns.grass || '#87b76b';
    ctx.fillRect(camx,camy,vw,vh);

    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const t = kind(x,y);
            if (t === 'grass') continue;

            const texture = t === 'bridge' ? 'path' : t;
            ctx.fillStyle = patterns[texture] || (
                t === 'water' ? '#298ca5' : '#c49a60'
            );

            // Hele ruter, ingen forskyvning eller fading.
            ctx.fillRect(x*T,y*T,T+.5,T+.5);

            if (t === 'bridge') {
                ctx.fillStyle = 'rgba(99,65,37,.18)';
                ctx.fillRect(x*T,y*T,T,4);
                ctx.fillRect(x*T,y*T+T-4,T,4);
            }
        }
    }
}

// --------------------------------------------------
// TEGNEREKKEFØLGE OG SPILLERRING
// --------------------------------------------------

const dimensions = {
    oak:[235,215], spruce:[180,235], birch:[218,230],
    blossom:[220,220], bush:[106,79], rock:[124,83],
    reeds:[64,75], pebbles:[58,34], tuft:[64,50],
    daisies:[70,52], mushrooms:[64,55], fern:[70,65],
    log:[80,45], pink:[70,55], leaves:[65,35],
    lily:[75,42], dry:[64,55], magic:[70,60]
};

function drawPlayer() {
    const x = player.x*T, y = player.y*T;
    const pose = !player.moving ? 'idle' :
        Math.floor(walkClock*7)%2 ? 'step_left' : 'step_right';

    ctx.fillStyle = 'rgba(20,60,40,.3)';
    ctx.beginPath();
    ctx.ellipse(x,y+3,18,7,0,0,Math.PI*2);
    ctx.fill();

    asset(`avatar_${player.dir}_${pose}`,x,y,74,95);
}

function hiddenBy(drawables) {
    const index = drawables.findIndex(o => o.type === 'player');
    const px = player.x*T, py = player.y*T;

    for (const o of drawables.slice(index+1)) {
        if (o.type === 'chest' || o.detail) continue;

        const [w,h] = o.type === 'house' ? [410,295] : dimensions[o.type] || [0,0];
        if (!w) continue;

        const x = o.x*T, y = o.y*T+(o.type==='house'?55:0);
        const ox = Math.max(0,Math.min(px+25,x+w*.43)-Math.max(px-25,x-w*.43));
        const oy = Math.max(0,Math.min(py-12,y-h*.07)-Math.max(py-88,y-h*.91));

        if (ox > 18 && oy > 25) return true;
    }
    return false;
}

function drawRing(now) {
    const x = player.x*T, y = player.y*T;
    const pulse = (Math.sin(now*.005)+1)/2;

    ctx.save();
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 2+ringStrength*(2.5+.6*pulse);
    ctx.globalAlpha = .72+ringStrength*.28;

    ctx.beginPath();
    ctx.ellipse(x,y,22+ringStrength*(3+2*pulse),
        10+ringStrength*(2+pulse),0,0,Math.PI*2);
    ctx.stroke();

    if (ringStrength > .06) {
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = ringStrength*(.45+.15*pulse);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(x,y,29+ringStrength*3,
            14+ringStrength*2,0,0,Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
}

// --------------------------------------------------
// HOVEDLØKKE
// --------------------------------------------------

function draw(now) {
    const dt = Math.min(.05,(now-last)/1000||0);
    last = now;

    const dx = (+keys.has('right'))-(+keys.has('left'))+joy.x;
    const dy = (+keys.has('down'))-(+keys.has('up'))+joy.y;
    const mag = Math.hypot(dx,dy);

    player.moving = mag > .12;

    if (player.moving) {
        const ux = dx/Math.max(1,mag), uy = dy/Math.max(1,mag);
        player.dir = Math.abs(ux)>Math.abs(uy)
            ? (ux>0?'right':'left') : (uy>0?'down':'up');

        const nx = player.x+ux*dt*SPEED, ny = player.y+uy*dt*SPEED;
        if (walkable(nx,player.y)) player.x = nx;
        if (walkable(player.x,ny)) player.y = ny;
        walkClock += dt;
    }

    const vw = canvas.width, vh = canvas.height;
    const viewW = vw/ZOOM, viewH = vh/ZOOM;
    const camx = Math.max(0,Math.min(W*T-viewW,player.x*T-viewW/2));
    const camy = Math.max(0,Math.min(H*T-viewH,player.y*T-viewH/2));

    const x0 = Math.max(0,Math.floor(camx/T)-3);
    const y0 = Math.max(0,Math.floor(camy/T)-3);
    const x1 = Math.min(W,Math.ceil((camx+viewW)/T)+3);
    const y1 = Math.min(H,Math.ceil((camy+viewH)/T)+3);

    ctx.clearRect(0,0,vw,vh);
    ctx.save();
    ctx.scale(ZOOM,ZOOM);
    ctx.translate(-camx,-camy);

    drawTerrain(x0,y0,x1,y1,camx,camy,viewW,viewH);

    const visible = o =>
        o.x>=x0-5 && o.x<x1+5 && o.y>=y0-5 && o.y<y1+5;

    const drawables = [
        ...nature.filter(visible),
        ...filteredDetails.filter(visible).map(o => ({...o,detail:true})),
        house, ...objects, {...player,type:'player'}
    ];

    drawables.sort((a,b) => a.y-b.y);

    ringStrength += ((hiddenBy(drawables)?1:0)-ringStrength)*Math.min(1,dt*9);

    for (const o of drawables) {
        const x = o.x*T, y = o.y*T;

        if (o.type === 'player') drawPlayer();
        else if (o.type === 'house') asset('house',x,y+55,410,295);
        else if (o.type === 'chest') asset('chest',x,y,110,82);
        else if (dimensions[o.type]) {
            const [w,h] = dimensions[o.type];
            const scale = o.scale || 1;
            asset(o.type,x,y,w*scale,h*scale);
        }
    }

    drawRing(now);
    ctx.restore();

    if ($('region')) $('region').textContent =
        player.x<36?'🏡 Landsbyen':
        player.x<66?'🌲 Den ville skogen':
        player.x<88?'🌿 Elvedalen':'🪨 Steinmarken';

    if ($('position')) $('position').textContent =
        `${Math.floor(player.x)}, ${Math.floor(player.y)}`;

    requestAnimationFrame(draw);
}

// --------------------------------------------------
// TASTATUR OG JOYSTICK
// --------------------------------------------------

const dirs = {
    arrowup:'up',w:'up',arrowdown:'down',s:'down',
    arrowleft:'left',a:'left',arrowright:'right',d:'right'
};

addEventListener('keydown',e => {
    if (e.key.toLowerCase()==='m') {
        e.preventDefault();
        toggleMap();
        return;
    }
    const d = dirs[e.key.toLowerCase()];
    if (d) { keys.add(d); e.preventDefault(); }
});

addEventListener('keyup',e => {
    const d = dirs[e.key.toLowerCase()];
    if (d) keys.delete(d);
});

const stick = $('joystick'), knob = $('knob');

function resetStick() {
    joy.x = joy.y = 0;
    knob.style.transform = 'translate(-50%,-50%)';
}

function updateStick(e) {
    const r = stick.getBoundingClientRect(), radius = r.width*.29;
    let x = e.clientX-r.left-r.width/2;
    let y = e.clientY-r.top-r.height/2;
    const f = Math.min(1,radius/(Math.hypot(x,y)||1));
    x *= f; y *= f;

    joy.x = x/radius;
    joy.y = y/radius;
    if (Math.hypot(joy.x,joy.y)<.13) joy.x = joy.y = 0;

    knob.style.transform =
        `translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
}

stick.addEventListener('pointerdown',e => {
    e.preventDefault();
    pointerId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    updateStick(e);
});

stick.addEventListener('pointermove',e => {
    if (pointerId===e.pointerId) updateStick(e);
});

for (const event of ['pointerup','pointercancel','lostpointercapture'])
    stick.addEventListener(event,e => {
        if (pointerId===e.pointerId) {
            pointerId = null;
            resetStick();
        }
    });

stick.addEventListener('contextmenu',e => e.preventDefault());
addEventListener('blur',() => { keys.clear(); resetStick(); });

// --------------------------------------------------
// VERDENSKART
// --------------------------------------------------

const overlay = $('overlay');

function toggleMap() {
    const opening = overlay.classList.contains('hidden');
    overlay.classList.toggle('hidden');
    if (opening) showMap();
}

function showMap() {
    const c = $('map'), g = c.getContext('2d');
    const sx = c.width/W, sy = c.height/H;
    const colors = {
        grass:'#87b76b',path:'#c49a60',
        water:'#298ca5',bridge:'#a98757'
    };

    for (let y=0;y<H;y++)
        for (let x=0;x<W;x++) {
            g.fillStyle = colors[kind(x,y)];
            g.fillRect(x*sx,y*sy,sx+1,sy+1);
        }

    g.fillStyle = '#be5b48';
    g.fillRect((house.x-3)*sx,(house.y-3)*sy,6*sx,5*sy);

    for (const o of objects) {
        g.fillStyle = '#efb83b';
        g.beginPath();
        g.arc(o.x*sx,o.y*sy,4,0,Math.PI*2);
        g.fill();
    }

    g.fillStyle = '#2264c4';
    g.beginPath();
    g.arc(player.x*sx,player.y*sy,8,0,Math.PI*2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.stroke();
}

$('mapBtn').onclick = toggleMap;
$('close').onclick = toggleMap;
overlay.addEventListener('click',e => {
    if (e.target===overlay) toggleMap();
});

// --------------------------------------------------
// UNDERSØK
// --------------------------------------------------

$('interact').onclick = () => {
    const nearest = [house,...objects]
        .map(o => ({...o,dist:distance(player,o)}))
        .sort((a,b) => a.dist-b.dist)[0];

    $('hint').textContent = nearest.dist<5
        ? `✨ ${nearest.title}: grafikkdemo – oppgaver kommer senere`
        : 'Gå nærmere huset eller en skattekiste for å undersøke.';

    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
        $('hint').textContent = 'Utforsk landskapet og prøv å gå bak trærne.';
    },4500);
};

// Start
loadAll().then(() => requestAnimationFrame(draw));
