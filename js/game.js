(() => {
  "use strict";

  const { Engine, World, Bodies, Body, Events, Composite } = Matter;

  // Virtual world dimensions
  const WORLD_W = 1950;
  const WORLD_H = 760;
  const GROUND_Y = 640;
  const SLING_X = 270;
  const SLING_Y = 505;
  const MAX_PULL = 122;
  const LAUNCH_SPEED_SCALE = 0.205;
  const GRAVITY_Y = 1.0;
  const BIRD_FRICTION_AIR = 0.0015;
  const STORAGE_KEY = "rbs_angry_birds_progress_v1";

  const BIRD_META = {
    red: {
      name: "Red",
      radius: 19,
      density: 0.0042,
      color: "#ef4444",
      belly: "#fecaca",
      hint: "Red: Tap mid-air for a shockwave pulse"
    },
    yellow: {
      name: "Chuck",
      radius: 18,
      density: 0.0038,
      color: "#facc15",
      belly: "#fef9c3",
      hint: "Chuck: Tap mid-air for turbo dash (shreds wood!)"
    },
    blue: {
      name: "The Blues",
      radius: 14,
      density: 0.0034,
      color: "#38bdf8",
      belly: "#e0f2fe",
      hint: "The Blues: Tap mid-air to split into 3 (shatters ice!)"
    },
    black: {
      name: "Bomb",
      radius: 23,
      density: 0.0052,
      color: "#1e293b",
      belly: "#64748b",
      hint: "Bomb: Tap mid-air (or wait after hit) to EXPLODE!"
    }
  };

  const MATERIAL_STATS = {
    wood: { hp: 75, density: 0.0018, restitution: 0.15, friction: 0.6, score: 500 },
    ice: { hp: 42, density: 0.0013, restitution: 0.2, friction: 0.35, score: 600 },
    stone: { hp: 145, density: 0.0034, restitution: 0.08, friction: 0.85, score: 850 },
    tnt: { hp: 22, density: 0.0016, restitution: 0.15, friction: 0.65, score: 1500 }
  };

  const PIG_STATS = {
    normal: { radius: 21, hp: 36, score: 5000 },
    helmet: { radius: 23, hp: 74, score: 6500 },
    king: { radius: 31, hp: 120, score: 10000 }
  };

  // DOM references
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const hudLevel = document.getElementById("hud-level");
  const hudLevelTotal = document.getElementById("hud-level-total");
  const hudScore = document.getElementById("hud-score");
  const hudBest = document.getElementById("hud-best");
  const abilityHint = document.getElementById("ability-hint");
  const birdQueueEl = document.getElementById("bird-queue");
  const levelNamePill = document.getElementById("level-name-pill");

  const modalLevels = document.getElementById("modal-levels");
  const levelsGrid = document.getElementById("levels-grid");
  const modalResult = document.getElementById("modal-result");
  const resultTitle = document.getElementById("result-title");
  const resultStars = document.getElementById("result-stars");
  const resultScore = document.getElementById("result-score");
  const resultBonus = document.getElementById("result-bonus");
  const resultTotal = document.getElementById("result-total");
  const resultBest = document.getElementById("result-best");

  const btnLevels = document.getElementById("btn-levels");
  const btnCloseLevels = document.getElementById("btn-close-levels");
  const btnCamera = document.getElementById("btn-camera");
  const btnRestart = document.getElementById("btn-restart");
  const btnSound = document.getElementById("btn-sound");
  const btnResultLevels = document.getElementById("btn-result-levels");
  const btnRetry = document.getElementById("btn-retry");
  const btnNext = document.getElementById("btn-next");

  // Progress persistence
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveProgress(levelId, score, stars) {
    const progress = loadProgress();
    const prev = progress[levelId] || { best: 0, stars: 0 };
    progress[levelId] = {
      best: Math.max(prev.best, score),
      stars: Math.max(prev.stars, stars)
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }

  // Game state
  let engine = null;
  let currentLevelIdx = 0;
  let score = 0;
  let phase = "aiming"; // aiming | dragging | flying | resolving | ended
  let birdQueue = [];
  let activeBird = null;
  let activeBirdBodies = [];
  let pigs = [];
  let blocks = [];
  let particles = [];
  let popups = [];
  let flightTrail = [];
  let clouds = [];

  let pullPos = { x: SLING_X, y: SLING_Y };
  let isDraggingSling = false;
  let isPanningCamera = false;
  let panStartScreenX = 0;
  let panStartCamX = 0;
  let manualCamOffset = 0;
  let peekTarget = false;
  let cameraX = 0;
  let shakeTime = 0;
  let shakePower = 0;

  let settleUntil = 0;
  let launchTime = 0;
  let lastTrailTime = 0;
  let bombFuseTimer = null;
  let abilityUsed = false;
  let levelEnded = false;

  // Viewport transform cache
  let view = { scale: 1, offsetX: 0, offsetY: 0, width: 1280, height: 720 };

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 9; i++) {
      clouds.push({
        x: (i * 260 + Math.random() * 140) % (WORLD_W + 300),
        y: 65 + Math.random() * 190,
        scale: 0.65 + Math.random() * 0.85,
        speed: 8 + Math.random() * 12
      });
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    view.width = w;
    view.height = h;
    view.dpr = dpr;
    updateCameraTransform();
  }

  function updateCameraTransform() {
    // Fit vertical height comfortably while keeping nice wide framing
    const scaleY = view.height / WORLD_H;
    const scaleX = view.width / 1280;
    const scale = Math.max(0.55, Math.min(scaleY, scaleX * 1.15));
    view.scale = scale;
    view.offsetY = (view.height - WORLD_H * scale) * 0.5 + (view.height > WORLD_H * scale ? (view.height - WORLD_H * scale) * 0.25 : 0);

    const visibleWorldW = view.width / scale;
    const maxCamX = Math.max(0, WORLD_W - visibleWorldW);

    let desiredCamX = 0;
    if (peekTarget) {
      desiredCamX = Math.min(maxCamX, Math.max(0, 1240 - visibleWorldW * 0.55));
    } else if (phase === "flying" && activeBirdBodies.length > 0) {
      const lead = activeBirdBodies[0];
      desiredCamX = lead.position.x - visibleWorldW * 0.36;
    } else if (isPanningCamera || manualCamOffset !== 0) {
      desiredCamX = manualCamOffset;
    } else {
      // Show slingshot and a generous peek at the left side of target
      desiredCamX = Math.max(0, Math.min(maxCamX, 40));
    }

    desiredCamX = Math.max(0, Math.min(maxCamX, desiredCamX));
    cameraX += (desiredCamX - cameraX) * 0.14;
    view.offsetX = -cameraX * scale;
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - view.offsetX) / view.scale,
      y: (sy - view.offsetY) / view.scale
    };
  }

  function clearBombTimer() {
    if (bombFuseTimer) {
      clearTimeout(bombFuseTimer);
      bombFuseTimer = null;
    }
  }

  function loadLevel(idx) {
    clearBombTimer();
    currentLevelIdx = idx;
    const level = window.GAME_LEVELS[idx];
    const progress = loadProgress();
    const best = (progress[level.id] && progress[level.id].best) || 0;

    score = 0;
    phase = "aiming";
    levelEnded = false;
    abilityUsed = false;
    peekTarget = false;
    manualCamOffset = 0;
    cameraX = 0;
    btnCamera.classList.remove("active");

    birdQueue = [...level.birds];
    activeBird = null;
    activeBirdBodies = [];
    pigs = [];
    blocks = [];
    particles = [];
    popups = [];
    flightTrail = [];
    pullPos = { x: SLING_X, y: SLING_Y };

    hudLevel.textContent = level.id;
    hudLevelTotal.textContent = window.GAME_LEVELS.length;
    hudScore.textContent = "0";
    hudBest.textContent = best.toLocaleString();
    levelNamePill.textContent = `Level ${level.id}: ${level.name}`;

    modalResult.classList.add("hidden");
    modalLevels.classList.add("hidden");

    // Create fresh Matter.js engine
    engine = Engine.create({
      gravity: { x: 0, y: GRAVITY_Y, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 8
    });

    // Ground and outer boundary walls
    const ground = Bodies.rectangle(WORLD_W * 0.5, GROUND_Y + 80, WORLD_W + 800, 160, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.1,
      label: "ground"
    });
    const leftWall = Bodies.rectangle(-180, WORLD_H * 0.5, 100, WORLD_H * 3, {
      isStatic: true,
      label: "wall"
    });
    World.add(engine.world, [ground, leftWall]);

    // Build fortress blocks
    for (const def of level.blocks) {
      const mat = MATERIAL_STATS[def.material] || MATERIAL_STATS.wood;
      const cy = GROUND_Y - def.bottom - def.h * 0.5;
      const body = Bodies.rectangle(def.x, cy, def.w, def.h, {
        density: mat.density,
        restitution: mat.restitution,
        friction: mat.friction,
        frictionStatic: 0.8,
        label: "block"
      });
      body.gameData = {
        kind: "block",
        material: def.material,
        w: def.w,
        h: def.h,
        hp: mat.hp,
        maxHp: mat.hp,
        score: mat.score,
        destroyed: false
      };
      blocks.push(body);
      World.add(engine.world, body);
    }

    // Build pigs
    for (const def of level.pigs) {
      const stats = PIG_STATS[def.variant] || PIG_STATS.normal;
      const cy = GROUND_Y - def.bottom - stats.radius;
      const body = Bodies.circle(def.x, cy, stats.radius, {
        density: 0.0018,
        restitution: 0.25,
        friction: 0.5,
        label: "pig"
      });
      body.gameData = {
        kind: "pig",
        variant: def.variant,
        radius: stats.radius,
        hp: stats.hp,
        maxHp: stats.hp,
        score: stats.score,
        destroyed: false,
        blinkSeed: Math.random() * 10
      };
      pigs.push(body);
      World.add(engine.world, body);
    }

    settleUntil = performance.now() + 450;
    bindCollisionEvents();
    spawnNextBird();
    renderBirdQueue();
  }

  function spawnNextBird() {
    clearBombTimer();
    activeBirdBodies = [];
    abilityUsed = false;

    if (birdQueue.length === 0) {
      activeBird = null;
      return;
    }

    const type = birdQueue[0];
    const meta = BIRD_META[type];
    activeBird = { type, meta };
    pullPos = { x: SLING_X, y: SLING_Y };
    phase = "aiming";
    abilityHint.textContent = meta.hint;
    renderBirdQueue();
  }

  function renderBirdQueue() {
    birdQueueEl.innerHTML = "";
    if (birdQueue.length === 0) {
      const empty = document.createElement("span");
      empty.style.fontSize = "0.78rem";
      empty.style.color = "#94a3b8";
      empty.textContent = "No birds left";
      birdQueueEl.appendChild(empty);
      return;
    }
    birdQueue.forEach((type, index) => {
      const chip = document.createElement("div");
      chip.className = "queue-chip" + (index === 0 && phase !== "flying" ? " active" : "");
      const sw = document.createElement("span");
      sw.className = `swatch ${type}`;
      const label = document.createElement("span");
      label.textContent = BIRD_META[type].name;
      chip.appendChild(sw);
      chip.appendChild(label);
      birdQueueEl.appendChild(chip);
    });
  }

  function bindCollisionEvents() {
    Events.on(engine, "collisionStart", (event) => {
      const now = performance.now();
      if (now < settleUntil) return;

      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const rvx = bodyA.velocity.x - bodyB.velocity.x;
        const rvy = bodyA.velocity.y - bodyB.velocity.y;
        const relSpeed = Math.hypot(rvx, rvy);
        if (relSpeed < 2.2) continue;

        processBodyHit(bodyA, bodyB, relSpeed);
        processBodyHit(bodyB, bodyA, relSpeed);
      }
    });
  }

  function processBodyHit(target, other, relSpeed) {
    const data = target.gameData;
    if (!data || data.destroyed) return;

    let dmg = (relSpeed - 1.8) * 5.2;
    if (other.gameData && other.gameData.kind === "bird") {
      const bType = other.gameData.birdType;
      dmg *= 1.55;
      if (data.kind === "block") {
        if (bType === "yellow" && data.material === "wood") dmg *= 2.2;
        if (bType === "blue" && data.material === "ice") dmg *= 2.5;
        if (bType === "black" && data.material === "stone") dmg *= 1.85;
      }
      if (bType === "black" && !other.gameData.fuseStarted && !abilityUsed) {
        other.gameData.fuseStarted = true;
        bombFuseTimer = setTimeout(() => {
          if (!levelEnded && !abilityUsed && activeBirdBodies.includes(other)) {
            triggerBombExplosion(other);
          }
        }, 1250);
      }
    } else if (other.label === "ground") {
      dmg *= 1.1;
    }

    if (dmg <= 0.5) return;

    data.hp -= dmg;
    if (data.hp <= 0) {
      destroyEntity(target);
    } else if (relSpeed > 4.2 && data.kind === "block") {
      window.SoundFX.hit(data.material, relSpeed / 10);
    }
  }

  function addScore(pts, x, y, color = "#fde047") {
    score += pts;
    hudScore.textContent = score.toLocaleString();
    popups.push({
      text: `+${pts}`,
      x,
      y,
      vy: -1.3,
      life: 1.0,
      color
    });
  }

  function spawnParticles(x, y, color, count = 12, speed = 5) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.9) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        size: 3 + Math.random() * 5,
        color,
        life: 1.0,
        decay: 0.018 + Math.random() * 0.02
      });
    }
  }

  function destroyEntity(body) {
    const data = body.gameData;
    if (!data || data.destroyed) return;
    data.destroyed = true;

    const { x, y } = body.position;
    Composite.remove(engine.world, body);

    if (data.kind === "pig") {
      window.SoundFX.pigPop();
      spawnParticles(x, y, "#84cc16", 16, 5.5);
      spawnParticles(x, y, "#ffffff", 6, 3.5);
      addScore(data.score, x, y - 16, "#86efac");
      pigs = pigs.filter((p) => p !== body);
    } else if (data.kind === "block") {
      window.SoundFX.destroy(data.material);
      const colMap = {
        wood: "#b45309",
        ice: "#7dd3fc",
        stone: "#94a3b8",
        tnt: "#ef4444"
      };
      spawnParticles(x, y, colMap[data.material] || "#cbd5e1", 12, 4.8);
      addScore(data.score, x, y - 12, "#fde047");
      blocks = blocks.filter((b) => b !== body);

      if (data.material === "tnt") {
        explodeAt(x, y, 185, 130, 0.24);
      }
    }
  }

  function explodeAt(cx, cy, radius, maxDamage, forceMag) {
    shakeTime = 18;
    shakePower = 11;
    spawnParticles(cx, cy, "#f97316", 26, 9);
    spawnParticles(cx, cy, "#fde047", 18, 7);
    spawnParticles(cx, cy, "#475569", 14, 5);
    particles.push({
      ring: true,
      x: cx,
      y: cy,
      r: 12,
      maxR: radius,
      color: "rgba(251, 146, 60, 0.85)",
      life: 1.0,
      decay: 0.06
    });

    const bodies = Composite.allBodies(engine.world).slice();
    for (const b of bodies) {
      if (b.isStatic) continue;
      const dx = b.position.x - cx;
      const dy = b.position.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 0.001) continue;

      const falloff = 1 - dist / radius;
      const nx = dx / dist;
      const ny = dy / dist;
      Body.applyForce(b, b.position, {
        x: nx * forceMag * falloff,
        y: (ny - 0.35) * forceMag * falloff
      });

      if (b.gameData && !b.gameData.destroyed) {
        let dmg = maxDamage * falloff;
        if (b.gameData.material === "stone") dmg *= 1.35;
        b.gameData.hp -= dmg;
        if (b.gameData.hp <= 0) {
          destroyEntity(b);
        }
      }
    }
  }

  function triggerBombExplosion(birdBody) {
    if (abilityUsed) return;
    abilityUsed = true;
    clearBombTimer();
    window.SoundFX.ability("black");
    const { x, y } = birdBody.position;
    Composite.remove(engine.world, birdBody);
    activeBirdBodies = activeBirdBodies.filter((b) => b !== birdBody);
    explodeAt(x, y, 200, 145, 0.28);
  }

  function triggerBirdAbility() {
    if (phase !== "flying" || abilityUsed || activeBirdBodies.length === 0) return;
    const lead = activeBirdBodies[0];
    const type = lead.gameData.birdType;

    if (type === "black") {
      triggerBombExplosion(lead);
      return;
    }

    abilityUsed = true;
    window.SoundFX.ability(type);

    if (type === "yellow") {
      const vx = lead.velocity.x;
      const vy = lead.velocity.y;
      const mag = Math.hypot(vx, vy) || 1;
      const targetSpeed = Math.min(34, Math.max(22, mag * 2.1));
      Body.setVelocity(lead, {
        x: (vx / mag) * targetSpeed,
        y: (vy / mag) * targetSpeed * 0.75
      });
      spawnParticles(lead.position.x, lead.position.y, "#fde047", 16, 6);
    } else if (type === "blue") {
      const baseVx = lead.velocity.x;
      const baseVy = lead.velocity.y;
      const baseAng = Math.atan2(baseVy, baseVx);
      const spd = Math.hypot(baseVx, baseVy);
      const offsets = [-0.24, 0.24];
      for (const dAng of offsets) {
        const clone = createBirdBody("blue", lead.position.x, lead.position.y + Math.sign(dAng) * 14);
        Body.setVelocity(clone, {
          x: Math.cos(baseAng + dAng) * spd * 1.05,
          y: Math.sin(baseAng + dAng) * spd * 1.05
        });
        activeBirdBodies.push(clone);
        World.add(engine.world, clone);
      }
      spawnParticles(lead.position.x, lead.position.y, "#38bdf8", 14, 5);
    } else {
      // Red shockwave push
      const { x, y } = lead.position;
      explodeAt(x, y, 120, 42, 0.11);
    }
  }

  function createBirdBody(type, x, y) {
    const meta = BIRD_META[type];
    const body = Bodies.circle(x, y, meta.radius, {
      density: meta.density,
      restitution: 0.42,
      friction: 0.5,
      frictionAir: BIRD_FRICTION_AIR,
      label: "bird"
    });
    body.gameData = {
      kind: "bird",
      birdType: type,
      radius: meta.radius,
      fuseStarted: false
    };
    return body;
  }

  function launchActiveBird() {
    if (!activeBird) return;
    const dx = SLING_X - pullPos.x;
    const dy = SLING_Y - pullPos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 16) {
      pullPos = { x: SLING_X, y: SLING_Y };
      phase = "aiming";
      return;
    }

    const type = activeBird.type;
    birdQueue.shift(); // consume bird from queue
    const body = createBirdBody(type, pullPos.x, pullPos.y);
    Body.setVelocity(body, {
      x: dx * LAUNCH_SPEED_SCALE,
      y: dy * LAUNCH_SPEED_SCALE
    });
    World.add(engine.world, body);
    activeBirdBodies = [body];
    flightTrail = [];
    phase = "flying";
    launchTime = performance.now();
    lastTrailTime = launchTime;
    peekTarget = false;
    btnCamera.classList.remove("active");
    manualCamOffset = 0;

    window.SoundFX.launch();
    renderBirdQueue();
  }

  // Input Handling
  function onPointerDown(e) {
    if (modalLevels && !modalLevels.classList.contains("hidden")) return;
    if (modalResult && !modalResult.classList.contains("hidden")) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (phase === "flying" && !abilityUsed) {
      triggerBirdAbility();
      return;
    }

    if (phase === "aiming" && activeBird) {
      const distToSling = Math.hypot(worldPos.x - SLING_X, worldPos.y - SLING_Y);
      if (distToSling <= 95) {
        isDraggingSling = true;
        phase = "dragging";
        peekTarget = false;
        btnCamera.classList.remove("active");
        manualCamOffset = 0;
        updatePull(worldPos);
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Pan camera by dragging elsewhere
    isPanningCamera = true;
    panStartScreenX = e.clientX;
    panStartCamX = cameraX;
    canvas.setPointerCapture(e.pointerId);
  }

  function updatePull(worldPos) {
    let dx = worldPos.x - SLING_X;
    let dy = worldPos.y - SLING_Y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_PULL) {
      dx = (dx / dist) * MAX_PULL;
      dy = (dy / dist) * MAX_PULL;
    }
    // Keep bird above ground while aiming
    if (SLING_Y + dy > GROUND_Y - 24) {
      dy = GROUND_Y - 24 - SLING_Y;
    }
    pullPos = { x: SLING_X + dx, y: SLING_Y + dy };
    window.SoundFX.stretch(Math.min(1, dist / MAX_PULL));
  }

  function onPointerMove(e) {
    if (isDraggingSling) {
      updatePull(screenToWorld(e.clientX, e.clientY));
    } else if (isPanningCamera) {
      const dxScreen = e.clientX - panStartScreenX;
      manualCamOffset = panStartCamX - dxScreen / view.scale;
    }
  }

  function onPointerUp(e) {
    if (isDraggingSling) {
      isDraggingSling = false;
      launchActiveBird();
    }
    if (isPanningCamera) {
      isPanningCamera = false;
    }
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (phase === "flying") triggerBirdAbility();
    } else if (e.key === "r" || e.key === "R") {
      loadLevel(currentLevelIdx);
    } else if (e.key === "Tab") {
      e.preventDefault();
      togglePeek();
    }
  });

  function togglePeek() {
    peekTarget = !peekTarget;
    btnCamera.classList.toggle("active", peekTarget);
    if (!peekTarget) manualCamOffset = 0;
  }

  btnCamera.addEventListener("click", togglePeek);
  btnRestart.addEventListener("click", () => loadLevel(currentLevelIdx));
  btnSound.addEventListener("click", () => {
    const muted = window.SoundFX.toggleMute();
    btnSound.innerHTML = muted ? "&#x1f507;" : "&#x1f50a;";
  });
  btnLevels.addEventListener("click", openLevelsModal);
  btnCloseLevels.addEventListener("click", () => modalLevels.classList.add("hidden"));
  btnResultLevels.addEventListener("click", () => {
    modalResult.classList.add("hidden");
    openLevelsModal();
  });
  btnRetry.addEventListener("click", () => loadLevel(currentLevelIdx));
  btnNext.addEventListener("click", () => {
    const nextIdx = (currentLevelIdx + 1) % window.GAME_LEVELS.length;
    loadLevel(nextIdx);
  });

  function openLevelsModal() {
    const progress = loadProgress();
    levelsGrid.innerHTML = "";
    window.GAME_LEVELS.forEach((lvl, idx) => {
      const p = progress[lvl.id] || { best: 0, stars: 0 };
      const tile = document.createElement("button");
      tile.className = "level-tile" + (idx === currentLevelIdx ? " current" : "");
      const starsStr = "★".repeat(p.stars) + "☆".repeat(3 - p.stars);
      tile.innerHTML = `
        <div class="level-tile-num">Stage ${lvl.id}</div>
        <div class="level-tile-name">${lvl.name}</div>
        <div class="level-tile-stars" style="color:#fbbf24">${starsStr}</div>
        <div class="level-tile-best">Best: ${p.best.toLocaleString()}</div>
      `;
      tile.addEventListener("click", () => loadLevel(idx));
      levelsGrid.appendChild(tile);
    });
    modalLevels.classList.remove("hidden");
  }

  // Turn resolution & Win/Loss checks
  function checkWorldState(now) {
    if (levelEnded) return;

    // Immediate victory check once things settle briefly after last pig pops
    if (pigs.length === 0) {
      if (phase !== "resolving") {
        phase = "resolving";
        setTimeout(() => finishLevel(true), 900);
      }
      return;
    }

    if (phase !== "flying") return;

    const elapsed = now - launchTime;
    if (elapsed < 900) return;

    // Remove out-of-bounds birds
    activeBirdBodies = activeBirdBodies.filter((b) => {
      const out = b.position.x > WORLD_W + 160 || b.position.x < -160 || b.position.y > WORLD_H + 160;
      if (out) Composite.remove(engine.world, b);
      return !out;
    });

    const birdsStopped = activeBirdBodies.every(
      (b) => Math.hypot(b.velocity.x, b.velocity.y) < 0.38
    );
    const allObjectsCalm = [...blocks, ...pigs].every(
      (b) => Math.hypot(b.velocity.x, b.velocity.y) < 0.45
    );

    if ((birdsStopped && allObjectsCalm && elapsed > 1600) || elapsed > 5600) {
      if (pigs.length === 0) {
        phase = "resolving";
        setTimeout(() => finishLevel(true), 600);
      } else if (birdQueue.length > 0) {
        spawnNextBird();
      } else {
        phase = "resolving";
        setTimeout(() => finishLevel(false), 750);
      }
    }
  }

  function finishLevel(won) {
    if (levelEnded) return;
    levelEnded = true;
    phase = "ended";
    clearBombTimer();

    const level = window.GAME_LEVELS[currentLevelIdx];
    const progress = loadProgress();
    const prevBest = (progress[level.id] && progress[level.id].best) || 0;

    if (won) {
      window.SoundFX.win();
      const unusedBonus = birdQueue.length * 10000;
      const finalScore = score + unusedBonus;
      const [s1, s2, s3] = level.starThresholds;
      const stars = finalScore >= s3 ? 3 : finalScore >= s2 ? 2 : finalScore >= s1 ? 1 : 1;

      saveProgress(level.id, finalScore, stars);
      const bestNow = Math.max(prevBest, finalScore);
      hudBest.textContent = bestNow.toLocaleString();

      resultTitle.textContent = currentLevelIdx === window.GAME_LEVELS.length - 1
        ? "Citadel Conquered!"
        : `Stage ${level.id} Cleared!`;
      resultStars.innerHTML = [1, 2, 3]
        .map((n) => `<span class="${n <= stars ? "star-on" : "star-off"}">★</span>`)
        .join("");
      resultScore.textContent = score.toLocaleString();
      resultBonus.textContent = `+${unusedBonus.toLocaleString()}`;
      resultTotal.textContent = finalScore.toLocaleString();
      resultBest.textContent = bestNow.toLocaleString();
      btnNext.classList.remove("hidden");
      btnNext.textContent = currentLevelIdx === window.GAME_LEVELS.length - 1
        ? "Play Stage 1 →"
        : "Next Level →";
    } else {
      window.SoundFX.lose();
      resultTitle.textContent = "Pigs Survived!";
      resultStars.innerHTML = `<span class="star-off">★★★</span>`;
      resultScore.textContent = score.toLocaleString();
      resultBonus.textContent = "+0";
      resultTotal.textContent = score.toLocaleString();
      resultBest.textContent = prevBest.toLocaleString();
      btnNext.classList.add("hidden");
    }

    modalResult.classList.remove("hidden");
  }

  // ==================== RENDERING ====================

  function drawBackground() {
    // Rich sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, "#1d4ed8");
    sky.addColorStop(0.45, "#38bdf8");
    sky.addColorStop(0.82, "#bae6fd");
    sky.addColorStop(1, "#fef3c7");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.height);

    // Sun glow in world-parallax space
    const sunX = view.width * 0.78 - cameraX * 0.08;
    const sunY = view.height * 0.2;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 130);
    sunGrad.addColorStop(0, "rgba(254, 249, 195, 0.95)");
    sunGrad.addColorStop(0.35, "rgba(253, 224, 71, 0.45)");
    sunGrad.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWorldBackdrop() {
    // Drifting clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    for (const c of clouds) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.arc(26, -8, 32, 0, Math.PI * 2);
      ctx.arc(58, -2, 24, 0, Math.PI * 2);
      ctx.arc(28, 10, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Distant rolling hills
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.moveTo(-200, GROUND_Y);
    for (let x = -200; x <= WORLD_W + 300; x += 180) {
      ctx.quadraticCurveTo(x + 90, GROUND_Y - 125 - ((x / 180) % 2) * 35, x + 180, GROUND_Y);
    }
    ctx.lineTo(WORLD_W + 300, GROUND_Y + 20);
    ctx.lineTo(-200, GROUND_Y + 20);
    ctx.fill();

    // Closer darker green hills
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(-200, GROUND_Y);
    for (let x = -120; x <= WORLD_W + 300; x += 220) {
      ctx.quadraticCurveTo(x + 110, GROUND_Y - 72 - ((x / 220) % 2) * 20, x + 220, GROUND_Y);
    }
    ctx.lineTo(WORLD_W + 300, GROUND_Y + 20);
    ctx.lineTo(-200, GROUND_Y + 20);
    ctx.fill();

    // Ground soil & grass top
    const soilGrad = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H + 100);
    soilGrad.addColorStop(0, "#654321");
    soilGrad.addColorStop(1, "#3b2313");
    ctx.fillStyle = soilGrad;
    ctx.fillRect(-300, GROUND_Y, WORLD_W + 700, 300);

    ctx.fillStyle = "#16a34a";
    ctx.fillRect(-300, GROUND_Y - 4, WORLD_W + 700, 18);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(-300, GROUND_Y - 4, WORLD_W + 700, 6);
  }

  function drawWaitingQueueOnGround() {
    // Draw extra birds waiting near base of slingshot
    for (let i = 1; i < birdQueue.length; i++) {
      const type = birdQueue[i];
      const meta = BIRD_META[type];
      const bx = SLING_X - 55 - i * 44;
      const bounce = Math.abs(Math.sin(performance.now() * 0.004 + i * 1.4)) * 4;
      const by = GROUND_Y - meta.radius - bounce;
      drawBirdGraphic(bx, by, 0, type, meta.radius);
    }
  }

  function drawSlingshotBack() {
    // Back wooden fork
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Base trunk
    ctx.strokeStyle = "#5c3317";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y);
    ctx.lineTo(SLING_X, SLING_Y + 42);
    ctx.stroke();

    // Right/back fork prong
    ctx.strokeStyle = "#6b3e1e";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 42);
    ctx.lineTo(SLING_X + 18, SLING_Y - 6);
    ctx.stroke();

    // Back rubber band
    if (activeBird && (phase === "aiming" || phase === "dragging")) {
      ctx.strokeStyle = "#3f1d0b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(SLING_X + 17, SLING_Y - 2);
      ctx.lineTo(pullPos.x, pullPos.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSlingshotFront() {
    ctx.save();
    ctx.lineCap = "round";
    // Front rubber band
    if (activeBird && (phase === "aiming" || phase === "dragging")) {
      ctx.strokeStyle = "#5a2a10";
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(SLING_X - 16, SLING_Y);
      ctx.lineTo(pullPos.x, pullPos.y);
      ctx.stroke();

      // Leather pouch
      ctx.fillStyle = "#271409";
      ctx.beginPath();
      ctx.arc(pullPos.x - 4, pullPos.y + 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left/front fork prong
    ctx.strokeStyle = "#854d27";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 42);
    ctx.lineTo(SLING_X - 16, SLING_Y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrajectoryPreview() {
    if (phase !== "dragging" || !activeBird) return;
    const dx = SLING_X - pullPos.x;
    const dy = SLING_Y - pullPos.y;
    if (Math.hypot(dx, dy) < 16) return;

    let x = pullPos.x;
    let y = pullPos.y;
    let vx = dx * LAUNCH_SPEED_SCALE;
    let vy = dy * LAUNCH_SPEED_SCALE;
    const gravStep = GRAVITY_Y * 0.001 * (1000 / 60) * (1000 / 60);

    ctx.save();
    for (let step = 1; step <= 48; step++) {
      vx *= 1 - BIRD_FRICTION_AIR;
      vy = vy * (1 - BIRD_FRICTION_AIR) + gravStep;
      x += vx;
      y += vy;
      if (y > GROUND_Y) break;
      if (step % 3 === 0) {
        const alpha = Math.max(0.15, 1 - step / 52);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2.2, 5 - step * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBirdGraphic(x, y, angle, type, r) {
    const meta = BIRD_META[type];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Tail feathers
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r + 2, 0);
    ctx.lineTo(-r - 8, -5);
    ctx.moveTo(-r + 2, 2);
    ctx.lineTo(-r - 9, 2);
    ctx.stroke();

    // Body
    if (type === "yellow") {
      // Triangular Chuck silhouette
      ctx.fillStyle = meta.color;
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.18);
      ctx.lineTo(r * 1.1, r * 0.85);
      ctx.lineTo(-r * 1.1, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = meta.color;
      ctx.strokeStyle = type === "black" ? "#020617" : "#7f1d1d";
      if (type === "blue") ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Belly highlight
      ctx.fillStyle = meta.belly;
      ctx.beginPath();
      ctx.arc(2, r * 0.45, r * 0.52, 0, Math.PI);
      ctx.fill();
    }

    // Bomb fuse
    if (type === "black") {
      ctx.strokeStyle = "#a8a29e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(4, -r - 8, 9, -r - 10);
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(10, -r - 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(4, -3, r * 0.25, 0, Math.PI * 2);
    ctx.arc(11, -3, r * 0.23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(5, -3, r * 0.11, 0, Math.PI * 2);
    ctx.arc(12, -3, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Angry brows
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(8, -5);
    ctx.lineTo(15, -8);
    ctx.stroke();

    // Beak
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(8, 1);
    ctx.lineTo(r + 5, 4);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPigGraphic(body) {
    const { x, y } = body.position;
    const { radius: r, variant, hp, maxHp } = body.gameData;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Ears
    ctx.fillStyle = "#65a30d";
    ctx.beginPath();
    ctx.arc(-r * 0.65, -r * 0.72, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.65, -r * 0.72, r * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Main green sphere
    ctx.fillStyle = "#84cc16";
    ctx.strokeStyle = "#3f6212";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Snout
    ctx.fillStyle = "#bef264";
    ctx.strokeStyle = "#4d7c0f";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 3, r * 0.44, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#365314";
    ctx.beginPath();
    ctx.arc(-r * 0.16, 3, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.16, 3, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-r * 0.36, -r * 0.22, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.36, -r * 0.22, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.22, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.22, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Damage bruise
    if (hp < maxHp * 0.65) {
      ctx.strokeStyle = "#365314";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.3, r * 0.15, 0, Math.PI);
      ctx.stroke();
    }

    // Variants: helmet or crown
    if (variant === "helmet") {
      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2, r * 1.04, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (variant === "king") {
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.78);
      ctx.lineTo(-r * 0.62, -r * 1.32);
      ctx.lineTo(-r * 0.2, -r * 1.05);
      ctx.lineTo(0, -r * 1.42);
      ctx.lineTo(r * 0.2, -r * 1.05);
      ctx.lineTo(r * 0.62, -r * 1.32);
      ctx.lineTo(r * 0.55, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBlockGraphic(body) {
    const { w, h, material, hp, maxHp } = body.gameData;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    if (material === "wood") {
      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
      ctx.fillStyle = "rgba(254, 215, 170, 0.2)";
      ctx.fillRect(-w * 0.5 + 3, -h * 0.5 + 3, w - 6, Math.min(6, h * 0.25));
    } else if (material === "ice") {
      ctx.fillStyle = "rgba(125, 211, 252, 0.72)";
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
      // Glint
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.3);
      ctx.lineTo(w * 0.15, h * 0.2);
      ctx.stroke();
    } else if (material === "stone") {
      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2.5;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fillRect(-w * 0.5 + 3, -h * 0.5 + 3, w - 6, 4);
    } else if (material === "tnt") {
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 2.5;
      ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);
      ctx.fillStyle = "#fef2f2";
      ctx.fillRect(-w * 0.4, -8, w * 0.8, 16);
      ctx.fillStyle = "#991b1b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TNT", 0, 1);
    }

    // Damage cracks
    if (hp < maxHp * 0.68) {
      ctx.strokeStyle = "rgba(15, 23, 42, 0.65)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, -h * 0.25);
      ctx.lineTo(0, 0);
      ctx.lineTo(w * 0.22, h * 0.25);
      if (hp < maxHp * 0.36) {
        ctx.moveTo(w * 0.22, -h * 0.2);
        ctx.lineTo(-w * 0.15, h * 0.22);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawEffects() {
    // Flight trail puffs
    for (const pt of flightTrail) {
      ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      if (p.ring) {
        p.r += (p.maxR - p.r) * 0.22;
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        ctx.restore();
      }
    }

    // Score popups
    ctx.save();
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.y += pop.vy;
      pop.life -= 0.018;
      if (pop.life <= 0) {
        popups.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, pop.life * 1.4);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }

  let lastFrameTime = performance.now();
  function gameLoop(now) {
    const dt = Math.min(32, now - lastFrameTime);
    lastFrameTime = now;

    // Step clouds
    for (const c of clouds) {
      c.x += (c.speed * dt) / 1000;
      if (c.x > WORLD_W + 200) c.x = -180;
    }

    // Step physics at fixed 60Hz tick
    if (engine) {
      Engine.update(engine, 1000 / 60);
    }

    // Record flight trail for lead bird
    if (phase === "flying" && activeBirdBodies.length > 0 && now - lastTrailTime > 55) {
      lastTrailTime = now;
      for (const b of activeBirdBodies) {
        if (Math.hypot(b.velocity.x, b.velocity.y) > 2.2) {
          flightTrail.push({
            x: b.position.x,
            y: b.position.y,
            r: 3.5 + Math.random() * 2,
            alpha: 0.72
          });
          if (flightTrail.length > 55) flightTrail.shift();
        }
      }
    }

    checkWorldState(now);
    updateCameraTransform();

    // Begin frame render
    ctx.save();
    ctx.scale(view.dpr, view.dpr);
    drawBackground();

    // World transform + screen shake
    let sx = 0;
    let sy = 0;
    if (shakeTime > 0) {
      shakeTime--;
      sx = (Math.random() - 0.5) * shakePower;
      sy = (Math.random() - 0.5) * shakePower;
    }

    ctx.translate(view.offsetX + sx, view.offsetY + sy);
    ctx.scale(view.scale, view.scale);

    drawWorldBackdrop();
    drawWaitingQueueOnGround();
    drawSlingshotBack();
    drawTrajectoryPreview();

    // Blocks & Pigs
    for (const b of blocks) drawBlockGraphic(b);
    for (const p of pigs) drawPigGraphic(p);

    // Bird sitting in sling OR flying birds
    if (activeBird && (phase === "aiming" || phase === "dragging")) {
      const ang = phase === "dragging"
        ? Math.atan2(SLING_Y - pullPos.y, SLING_X - pullPos.x)
        : 0;
      drawBirdGraphic(pullPos.x, pullPos.y, ang, activeBird.type, activeBird.meta.radius);
    }
    for (const b of activeBirdBodies) {
      drawBirdGraphic(b.position.x, b.position.y, b.angle, b.gameData.birdType, b.gameData.radius);
    }

    drawSlingshotFront();
    drawEffects();
    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  // Bootstrap
  initClouds();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  loadLevel(0);
  requestAnimationFrame(gameLoop);
})();
