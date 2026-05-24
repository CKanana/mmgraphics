
const CONFIG = {
  LANES: 4,                  
  INITIAL_ENEMY_SPEED: 3,    
  SPEED_INCREMENT: 0.5,      
  LEVEL_UP_SCORE: 10,        
  SPAWN_INTERVAL: 90,       
  PLAYER_SPEED: 5,           
  ROAD_LINE_COUNT: 8,        
};

//Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
// Fixed game dimensions (viewport for the city road)
canvas.width  = 400;
canvas.height = 600;
//game state
let score        = 0;
let highScore    = 0;
let level        = 1;
let frameCount   = 0;
let gameRunning  = false;
let animFrameId  = null;

// Road lane X-centre positions  [GEOMETRY: evenly spaced vertical lanes]
const ROAD_LEFT   = 40;
const ROAD_RIGHT  = canvas.width - 40;
const ROAD_WIDTH  = ROAD_RIGHT - ROAD_LEFT;
const LANE_WIDTH  = ROAD_WIDTH / CONFIG.LANES;

function laneCentreX(laneIndex) {
  // GEOMETRY: calculates the horizontal midpoint of a lane
  return ROAD_LEFT + laneIndex * LANE_WIDTH + LANE_WIDTH / 2;
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, duration, type = 'square', volume = 0.3) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type            = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playEngineHum() {
  playBeep(80, 0.08, 'sawtooth', 0.15);
}

function playCrash() {
  playBeep(120, 0.4, 'sawtooth', 0.5);
  setTimeout(() => playBeep(80, 0.3, 'sawtooth', 0.4), 100);
}

function playLevelUp() {
  playBeep(440, 0.1, 'square', 0.3);
  setTimeout(() => playBeep(550, 0.1, 'square', 0.3), 120);
  setTimeout(() => playBeep(660, 0.15, 'square', 0.3), 240);
}

function playScoreBeep() {
  playBeep(300, 0.05, 'triangle', 0.2);
}
let particles = [];

function spawnExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x, y,
      vx:      Math.cos(angle) * speed,
      vy:      Math.sin(angle) * speed,
      radius:  Math.random() * 5 + 2,
      alpha:   1,
      color:   ['#ff4444', '#ff8800', '#ffcc00', '#ffffff'][Math.floor(Math.random() * 4)],
      decay:   Math.random() * 0.03 + 0.02,
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.alpha > 0.01);
  particles.forEach(p => {
    p.x     += p.vx;
    p.y     += p.vy;
    p.vy    += 0.15; // gravity
    p.alpha -= p.decay;
  });
}

function drawParticles() {
  // RASTERIZATION: each particle is a filled circle rasterized onto canvas pixels
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;          // TRANSPARENCY: fading particles
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    // GEOMETRY: circle defined by centre (p.x, p.y) and radius
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

let roadOffset = 0; // tracks vertical scroll position

function drawRoad() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d0d1a';
  const buildings = [
    {x:0,   w:50,  h:120},
    {x:45,  w:35,  h:80},
    {x:75,  w:60,  h:150},
    {x:130, w:40,  h:100},
    {x:280, w:55,  h:140},
    {x:330, w:40,  h:90},
    {x:365, w:50,  h:110},
  ];
  buildings.forEach(b => {
    // RASTERIZATION: each building rectangle is filled pixel-by-pixel
    ctx.fillRect(b.x, canvas.height - b.h, b.w, b.h);
    // Windows: small glowing rectangles (GEOMETRY: sub-rectangles inside buildings)
    ctx.fillStyle = 'rgba(255, 220, 100, 0.3)'; // TRANSPARENCY: semi-transparent windows
    for (let wy = canvas.height - b.h + 10; wy < canvas.height - 10; wy += 18) {
      for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 12) {
        if (Math.random() > 0.4) ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.fillStyle = '#0d0d1a';
  });

  // --- Road surface ---
  ctx.fillStyle = '#2c2c3e';
  // GEOMETRY: road is a rectangle spanning ROAD_LEFT to ROAD_RIGHT
  // RASTERIZATION: fillRect converts this geometry to pixels
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);

  // --- Road edge lines ---
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  // GEOMETRY: vertical lines at road edges
  ctx.moveTo(ROAD_LEFT, 0);
  ctx.lineTo(ROAD_LEFT, canvas.height);
  ctx.moveTo(ROAD_RIGHT, 0);
  ctx.lineTo(ROAD_RIGHT, canvas.height);
  ctx.stroke(); // RASTERIZATION: stroke converts line geometry to pixels

  // --- Scrolling dashed lane dividers ---
  roadOffset = (roadOffset + (CONFIG.INITIAL_ENEMY_SPEED + (level - 1) * CONFIG.SPEED_INCREMENT)) % 60;

  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; // TRANSPARENCY: faint lane lines
  ctx.lineWidth   = 2;
  ctx.setLineDash([25, 35]);                   // dashed line pattern

  for (let lane = 1; lane < CONFIG.LANES; lane++) {
    const lx = ROAD_LEFT + lane * LANE_WIDTH;
    ctx.beginPath();
    // GEOMETRY: vertical dashed line for each lane separator
    // TRANSFORMATION: offset shifts lines downward each frame (scroll illusion)
    ctx.moveTo(lx, -60 + roadOffset);
    ctx.lineTo(lx, canvas.height + roadOffset);
    ctx.stroke(); // RASTERIZATION: dashed stroke rasterized to canvas
  }
  ctx.setLineDash([]); // reset dash
}

