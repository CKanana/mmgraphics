# Dodge the Traffic

A HTML5 Canvas multimedia application built for a university multimedia project.
Demonstrates the graphics pipeline stages: Application, Geometry, and Rasterization.

Live Demo: https://ckanana.github.io/mmgraphics/

---

## Project Structure

```
dodge-the-traffic/
├── index.html     # Page structure, canvas element, UI screens
├── style.css      # Styling for HUD, buttons, and screens
├── game.js        # All game logic, drawing, audio, and interactions
└── README.md      # This file
```

---

## How to Play

- Press left/right arrow keys or A / D to switch lanes
- Dodge incoming traffic cars
- Score increases every second you survive
- Every 10 points the speed increases
- Game ends on collision

Mobile: Swipe left or right on the canvas to change lanes.

---

## How to Run Locally

1. Clone or download this repository
2. Open the folder in VS Code
3. Install the Live Server extension if not already installed
4. Right-click `index.html` and select Open with Live Server
5. Game loads in your browser at `http://127.0.0.1:5500`

Note: Do not open `index.html` by double-clicking. Web Audio API requires a server context to work properly.

---

## Graphics Pipeline Coverage

### Application Stage
Handled in `game.js` — game logic, input handling, collision detection, score tracking, and object state updates all happen here before anything is drawn.

### Geometry Stage
All shapes are defined mathematically before rasterization. Look for `// GEOMETRY:` comments in `game.js`.

| Shape | Where used |
|---|---|
| Rectangles | Car bodies, road surface, buildings, speed blur lines |
| Circles | Wheels, headlights, tail lights, particles, glow rings |
| Lines | Road edges, lane dividers |
| Rounded rectangles | Car bodies using quadraticCurveTo |
| AABB | Collision detection bounding boxes |

### Rasterization Stage
Every `ctx.fill()`, `ctx.stroke()`, `ctx.fillRect()`, and `ctx.arc()` call converts geometry into pixels on the canvas. Look for `// RASTERIZATION:` comments in `game.js`.

---

## Requirements Checklist

| Requirement | Implementation |
|---|---|
| HTML5 Canvas | canvas element in index.html, all drawing via ctx in game.js |
| No external libraries | Pure HTML, CSS, and JavaScript only |
| At least 2 objects | Player car and multiple enemy traffic cars |
| Moving objects | Enemy cars move down; player moves left/right |
| Size changes | Explosion particles grow then shrink |
| Rotation / direction | Player tilts on turn; enemies wobble |
| Score system | +1 point every second survived, displayed in HUD |
| Speed changes | Traffic speed increases every 10 points |
| Unique interaction | Lane-switching with tilt animation and touch swipe support |
| Audio | Web Audio API — engine hum, crash sound, level-up jingle, score beep |
| Visual effects | Explosion particles on crash, neon glow, speed blur streaks |
| Overlapping shapes | Glow rings overlap player car; particles overlap everything |
| Transparency | globalAlpha used on windows, glow rings, speed blur, and particles |
| Layering | Road, blur, rings, enemies, player, particles, UI — in that order |
| Developer input | CONFIG object at top of game.js to adjust speed, lanes, spawn rate |

---

## Developer Configuration

At the top of `game.js` there is a CONFIG object you can tweak:

```javascript
const CONFIG = {
  LANES: 4,                 // number of road lanes
  INITIAL_ENEMY_SPEED: 3,   // starting speed of traffic cars
  SPEED_INCREMENT: 0.5,     // speed added per level
  LEVEL_UP_SCORE: 10,       // points needed to level up
  SPAWN_INTERVAL: 90,       // frames between enemy spawns
  PLAYER_SPEED: 5,          // player left/right movement speed
  ROAD_LINE_COUNT: 8,       // number of dashed lane lines
};
```

---

## Technologies Used

- HTML5 Canvas API
- CSS3
- Vanilla JavaScript (ES6+)
- Web Audio API (no external libraries)

---

Built for academic purposes.