// Level definitions for RBS Angry Birds
// Coordinates use bottom-up offsets relative to GROUND_Y (640) so fortresses stack cleanly with zero overlap.
window.GAME_LEVELS = [
  {
    id: 1,
    name: "Timber Outpost",
    birds: ["red", "red", "red"],
    starThresholds: [14000, 22000, 29000],
    blocks: [
      // Base pillars
      { x: 1100, bottom: 0, w: 22, h: 110, material: "wood" },
      { x: 1230, bottom: 0, w: 22, h: 110, material: "wood" },
      // First roof
      { x: 1165, bottom: 110, w: 170, h: 20, material: "wood" },
      // Second floor pillars
      { x: 1120, bottom: 130, w: 20, h: 90, material: "wood" },
      { x: 1210, bottom: 130, w: 20, h: 90, material: "wood" },
      // Top roof
      { x: 1165, bottom: 220, w: 130, h: 20, material: "wood" },
      // Front ice barrier
      { x: 990, bottom: 0, w: 22, h: 80, material: "ice" },
      { x: 990, bottom: 80, w: 46, h: 18, material: "ice" }
    ],
    pigs: [
      { x: 1165, bottom: 0, variant: "normal" },
      { x: 1165, bottom: 130, variant: "normal" }
    ]
  },
  {
    id: 2,
    name: "Glass Pavilion",
    birds: ["blue", "yellow", "red", "red"],
    starThresholds: [18000, 28000, 36000],
    blocks: [
      // Left ice bay
      { x: 1030, bottom: 0, w: 20, h: 100, material: "ice" },
      { x: 1140, bottom: 0, w: 20, h: 100, material: "ice" },
      { x: 1085, bottom: 100, w: 140, h: 18, material: "ice" },
      // Right wood/ice bay
      { x: 1230, bottom: 0, w: 22, h: 100, material: "wood" },
      { x: 1350, bottom: 0, w: 22, h: 100, material: "wood" },
      { x: 1290, bottom: 100, w: 150, h: 18, material: "wood" },
      // Upper ice bridge
      { x: 1185, bottom: 118, w: 210, h: 18, material: "ice" },
      { x: 1135, bottom: 136, w: 18, h: 75, material: "ice" },
      { x: 1235, bottom: 136, w: 18, h: 75, material: "ice" },
      { x: 1185, bottom: 211, w: 135, h: 18, material: "ice" }
    ],
    pigs: [
      { x: 1085, bottom: 0, variant: "normal" },
      { x: 1290, bottom: 0, variant: "normal" },
      { x: 1185, bottom: 136, variant: "normal" }
    ]
  },
  {
    id: 3,
    name: "Powder Keg Bridge",
    birds: ["yellow", "red", "blue", "red"],
    starThresholds: [22000, 32000, 41000],
    blocks: [
      // Left tower
      { x: 1020, bottom: 0, w: 24, h: 115, material: "wood" },
      { x: 1120, bottom: 0, w: 24, h: 115, material: "wood" },
      { x: 1070, bottom: 115, w: 135, h: 20, material: "wood" },
      // Center TNT nest
      { x: 1190, bottom: 0, w: 46, h: 46, material: "tnt" },
      // Right tower
      { x: 1260, bottom: 0, w: 24, h: 115, material: "wood" },
      { x: 1360, bottom: 0, w: 24, h: 115, material: "wood" },
      { x: 1310, bottom: 115, w: 135, h: 20, material: "wood" },
      // Connecting upper deck
      { x: 1190, bottom: 135, w: 260, h: 20, material: "wood" },
      { x: 1130, bottom: 155, w: 20, h: 80, material: "ice" },
      { x: 1250, bottom: 155, w: 20, h: 80, material: "ice" },
      { x: 1190, bottom: 235, w: 150, h: 18, material: "wood" }
    ],
    pigs: [
      { x: 1070, bottom: 0, variant: "normal" },
      { x: 1310, bottom: 0, variant: "normal" },
      { x: 1190, bottom: 155, variant: "helmet" }
    ]
  },
  {
    id: 4,
    name: "Twin Stone Keep",
    birds: ["black", "yellow", "red", "red"],
    starThresholds: [24000, 34000, 44000],
    blocks: [
      // Outer stone shield
      { x: 980, bottom: 0, w: 28, h: 130, material: "stone" },
      { x: 1080, bottom: 0, w: 24, h: 130, material: "stone" },
      { x: 1030, bottom: 130, w: 135, h: 22, material: "stone" },
      // Inner keep
      { x: 1175, bottom: 0, w: 24, h: 130, material: "wood" },
      { x: 1305, bottom: 0, w: 24, h: 130, material: "stone" },
      { x: 1240, bottom: 130, w: 165, h: 22, material: "stone" },
      // Roof spire
      { x: 1195, bottom: 152, w: 20, h: 90, material: "wood" },
      { x: 1285, bottom: 152, w: 20, h: 90, material: "wood" },
      { x: 1240, bottom: 242, w: 130, h: 20, material: "wood" },
      // Rear guard
      { x: 1410, bottom: 0, w: 24, h: 95, material: "ice" },
      { x: 1495, bottom: 0, w: 24, h: 95, material: "ice" },
      { x: 1452, bottom: 95, w: 120, h: 18, material: "wood" }
    ],
    pigs: [
      { x: 1030, bottom: 0, variant: "normal" },
      { x: 1240, bottom: 0, variant: "helmet" },
      { x: 1240, bottom: 152, variant: "normal" },
      { x: 1452, bottom: 0, variant: "normal" }
    ]
  },
  {
    id: 5,
    name: "The Frozen Pyramid",
    birds: ["blue", "yellow", "black", "red"],
    starThresholds: [28000, 39000, 50000],
    blocks: [
      // Tier 1 (wide base)
      { x: 1030, bottom: 0, w: 22, h: 100, material: "ice" },
      { x: 1150, bottom: 0, w: 22, h: 100, material: "stone" },
      { x: 1270, bottom: 0, w: 22, h: 100, material: "stone" },
      { x: 1390, bottom: 0, w: 22, h: 100, material: "ice" },
      // TNT inside center bay
      { x: 1210, bottom: 0, w: 44, h: 44, material: "tnt" },
      // Tier 1 slabs
      { x: 1090, bottom: 100, w: 150, h: 18, material: "ice" },
      { x: 1210, bottom: 100, w: 125, h: 18, material: "wood" },
      { x: 1330, bottom: 100, w: 150, h: 18, material: "ice" },
      // Tier 2
      { x: 1110, bottom: 118, w: 20, h: 95, material: "wood" },
      { x: 1210, bottom: 118, w: 20, h: 95, material: "ice" },
      { x: 1310, bottom: 118, w: 20, h: 95, material: "wood" },
      { x: 1210, bottom: 213, w: 230, h: 18, material: "ice" },
      // Tier 3 (apex)
      { x: 1160, bottom: 231, w: 18, h: 80, material: "ice" },
      { x: 1260, bottom: 231, w: 18, h: 80, material: "ice" },
      { x: 1210, bottom: 311, w: 135, h: 18, material: "wood" }
    ],
    pigs: [
      { x: 1090, bottom: 0, variant: "normal" },
      { x: 1330, bottom: 0, variant: "normal" },
      { x: 1160, bottom: 118, variant: "normal" },
      { x: 1210, bottom: 231, variant: "helmet" }
    ]
  },
  {
    id: 6,
    name: "King Pig's Citadel",
    birds: ["black", "yellow", "blue", "black", "red"],
    starThresholds: [36000, 50000, 65000],
    blocks: [
      // Front bastion
      { x: 980, bottom: 0, w: 26, h: 115, material: "stone" },
      { x: 1080, bottom: 0, w: 26, h: 115, material: "stone" },
      { x: 1030, bottom: 115, w: 135, h: 20, material: "stone" },
      { x: 1030, bottom: 135, w: 42, h: 42, material: "tnt" },
      // Main citadel lower
      { x: 1170, bottom: 0, w: 26, h: 125, material: "stone" },
      { x: 1290, bottom: 0, w: 24, h: 125, material: "wood" },
      { x: 1410, bottom: 0, w: 26, h: 125, material: "stone" },
      { x: 1230, bottom: 125, w: 150, h: 20, material: "stone" },
      { x: 1350, bottom: 125, w: 150, h: 20, material: "stone" },
      // Main citadel throne room
      { x: 1200, bottom: 145, w: 22, h: 115, material: "wood" },
      { x: 1380, bottom: 145, w: 22, h: 115, material: "wood" },
      { x: 1290, bottom: 260, w: 215, h: 22, material: "wood" },
      // Ice crown canopy
      { x: 1230, bottom: 282, w: 18, h: 70, material: "ice" },
      { x: 1350, bottom: 282, w: 18, h: 70, material: "ice" },
      { x: 1290, bottom: 352, w: 155, h: 18, material: "ice" },
      // Back bunker
      { x: 1490, bottom: 0, w: 24, h: 105, material: "ice" },
      { x: 1585, bottom: 0, w: 24, h: 105, material: "stone" },
      { x: 1538, bottom: 105, w: 130, h: 18, material: "wood" }
    ],
    pigs: [
      { x: 1030, bottom: 0, variant: "helmet" },
      { x: 1230, bottom: 0, variant: "normal" },
      { x: 1350, bottom: 0, variant: "normal" },
      { x: 1290, bottom: 145, variant: "king" },
      { x: 1538, bottom: 0, variant: "helmet" }
    ]
  }
];