const player = {
  lane:       1,                    // current lane index (0-based)
  x:          laneCentreX(1),       // horizontal position
  y:          canvas.height - 100,  // vertical position (near bottom)
  width:      36,                   // GEOMETRY: car width
  height:     60,                   // GEOMETRY: car height
  color:      '#00d4ff',
  tilt:       0,                    // rotation angle for turning effect
  targetX:    laneCentreX(1),       // smooth movement target

  // TRANSFORMATION: move player toward target X (smooth slide between lanes)
  update() {
    this.x += (this.targetX - this.x) * 0.18; // lerp — linear interpolation
    // Tilt decays back to 0 when not pressing key
    this.tilt *= 0.85;
  },

  draw() {
    ctx.save();
    // TRANSFORMATION: translate to car centre, rotate (tilt), translate back
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);           // TRANSFORMATION: simulated rotation/direction

    // --- Car body ---
    // GEOMETRY: rounded rectangle = car body
    // RASTERIZATION: fillRect rasterizes the car body rectangle to pixels
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 15;            // glow visual effect
    roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 6);
    ctx.fill();

    // --- Windscreen ---
    // GEOMETRY: smaller rectangle for windscreen
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; // TRANSPARENCY: semi-transparent windscreen
    ctx.shadowBlur = 0;
    ctx.fillRect(-10, -this.height / 2 + 6, 20, 14);

    // --- Headlights ---
    // GEOMETRY: two small circles (arcs) at front of car
    ctx.fillStyle = '#ffffaa';
    ctx.shadowColor = '#ffffaa';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(-10, -this.height / 2 + 4, 4, 0, Math.PI * 2); // GEOMETRY: circle
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -this.height / 2 + 4, 4, 0, Math.PI * 2);  // GEOMETRY: circle
    ctx.fill();

    // --- Wheels (4 circles) ---
    // GEOMETRY: circles at 4 corners of the car
    ctx.fillStyle = '#111';
    ctx.shadowBlur = 0;
    [[-this.width / 2 - 2, -20], [this.width / 2 + 2, -20],
     [-this.width / 2 - 2,  20], [this.width / 2 + 2,  20]].forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2); // GEOMETRY: circle for each wheel
      ctx.fill(); // RASTERIZATION: arc filled as pixels
    });

    ctx.restore();
  },

  // Move to an adjacent lane
  moveLeft() {
    if (this.lane > 0) {
      this.lane--;
      this.targetX = laneCentreX(this.lane);
      this.tilt = -0.15; // TRANSFORMATION: tilt left
      playEngineHum();
    }
  },
  moveRight() {
    if (this.lane < CONFIG.LANES - 1) {
      this.lane++;
      this.targetX = laneCentreX(this.lane);
      this.tilt = 0.15; // TRANSFORMATION: tilt right
      playEngineHum();
    }
  },
};

