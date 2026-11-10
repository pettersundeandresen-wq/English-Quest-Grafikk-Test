
// English Quest - Grafikkprototype
// Tre terrengteksturer med individuell skalering

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const T = 64, W = 112, H = 82, ZOOM = 1.15;

const TERRAIN_SCALE = {
    grass: 0.25,
    path: 0.25,
    water: 0.25
};

const images = {}, patterns = {}, keys = new Set();
const player = { x: 18, y: 19, dir: 'down', moving: false };

let last = 0, walkClock = 0, ringStrength = 0;
let joy = { x: 0, y: 0 }, activePointer = null, noticeUntil;

const files = {
    oak: 'assets/nature/tree_oak.png',
    spruce: 'assets/nature/tree_spruce.png',
    birch: 'assets/nature/tree_birch.png',
    blossom: 'assets/nature/tree_blossom.png',
    bush: 'assets/nature/bush_berries.png',
    rock: 'assets/nature/rock_moss.png',
    house: 'assets/buildings/house_cottage.png',
    chest: 'assets/objects/chest_open.png',
    grass: 'assets/terrain/grass_base.png',
    path: 'assets/terrain/dirt_path.png',
    water: 'assets/terrain/water_base.png'
};

for (const dir of ['down', 'up', 'left', 'right']) {
    for (const pose of ['idle', 'step_left', 'step_right']) {
        files[`avatar_${dir}_${pose}`] =
            `assets/avatar/avatar_${dir}_${pose}.png`;
    }
}

const rand = (x, y, s = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + s * 47.9) * 43758.5453;
    return n - Math.floor(n);
};

const colors = {
    grass: '#87b76b',
    path: '#c49a60',
    water: '#298ca5',
    bridge: '#a98757'
};

// --------------------------------------------------
// KART OG TERRENG
// --------------------------------------------------

const terrain = Array.from({ length: H }, () => Array(W).fill('grass'));

function paintDisk(x, y, r, kind) {
    for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(H - 1, Math.ceil(y + r)); yy++) {
        for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W - 1, Math.ceil(x + r)); xx++) {
            if (Math.hypot(xx - x, yy - y) <= r) terrain[yy][xx] = kind;
        }
    }
}

function route(points, radius = 2.3, kind = 'path') {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3);

        for (let j = 0; j <= steps; j++) {
            const q = j / steps;
            paintDisk(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, radius, kind);
        }
    }
}

// Hovedstier og snarveier
[
    [[[7,17],[18,19],[31,18],[43,26],[55,35],[68,40],[79,38],[96,48],[104,67]], 2.6],
    [[[31,18],[40,9],[56,11],[70,20],[79,38]], 2.1],
    [[[43,26],[45,48],[63,57],[83,54],[96,48]], 2.1],
    [[[18,19],[14,37],[31,54],[63,57]], 2.0],
    [[[68,40],[69,65],[88,71],[104,67]], 1.8],
    [[[79,38],[93,22],[104,16]], 1.9]
].forEach(([points, radius]) => route(points, radius));

// Elv
for (let y = 0; y < H; y++) {
    const center = 61 + 3 * Math.sin(y / 8);
    for (let x = 0; x < W; x++) {
        if (Math.abs(x - center) < 2.5) terrain[y][x] = 'water';
    }
}

// Broer
route([[55,35],[68,40]], 2.3, 'bridge');
route([[60,57],[65,57]], 2.1, 'bridge');

const house = { x: 16, y: 14, type: 'house', title: 'Hjemmet' };
const objects = [
    { x: 25, y: 23, type: 'chest', title: 'Skattekiste' },
    { x: 43, y: 34, type: 'chest', title: 'Skattekiste' },
    { x: 79, y: 35, type: 'chest', title: 'Skattekiste' },
    { x: 98, y: 57, type: 'chest', title: 'Skattekiste' }
];

// --------------------------------------------------
// NATUR OG KOLLISJON
// --------------------------------------------------

const nature = [];

for (let y = 3; y < H - 2; y += 2) {
    for (let x = 3; x < W - 2; x += 2) {
        const q = rand(x, y, 9), r = rand(x, y, 10);

        if (terrain[y][x] !== 'grass' ||
            Math.hypot(x - house.x, y - house.y) < 9 ||
            objects.some(o => Math.hypot(x - o.x, y - o.y) < 3.5)) continue;

        let type = null;

        if (x < 36) {
            if (q > .87) type = r > .75 ? 'blossom' : 'birch';
            else if (q > .76) type = 'bush';
            else if (q > .72) type = 'rock';
        } else if (x < 88) {
            if (q > .71) type = r > .63 ? 'spruce' : r > .30 ? 'oak' : 'birch';
            else if (q > .65) type = 'bush';
            else if (q > .60) type = 'rock';
        } else {
            if (q > .78) type = r > .55 ? 'rock' : 'spruce';
            else if (q > .68) type = 'bush';
        }

        if (type) nature.push({ x, y, type });
    }
}

