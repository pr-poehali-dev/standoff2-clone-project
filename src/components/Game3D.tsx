import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface WeaponDef {
  id: string; name: string; price: number; damage: number;
  fireRate: number; reloadTime: number; magSize: number;
  spread: number; recoilX: number; recoilY: number;
  automatic: boolean; pellets?: number; color: number;
  type: "pistol" | "rifle" | "smg" | "shotgun" | "sniper" | "knife";
}

const WEAPONS: Record<string, WeaponDef> = {
  knife:  { id:"knife",  name:"Нож",          price:0,    damage:40,  fireRate:600,  reloadTime:0,    magSize:1,  spread:0,     recoilX:0,     recoilY:0,     automatic:false, color:0xaaaaaa, type:"knife"   },
  glock:  { id:"glock",  name:"Glock-18",      price:200,  damage:25,  fireRate:150,  reloadTime:2200, magSize:20, spread:0.03,  recoilX:0.003, recoilY:0.006, automatic:false, color:0x444455, type:"pistol"  },
  deagle: { id:"deagle", name:"Desert Eagle",  price:700,  damage:75,  fireRate:700,  reloadTime:2500, magSize:7,  spread:0.015, recoilX:0.01,  recoilY:0.025, automatic:false, color:0x998844, type:"pistol"  },
  ak47:   { id:"ak47",   name:"AK-47",         price:2700, damage:36,  fireRate:100,  reloadTime:2700, magSize:30, spread:0.025, recoilX:0.008, recoilY:0.02,  automatic:true,  color:0x8B6000, type:"rifle"   },
  m4a1:   { id:"m4a1",   name:"M4A1-S",        price:2900, damage:33,  fireRate:90,   reloadTime:3100, magSize:25, spread:0.018, recoilX:0.006, recoilY:0.016, automatic:true,  color:0x334455, type:"rifle"   },
  awp:    { id:"awp",    name:"AWP",            price:4750, damage:115, fireRate:1500, reloadTime:3700, magSize:10, spread:0.001, recoilX:0.02,  recoilY:0.05,  automatic:false, color:0x2a4a2a, type:"sniper"  },
  mp5:    { id:"mp5",    name:"MP5-SD",         price:1500, damage:27,  fireRate:75,   reloadTime:2400, magSize:30, spread:0.04,  recoilX:0.005, recoilY:0.012, automatic:true,  color:0x334433, type:"smg"     },
  sg:     { id:"sg",     name:"XM1014",         price:2000, damage:20,  fireRate:400,  reloadTime:3500, magSize:7,  spread:0.12,  recoilX:0.015, recoilY:0.04,  automatic:false, pellets:8, color:0x5a3a22, type:"shotgun" },
};

const BUY_MENU = [
  { category:"Пистолеты",           items:["glock","deagle"] },
  { category:"Пистолеты-пулемёты",  items:["mp5"] },
  { category:"Дробовики",           items:["sg"] },
  { category:"Штурмовые винтовки",  items:["ak47","m4a1"] },
  { category:"Снайперские",         items:["awp"] },
];

// ─── MAP GEOMETRY ─────────────────────────────────────────────────────────────
type Box = [number,number,number, number,number,number, number, number?, number?]; // x,y,z, w,h,d, color, roughness?, metalness?

const C_SAND=0xd4a96a, C_WALL=0xc8a05a, C_DARK=0x8b6914, C_STONE=0x9e8870;
const C_ROOF=0xaa8844, C_FLOOR=0xbfa060, C_BOX=0xaa7733, C_METAL=0x556677;

const MAP: Box[] = [
  // Floor
  [0,-0.5,0, 120,1,120, C_FLOOR, 0.9, 0],
  // Outer walls
  [0,5,-60, 120,12,1, C_WALL],[0,5,60, 120,12,1, C_WALL],
  [-60,5,0, 1,12,120, C_WALL],[60,5,0, 1,12,120, C_WALL],
  // T-Spawn
  [-35,0.1,35, 30,0.2,20, C_SAND],[-35,3,25, 30,6,1, C_WALL],
  [-42,3,30, 2,6,2, C_STONE],[-28,3,30, 2,6,2, C_STONE],
  // Long A corridor
  [-20,0,50, 30,0.2,20, C_SAND],[-35,4,45, 1,8,30, C_WALL],
  [-5,4,45, 1,8,30, C_WALL],[-20,8,45, 30,1,30, C_ROOF],
  [-8,1.5,38, 5,3,5, C_BOX],
  // A-site
  [25,0.2,25, 35,0.4,35, C_SAND],[10,2,10, 1,4,20, C_WALL],
  [18,1,18, 8,2,4, C_BOX],[18,2.5,18, 8,0.5,4, C_BOX],
  [42,4,25, 1,8,35, C_WALL],[25,4,8, 35,8,1, C_WALL],
  [28,1,22, 7,2,4, C_METAL, 0.3, 0.6],[28,2.5,22, 7,0.5,4, C_METAL, 0.3, 0.6],
  [30,1.5,30, 4,3,4, C_BOX],[30,3.5,30, 4,1,4, C_BOX],
  // Short / Ramp
  [0,1,8, 20,2,3, C_STONE],[0,0.5,12, 20,1,3, C_STONE],
  [0,4,-2, 20,8,1, C_WALL],
  // CT-Spawn
  [35,0,-35, 25,0.2,25, C_SAND],[22,4,-48, 1,8,25, C_WALL],
  [47,4,-48, 1,8,25, C_WALL],[35,4,-22, 25,8,1, C_WALL],
  [25,3,-30, 2,6,2, C_STONE],[45,3,-30, 2,6,2, C_STONE],
  [38,1,-40, 6,2,4, C_METAL, 0.3, 0.6],
  // Mid
  [0,0,0, 25,0.2,25, C_SAND],[-15,4,-2, 1,8,20, C_WALL],
  [15,4,-2, 1,8,20, C_WALL],[0,8,-2, 25,1,20, C_ROOF],
  [-5,1.5,-5, 4,3,4, C_BOX],[5,1.5,5, 4,3,4, C_BOX],
  [0,4,-12, 12,8,1, C_WALL],
  // B Tunnels
  [-20,0,-20, 20,0.2,15, C_DARK],[-20,5,-20, 20,1,15, C_ROOF],
  [-30,3,-20, 1,6,15, C_WALL],[-10,3,-20, 1,6,15, C_WALL],
  [-30,0,-5, 10,0.2,20, C_DARK],[-30,5,-5, 10,1,20, C_ROOF],
  [-40,3,-5, 1,6,20, C_WALL],[-20,3,-5, 1,6,20, C_WALL],
  // B-site
  [-35,0.2,-25, 30,0.4,30, C_SAND],[-50,4,-25, 1,8,30, C_WALL],
  [-35,4,-40, 30,8,1, C_WALL],[-38,1.5,-28, 5,3,5, C_BOX],
  [-38,4,-28, 5,2,5, C_BOX],[-28,1.5,-20, 4,3,4, C_BOX],
  [-42,1,-18, 7,2,4, C_METAL, 0.3, 0.6],[-45,1.5,-30, 4,3,3, C_STONE],
  // Palace
  [30,0,-5, 20,0.2,15, C_SAND],[30,4,-12, 20,8,1, C_WALL],
  [20,4,-5, 1,8,15, C_WALL],[40,4,-5, 1,8,15, C_WALL],
  [30,8,-5, 20,1,15, C_ROOF],[25,1.5,-5, 3,3,3, C_BOX],
  // Catwalk
  [12,3,15, 8,0.5,30, C_STONE],[8,4,15, 1,2,30, C_WALL],
  [16,4,15, 1,2,30, C_WALL],
  // Details
  [-30,1.5,20, 2,3,2, C_METAL, 0.3, 0.6],[8,1,-8, 4,2,2, C_DARK],
  [-22,1,-35, 1,2,6, C_METAL, 0.3, 0.6],[-15,1.5,42, 6,3,6, C_BOX],
];

const T_SPAWN  = new THREE.Vector3(-35, 2, 38);
const CT_SPAWN = new THREE.Vector3(35, 2, -38);

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
class SoundEngine {
  ctx: AudioContext;
  masterGain: GainNode;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() { if (this.ctx.state === "suspended") this.ctx.resume(); }