// ---------------------------------------------------------------
// ENEMY CARS ARRAY (multiple objects)
// ---------------------------------------------------------------
let enemies = [];

// GEOMETRY: different car body colours and shapes for variety
const ENEMY_COLORS = ['#ff4466', '#ff8800', '#aa44ff', '#44ff88', '#ff44cc'];

function spawnEnemy() {
  const lane      = Math.floor(Math.random() * CONFIG.LANES);
  const colorIdx  = Math.floor(Math.random() * ENEMY_COLORS.length);
  const speedMult = 0.8 + Math.random() * 0.5; // slight speed variation

  enemies.push({
    lane,
    x:          laneCentreX(lane),
    y:          -70,                // start above canvas
    width:      34,
    height:     56,
    color:      ENEMY_COLORS[colorIdx],
    speed:      (CONFIG.INITIAL_ENEMY_SPEED + (level - 1) * CONFIG.SPEED_INCREMENT) * speedMult,
    // TRANSFORMATION: slight continuous rotation to simulate motion
    wobble:     0,
    wobbleDir:  (Math.random() > 0.5 ? 1 : -1) * 0.01,

    update() {
      // TRANSFORMATION: move downward (translation along Y axis)
      this.y      += this.speed;
      this.wobble += this.wobbleDir; // TRANSFORMATION: subtle side wobble
      if (Math.abs(this.wobble) > 0.04) this.wobbleDir *= -1;
    },

    draw() {
      ctx.save();
      // TRANSFORMATION: translate + rotate for wobble effect
      ctx.translate(this.x, this.y);
      ctx.rotate(this.wobble); // TRANSFORMATION: simulated direction oscillation

      // --- Car body ---
      // GEOMETRY: rounded rectangle
      ctx.fillStyle  = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 12;
      roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 5);
      ctx.fill(); // RASTERIZATION: geometry rasterized to pixels

      // --- Rear windscreen ---
      ctx.fillStyle  = 'rgba(0,0,0,0.5)'; // TRANSPARENCY
      ctx.shadowBlur = 0;
      ctx.fillRect(-10, this.height / 2 - 20, 20, 14);

      // --- Tail lights ---
      // GEOMETRY: two small circles at rear
      ctx.fillStyle  = '#ff2200';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(-10, this.height / 2 - 4, 4, 0, Math.PI * 2); // GEOMETRY: circle
      ctx.fill(); // RASTERIZATION
      ctx.beginPath();
      ctx.arc( 10, this.height / 2 - 4, 4, 0, Math.PI * 2); // GEOMETRY: circle
      ctx.fill();

      // --- Wheels ---
      ctx.fillStyle  = '#111';
      ctx.shadowBlur = 0;
      [[-this.width / 2 - 2, -16], [this.width / 2 + 2, -16],
       [-this.width / 2 - 2,  16], [this.width / 2 + 2,  16]].forEach(([wx, wy]) => {
        ctx.beginPath();
        ctx.arc(wx, wy, 5, 0, Math.PI * 2); // GEOMETRY: wheel circle
        ctx.fill(); // RASTERIZATION
      });

      ctx.restore();
    },

    // AABB collision detection using car geometry rectangles
    collidesWith(other) {
      // GEOMETRY: axis-aligned bounding box (AABB) overlap test
      return (
        Math.abs(this.x - other.x) < (this.width  + other.width)  / 2 - 4 &&
        Math.abs(this.y - other.y) < (this.height + other.height) / 2 - 4
      );
    },
  });
}
function drawSpeedBlur() {
  if (level < 3) return; // only show at higher speeds
  // LAYERING: drawn over road, under cars
  // TRANSPARENCY: semi-transparent vertical streaks
  const alpha = Math.min(0.15, (level - 2) * 0.04);
  ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
  for (let i = 0; i < 6; i++) {
    const lx = ROAD_LEFT + Math.random() * ROAD_WIDTH;
    const ly = Math.random() * canvas.height;
    // GEOMETRY: thin tall rectangle = speed line
    // RASTERIZATION: fillRect converts to pixels
    ctx.fillRect(lx, ly, 2, 40 + Math.random() * 60);
  }
}