const dimensions = {
    oak: [235, 215], birch: [218, 230],
    spruce: [180, 235], blossom: [220, 220],
    bush: [106, 79], rock: [124, 83]
};

const blockers = nature.filter(o =>
    ['oak', 'birch', 'spruce', 'blossom', 'rock'].includes(o.type)
);

function walkable(x, y) {
    if (x < 1.2 || y < 1.2 || x > W - 1.2 || y > H - 1.2) return false;
    if (terrain[Math.floor(y)]?.[Math.floor(x)] === 'water') return false;

    if (x > house.x - 2.1 && x < house.x + 2.1 &&
        y > house.y - 1.5 && y < house.y + 1.1) return false;

    return !blockers.some(o =>
        Math.hypot(x - o.x, y - o.y) < (o.type === 'rock' ? .67 : .52)
    );
}

// --------------------------------------------------
// BILDER OG TERRENGMØNSTRE
// --------------------------------------------------

async function loadAll() {
    const entries = Object.entries(files);
    const status = document.getElementById('loadStatus');
    let count = 0;

    await Promise.all(entries.map(([key, url]) => new Promise(resolve => {
        const img = new Image();
        images[key] = img;

        img.onload = img.onerror = () => {
            if (!img.naturalWidth) console.warn('Mangler bilde:', url);
            status.textContent = `Grafikk ${++count}/${entries.length}`;
            resolve();
        };

        img.src = url;
    })));

    for (const type of ['grass', 'path', 'water']) {
        const img = images[type];
        if (!img?.naturalWidth) continue;

        const scale = TERRAIN_SCALE[type];
        const tile = document.createElement('canvas');

        tile.width = Math.max(1, Math.round(img.naturalWidth * scale));
        tile.height = Math.max(1, Math.round(img.naturalHeight * scale));

        const g = tile.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, tile.width, tile.height);

        patterns[type] = ctx.createPattern(tile, 'repeat');
        console.log(`${type}: skala ${scale}, flis ${tile.width}x${tile.height}`);
    }

    status.textContent = 'Grafikkprototype';
}

function drawAsset(type, x, y, w, h) {
    const img = images[type];
    if (img?.naturalWidth) ctx.drawImage(img, x - w / 2, y - h, w, h);
}

// --------------------------------------------------
// TERRENGTEGNING
// --------------------------------------------------

// Litt variasjon langs flisekantene.
// Dette lager uregelmessige grenser uten å fade teksturene.
function edgePoint(x, y) {
    return [
        x * T + (rand(x, y, 21) - .5) * 10,
        y * T + (rand(x, y, 22) - .5) * 10
    ];
}

function tileShape(x, y) {
    const p = [
        edgePoint(x, y),
        edgePoint(x + 1, y),
        edgePoint(x + 1, y + 1),
        edgePoint(x, y + 1)
    ];

    ctx.beginPath();
    ctx.moveTo(...p[0]);

    for (let i = 0; i < 4; i++) {
        const a = p[i], b = p[(i + 1) % 4];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const horizontal = i % 2 === 0;

        const offset = (rand(x, y, i + 30) - .5) * 9;

        ctx.lineTo(
            mx + (horizontal ? 0 : offset),
            my + (horizontal ? offset : 0)
        );
        ctx.lineTo(...b);
    }

    ctx.closePath();
}

function drawTerrain(x0, y0, x1, y1, camx, camy, vw, vh) {
    // Grunnlaget er alltid gress.
    ctx.fillStyle = patterns.grass || colors.grass;
    ctx.fillRect(camx - T, camy - T, vw + T * 2, vh + T * 2);

    // Stier, vann og broer tegnes oppå gresset.
    // Mønstrene bruker verdenskoordinater, ikke kamerakoordinater.
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const kind = terrain[y][x];
            if (kind === 'grass') continue;

            const texture = kind === 'bridge' ? 'path' : kind;

            ctx.save();
            tileShape(x, y);
            ctx.clip();

            ctx.fillStyle = patterns[texture] || colors[kind];
            ctx.fillRect(x * T - 8, y * T - 8, T + 16, T + 16);
            ctx.restore();

            if (kind === 'bridge') {
                ctx.strokeStyle = '#795c39';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x * T, y * T + 16);
                ctx.lineTo((x + 1) * T, y * T + 16);
                ctx.moveTo(x * T, y * T + 47);
                ctx.lineTo((x + 1) * T, y * T + 47);
                ctx.stroke();
            }
        }
    }
}