  _makeNoise(buf: AudioBuffer, type: "white"|"brown") {
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < buf.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = type === "brown" ? (last = (last + 0.02 * white) / 1.02) * 3 : white;
    }
  }

  _burst(freq: number, dur: number, gain: number, type: OscillatorType = "sine") {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.2, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  _noise(dur: number, gain: number, freq: number, q: number, type: "white"|"brown" = "white") {
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    this._makeNoise(buf, type);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(filter); filter.connect(g); g.connect(this.masterGain);
    src.start(); src.stop(this.ctx.currentTime + dur);
  }

  playShot(type: WeaponDef["type"]) {
    this.resume();
    if (type === "knife") { this._noise(0.08, 0.4, 800, 2); return; }
    if (type === "sniper") {
      this._burst(200, 0.35, 0.6, "sawtooth");
      this._noise(0.25, 1.0, 600, 1);
    } else if (type === "shotgun") {
      for (let i = 0; i < 3; i++) setTimeout(() => { this._noise(0.18, 0.8, 400+i*100, 1.5); this._burst(120+i*20, 0.2, 0.4, "square"); }, i * 15);
    } else if (type === "rifle") {
      this._burst(180, 0.15, 0.5, "sawtooth");
      this._noise(0.12, 0.9, 900, 2);
      this._noise(0.08, 0.5, 300, 1);
    } else if (type === "smg") {
      this._burst(300, 0.1, 0.35, "sawtooth");
      this._noise(0.09, 0.6, 700, 2);
    } else {
      this._burst(250, 0.18, 0.4, "sawtooth");
      this._noise(0.14, 0.7, 800, 2);
    }
  }

  playReload() {
    this.resume();
    this._noise(0.07, 0.3, 2000, 5, "white");
    setTimeout(() => this._noise(0.06, 0.4, 1500, 4, "white"), 200);
    setTimeout(() => this._burst(400, 0.08, 0.2, "square"), 400);
  }

  playEmpty() {
    this.resume();
    this._burst(800, 0.05, 0.2, "square");
  }

  playStep() {
    this.resume();
    this._noise(0.08, 0.15, 300, 3, "brown");
  }

  playHit() {
    this.resume();
    this._noise(0.06, 0.5, 1200, 3);
    this._burst(150, 0.1, 0.3, "sawtooth");
  }

  playDeath() {
    this.resume();
    this._noise(0.4, 0.7, 400, 1, "brown");
    this._burst(80, 0.5, 0.5, "sawtooth");
  }

  playSwitchWeapon() {
    this.resume();
    this._noise(0.06, 0.2, 1800, 6);
    setTimeout(() => this._noise(0.04, 0.15, 2200, 8), 80);
  }
}

