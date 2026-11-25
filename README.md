# RBS Angry Birds (`rbsangry-birds`)

A fast, polished HTML5 Canvas + Matter.js physics slingshot game inspired by Angry Birds — zero build step, ready to deploy directly to **Vercel**.

## Features

- **Real 2D Rigid-Body Physics** powered by [Matter.js](https://brm.io/matter-js/) (bundled locally in `vendor/matter.min.js`).
- **4 Playable Birds with Mid-Air Abilities** (click/tap or press `Space` while airborne):
  - **Red**: Shockwave war-cry push on tap.
  - **Yellow (Chuck)**: Supersonic forward dash — smashes through wood.
  - **Blue (The Blues)**: Splits into 3 birds — shatters ice/glass.
  - **Black (Bomb)**: Massive explosive blast — destroys stone fortresses.
- **4 Destructible Materials & Props**: Wood planks, Ice/Glass blocks, Stone walls, and explosive **TNT crates**.
- **6 Handcrafted Levels** with Regular, Helmeted, and King Pigs, 3-star scoring, and `localStorage` high-score persistence.
- **Procedural Web Audio SFX** (slingshot stretch, launch, impacts, explosions, pig pops, victory fanfare) with mute toggle.
- **Desktop & Mobile Touch Support** with parabolic trajectory preview, smart camera follow, and target peek button.

## Controls

- **Drag** from the slingshot to aim and stretch; **release** to launch.
- **Click / Tap / Space** while a bird is flying to trigger its special ability.
- **Drag** the background (away from the slingshot) or click **Peek Target** (`Tab` / button) to inspect the fortress.
- **R**: Restart current level.

## Deploy to Vercel

### Option 1: GitHub + Vercel Dashboard (Recommended)
1. Create a new GitHub repository named **`rbsangry-birds`**.
2. Push this folder to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/rbsangry-birds.git
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new), import **`rbsangry-birds`**, leave Framework Preset as **Other** (no build command needed), and click **Deploy**.

### Option 2: Vercel CLI
```bash
npx vercel --prod
```