// --------------------------------------------------
// AVATAR, DYBDE OG SPILLERRING
// --------------------------------------------------

function isHidden(drawables) {
    const index = drawables.findIndex(o => o.type === 'player');
    const left = player.x * T - 25, right = player.x * T + 25;
    const top = player.y * T - 88, bottom = player.y * T - 12;

    for (const o of drawables.slice(index + 1)) {
        if (o.type === 'chest') continue;

        const [w, h] = o.type === 'house'
            ? [410, 295] : dimensions[o.type] || [0, 0];

        if (!w) continue;

        const X = o.x * T, Y = o.y * T + (o.type === 'house' ? 55 : 0);
        const overlapX = Math.max(0, Math.min(right, X + w * .43) - Math.max(left, X - w * .43));
        const overlapY = Math.max(0, Math.min(bottom, Y - h * .07) - Math.max(top, Y - h * .91));

        if (overlapX > 18 && overlapY > 25) return true;
    }

    return false;
}

function drawPlayer(now) {
    const x = player.x * T, y = player.y * T;
    const pose = !player.moving ? 'idle'
        : Math.floor(walkClock * 7) % 2 ? 'step_left' : 'step_right';

    ctx.fillStyle = '#1a4b4170';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    drawAsset(`avatar_${player.dir}_${pose}`, x, y, 74, 95);
}

function drawRing(now) {
    const x = player.x * T, y = player.y * T;
    const pulse = (Math.sin(now * .005) + 1) / 2;

    ctx.save();
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 2 + ringStrength * (2.5 + .6 * pulse);
    ctx.globalAlpha = .72 + ringStrength * .28;

    ctx.beginPath();
    ctx.ellipse(x, y, 22 + ringStrength * (3 + pulse * 2),
        10 + ringStrength * (2 + pulse), 0, 0, Math.PI * 2);
    ctx.stroke();

    if (ringStrength > .06) {
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = ringStrength * (.45 + .15 * pulse);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(x, y, 29 + ringStrength * 3,
            14 + ringStrength * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

// --------------------------------------------------
// HOVEDLØKKE
// --------------------------------------------------

function draw(now) {
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;

    const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0) + joy.x;
    const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0) + joy.y;
    const mag = Math.hypot(dx, dy);

    player.moving = mag > .12;

    if (player.moving) {
        const ux = dx / Math.max(1, mag), uy = dy / Math.max(1, mag);
        player.dir = Math.abs(ux) > Math.abs(uy)
            ? (ux > 0 ? 'right' : 'left')
            : (uy > 0 ? 'down' : 'up');

        const speed = 5.2;
        const nx = player.x + ux * dt * speed;
        const ny = player.y + uy * dt * speed;

        if (walkable(nx, player.y)) player.x = nx;
        if (walkable(player.x, ny)) player.y = ny;
        walkClock += dt;
    }

    const vw = canvas.width, vh = canvas.height;
    const viewW = vw / ZOOM, viewH = vh / ZOOM;

    const camx = Math.max(0, Math.min(W * T - viewW, player.x * T - viewW / 2));
    const camy = Math.max(0, Math.min(H * T - viewH, player.y * T - viewH / 2));

    const x0 = Math.max(0, Math.floor(camx / T) - 3);
    const y0 = Math.max(0, Math.floor(camy / T) - 3);
    const x1 = Math.min(W, Math.ceil((camx + viewW) / T) + 3);
    const y1 = Math.min(H, Math.ceil((camy + viewH) / T) + 3);

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-camx, -camy);

    drawTerrain(x0, y0, x1, y1, camx, camy, viewW, viewH);

    const drawables = nature.filter(o =>
        o.x >= x0 - 4 && o.x < x1 + 4 &&
        o.y >= y0 - 4 && o.y < y1 + 4
    );

    drawables.push(house, ...objects, { ...player, type: 'player' });
    drawables.sort((a, b) => a.y - b.y);

    const hidden = isHidden(drawables);
    ringStrength += ((hidden ? 1 : 0) - ringStrength) * Math.min(1, dt * 9);

    for (const o of drawables) {
        const X = o.x * T, Y = o.y * T;

        if (o.type === 'player') drawPlayer(now);
        else if (o.type === 'house') drawAsset('house', X, Y + 55, 410, 295);
        else if (o.type === 'chest') drawAsset('chest', X, Y, 110, 82);
        else if (dimensions[o.type]) {
            const [w, h] = dimensions[o.type];
            drawAsset(o.type, X, Y, w, h);
        }
    }

    drawRing(now);
    ctx.restore();

    document.getElementById('region').textContent =
        player.x < 36 ? '🏡 Landsbyen' :
        player.x < 66 ? '🌲 Den ville skogen' :
        player.x < 88 ? '🌿 Elvedalen' : '🪨 Steinmarken';

    document.getElementById('position').textContent =
        `${Math.floor(player.x)}, ${Math.floor(player.y)}`;

    requestAnimationFrame(draw);
}