// ─── WEAPON MODEL BUILDER ─────────────────────────────────────────────────────
function buildWeaponModel(wDef: WeaponDef): THREE.Group {
  const group = new THREE.Group();

  const metal = (color: number, rough = 0.25, metal = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const plastic = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
  const wood = () =>
    new THREE.MeshStandardMaterial({ color: 0x7B4A1A, roughness: 0.95, metalness: 0 });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x=0,y=0,z=0, rx=0,ry=0,rz=0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
    m.castShadow = true;
    group.add(m);
    return m;
  };

  if (wDef.type === "knife") {
    // Detailed knife
    add(new THREE.BoxGeometry(0.025,0.008,0.28), metal(0xddeeff, 0.05, 0.95), 0,0,-0.14); // blade
    add(new THREE.BoxGeometry(0.03,0.015,0.06), metal(0x888888), 0,0.002,0.01);           // guard
    add(new THREE.BoxGeometry(0.035,0.035,0.14), plastic(0x1a1a1a), 0,0,0.1);             // handle
    // Grip wrapping lines
    for (let i = 0; i < 4; i++)
      add(new THREE.BoxGeometry(0.037,0.004,0.006), plastic(0x333333), 0,0.016,0.06+i*0.025);
    add(new THREE.CylinderGeometry(0.018,0.022,0.025,8), metal(0x666666), 0,-0.018,0.18);  // pommel
  } else {

    // ── Shared parts ──────────────────────────────────────────────────────────
    const bodyColor = wDef.color;
    const darkParts = metal(0x111111, 0.3, 0.9);
    const bodyMat   = metal(bodyColor, 0.3, 0.85);
    const gripMat   = plastic(0x1a1a1a);

    if (wDef.type === "pistol") {
      // ── PISTOL ──────────────────────────────────────────────────────────────
      const slide = metal(bodyColor, 0.2, 0.9);
      add(new THREE.BoxGeometry(0.058,0.09,0.21), slide, 0,0.015,-0.08);           // slide
      // Slide serrations
      for (let i = 0; i < 5; i++)
        add(new THREE.BoxGeometry(0.062,0.003,0.006), metal(0x222222, 0.1, 0.95), 0,0.015,-0.14+i*0.018);
      add(new THREE.BoxGeometry(0.054,0.07,0.18), plastic(0x222222), 0,-0.014,-0.075); // frame
      // Trigger guard
      add(new THREE.BoxGeometry(0.044,0.003,0.08), gripMat, 0,-0.047,-0.04);
      add(new THREE.BoxGeometry(0.044,0.045,0.003), gripMat, 0,-0.025,0.0);
      // Grip
      add(new THREE.BoxGeometry(0.055,0.11,0.07), plastic(0x1a1a1a), 0,-0.09,0.05);
      // Grip texture panels
      for (let i = 0; i < 6; i++)
        add(new THREE.BoxGeometry(0.057,0.004,0.065), plastic(0x111111), 0,-0.04-i*0.012,0.05);
      // Barrel
      add(new THREE.CylinderGeometry(0.012,0.013,0.06,8), darkParts, 0,0.018,-0.22, Math.PI/2,0,0);
      // Sight front
      add(new THREE.BoxGeometry(0.004,0.012,0.004), metal(0xffffff, 0.9, 0), 0,0.068,-0.19);
      // Sight rear (notch)
      add(new THREE.BoxGeometry(0.02,0.01,0.004), darkParts, 0,0.068,-0.005);
      if (wDef.id === "deagle") {
        // Longer barrel, compensator
        add(new THREE.CylinderGeometry(0.015,0.015,0.09,8), darkParts, 0,0.018,-0.265, Math.PI/2,0,0);
        add(new THREE.BoxGeometry(0.035,0.03,0.04), darkParts, 0,0.018,-0.33);
      }
      // Magazine
      add(new THREE.BoxGeometry(0.046,0.09,0.06), darkParts, 0,-0.13,0.05);

    } else if (wDef.type === "rifle") {
      // ── RIFLE (AK-47 / M4A1) ────────────────────────────────────────────────
      const isAK = wDef.id === "ak47";
      // Upper receiver
      add(new THREE.BoxGeometry(0.065,0.07,0.46), bodyMat, 0,0.015,-0.1);
      // Lower receiver
      add(new THREE.BoxGeometry(0.06,0.06,0.38), plastic(0x222222), 0,-0.022,-0.08);
      // Handguard
      const hgMat = isAK ? wood() : plastic(0x222222);
      add(new THREE.BoxGeometry(0.068,0.06,0.22), hgMat, 0,-0.002,-0.26);
      // Rail on top
      for (let i = 0; i < 8; i++)
        add(new THREE.BoxGeometry(0.07,0.008,0.012), metal(0x333333, 0.2, 0.9), 0,0.053,-0.22+i*0.028);
      // Barrel
      add(new THREE.CylinderGeometry(0.012,0.014,0.52,8), darkParts, 0,0.02,-0.49, Math.PI/2,0,0);
      // Gas tube (above barrel)
      add(new THREE.CylinderGeometry(0.006,0.006,0.25,6), metal(0x444444), 0,0.04,-0.35, Math.PI/2,0,0);
      // Muzzle device
      if (isAK) {
        add(new THREE.CylinderGeometry(0.016,0.013,0.045,8), darkParts, 0,0.02,-0.76, Math.PI/2,0,0);
      } else {
        // Suppressor M4
        add(new THREE.CylinderGeometry(0.019,0.019,0.12,12), darkParts, 0,0.02,-0.82, Math.PI/2,0,0);
      }
      // Magazine - curved for AK
      if (isAK) {
        add(new THREE.BoxGeometry(0.048,0.13,0.065), plastic(0x1a1a1a), 0,-0.11,-0.02);
        add(new THREE.BoxGeometry(0.046,0.04,0.04), plastic(0x1a1a1a), 0,-0.2,0.01, 0.25,0,0);
      } else {
        add(new THREE.BoxGeometry(0.044,0.15,0.048), plastic(0x1a1a1a), 0,-0.11,-0.02);
      }
      // Pistol grip
      add(new THREE.BoxGeometry(0.052,0.11,0.065), plastic(0x1a1a1a), 0,-0.09,0.08, -0.2,0,0);
      // Grip texture
      for (let i = 0; i < 5; i++)
        add(new THREE.BoxGeometry(0.054,0.004,0.06), plastic(0x111111), 0,-0.05-i*0.015,0.07, -0.2,0,0);
      // Stock
      if (isAK) {
        add(new THREE.BoxGeometry(0.05,0.05,0.23), wood(), 0,-0.01,0.26);
        add(new THREE.BoxGeometry(0.05,0.025,0.06), wood(), 0,-0.038,0.38, -0.15,0,0);
      } else {
        // Collapsible stock M4
        add(new THREE.BoxGeometry(0.04,0.04,0.18), metal(0x333333, 0.4, 0.7), 0,-0.005,0.27);
        add(new THREE.BoxGeometry(0.055,0.065,0.09), plastic(0x222222), 0,-0.012,0.38);
        add(new THREE.BoxGeometry(0.024,0.04,0.18), metal(0x333333, 0.4, 0.7), 0,0.018,0.27);
      }
      // Charging handle
      add(new THREE.BoxGeometry(0.012,0.022,0.025), darkParts, 0,0.04,0.12);
      // Bolt catch / controls
      add(new THREE.BoxGeometry(0.006,0.018,0.022), darkParts, -0.033,-0.002,-0.04);
      // Front/rear sights
      add(new THREE.BoxGeometry(0.006,0.025,0.008), darkParts, 0,0.055,-0.56);
      add(new THREE.BoxGeometry(0.02,0.02,0.008), darkParts, 0,0.055,0.06);

    } else if (wDef.type === "sniper") {
      // ── AWP ──────────────────────────────────────────────────────────────────
      // Receiver
      add(new THREE.BoxGeometry(0.065,0.09,0.56), bodyMat, 0,0.01,-0.12);
      // Barrel - very long
      add(new THREE.CylinderGeometry(0.013,0.016,0.72,10), darkParts, 0,0.015,-0.66, Math.PI/2,0,0);
      // Muzzle brake
      add(new THREE.CylinderGeometry(0.022,0.018,0.06,8), darkParts, 0,0.015,-1.035, Math.PI/2,0,0);
      // Scope body
      add(new THREE.CylinderGeometry(0.028,0.028,0.26,12), metal(0x111111, 0.15, 0.95), 0,0.075,-0.06, Math.PI/2,0,0);
      // Scope lenses
      add(new THREE.CylinderGeometry(0.026,0.026,0.008,12), metal(0x1a3a5a, 0.05, 0.3), 0,0.075,-0.195, Math.PI/2,0,0);
      add(new THREE.CylinderGeometry(0.024,0.026,0.008,12), metal(0x1a3a5a, 0.05, 0.3), 0,0.075,0.075, Math.PI/2,0,0);
      // Scope mount rings
      add(new THREE.CylinderGeometry(0.034,0.034,0.018,12), metal(0x555555, 0.3, 0.8), 0,0.068,-0.12, Math.PI/2,0,0);
      add(new THREE.CylinderGeometry(0.034,0.034,0.018,12), metal(0x555555, 0.3, 0.8), 0,0.068,0.0, Math.PI/2,0,0);
      // Elevation/windage knobs
      add(new THREE.CylinderGeometry(0.012,0.012,0.025,8), metal(0x666666), -0.04,0.075,-0.06);
      add(new THREE.CylinderGeometry(0.012,0.012,0.025,8), metal(0x666666), 0,0.104,-0.06, 0,0,Math.PI/2);
      // Thumbhole stock
      add(new THREE.BoxGeometry(0.055,0.14,0.28), plastic(0x2a4a2a), 0,-0.04,0.21);
      add(new THREE.BoxGeometry(0.053,0.055,0.15), plastic(0x2a4a2a), 0,-0.095,0.14, 0.3,0,0);
      // Cheekpiece
      add(new THREE.BoxGeometry(0.055,0.055,0.18), plastic(0x2a4a2a), 0,0.06,0.25, -0.1,0,0);
      // Pistol grip
      add(new THREE.BoxGeometry(0.05,0.11,0.065), plastic(0x1a1a1a), 0,-0.09,0.075, -0.25,0,0);
      // Bipod (folded)
      add(new THREE.BoxGeometry(0.01,0.06,0.01), metal(0x555555), -0.025,-0.04,-0.42, 0.3,0,0);
      add(new THREE.BoxGeometry(0.01,0.06,0.01), metal(0x555555), 0.025,-0.04,-0.42, 0.3,0,0);
      // Magazine
      add(new THREE.BoxGeometry(0.052,0.1,0.05), plastic(0x1a1a1a), 0,-0.085,-0.04);

    } else if (wDef.type === "smg") {
      // ── MP5-SD ───────────────────────────────────────────────────────────────
      add(new THREE.BoxGeometry(0.062,0.07,0.38), bodyMat, 0,0.01,-0.06);
      // Integrated suppressor (SD = Schalldämpfer)
      add(new THREE.CylinderGeometry(0.022,0.022,0.36,12), metal(0x333333, 0.4, 0.8), 0,0.014,-0.34, Math.PI/2,0,0);
      // Perforations on suppressor
      for (let i = 0; i < 6; i++) {
        add(new THREE.CylinderGeometry(0.004,0.004,0.025,6), metal(0x111111), 0.022,0.014,-0.2+i*0.035, 0,0,Math.PI/2);
        add(new THREE.CylinderGeometry(0.004,0.004,0.025,6), metal(0x111111), -0.022,0.014,-0.2+i*0.035, 0,0,Math.PI/2);
      }
      // Lower receiver / handguard
      add(new THREE.BoxGeometry(0.058,0.055,0.32), plastic(0x1a1a1a), 0,-0.018,-0.04);
      // Magazine (curved)
      add(new THREE.BoxGeometry(0.042,0.13,0.048), plastic(0x222222), 0,-0.1,-0.01);
      add(new THREE.BoxGeometry(0.04,0.04,0.03), plastic(0x222222), 0,-0.2,0.01, 0.2,0,0);
      // Grip
      add(new THREE.BoxGeometry(0.05,0.1,0.06), plastic(0x1a1a1a), 0,-0.085,0.1, -0.15,0,0);
      // Folding stock (folded out)
      add(new THREE.BoxGeometry(0.036,0.012,0.2), metal(0x444444, 0.5, 0.7), 0,-0.02,0.26);
      add(new THREE.BoxGeometry(0.05,0.055,0.075), plastic(0x222222), 0,-0.018,0.38);
      // Rail top
      for (let i = 0; i < 5; i++)
        add(new THREE.BoxGeometry(0.066,0.007,0.01), metal(0x333333, 0.2, 0.9), 0,0.048,-0.08+i*0.03);
      // Sights
      add(new THREE.BoxGeometry(0.005,0.02,0.006), metal(0xffffff, 0.9, 0), 0,0.052,-0.26);
      add(new THREE.BoxGeometry(0.018,0.016,0.006), darkParts, 0,0.052,0.04);

    } else if (wDef.type === "shotgun") {
      // ── XM1014 ───────────────────────────────────────────────────────────────
      add(new THREE.BoxGeometry(0.07,0.08,0.52), bodyMat, 0,0.01,-0.1);
      // Barrel (wide)
      add(new THREE.CylinderGeometry(0.018,0.02,0.55,10), darkParts, 0,0.02,-0.5, Math.PI/2,0,0);
      // Tubular magazine under barrel
      add(new THREE.CylinderGeometry(0.013,0.013,0.38,8), darkParts, 0,-0.02,-0.32, Math.PI/2,0,0);
      // Magazine cap
      add(new THREE.CylinderGeometry(0.015,0.013,0.02,8), darkParts, 0,-0.02,-0.52, Math.PI/2,0,0);
      // Pump/foregrip
      add(new THREE.BoxGeometry(0.072,0.055,0.14), wood(), 0,-0.005,-0.32);
      // Grooves on pump
      for (let i = 0; i < 4; i++)
        add(new THREE.BoxGeometry(0.074,0.003,0.008), metal(0x5a3a00, 0.9, 0), 0,-0.005,-0.28+i*0.025);
      // Stock (wood)
      add(new THREE.BoxGeometry(0.055,0.07,0.28), wood(), 0,-0.012,0.24);
      add(new THREE.BoxGeometry(0.055,0.04,0.07), wood(), 0,-0.038,0.39, -0.2,0,0);
      // Pistol grip (no separate grip, it's a traditional shotgun stock)
      // Receiver detail
      add(new THREE.BoxGeometry(0.068,0.05,0.06), metal(0x333333, 0.3, 0.8), 0,-0.015,-0.02);
      // Loading port
      add(new THREE.BoxGeometry(0.03,0.025,0.06), metal(0x111111), -0.04,0.005,-0.02);
      // Sights
      add(new THREE.CylinderGeometry(0.005,0.005,0.02,6), metal(0xffffff, 0.8, 0.1), 0,0.055,-0.72, Math.PI/2,0,0);
    }

    // Muzzle flash (always added, hidden by default)
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), flashMat);
    flash.name = "muzzleFlash";
    // Position at barrel end
    const barrelOffset = wDef.type === "sniper" ? -1.08 : wDef.type === "rifle" ? -0.82 : wDef.type === "shotgun" ? -0.78 : -0.28;
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(0, 0.018, barrelOffset);
    group.add(flash);
  }

  return group;
}