// ---------------------------------------------------------------
// OVERLAPPING SHAPES — Semi-transparent glow rings
// Shows transparency + overlapping geometry requirement
// ---------------------------------------------------------------
function drawGlowRings() {
  // GEOMETRY: concentric circles (rings) around player — overlapping shapes
  // TRANSPARENCY: globalAlpha makes rings see-through, overlapping blends them
  // LAYERING: drawn above road but below car body
  const rings = 3;
  for (let i = rings; i >= 1; i--) {
    ctx.save();
    ctx.globalAlpha = 0.06 * i;          // TRANSPARENCY: decreasing opacity
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    // GEOMETRY: circle ring centred on player
    ctx.arc(player.x, player.y, 30 + i * 18, 0, Math.PI * 2); // GEOMETRY: arc
    ctx.stroke(); // RASTERIZATION: arc stroke rasterized to pixels
    ctx.restore();
  }
}
function updateScoreDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
}

function checkCollisions() {
  for (const enemy of enemies) {
    if (enemy.collidesWith(player)) {
      // Spawn explosion at collision point
      spawnExplosion(player.x, player.y);
      playCrash();
      endGame();
      return;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);         // GEOMETRY: curved corner
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); // GEOMETRY: curved corner
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);         // GEOMETRY: curved corner
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);                 // GEOMETRY: curved corner
  ctx.closePath();
}

function gameLoop() {
  if (!gameRunning) return;

  frameCount++;
  drawRoad();
  drawSpeedBlur();
  drawGlowRings();
  enemies.forEach(e => e.update());
  enemies.forEach(e => e.draw());   // RASTERIZATION: each car drawn to canvas

  // Remove enemies that have left the screen (off bottom)
  enemies = enemies.filter(e => e.y < canvas.height + 80);
  // 5. Update + draw player car (top car layer)
  player.update();
  player.draw(); // RASTERIZATION: player car rasterized to canvas pixels

  // 6. Particles on top of everything (VISUAL EFFECTS)
  updateParticles();
  drawParticles(); // RASTERIZATION: particle circles rasterized
  if (frameCount % CONFIG.SPAWN_INTERVAL === 0) {
    spawnEnemy();
  }
  if (frameCount % 60 === 0) {
    score++;
    playScoreBeep();
    updateScoreDisplay();

    const newLevel = 1 + Math.floor(score / CONFIG.LEVEL_UP_SCORE);
    if (newLevel > level) {
      level = newLevel;
      playLevelUp();
      updateScoreDisplay();
    }
  }

  checkCollisions();

  animFrameId = requestAnimationFrame(gameLoop);
}
function startGame() {
  audioCtx.resume();
  score      = 0;
  level      = 1;
  frameCount = 0;
  enemies    = [];
  particles  = [];

 player.lane    = 1;
  player.x       = laneCentreX(1);
  player.targetX = laneCentreX(1);
  player.tilt    = 0;

  updateScoreDisplay();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');

  gameRunning = true;
  animFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animFrameId);
  let frames = 0;
  function explosionLoop() {
    drawRoad();
    drawParticles();
    updateParticles();
    frames++;
    if (frames < 80) requestAnimationFrame(explosionLoop);
    else showGameOver();
  }
  explosionLoop();
}

function showGameOver() {
  if (score > highScore) highScore = score;
  document.getElementById('final-score').textContent = score;
  document.getElementById('high-score').textContent  = highScore;
  document.getElementById('game-over-screen').classList.remove('hidden');
}
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  if (e.key === 'ArrowLeft'  || e.key === 'a') player.moveLeft();
  if (e.key === 'ArrowRight' || e.key === 'd') player.moveRight();
});
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
canvas.addEventListener('touchend',   (e) => {
  const diff = e.changedTouches[0].clientX - touchStartX;
  if (!gameRunning) return;
  if (diff < -30) player.moveLeft();
  if (diff >  30) player.moveRight();
});
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
drawRoad();