// --------------------------------------------------
// TASTATUR OG JOYSTICK
// --------------------------------------------------

const dirs = {
    arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'
};

addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMap();
        return;
    }

    const dir = dirs[e.key.toLowerCase()];
    if (dir) { keys.add(dir); e.preventDefault(); }
});

addEventListener('keyup', e => {
    const dir = dirs[e.key.toLowerCase()];
    if (dir) keys.delete(dir);
});

const stick = document.getElementById('joystick');
const knob = document.getElementById('knob');

function resetStick() {
    joy = { x: 0, y: 0 };
    knob.style.transform = 'translate(-50%, -50%)';
}

function updateStick(e) {
    const r = stick.getBoundingClientRect();
    const radius = r.width * .29;

    let x = e.clientX - r.left - r.width / 2;
    let y = e.clientY - r.top - r.height / 2;

    const factor = Math.min(1, radius / (Math.hypot(x, y) || 1));
    x *= factor;
    y *= factor;

    joy = { x: x / radius, y: y / radius };
    if (Math.hypot(joy.x, joy.y) < .13) joy = { x: 0, y: 0 };

    knob.style.transform =
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

stick.addEventListener('pointerdown', e => {
    e.preventDefault();
    activePointer = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    updateStick(e);
});

stick.addEventListener('pointermove', e => {
    if (activePointer === e.pointerId) updateStick(e);
});

for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(event, e => {
        if (activePointer === e.pointerId) {
            activePointer = null;
            resetStick();
        }
    });
}

stick.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { keys.clear(); resetStick(); });

// --------------------------------------------------
// VERDENSKART
// --------------------------------------------------

const overlay = document.getElementById('overlay');

function toggleMap() {
    const opening = overlay.classList.contains('hidden');
    overlay.classList.toggle('hidden');
    if (opening) showMap();
}

function showMap() {
    const c = document.getElementById('map');
    const g = c.getContext('2d');
    const sx = c.width / W, sy = c.height / H;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            g.fillStyle = colors[terrain[y][x]];
            g.fillRect(x * sx, y * sy, sx + 1, sy + 1);
        }
    }

    g.fillStyle = '#be5b48';
    g.fillRect((house.x - 3) * sx, (house.y - 3) * sy, 6 * sx, 5 * sy);

    for (const o of objects) {
        g.fillStyle = '#efb83b';
        g.beginPath();
        g.arc(o.x * sx, o.y * sy, 4, 0, Math.PI * 2);
        g.fill();
    }

    g.fillStyle = '#2264c4';
    g.beginPath();
    g.arc(player.x * sx, player.y * sy, 8, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.stroke();
}

document.getElementById('mapBtn').onclick = toggleMap;
document.getElementById('close').onclick = toggleMap;

overlay.addEventListener('click', e => {
    if (e.target === overlay) toggleMap();
});

// --------------------------------------------------
// UNDERSØK
// --------------------------------------------------

document.getElementById('interact').onclick = () => {
    const nearest = [house, ...objects]
        .map(o => ({ ...o, dist: Math.hypot(player.x - o.x, player.y - o.y) }))
        .sort((a, b) => a.dist - b.dist)[0];

    const hint = document.getElementById('hint');

    hint.textContent = nearest.dist < 5
        ? `✨ ${nearest.title}: grafikkdemo – oppgaver kommer senere`
        : 'Gå nærmere huset eller en skattekiste for å undersøke.';

    clearTimeout(noticeUntil);
    noticeUntil = setTimeout(() => {
        hint.textContent = 'Utforsk landskapet og prøv å gå bak trærne.';
    }, 4500);
};

// Start
loadAll().then(() => requestAnimationFrame(draw));