// ─── ENEMY MODEL ──────────────────────────────────────────────────────────────
function buildEnemyModel(team: "T" | "CT"): THREE.Group {
  const group = new THREE.Group();
  const isT = team === "T";

  const skin  = new THREE.MeshStandardMaterial({ color: 0xd4a57a, roughness: 0.8, metalness: 0 });
  const vest  = new THREE.MeshStandardMaterial({ color: isT ? 0x8B4513 : 0x2244aa, roughness: 0.9, metalness: 0 });
  const pants = new THREE.MeshStandardMaterial({ color: isT ? 0x6B4226 : 0x1a3366, roughness: 0.9, metalness: 0 });
  const boot  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.1 });
  const helm  = new THREE.MeshStandardMaterial({ color: isT ? 0x5c3a1e : 0x1a2a4a, roughness: 0.6, metalness: 0.2 });
  const bala  = new THREE.MeshStandardMaterial({ color: isT ? 0x2a1a0a : 0x0a1020, roughness: 0.95, metalness: 0 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0 });
  const gunM  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.9 });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x=0,y=0,z=0, rx=0,ry=0,rz=0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m); return m;
  };

  // ── Legs ──
  add(new THREE.BoxGeometry(0.22,0.52,0.22), pants, -0.11,0.28,0); // left thigh
  add(new THREE.BoxGeometry(0.22,0.52,0.22), pants,  0.11,0.28,0); // right thigh
  add(new THREE.BoxGeometry(0.20,0.48,0.20), pants, -0.11,-0.26,0); // left shin
  add(new THREE.BoxGeometry(0.20,0.48,0.20), pants,  0.11,-0.26,0); // right shin
  // Boots
  add(new THREE.BoxGeometry(0.22,0.12,0.28), boot, -0.11,-0.51,0.04);
  add(new THREE.BoxGeometry(0.22,0.12,0.28), boot,  0.11,-0.51,0.04);
  // Boot soles
  add(new THREE.BoxGeometry(0.24,0.025,0.30), new THREE.MeshStandardMaterial({color:0x0a0a0a}), -0.11,-0.575,0.04);
  add(new THREE.BoxGeometry(0.24,0.025,0.30), new THREE.MeshStandardMaterial({color:0x0a0a0a}),  0.11,-0.575,0.04);

  // ── Torso (vest) ──
  add(new THREE.BoxGeometry(0.52,0.58,0.32), vest, 0,0.73,0);
  // Vest straps
  add(new THREE.BoxGeometry(0.04,0.55,0.025), new THREE.MeshStandardMaterial({color:0x333333, roughness:0.9}), -0.15,0.73,0.17);
  add(new THREE.BoxGeometry(0.04,0.55,0.025), new THREE.MeshStandardMaterial({color:0x333333, roughness:0.9}),  0.15,0.73,0.17);
  // Vest pouches
  add(new THREE.BoxGeometry(0.12,0.1,0.06), vest, -0.18,0.62,0.18);
  add(new THREE.BoxGeometry(0.12,0.1,0.06), vest,  0.18,0.62,0.18);
  add(new THREE.BoxGeometry(0.1,0.08,0.06), vest, 0,0.58,0.18);
  // Belt
  add(new THREE.BoxGeometry(0.54,0.04,0.34), new THREE.MeshStandardMaterial({color:0x222222, roughness:0.6}), 0,0.44,0);
  // Belt buckle
  add(new THREE.BoxGeometry(0.05,0.04,0.006), new THREE.MeshStandardMaterial({color:0x888866, metalness:0.8, roughness:0.2}), 0,0.44,0.17);

  // ── Arms ──
  // Upper arms
  add(new THREE.BoxGeometry(0.16,0.38,0.16), vest, -0.34,0.73,0, 0,0,0.15);
  add(new THREE.BoxGeometry(0.16,0.38,0.16), vest,  0.34,0.73,0, 0,0,-0.15);
  // Forearms
  add(new THREE.BoxGeometry(0.13,0.34,0.13), pants, -0.38,0.4,-0.05, -0.2,0,0.1);
  add(new THREE.BoxGeometry(0.13,0.34,0.13), pants,  0.38,0.4,-0.05, -0.2,0,-0.1);
  // Gloves
  add(new THREE.BoxGeometry(0.14,0.1,0.12), glove, -0.39,0.23,-0.08);
  add(new THREE.BoxGeometry(0.14,0.1,0.12), glove,  0.39,0.23,-0.08);

  // ── Head / Neck ──
  add(new THREE.CylinderGeometry(0.1,0.1,0.14,8), skin, 0,1.05,0); // neck
  // Head base (with balaclava)
  add(new THREE.SphereGeometry(0.22,12,10), bala, 0,1.3,0);
  // Face plate / opening for eyes
  add(new THREE.BoxGeometry(0.28,0.08,0.05), skin, 0,1.32,0.18);
  // Eyes (white + dark pupil)
  add(new THREE.SphereGeometry(0.03,6,6), new THREE.MeshStandardMaterial({color:0xffffff}), -0.07,1.34,0.22);
  add(new THREE.SphereGeometry(0.03,6,6), new THREE.MeshStandardMaterial({color:0xffffff}),  0.07,1.34,0.22);
  add(new THREE.SphereGeometry(0.018,6,6), new THREE.MeshStandardMaterial({color:0x111111}), -0.07,1.34,0.235);
  add(new THREE.SphereGeometry(0.018,6,6), new THREE.MeshStandardMaterial({color:0x111111}),  0.07,1.34,0.235);

  // ── Helmet ──
  add(new THREE.SphereGeometry(0.245,10,8, 0, Math.PI*2, 0, Math.PI*0.56), helm, 0,1.35,0);
  // Helmet rail
  add(new THREE.BoxGeometry(0.035,0.018,0.38), new THREE.MeshStandardMaterial({color:0x444444, metalness:0.7, roughness:0.3}), 0,1.6,-0.02);
  // NVG mount (aesthetic)
  add(new THREE.BoxGeometry(0.06,0.04,0.035), new THREE.MeshStandardMaterial({color:0x222222, metalness:0.8}), 0,1.6,0.22);
  // Ear protection
  add(new THREE.CylinderGeometry(0.055,0.055,0.03,8), helm, -0.25,1.35,0, 0,0,Math.PI/2);
  add(new THREE.CylinderGeometry(0.055,0.055,0.03,8), helm,  0.25,1.35,0, 0,0,Math.PI/2);

  // ── Weapon in hands ──
  add(new THREE.BoxGeometry(0.06,0.06,0.42), gunM, 0.3,0.35,-0.22, -0.2,0,0.1);
  add(new THREE.CylinderGeometry(0.01,0.012,0.4,6), gunM, 0.28,0.37,-0.42, Math.PI/2,0,0.05);
  add(new THREE.BoxGeometry(0.04,0.1,0.05), gunM, 0.3,0.27,-0.1, -0.2,0,0.1);

  // Move pivot to feet
  group.children.forEach(c => c.position.y += 0.58);

  return group;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface Props { onExit: () => void; }

interface PlayerState {
  health: number; armor: number; money: number;
  currentWeapon: string; weapons: string[];
  ammo: Record<string, { mag: number; reserve: number }>;
}

export default function Game3D({ onExit }: Props) {
  // ── Refs (never trigger re-render) ──────────────────────────────────────────
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef        = useRef<number>(0);
  const keys          = useRef<Record<string, boolean>>({});
  const mouse         = useRef({ locked: false });
  const pitch         = useRef(0);
  const yaw           = useRef(0);
  const velocity      = useRef(new THREE.Vector3());
  const onGround      = useRef(true);
  const colliders     = useRef<THREE.Box3[]>([]);
  const weaponGroup   = useRef<THREE.Group | null>(null);
  const weaponAnim    = useRef({ recoilY:0, recoilX:0, bobPhase:0, shootAnim:0, reloadAnim:0, inspectT:0, inspecting:false });
  const lastShot      = useRef(0);
  const isReloading   = useRef(false);
  const isFiring      = useRef(false);
  const enemies       = useRef<THREE.Group[]>([]);
  const enemyHP       = useRef<{ hp:number; alive:boolean; lastShot:number }[]>([]);
  const particles     = useRef<{ pts:THREE.Points; life:number; max:number; vel:THREE.Vector3[] }[]>([]);
  const bulletHoles   = useRef<THREE.Mesh[]>([]);
  const soundEngine   = useRef<SoundEngine | null>(null);
  const stepTimer     = useRef(0);
  const prevPos       = useRef(new THREE.Vector3());
  const prevTime      = useRef(performance.now());
  const playerRef     = useRef<PlayerState>({
    health:100, armor:0, money:3000, currentWeapon:"glock",
    weapons:["knife","glock"],
    ammo:{ knife:{mag:1,reserve:0}, glock:{mag:20,reserve:60} }
  });

  // ── State (triggers re-render for UI) ───────────────────────────────────────
  const [phase, setPhase]       = useState<"menu"|"playing"|"dead"|"win">("menu");
  const [team, setTeam]         = useState<"T"|"CT">("T");
  const [score, setScore]       = useState({ T:0, CT:0 });
  const [round, setRound]       = useState(1);
  const [player, setPlayer]     = useState<PlayerState>(playerRef.current);
  const [hud, setHud]           = useState({ health:100, armor:0, mag:20, reserve:60, weapon:"Glock-18", reloading:false });
  const [locked, setLocked]     = useState(false);
  const [crossHit, setCrossHit] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [showBuy, setShowBuy]   = useState(false);
  const showBuyRef              = useRef(false);
  const [buyCat, setBuyCat]     = useState(0);
  const [inspecting, setInspecting] = useState(false);

  // sync playerRef
  useEffect(() => { playerRef.current = player; }, [player]);

  // ── Sound init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    soundEngine.current = new SoundEngine();
    return () => { soundEngine.current?.ctx.close(); };
  }, []);

  // ── Build scene ─────────────────────────────────────────────────────────────
  const buildScene = useCallback((scene: THREE.Scene) => {
    // Sky
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0xfff0dd, 0.55));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left:-90, right:90, top:90, bottom:-90, near:1, far:220 });
    scene.add(sun);
    scene.add(Object.assign(new THREE.DirectionalLight(0xaaddff, 0.3), { position: new THREE.Vector3(-30, 30, -40) }));

    // Map geometry
    const cols: THREE.Box3[] = [];
    MAP.forEach(([x,y,z,w,h,d,color,rough,metl]) => {
      const mat = new THREE.MeshStandardMaterial({
        color, roughness: rough ?? 0.85, metalness: metl ?? 0.05
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      mesh.position.set(x,y,z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      if (h > 0.5) cols.push(new THREE.Box3().setFromObject(mesh));
    });
    colliders.current = cols;
  }, []);

  const spawnEnemies = useCallback((scene: THREE.Scene, playerTeam: "T"|"CT") => {
    enemies.current.forEach(e => scene.remove(e));
    enemies.current = [];
    enemyHP.current = [];
    const enemyTeam = playerTeam === "T" ? "CT" : "T";
    const spawnPts = playerTeam === "T"
      ? [new THREE.Vector3(30,-0.2,-35), new THREE.Vector3(25,-0.2,25), new THREE.Vector3(38,-0.2,28), new THREE.Vector3(22,-0.2,-20)]
      : [new THREE.Vector3(-30,-0.2,35), new THREE.Vector3(-25,-0.2,-20), new THREE.Vector3(-38,-0.2,-25), new THREE.Vector3(-22,-0.2,20)];
    spawnPts.forEach(pos => {
      const e = buildEnemyModel(enemyTeam);
      e.position.copy(pos);
      scene.add(e);
      enemies.current.push(e);
      enemyHP.current.push({ hp:100, alive:true, lastShot:0 });
    });
  }, []);

  // ── Weapon mesh management ──────────────────────────────────────────────────
  const attachWeapon = useCallback((scene: THREE.Scene, wId: string) => {
    if (weaponGroup.current) scene.remove(weaponGroup.current);
    const g = buildWeaponModel(WEAPONS[wId]);
    scene.add(g);
    weaponGroup.current = g;
    weaponAnim.current = { recoilY:0, recoilX:0, bobPhase:0, shootAnim:0, reloadAnim:0, inspectT:0, inspecting:false };
  }, []);

  // ── Shoot ───────────────────────────────────────────────────────────────────
  const doShoot = useCallback(() => {
    const now = performance.now();
    const p = playerRef.current;
    const wDef = WEAPONS[p.currentWeapon];
    if (!wDef || isReloading.current || weaponAnim.current.inspecting) return;
    if (now - lastShot.current < wDef.fireRate) return;
    const ammo = p.ammo[wDef.id];
    if (!ammo || ammo.mag <= 0) { soundEngine.current?.playEmpty(); return; }

    lastShot.current = now;
    soundEngine.current?.playShot(wDef.type);

    setPlayer(prev => ({
      ...prev,
      ammo: { ...prev.ammo, [wDef.id]: { ...prev.ammo[wDef.id], mag: prev.ammo[wDef.id].mag - 1 } }
    }));

    weaponAnim.current.recoilY   += wDef.recoilY;
    weaponAnim.current.recoilX   += (Math.random() - 0.5) * wDef.recoilX * 2;
    weaponAnim.current.shootAnim  = 1;

    // Flash
    const flash = weaponGroup.current?.getObjectByName("muzzleFlash") as THREE.Mesh | undefined;
    if (flash) {
      (flash.material as THREE.MeshBasicMaterial).opacity = 1;
      setTimeout(() => { if (flash) (flash.material as THREE.MeshBasicMaterial).opacity = 0; }, 55);
    }

    // Raycast
    const cam = cameraRef.current;
    if (!cam || !sceneRef.current) return;
    const pellets = wDef.pellets ?? 1;
    for (let pi = 0; pi < pellets; pi++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * wDef.spread * 2,
        (Math.random() - 0.5) * wDef.spread * 2,
        -1
      ).normalize().applyQuaternion(cam.quaternion);

      const ray = new THREE.Raycaster(cam.position.clone(), dir, 0.1, 200);
      let hit = false;

      enemies.current.forEach((en, idx) => {
        if (!enemyHP.current[idx].alive) return;
        const box = new THREE.Box3().setFromObject(en);
        const pt  = ray.ray.intersectBox(box, new THREE.Vector3());
        if (!pt) return;
        hit = true;
        soundEngine.current?.playHit();
        enemyHP.current[idx].hp -= wDef.damage;
        spawnBlood(pt, sceneRef.current!);
        if (enemyHP.current[idx].hp <= 0) {
          enemyHP.current[idx].alive = false;
          en.visible = false;
          setKillFeed(f => [`💀 Ты убил противника!`, ...f.slice(0,3)]);
          setTimeout(() => setKillFeed(f => f.slice(0,-1)), 4000);
        }
      });

      if (hit) { setCrossHit(true); setTimeout(() => setCrossHit(false), 180); }
      else {
        const hits = ray.intersectObjects(sceneRef.current.children, true)
          .filter(h => h.object !== weaponGroup.current && !weaponGroup.current?.children.includes(h.object));
        if (hits.length) spawnDecal(hits[0].point, hits[0].face?.normal ?? new THREE.Vector3(0,1,0), hits[0].object, sceneRef.current!);
      }
    }
  }, []);

  const spawnBlood = (pos: THREE.Vector3, scene: THREE.Scene) => {
    const count = 16;
    const geo = new THREE.BufferGeometry();
    const pos3 = new Float32Array(count * 3);
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pos3[i*3]   = pos.x; pos3[i*3+1] = pos.y; pos3[i*3+2] = pos.z;
      vel.push(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos3, 3));
    const mat = new THREE.PointsMaterial({ color:0xbb1100, size:0.07, transparent:true, opacity:1, depthWrite:false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    particles.current.push({ pts, life:0, max:0.6, vel });
  };

  const spawnDecal = (pos: THREE.Vector3, normal: THREE.Vector3, _obj: THREE.Object3D, scene: THREE.Scene) => {
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 8),
      new THREE.MeshBasicMaterial({ color:0x0a0a0a, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-1 })
    );
    const worldNormal = normal.clone().normalize();
    hole.position.copy(pos).addScaledVector(worldNormal, 0.01);
    hole.lookAt(pos.clone().add(worldNormal));
    scene.add(hole);
    bulletHoles.current.push(hole);
    if (bulletHoles.current.length > 60) { scene.remove(bulletHoles.current.shift()!); }
  };

  const doReload = useCallback(() => {
    const p = playerRef.current;
    const wDef = WEAPONS[p.currentWeapon];
    if (!wDef || wDef.type === "knife" || isReloading.current) return;
    const a = p.ammo[wDef.id];
    if (!a || a.reserve <= 0 || a.mag === wDef.magSize) return;
    isReloading.current = true;
    setHud(h => ({ ...h, reloading:true }));
    soundEngine.current?.playReload();
    weaponAnim.current.reloadAnim = 1;
    setTimeout(() => {
      const pp = playerRef.current;
      const aa = pp.ammo[wDef.id];
      const take = Math.min(wDef.magSize - aa.mag, aa.reserve);
      setPlayer(prev => ({ ...prev, ammo: { ...prev.ammo, [wDef.id]: { mag: prev.ammo[wDef.id].mag+take, reserve: prev.ammo[wDef.id].reserve-take } } }));
      isReloading.current = false;
      weaponAnim.current.reloadAnim = 0;
      setHud(h => ({ ...h, reloading:false }));
    }, wDef.reloadTime);
  }, []);

  const doSwitch = useCallback((wId: string) => {
    if (!sceneRef.current) return;
    isReloading.current = false;
    weaponAnim.current.reloadAnim = 0;
    weaponAnim.current.inspecting = false;
    setInspecting(false);
    soundEngine.current?.playSwitchWeapon();
    setPlayer(p => ({ ...p, currentWeapon: wId }));
    attachWeapon(sceneRef.current!, wId);
    const wDef = WEAPONS[wId];
    setHud(h => ({ ...h, weapon: wDef.name, reloading:false }));
  }, [attachWeapon]);

  // ── Main game loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use window size for reliable dimensions
    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer using existing canvas element ─────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference:"high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false); // false = don't set canvas CSS size (already 100%)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd4c090, 35, 100);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, W / H, 0.04, 200);
    const spawn = team === "T" ? T_SPAWN : CT_SPAWN;
    camera.position.copy(spawn);
    yaw.current = team === "T" ? Math.PI : 0;
    pitch.current = 0;
    cameraRef.current = camera;

    buildScene(scene);
    attachWeapon(scene, playerRef.current.currentWeapon);
    spawnEnemies(scene, team);
    prevPos.current.copy(camera.position);

    // ── Pointer lock ────────────────────────────────────────────────────────────
    const lockCanvas = () => { if (!mouse.current.locked) canvas.requestPointerLock(); };
    canvas.addEventListener("click", lockCanvas);
    const onLock = () => { mouse.current.locked = document.pointerLockElement === canvas; setLocked(mouse.current.locked); };
    document.addEventListener("pointerlockchange", onLock);

    const onMove = (e: MouseEvent) => {
      if (!mouse.current.locked || showBuyRef.current) return;
      const s = 0.0015;
      yaw.current   -= e.movementX * s;
      pitch.current  = Math.max(-1.48, Math.min(1.48, pitch.current - e.movementY * s));
    };
    document.addEventListener("mousemove", onMove);

    const onDown = (e: MouseEvent) => { if (e.button === 0) isFiring.current = true; };
    const onUp   = (e: MouseEvent) => { if (e.button === 0) isFiring.current = false; };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup",   onUp);

    const onKey = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "KeyR") doReload();
      if (e.code === "KeyB") { showBuyRef.current = !showBuyRef.current; setShowBuy(showBuyRef.current); }
      if (e.code === "KeyF") {
        const wa = weaponAnim.current;
        if (!wa.inspecting) { wa.inspecting = true; wa.inspectT = 0; setInspecting(true); }
      }
      if (e.code === "Escape") { showBuyRef.current = false; setShowBuy(false); document.exitPointerLock(); }
      const p = playerRef.current;
      if (e.code === "Digit1" && p.weapons[0]) doSwitch(p.weapons[0]);
      if (e.code === "Digit2" && p.weapons[1]) doSwitch(p.weapons[1]);
      if (e.code === "Digit3" && p.weapons[2]) doSwitch(p.weapons[2]);
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup",   onKeyUp);

    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Game loop ───────────────────────────────────────────────────────────────
    const PH = 1.78, PR = 0.38, GRAVITY = -19, SPEED = 7.5, JUMP = 6.5;
    const tmpBox = new THREE.Box3();
    const tmpVec = new THREE.Vector3();

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = Math.min((now - prevTime.current) / 1000, 0.05);
      prevTime.current = now;

      // ── Fire ─────────────────────────────────────────────────────────────
      if (isFiring.current && mouse.current.locked && !showBuyRef.current) {
        const wDef = WEAPONS[playerRef.current.currentWeapon];
        if (wDef?.automatic || (now - lastShot.current > wDef?.fireRate)) doShoot();
      }

      // ── Movement ─────────────────────────────────────────────────────────
      const fwd   = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      const right = new THREE.Vector3( Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      const move  = new THREE.Vector3();
      if (keys.current["KeyW"])  move.add(fwd);
      if (keys.current["KeyS"])  move.sub(fwd);
      if (keys.current["KeyA"])  move.sub(right);
      if (keys.current["KeyD"])  move.add(right);

      const crouching = keys.current["ControlLeft"] || keys.current["KeyC"];
      const running   = keys.current["ShiftLeft"] && !crouching;
      const spd = SPEED * (crouching ? 0.48 : running ? 1.35 : 1.0);
      const height = PH * (crouching ? 0.6 : 1.0);

      if (move.lengthSq() > 0) move.normalize().multiplyScalar(spd);
      velocity.current.x = move.x;
      velocity.current.z = move.z;

      if (!onGround.current) velocity.current.y += GRAVITY * delta;
      if (keys.current["Space"] && onGround.current) {
        velocity.current.y = JUMP;
        onGround.current = false;
      }

      // ── Footstep sounds ──────────────────────────────────────────────────
      if (move.lengthSq() > 0 && onGround.current) {
        stepTimer.current += delta * (running ? 2.2 : crouching ? 0.8 : 1.4);
        if (stepTimer.current > 1) { stepTimer.current = 0; soundEngine.current?.playStep(); }
      }

      // ── Apply & collide ──────────────────────────────────────────────────
      const np = camera.position.clone().addScaledVector(velocity.current, delta);
      if (np.y - height < -0.5) { np.y = height - 0.5; velocity.current.y = 0; onGround.current = true; }

      tmpBox.setFromCenterAndSize(
        new THREE.Vector3(np.x, np.y - height/2, np.z),
        new THREE.Vector3(PR*2, height, PR*2)
      );
      for (const col of colliders.current) {
        if (!tmpBox.intersectsBox(col)) continue;
        const isect = new THREE.Box3().copy(tmpBox).intersect(col);
        isect.getSize(tmpVec);
        if (tmpVec.x < tmpVec.z) {
          np.x += np.x < col.getCenter(new THREE.Vector3()).x ? -tmpVec.x - 0.01 : tmpVec.x + 0.01;
        } else {
          np.z += np.z < col.getCenter(new THREE.Vector3()).z ? -tmpVec.z - 0.01 : tmpVec.z + 0.01;
        }
        tmpBox.setFromCenterAndSize(new THREE.Vector3(np.x, np.y - height/2, np.z), new THREE.Vector3(PR*2, height, PR*2));
      }
      camera.position.copy(np);

      // ── Camera rotation ──────────────────────────────────────────────────
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw.current;
      camera.rotation.x = pitch.current + weaponAnim.current.recoilY * 0.25;

      // ── Weapon animation ─────────────────────────────────────────────────
      const wa = weaponAnim.current;
      wa.recoilY   = THREE.MathUtils.lerp(wa.recoilY,   0, delta * 9);
      wa.recoilX   = THREE.MathUtils.lerp(wa.recoilX,   0, delta * 9);
      wa.shootAnim = THREE.MathUtils.lerp(wa.shootAnim, 0, delta * 22);

      const isMoving = move.lengthSq() > 0.01;
      if (isMoving) wa.bobPhase += delta * (running ? 14 : crouching ? 5 : 9);
      const bob  = isMoving ? Math.sin(wa.bobPhase) * 0.011 : 0;
      const bobX = isMoving ? Math.cos(wa.bobPhase * 0.5) * 0.006 : 0;

      // Inspect animation
      let inspRx = 0, inspRy = 0, inspRz = 0, inspOX = 0, inspOY = 0, inspOZ = 0;
      if (wa.inspecting) {
        wa.inspectT = Math.min(wa.inspectT + delta * 0.8, 1);
        const t = Math.sin(wa.inspectT * Math.PI);
        inspRx = t * 0.6;
        inspRy = t * 1.2;
        inspRz = t * 0.3;
        inspOX = t * 0.05;
        inspOY = -t * 0.08;
        inspOZ = t * 0.12;
        if (wa.inspectT >= 1) { wa.inspecting = false; setInspecting(false); }
      }

      const reloadOffset = wa.reloadAnim > 0 ? Math.sin(now * 0.005) * -0.05 : 0;
      if (weaponGroup.current) {
        const localPos = new THREE.Vector3(
          0.22 + bobX + wa.recoilX * 0.12 + inspOX,
          -0.22 + bob + reloadOffset - wa.recoilY * 0.07 - wa.shootAnim * 0.018 + inspOY - (crouching ? 0.08 : 0),
          -0.38 - wa.recoilY * 0.09 + wa.shootAnim * 0.035 + inspOZ
        );
        localPos.applyQuaternion(camera.quaternion);
        localPos.add(camera.position);
        weaponGroup.current.position.copy(localPos);
        weaponGroup.current.rotation.set(
          camera.rotation.x + wa.recoilY * 0.35 + inspRx,
          camera.rotation.y + 0.07 + inspRy,
          camera.rotation.z + inspRz,
          "YXZ"
        );
      }

      // ── Enemy AI ─────────────────────────────────────────────────────────
      enemies.current.forEach((en, i) => {
        const es = enemyHP.current[i];
        if (!es.alive) return;
        const toP = camera.position.clone().sub(en.position);
        const dist = toP.length();
        if (dist > 1) {
          en.lookAt(camera.position.x, en.position.y, camera.position.z);
          if (dist > 10) en.position.addScaledVector(toP.normalize().setY(0), 2.5 * delta);
        }
        if (dist < 28 && now - es.lastShot > 1400 + Math.random() * 800) {
          es.lastShot = now;
          if (Math.random() < Math.max(0.08, 0.55 - dist * 0.018)) {
            const dmg = Math.floor(12 + Math.random() * 22);
            soundEngine.current?.playHit();
            setPlayer(pp => {
              const nh = Math.max(0, pp.health - dmg);
              setHitFlash(true); setTimeout(() => setHitFlash(false), 250);
              if (nh <= 0) { soundEngine.current?.playDeath(); setPhase("dead"); }
              playerRef.current = { ...pp, health: nh };
              return { ...pp, health: nh };
            });
          }
        }
      });

      // ── Win check ────────────────────────────────────────────────────────
      if (enemyHP.current.length && enemyHP.current.every(e => !e.alive)) {
        setScore(s => ({ ...s, [team]: s[team] + 1 }));
        setPhase("win");
      }

      // ── Particles ────────────────────────────────────────────────────────
      particles.current = particles.current.filter(p => {
        p.life += delta;
        const buf = p.pts.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < p.vel.length; i++) {
          p.vel[i].y -= 4 * delta;
          buf.setXYZ(i, buf.getX(i)+p.vel[i].x*delta, buf.getY(i)+p.vel[i].y*delta, buf.getZ(i)+p.vel[i].z*delta);
        }
        buf.needsUpdate = true;
        (p.pts.material as THREE.PointsMaterial).opacity = 1 - p.life / p.max;
        if (p.life >= p.max) { sceneRef.current?.remove(p.pts); p.pts.geometry.dispose(); return false; }
        return true;
      });

      // ── HUD sync ─────────────────────────────────────────────────────────
      const pp = playerRef.current;
      const ammo = pp.ammo[pp.currentWeapon];
      setHud(h => ({
        ...h,
        health: pp.health,
        armor: pp.armor,
        mag: ammo?.mag ?? 0,
        reserve: ammo?.reserve ?? 0,
        weapon: WEAPONS[pp.currentWeapon]?.name ?? "",
      }));

      renderer.render(scene, camera);
    };

    rafRef.current = requestAnimationFrame(tick);

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup",   onKeyUp);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup",   onUp);
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("click", lockCanvas);
      document.exitPointerLock();
      // canvas is a ref — just dispose renderer, don't remove canvas from DOM
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, team]);

  // ── Buy weapon ──────────────────────────────────────────────────────────────
  const buyWeapon = useCallback((wId: string) => {
    const wDef = WEAPONS[wId];
    setPlayer(p => {
      if (p.money < wDef.price) return p;
      const weapons = [...p.weapons.filter(w => WEAPONS[w].type !== wDef.type || w === "knife"), wId];
      const np = { ...p, money: p.money - wDef.price, weapons, currentWeapon: wId,
        ammo: { ...p.ammo, [wId]: { mag: wDef.magSize, reserve: wDef.magSize * 3 } } };
      playerRef.current = np;
      setTimeout(() => { if (sceneRef.current) attachWeapon(sceneRef.current, wId); }, 50);
      return np;
    });
    setShowBuy(false);
  }, [attachWeapon]);

  const startGame = (t: "T"|"CT") => {
    const init: PlayerState = {
      health:100, armor:0, money:3000, currentWeapon:"glock",
      weapons:["knife","glock"],
      ammo:{ knife:{mag:1,reserve:0}, glock:{mag:20,reserve:60} }
    };
    playerRef.current = init;
    setPlayer(init);
    setTeam(t);
    setRound(1);
    setPhase("playing");
  };

  const nextRound = () => {
    setPlayer(p => {
      const money = Math.min(16000, p.money + 3250);
      const ammo = Object.fromEntries(p.weapons.map(w => [w, { mag: WEAPONS[w].magSize, reserve: WEAPONS[w].magSize * 3 }]));
      const np = { ...p, health:100, money, ammo };
      playerRef.current = np;
      return np;
    });
    setRound(r => r + 1);
    setPhase("playing");
  };

  // ── SCREENS ─────────────────────────────────────────────────────────────────
  const OswaldText = { fontFamily: "'Oswald', sans-serif" } as const;

  if (phase === "menu") return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col items-center justify-center">
      <div className="text-center mb-10">
        <div className="text-6xl tracking-[0.3em] text-white mb-3" style={OswaldText}>
          STAND<span className="text-[#e63946]">OFF</span> 2
        </div>
        <div className="text-gray-500 tracking-[0.2em] text-sm uppercase">3D Tactical Shooter · Dust 2</div>
      </div>
      <div className="flex gap-6 mb-10">
        {(["T","CT"] as const).map(t => (
          <button key={t} onClick={() => startGame(t)}
            className="px-14 py-6 text-white uppercase tracking-widest transition-all hover:scale-105"
            style={{ ...OswaldText, background: t==="T" ? "#882211" : "#112266", boxShadow: `0 0 40px ${t==="T"?"rgba(200,50,30,0.4)":"rgba(30,50,200,0.4)"}` }}>
            <div className="text-3xl mb-1">{t==="T"?"💥 Атака":"🛡️ Защита"}</div>
            <div className="text-lg opacity-80">{t} сторона</div>
          </button>
        ))}
      </div>
      <div className="bg-[#111118] border border-white/10 p-6 max-w-lg w-full mb-6">
        <div className="text-[#e63946] text-center mb-4 tracking-widest uppercase text-sm" style={OswaldText}>Управление</div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-300">
          {[["WASD","движение"],["Мышь","прицел"],["ЛКМ","стрелять"],["R","перезарядка"],
            ["Пробел","прыжок"],["Ctrl / C","присесть"],["B","закупка оружия"],["1/2/3","смена оружия"],
            ["F","осмотр оружия"],["ESC","освободить мышь"]].map(([k,v]) => (
            <div key={k}><span className="text-white font-bold">{k}</span> — {v}</div>
          ))}
        </div>
      </div>
      <button onClick={onExit} className="text-gray-500 hover:text-white text-sm tracking-widest uppercase transition-colors border border-gray-700 hover:border-white px-8 py-2" style={OswaldText}>
        ← Назад
      </button>
    </div>
  );

  if (phase === "dead") return (
    <div className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center">
      <div className="text-[#e63946] text-8xl mb-4" style={OswaldText}>ТЫ УБИТ</div>
      <div className="text-gray-400 text-xl mb-8" style={OswaldText}>Раунд {round} · {score.T}:{score.CT}</div>
      <div className="flex gap-4">
        <button onClick={nextRound} className="bg-[#e63946] hover:bg-[#c62836] text-white px-10 py-3 tracking-widest uppercase" style={OswaldText}>Следующий раунд</button>
        <button onClick={() => setPhase("menu")} className="border border-white/30 hover:bg-white/10 text-white px-10 py-3 tracking-widest uppercase" style={OswaldText}>В меню</button>
      </div>
    </div>
  );

  if (phase === "win") return (
    <div className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center">
      <div className="text-yellow-400 text-8xl mb-4" style={OswaldText}>ПОБЕДА!</div>
      <div className="text-white text-4xl mb-2" style={OswaldText}>
        T <span className="text-[#cc4422]">{score.T}</span> — <span className="text-[#2244cc]">{score.CT}</span> CT
      </div>
      <div className="text-gray-400 mb-8">Все противники уничтожены · Раунд {round}</div>
      <div className="flex gap-4">
        <button onClick={nextRound} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-10 py-3 tracking-widest uppercase" style={OswaldText}>Следующий раунд</button>
        <button onClick={() => setPhase("menu")} className="border border-white/30 hover:bg-white/10 text-white px-10 py-3 tracking-widest uppercase" style={OswaldText}>В меню</button>
      </div>
    </div>
  );

  // ── Playing ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black select-none" style={{ cursor:"none" }}>

      {/* Three.js canvas — ref passed directly, renderer reuses this element */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`relative ${crossHit ? "text-red-500" : "text-white"}`} style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))" }}>
          <div className="absolute w-px h-3 bg-current left-1/2 -translate-x-1/2" style={{ top:"-18px" }} />
          <div className="absolute w-px h-3 bg-current left-1/2 -translate-x-1/2" style={{ top:"6px" }} />
          <div className="absolute h-px w-3 bg-current top-1/2 -translate-y-1/2" style={{ left:"-18px" }} />
          <div className="absolute h-px w-3 bg-current top-1/2 -translate-y-1/2" style={{ left:"6px" }} />
          <div className="w-1 h-1 rounded-full bg-current opacity-90" />
        </div>
      </div>

      {/* Hit vignette */}
      {hitFlash && <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(ellipse at center, transparent 40%, rgba(180,0,0,0.55) 100%)" }} />}

      {/* Click to lock */}
      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/75 border border-white/20 px-10 py-5 text-center backdrop-blur-md">
            <div className="text-white text-xl tracking-widest uppercase" style={OswaldText}>Кликни для захвата мыши</div>
            <div className="text-gray-400 text-sm mt-1">ESC — освободить</div>
          </div>
        </div>
      )}

      {/* Inspect hint */}
      {inspecting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-yellow-300 text-sm tracking-widest opacity-70" style={OswaldText}>ОСМОТР ОРУЖИЯ</div>
        </div>
      )}

      {/* HUD — bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none px-6 pb-5">
        <div className="flex items-end justify-between">
          {/* Health */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl font-bold text-white" style={{ ...OswaldText, textShadow:"0 2px 8px rgba(0,0,0,0.9)" }}>
                {hud.health}
              </span>
              <span className="text-gray-400 text-xl" style={OswaldText}>HP</span>
              {hud.armor > 0 && <span className="text-blue-300 text-xl ml-2" style={OswaldText}>🛡 {hud.armor}</span>}
            </div>
            <div className="h-1.5 w-40 bg-black/60 rounded overflow-hidden border border-white/10">
              <div className="h-full rounded transition-all duration-300"
                style={{ width:`${hud.health}%`, background: hud.health>60?"#22cc55":hud.health>30?"#ffaa00":"#e63946" }} />
            </div>
          </div>

          {/* Money */}
          <div className="text-center">
            <div className="text-yellow-400 text-2xl font-bold" style={{ ...OswaldText, textShadow:"0 2px 8px rgba(0,0,0,0.9)" }}>
              ${player.money.toLocaleString()}
            </div>
          </div>

          {/* Ammo */}
          <div className="text-right">
            <div className="text-gray-400 text-xs uppercase tracking-[0.15em] mb-1" style={OswaldText}>{hud.weapon}</div>
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-white text-5xl font-bold" style={{ ...OswaldText, textShadow:"0 2px 8px rgba(0,0,0,0.9)" }}>{hud.mag}</span>
              <span className="text-gray-500 text-2xl" style={OswaldText}>/ {hud.reserve}</span>
            </div>
            {hud.reloading && <div className="text-yellow-400 text-xs tracking-widest animate-pulse mt-1" style={OswaldText}>ПЕРЕЗАРЯДКА...</div>}
          </div>
        </div>
      </div>

      {/* HUD — top center (score) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-6 py-2 flex items-center gap-5">
          <span className="text-[#cc4422] text-lg" style={OswaldText}>T {score.T}</span>
          <span className="text-gray-500 text-xs uppercase tracking-widest">· Раунд {round} ·</span>
          <span className="text-[#2244cc] text-lg" style={OswaldText}>{score.CT} CT</span>
        </div>
      </div>

      {/* HUD — weapon slots */}
      <div className="absolute top-4 right-4 pointer-events-none flex flex-col gap-1">
        {player.weapons.map((wId, i) => (
          <div key={wId} className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-all ${wId===player.currentWeapon?"border-[#e63946] bg-[#e63946]/20 text-white":"border-white/15 bg-black/40 text-gray-500"}`} style={OswaldText}>
            [{i+1}] {WEAPONS[wId]?.name}
          </div>
        ))}
      </div>

      {/* Kill feed */}
      <div className="absolute top-16 right-4 pointer-events-none flex flex-col gap-1">
        {killFeed.map((k,i) => (
          <div key={i} className="bg-black/70 border border-[#e63946]/30 px-3 py-1 text-xs text-[#ff6655]" style={OswaldText}>{k}</div>
        ))}
      </div>

      {/* Buy menu */}
      {showBuy && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d14] border border-[#e63946]/30 w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="text-2xl tracking-widest uppercase text-white" style={OswaldText}>
                Закупка — <span className="text-yellow-400">${player.money.toLocaleString()}</span>
              </div>
              <button onClick={() => { showBuyRef.current = false; setShowBuy(false); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="flex">
              <div className="w-48 border-r border-white/10">
                {BUY_MENU.map((cat,i) => (
                  <button key={i} onClick={() => setBuyCat(i)}
                    className={`w-full text-left px-4 py-3 text-sm tracking-wide transition-all ${buyCat===i?"bg-[#e63946]/15 text-white border-l-2 border-[#e63946]":"text-gray-400 hover:text-white hover:bg-white/5"}`}
                    style={OswaldText}>{cat.category}</button>
                ))}
              </div>
              <div className="flex-1 p-3 space-y-2">
                {BUY_MENU[buyCat].items.map(wId => {
                  const wDef = WEAPONS[wId];
                  const owned = player.weapons.includes(wId);
                  const afford = player.money >= wDef.price;
                  return (
                    <button key={wId} onClick={() => afford && !owned && buyWeapon(wId)} disabled={!afford||owned}
                      className={`w-full flex justify-between items-center p-4 border transition-all text-left ${owned?"border-green-500/40 bg-green-900/15 cursor-default":afford?"border-white/10 hover:border-[#e63946]/50 hover:bg-[#e63946]/8 cursor-pointer":"border-white/5 opacity-40 cursor-not-allowed"}`}>
                      <div>
                        <div className="text-white font-semibold tracking-wide" style={OswaldText}>{owned&&"✓ "}{wDef.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">Урон:{wDef.damage} · Маг:{wDef.magSize} · {wDef.automatic?"Авто":"Полуавто"}</div>
                      </div>
                      <div className={`text-xl font-bold ${afford?"text-yellow-400":"text-gray-600"}`} style={OswaldText}>${wDef.price}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-2 border-t border-white/10 text-xs text-gray-600 flex justify-between" style={OswaldText}>
              <span>[B] закрыть</span><span>[ESC] освободить мышь</span>
            </div>
          </div>
        </div>
      )}

      {/* Exit */}
      <button onClick={() => { document.exitPointerLock(); setPhase("menu"); }}
        className="absolute top-4 left-4 bg-black/60 hover:bg-[#e63946]/80 border border-white/20 text-white px-3 py-2 text-xs tracking-widest uppercase transition-all backdrop-blur-sm"
        style={OswaldText}>
        ← Меню
      </button>
    </div>
  );
}