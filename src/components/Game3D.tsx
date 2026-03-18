import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── WEAPON DEFINITIONS ───────────────────────────────────────────────────────
interface WeaponDef {
  id: string;
  name: string;
  price: number;
  damage: number;
  fireRate: number; // ms between shots
  reloadTime: number; // ms
  magSize: number;
  spread: number;
  recoilX: number;
  recoilY: number;
  automatic: boolean;
  pellets?: number; // shotgun
  color: string;
  type: "pistol" | "rifle" | "smg" | "shotgun" | "sniper" | "knife";
}

const WEAPONS: Record<string, WeaponDef> = {
  knife: { id: "knife", name: "Нож", price: 0, damage: 40, fireRate: 600, reloadTime: 0, magSize: 1, spread: 0, recoilX: 0, recoilY: 0, automatic: false, color: "#aaaaaa", type: "knife" },
  glock: { id: "glock", name: "Glock-18", price: 200, damage: 25, fireRate: 150, reloadTime: 2200, magSize: 20, spread: 0.03, recoilX: 0.003, recoilY: 0.006, automatic: false, color: "#555566", type: "pistol" },
  deagle: { id: "deagle", name: "Desert Eagle", price: 700, damage: 75, fireRate: 700, reloadTime: 2500, magSize: 7, spread: 0.015, recoilX: 0.01, recoilY: 0.025, automatic: false, color: "#888855", type: "pistol" },
  ak47: { id: "ak47", name: "AK-47", price: 2700, damage: 36, fireRate: 100, reloadTime: 2700, magSize: 30, spread: 0.025, recoilX: 0.008, recoilY: 0.02, automatic: true, color: "#8B6914", type: "rifle" },
  m4a1: { id: "m4a1", name: "M4A1-S", price: 2900, damage: 33, fireRate: 90, reloadTime: 3100, magSize: 25, spread: 0.018, recoilX: 0.006, recoilY: 0.016, automatic: true, color: "#445566", type: "rifle" },
  awp: { id: "awp", name: "AWP", price: 4750, damage: 115, fireRate: 1500, reloadTime: 3700, magSize: 10, spread: 0.001, recoilX: 0.02, recoilY: 0.05, automatic: false, color: "#336633", type: "sniper" },
  mp5: { id: "mp5", name: "MP5-SD", price: 1500, damage: 27, fireRate: 75, reloadTime: 2400, magSize: 30, spread: 0.04, recoilX: 0.005, recoilY: 0.012, automatic: true, color: "#445544", type: "smg" },
  sg: { id: "sg", name: "XM1014", price: 2000, damage: 20, fireRate: 400, reloadTime: 3500, magSize: 7, spread: 0.12, recoilX: 0.015, recoilY: 0.04, automatic: false, pellets: 8, color: "#664433", type: "shotgun" },
};

const BUY_MENU_ITEMS = [
  { category: "Пистолеты", items: ["glock", "deagle"] },
  { category: "Пистолеты-пулемёты", items: ["mp5"] },
  { category: "Дробовики", items: ["sg"] },
  { category: "Штурмовые винтовки", items: ["ak47", "m4a1"] },
  { category: "Снайперские", items: ["awp"] },
];

// ─── DUST2 MAP GEOMETRY ───────────────────────────────────────────────────────
// Each box: [x, y, z, width, height, depth, colorHex]
type BoxDef = [number, number, number, number, number, number, string];

// Colors
const C_SAND  = 0xd4a96a;
const C_WALL  = 0xc8a05a;
const C_DARK  = 0x8b6914;
const C_STONE = 0x9e8870;
const C_ROOF  = 0xaa8844;
const C_FLOOR = 0xc0995a;
const C_BOX   = 0xaa7733;
const C_METAL = 0x556677;
const C_SKY_WALL = 0xbba060;

// Full Dust2 layout (simplified but accurate proportions)
// Reference: Dust2 is ~1024x1024 Hammer units
// We scale: 1 Hammer unit ≈ 0.05 Three.js units
// Key areas: T-spawn, CT-spawn, Mid, A-site, B-site, Long, Short
const MAP_BOXES: BoxDef[] = [
  // ─── FLOOR (base ground) ───
  [0, -0.5, 0, 120, 1, 120, C_FLOOR],

  // ─── OUTER WALLS ───
  // North wall
  [0, 5, -60, 120, 12, 1, C_WALL],
  // South wall
  [0, 5, 60, 120, 12, 1, C_WALL],
  // West wall
  [-60, 5, 0, 1, 12, 120, C_WALL],
  // East wall
  [60, 5, 0, 1, 12, 120, C_WALL],

  // ─── T-SPAWN (SW corner) ───
  // T spawn platform (slightly elevated)
  [-35, 0.1, 35, 30, 0.2, 20, C_SAND],
  // T spawn walls (dividers)
  [-35, 3, 25, 30, 6, 1, C_WALL],
  // T-spawn pillars
  [-42, 3, 30, 2, 6, 2, C_STONE],
  [-28, 3, 30, 2, 6, 2, C_STONE],

  // ─── LONG A / CATWALK AREA ───
  // Long A corridor floor
  [-20, 0, 50, 30, 0.2, 20, C_SAND],
  // Long A side walls
  [-35, 4, 45, 1, 8, 30, C_WALL],
  [-5, 4, 45, 1, 8, 30, C_WALL],
  // Long A roof
  [-20, 8, 45, 30, 1, 30, C_ROOF],
  // Long corner (Goose) box
  [-8, 1.5, 38, 5, 3, 5, C_BOX],
  // Long upper wall connector
  [-20, 6, 30, 30, 0.5, 1, C_DARK],

  // ─── A SITE ───
  // A site platform
  [25, 0.2, 25, 35, 0.4, 35, C_SAND],
  // A-site small wall (short) 
  [10, 2, 10, 1, 4, 20, C_WALL],
  // A-site corner boxes (ramp)
  [18, 1, 18, 8, 2, 4, C_BOX],
  [18, 2.5, 18, 8, 0.5, 4, C_BOX],
  // A site long wall
  [42, 4, 25, 1, 8, 35, C_WALL],
  // Backwall A
  [25, 4, 8, 35, 8, 1, C_WALL],
  // Car on A site
  [28, 1, 22, 7, 2, 4, C_METAL],
  [28, 2.5, 22, 7, 0.5, 4, C_METAL],
  // A site box stack (default plant)
  [30, 1.5, 30, 4, 3, 4, C_BOX],
  [30, 3.5, 30, 4, 1, 4, C_BOX],

  // ─── A RAMP / SHORT ───
  // Short stairs/ramp to A
  [0, 1, 8, 20, 2, 3, C_STONE],
  [0, 0.5, 12, 20, 1, 3, C_STONE],
  // Short wall above CT
  [0, 4, -2, 20, 8, 1, C_WALL],

  // ─── CT SPAWN ───
  // CT spawn area floor
  [35, 0, -35, 25, 0.2, 25, C_SAND],
  // CT spawn walls
  [22, 4, -48, 1, 8, 25, C_WALL],
  [47, 4, -48, 1, 8, 25, C_WALL],
  [35, 4, -22, 25, 8, 1, C_WALL],
  // CT pillars
  [25, 3, -30, 2, 6, 2, C_STONE],
  [45, 3, -30, 2, 6, 2, C_STONE],
  // CT spawn van/car
  [38, 1, -40, 6, 2, 4, C_METAL],

  // ─── MID AREA ───
  // Mid floor
  [0, 0, 0, 25, 0.2, 25, C_SAND],
  // Mid doors (tunnels) walls
  [-15, 4, -2, 1, 8, 20, C_WALL],
  [15, 4, -2, 1, 8, 20, C_WALL],
  // Mid top (catwalk connection)
  [0, 8, -2, 25, 1, 20, C_ROOF],
  // Mid boxes
  [-5, 1.5, -5, 4, 3, 4, C_BOX],
  [5, 1.5, 5, 4, 3, 4, C_BOX],
  // Mid window wall
  [0, 4, -12, 12, 8, 1, C_WALL],
  // Window opening (space above the 2u wall)
  [0, 2, -12, 12, 2, 0.5, C_SKY_WALL],

  // ─── B TUNNELS ───
  // Lower tunnel
  [-20, 0, -20, 20, 0.2, 15, C_DARK],
  // Tunnel ceiling
  [-20, 5, -20, 20, 1, 15, C_ROOF],
  // Tunnel left wall
  [-30, 3, -20, 1, 6, 15, C_WALL],
  // Tunnel right wall
  [-10, 3, -20, 1, 6, 15, C_WALL],
  // Upper tunnel
  [-30, 0, -5, 10, 0.2, 20, C_DARK],
  [-30, 5, -5, 10, 1, 20, C_ROOF],
  [-40, 3, -5, 1, 6, 20, C_WALL],
  [-20, 3, -5, 1, 6, 20, C_WALL],

  // ─── B SITE ───
  // B site floor
  [-35, 0.2, -25, 30, 0.4, 30, C_SAND],
  // B site back wall
  [-50, 4, -25, 1, 8, 30, C_WALL],
  // B site top wall
  [-35, 4, -40, 30, 8, 1, C_WALL],
  // B site boxes (classic stack)
  [-38, 1.5, -28, 5, 3, 5, C_BOX],
  [-38, 4, -28, 5, 2, 5, C_BOX],
  [-28, 1.5, -20, 4, 3, 4, C_BOX],
  // B car
  [-42, 1, -18, 7, 2, 4, C_METAL],
  // Platform on B
  [-45, 1.5, -30, 4, 3, 3, C_STONE],

  // ─── PALACE / A-SIDE BUILDING ───
  // Palace exterior
  [30, 0, -5, 20, 0.2, 15, C_SAND],
  [30, 4, -12, 20, 8, 1, C_WALL],
  [20, 4, -5, 1, 8, 15, C_WALL],
  [40, 4, -5, 1, 8, 15, C_WALL],
  [30, 8, -5, 20, 1, 15, C_ROOF],
  // Palace windows (decorative ledge)
  [30, 5, -11, 8, 1, 0.5, C_STONE],
  // Palace boxes inside
  [25, 1.5, -5, 3, 3, 3, C_BOX],

  // ─── CATWALK (connects mid to A) ───
  [12, 3, 15, 8, 0.5, 30, C_STONE],
  [8, 4, 15, 1, 2, 30, C_WALL],
  [16, 4, 15, 1, 2, 30, C_WALL],

  // ─── SOME EXTRA COVER / DETAILS ───
  // Barrel near T
  [-30, 1.5, 20, 2, 3, 2, C_METAL],
  // Dumpster mid
  [8, 1, -8, 4, 2, 2, C_DARK],
  // Barrier near B
  [-22, 1, -35, 1, 2, 6, C_METAL],
  // Long A big box (car/crate)
  [-15, 1.5, 42, 6, 3, 6, C_BOX],
  // Stairs up to CT roof
  [50, 1, -30, 5, 2, 3, C_STONE],
  [50, 2.5, -26, 5, 1, 3, C_STONE],
];

// Spawn positions for player
const T_SPAWN = new THREE.Vector3(-35, 2, 38);
const CT_SPAWN = new THREE.Vector3(35, 2, -38);

// ─── GAME STATE TYPES ─────────────────────────────────────────────────────────
interface PlayerState {
  health: number;
  armor: number;
  money: number;
  currentWeapon: string;
  weapons: string[];
  ammo: Record<string, { mag: number; reserve: number }>;
}

interface GameState {
  phase: "menu" | "buy" | "playing" | "dead" | "win";
  team: "T" | "CT" | null;
  round: number;
  score: { T: number; CT: number };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface Game3DProps {
  onExit: () => void;
}

export default function Game3D({ onExit }: Game3DProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 0, y: 0, locked: false });
  const weaponMeshRef = useRef<THREE.Group | null>(null);
  const weaponAnimRef = useRef({ recoilY: 0, recoilX: 0, bobPhase: 0, reloadAnim: 0, shootAnim: 0 });
  const flashRef = useRef<THREE.Mesh | null>(null);
  const bulletHolesRef = useRef<THREE.Mesh[]>([]);
  const collidersRef = useRef<THREE.Box3[]>([]);
  const lastShotRef = useRef(0);
  const isReloadingRef = useRef(false);
  const isFiringRef = useRef(false);
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(true);
  const clockRef = useRef(new THREE.Clock());
  const enemiesRef = useRef<THREE.Group[]>([]);
  const enemyStatesRef = useRef<{ health: number; alive: boolean; vel: THREE.Vector3; lastShot: number }[]>([]);
  const particlesRef = useRef<{ mesh: THREE.Points; life: number; maxLife: number }[]>([]);

  const [gameState, setGameState] = useState<GameState>({
    phase: "menu",
    team: null,
    round: 1,
    score: { T: 0, CT: 0 },
  });
  const [player, setPlayer] = useState<PlayerState>({
    health: 100,
    armor: 0,
    money: 3000,
    currentWeapon: "glock",
    weapons: ["knife", "glock"],
    ammo: {
      glock: { mag: 20, reserve: 60 },
      knife: { mag: 1, reserve: 0 },
    },
  });
  const [hud, setHud] = useState({ health: 100, armor: 0, mag: 20, reserve: 60, weapon: "glock", reloading: false, hitFlash: 0 });
  const [crosshairHit, setCrosshairHit] = useState(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [buyCategory, setBuyCategory] = useState(0);

  const playerRef = useRef<PlayerState>(player);
  playerRef.current = player;
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  // ─── BUILD WEAPON MESH ──────────────────────────────────────────────────────
  const buildWeaponMesh = useCallback((weaponId: string, scene: THREE.Scene) => {
    if (weaponMeshRef.current) {
      scene.remove(weaponMeshRef.current);
    }
    const wDef = WEAPONS[weaponId];
    const group = new THREE.Group();

    if (wDef.type === "knife") {
      // Blade
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
      );
      blade.position.set(0, 0, -0.15);
      group.add(blade);
      // Handle
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 0.8 })
      );
      handle.position.set(0, 0, 0.06);
      group.add(handle);
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(wDef.color), metalness: 0.7, roughness: 0.3 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.2 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });

      let bodyW = 0.08, bodyH = 0.07, bodyD = 0.5;
      if (wDef.type === "sniper") { bodyW = 0.07; bodyH = 0.09; bodyD = 0.75; }
      if (wDef.type === "pistol") { bodyW = 0.06; bodyH = 0.1; bodyD = 0.22; }
      if (wDef.type === "smg") { bodyW = 0.07; bodyH = 0.07; bodyD = 0.38; }
      if (wDef.type === "shotgun") { bodyW = 0.09; bodyH = 0.08; bodyD = 0.55; }

      // Main body
      const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), mat);
      body.position.set(0, 0, -bodyD * 0.2);
      group.add(body);

      // Barrel
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, bodyD * 0.7, 8),
        darkMat
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, bodyH * 0.2, -bodyD * 0.6);
      group.add(barrel);

      // Magazine
      if (wDef.type !== "pistol" && wDef.type !== "knife") {
        const mag = new THREE.Mesh(
          new THREE.BoxGeometry(bodyW * 0.7, bodyH * 1.5, bodyD * 0.12),
          darkMat
        );
        mag.position.set(0, -bodyH * 0.8, -bodyD * 0.05);
        group.add(mag);
      }

      // Stock / grip
      if (wDef.type === "rifle" || wDef.type === "sniper" || wDef.type === "smg") {
        const stock = new THREE.Mesh(
          new THREE.BoxGeometry(bodyW * 0.8, bodyH * 0.7, bodyD * 0.25),
          wDef.id === "ak47" ? woodMat : darkMat
        );
        stock.position.set(0, -bodyH * 0.1, bodyD * 0.32);
        group.add(stock);
      }

      // Pistol grip
      if (wDef.type === "pistol") {
        const grip = new THREE.Mesh(
          new THREE.BoxGeometry(bodyW * 0.8, bodyH * 1.2, bodyD * 0.15),
          darkMat
        );
        grip.position.set(0, -bodyH * 0.9, bodyD * 0.05);
        group.add(grip);
      }

      // Scope for sniper
      if (wDef.type === "sniper") {
        const scope = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8),
          darkMat
        );
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, bodyH * 0.65, -bodyD * 0.1);
        group.add(scope);
      }

      // Muzzle flash mesh (hidden by default)
      const flashGeo = new THREE.ConeGeometry(0.04, 0.12, 6);
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 });
      const flash = new THREE.Mesh(flashGeo, flashMat);
      flash.rotation.x = -Math.PI / 2;
      flash.position.set(0, bodyH * 0.2, -bodyD * 0.95);
      group.add(flash);
      flashRef.current = flash;
    }

    // Position weapon in view (right hand, bottom right)
    group.position.set(0.22, -0.22, -0.38);
    group.rotation.y = 0.08;
    scene.add(group);
    weaponMeshRef.current = group;
    weaponAnimRef.current = { recoilY: 0, recoilX: 0, bobPhase: 0, reloadAnim: 0, shootAnim: 0 };
  }, []);

  // ─── BUILD MAP ──────────────────────────────────────────────────────────────
  const buildMap = useCallback((scene: THREE.Scene) => {
    const colliders: THREE.Box3[] = [];

    MAP_BOXES.forEach(([x, y, z, w, h, d, color]) => {
      // Create varied texture appearance using roughness/metalness
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: color === C_METAL ? 0.3 : 0.85,
        metalness: color === C_METAL ? 0.6 : 0.05,
      });
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);

      // Register collider (skip floor)
      if (h > 0.5) {
        const box = new THREE.Box3().setFromObject(mesh);
        colliders.push(box);
      }
    });

    collidersRef.current = colliders;
  }, []);

  // ─── SPAWN ENEMIES (bots) ───────────────────────────────────────────────────
  const spawnEnemies = useCallback((scene: THREE.Scene, team: "T" | "CT") => {
    // Remove old
    enemiesRef.current.forEach(e => scene.remove(e));
    enemiesRef.current = [];
    enemyStatesRef.current = [];

    const spawnPoints = team === "T"
      ? [CT_SPAWN, new THREE.Vector3(30, 2, -30), new THREE.Vector3(25, 2, 25), new THREE.Vector3(38, 2, 28)]
      : [T_SPAWN, new THREE.Vector3(-30, 2, 35), new THREE.Vector3(-25, 2, -20), new THREE.Vector3(-38, 2, -25)];

    spawnPoints.slice(0, 4).forEach((pos) => {
      const group = new THREE.Group();

      // Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.4, 0.5),
        new THREE.MeshStandardMaterial({ color: team === "T" ? 0xcc4422 : 0x2244cc })
      );
      body.position.y = 0.7;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 })
      );
      head.position.y = 1.65;
      group.add(head);

      // Helmet
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: team === "T" ? 0x884422 : 0x224488 })
      );
      helmet.position.y = 1.7;
      group.add(helmet);

      // Weapon in hands (simple)
      const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 })
      );
      gunBody.position.set(0.45, 0.9, -0.3);
      group.add(gunBody);

      group.position.copy(pos);
      scene.add(group);

      enemiesRef.current.push(group);
      enemyStatesRef.current.push({ health: 100, alive: true, vel: new THREE.Vector3(), lastShot: 0 });
    });
  }, []);

  // ─── SHOOT ──────────────────────────────────────────────────────────────────
  const shoot = useCallback(() => {
    const now = Date.now();
    const wDef = WEAPONS[playerRef.current.currentWeapon];
    if (!wDef || isReloadingRef.current) return;
    if (now - lastShotRef.current < wDef.fireRate) return;

    const ammo = playerRef.current.ammo[wDef.id];
    if (!ammo || ammo.mag <= 0) {
      // Click sound feedback via DOM
      return;
    }

    lastShotRef.current = now;

    // Reduce ammo
    setPlayer(p => ({
      ...p,
      ammo: { ...p.ammo, [wDef.id]: { ...p.ammo[wDef.id], mag: p.ammo[wDef.id].mag - 1 } }
    }));

    // Apply recoil to camera
    if (cameraRef.current) {
      weaponAnimRef.current.recoilY += wDef.recoilY;
      weaponAnimRef.current.recoilX += (Math.random() - 0.5) * wDef.recoilX * 2;
      weaponAnimRef.current.shootAnim = 1;
    }

    // Muzzle flash
    if (flashRef.current) {
      const mat = flashRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9;
      setTimeout(() => { if (flashRef.current) (flashRef.current.material as THREE.MeshBasicMaterial).opacity = 0; }, 50);
    }

    // Raycast for hit detection
    if (cameraRef.current && sceneRef.current) {
      const pellets = wDef.pellets || 1;
      for (let p = 0; p < pellets; p++) {
        const raycaster = new THREE.Raycaster();
        const spreadX = (Math.random() - 0.5) * wDef.spread * 2;
        const spreadY = (Math.random() - 0.5) * wDef.spread * 2;
        const dir = new THREE.Vector3(spreadX, spreadY, -1).normalize();
        dir.applyQuaternion(cameraRef.current.quaternion);
        raycaster.set(cameraRef.current.position, dir);

        // Check enemy hits
        let hit = false;
        enemiesRef.current.forEach((enemy, idx) => {
          if (!enemyStatesRef.current[idx].alive) return;
          const enemyBox = new THREE.Box3().setFromObject(enemy);
          const point = raycaster.ray.intersectBox(enemyBox, new THREE.Vector3());
          if (point) {
            hit = true;
            const eState = enemyStatesRef.current[idx];
            eState.health -= wDef.damage;
            if (eState.health <= 0) {
              eState.alive = false;
              eState.health = 0;
              enemy.visible = false;
              setKillFeed(prev => [`Ты убил противника!`, ...prev.slice(0, 3)]);
              setTimeout(() => setKillFeed(prev => prev.slice(0, -1)), 4000);
            }
            // Blood particle
            spawnParticle(point, sceneRef.current!);
          }
        });

        if (hit) { setCrosshairHit(true); setTimeout(() => setCrosshairHit(false), 200); }

        // Bullet hole on walls
        if (!hit) {
          const objects = sceneRef.current.children.filter(c => c instanceof THREE.Mesh && c !== weaponMeshRef.current);
          const intersects = raycaster.intersectObjects(objects, true);
          if (intersects.length > 0) {
            const hitPoint = intersects[0].point;
            const normal = intersects[0].face?.normal.clone().applyQuaternion(intersects[0].object.getWorldQuaternion(new THREE.Quaternion())) || new THREE.Vector3(0, 1, 0);
            addBulletHole(hitPoint, normal, sceneRef.current!);
          }
        }
      }
    }
  }, []);

  const spawnParticle = (pos: THREE.Vector3, scene: THREE.Scene) => {
    const count = 12;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.1;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xcc2200, size: 0.06, transparent: true, opacity: 0.9 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    particlesRef.current.push({ mesh: points, life: 0, maxLife: 0.5 });
  };

  const addBulletHole = (pos: THREE.Vector3, normal: THREE.Vector3, scene: THREE.Scene) => {
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 8),
      new THREE.MeshBasicMaterial({ color: 0x111111, depthWrite: false })
    );
    hole.position.copy(pos).addScaledVector(normal, 0.01);
    hole.lookAt(pos.clone().add(normal));
    scene.add(hole);
    bulletHolesRef.current.push(hole);
    if (bulletHolesRef.current.length > 50) {
      const old = bulletHolesRef.current.shift()!;
      scene.remove(old);
    }
  };

  // ─── RELOAD ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    const wDef = WEAPONS[playerRef.current.currentWeapon];
    if (!wDef || wDef.type === "knife" || isReloadingRef.current) return;
    const ammo = playerRef.current.ammo[wDef.id];
    if (!ammo || ammo.reserve <= 0 || ammo.mag === wDef.magSize) return;

    isReloadingRef.current = true;
    setHud(h => ({ ...h, reloading: true }));
    weaponAnimRef.current.reloadAnim = 1;

    setTimeout(() => {
      const needed = wDef.magSize - (ammo.mag);
      const take = Math.min(needed, ammo.reserve);
      setPlayer(p => ({
        ...p,
        ammo: { ...p.ammo, [wDef.id]: { mag: p.ammo[wDef.id].mag + take, reserve: p.ammo[wDef.id].reserve - take } }
      }));
      isReloadingRef.current = false;
      setHud(h => ({ ...h, reloading: false }));
      weaponAnimRef.current.reloadAnim = 0;
    }, wDef.reloadTime);
  }, []);

  // ─── SWITCH WEAPON ──────────────────────────────────────────────────────────
  const switchWeapon = useCallback((weaponId: string) => {
    if (!sceneRef.current) return;
    setPlayer(p => ({ ...p, currentWeapon: weaponId }));
    isReloadingRef.current = false;
    buildWeaponMesh(weaponId, sceneRef.current);
  }, [buildWeaponMesh]);

  // ─── BUY WEAPON ─────────────────────────────────────────────────────────────
  const buyWeapon = useCallback((weaponId: string) => {
    const wDef = WEAPONS[weaponId];
    if (!wDef) return;
    setPlayer(p => {
      if (p.money < wDef.price) return p;
      const newWeapons = p.weapons.includes(weaponId) ? p.weapons : [...p.weapons.filter(w => WEAPONS[w].type !== wDef.type || WEAPONS[w].type === "knife"), weaponId];
      return {
        ...p,
        money: p.money - wDef.price,
        weapons: newWeapons,
        currentWeapon: weaponId,
        ammo: { ...p.ammo, [weaponId]: { mag: wDef.magSize, reserve: wDef.magSize * 3 } },
      };
    });
    setShowBuyMenu(false);
    setTimeout(() => {
      if (sceneRef.current) buildWeaponMesh(weaponId, sceneRef.current);
    }, 100);
  }, [buildWeaponMesh]);

  // ─── INIT THREE.JS ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.phase !== "playing" || !canvasRef.current) return;

    const container = canvasRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x87ceeb); // sky color
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd4a96a, 30, 90);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.05, 200);
    const spawn = gameState.team === "T" ? T_SPAWN : CT_SPAWN;
    camera.position.copy(spawn);
    cameraRef.current = camera;

    // Lights
    const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);
    // Fill light
    const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
    fill.position.set(-20, 20, -30);
    scene.add(fill);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(150, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Build map
    buildMap(scene);

    // Build weapon
    buildWeaponMesh(playerRef.current.currentWeapon, scene);

    // Spawn enemies
    spawnEnemies(scene, gameState.team === "T" ? "T" : "CT");

    // Camera rotation state
    let pitch = 0;
    let yaw = spawn.x > 0 ? Math.PI : 0; // face center

    // ─── POINTER LOCK ───────────────────────────────────────────────────────
    const requestLock = () => {
      if (!mouseRef.current.locked) renderer.domElement.requestPointerLock();
    };
    renderer.domElement.addEventListener("click", requestLock);

    const onLockChange = () => {
      mouseRef.current.locked = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener("pointerlockchange", onLockChange);

    // ─── MOUSE MOVE ─────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.locked) return;
      const sens = 0.0015;
      yaw -= e.movementX * sens;
      pitch -= e.movementY * sens;
      pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    };
    document.addEventListener("mousemove", onMouseMove);

    // ─── KEYS ───────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "KeyR") reload();
      if (e.code === "KeyB" && gameState.phase === "playing") setShowBuyMenu(v => !v);
      if (e.code === "Escape") { setShowBuyMenu(false); document.exitPointerLock(); }
      if (e.code === "Digit1") switchWeapon(playerRef.current.weapons[0] || "knife");
      if (e.code === "Digit2" && playerRef.current.weapons[1]) switchWeapon(playerRef.current.weapons[1]);
      if (e.code === "Digit3" && playerRef.current.weapons[2]) switchWeapon(playerRef.current.weapons[2]);
      // Mouse wheel weapon switch handled via scroll
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // ─── MOUSE BUTTONS ──────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isFiringRef.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isFiringRef.current = false;
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    // ─── RESIZE ─────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ─── GAME LOOP ──────────────────────────────────────────────────────────
    const PLAYER_HEIGHT = 1.75;
    const PLAYER_RADIUS = 0.4;
    const GRAVITY = -18;
    const MOVE_SPEED = 8;
    const JUMP_VEL = 6.5;
    const playerBox = new THREE.Box3();
    const tmpVec = new THREE.Vector3();

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const delta = Math.min(clockRef.current.getDelta(), 0.05);
      const now = Date.now();

      // ── Firing ────────────────────────────────────────────────────────────
      if (isFiringRef.current && mouseRef.current.locked && !showBuyMenu) {
        const wDef = WEAPONS[playerRef.current.currentWeapon];
        if (wDef && (wDef.automatic || (now - lastShotRef.current > wDef.fireRate))) {
          shoot();
        }
      }

      // ── Movement ──────────────────────────────────────────────────────────
      const moveDir = new THREE.Vector3();
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

      if (keysRef.current["KeyW"] || keysRef.current["ArrowUp"]) moveDir.add(forward);
      if (keysRef.current["KeyS"] || keysRef.current["ArrowDown"]) moveDir.sub(forward);
      if (keysRef.current["KeyA"] || keysRef.current["ArrowLeft"]) moveDir.sub(right);
      if (keysRef.current["KeyD"] || keysRef.current["ArrowRight"]) moveDir.add(right);

      const isCrouching = keysRef.current["ControlLeft"] || keysRef.current["KeyC"];
      const isRunning = keysRef.current["ShiftLeft"];
      const speed = MOVE_SPEED * (isCrouching ? 0.5 : isRunning ? 1.4 : 1.0);
      const playerH = PLAYER_HEIGHT * (isCrouching ? 0.6 : 1.0);

      if (moveDir.lengthSq() > 0) moveDir.normalize().multiplyScalar(speed);

      velocityRef.current.x = moveDir.x;
      velocityRef.current.z = moveDir.z;

      // Gravity + jump
      if (!onGroundRef.current) velocityRef.current.y += GRAVITY * delta;
      if ((keysRef.current["Space"]) && onGroundRef.current) {
        velocityRef.current.y = JUMP_VEL;
        onGroundRef.current = false;
      }

      // Move and collide
      const newPos = camera.position.clone().addScaledVector(velocityRef.current, delta);

      // Ground check
      if (newPos.y - playerH < 0) {
        newPos.y = playerH;
        velocityRef.current.y = 0;
        onGroundRef.current = true;
      }

      // Simple AABB collision with map boxes
      playerBox.setFromCenterAndSize(
        new THREE.Vector3(newPos.x, newPos.y - playerH / 2, newPos.z),
        new THREE.Vector3(PLAYER_RADIUS * 2, playerH, PLAYER_RADIUS * 2)
      );

      let collided = false;
      for (const col of collidersRef.current) {
        if (playerBox.intersectsBox(col)) {
          // Push out on horizontal axes
          const overlap = new THREE.Box3();
          overlap.copy(playerBox).intersect(col);
          const size = new THREE.Vector3();
          overlap.getSize(size);

          if (size.x < size.z) {
            const sign = camera.position.x < col.getCenter(tmpVec).x ? -1 : 1;
            newPos.x += sign * (size.x + 0.01);
          } else {
            const sign = camera.position.z < col.getCenter(tmpVec).z ? -1 : 1;
            newPos.z += sign * (size.z + 0.01);
          }
          collided = true;
        }
      }
      if (!collided) {
        // nothing special
      }

      camera.position.copy(newPos);

      // Apply camera rotation
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch + weaponAnimRef.current.recoilY * 0.3;

      // ── Recoil recovery ──────────────────────────────────────────────────
      weaponAnimRef.current.recoilY = THREE.MathUtils.lerp(weaponAnimRef.current.recoilY, 0, delta * 8);
      weaponAnimRef.current.recoilX = THREE.MathUtils.lerp(weaponAnimRef.current.recoilX, 0, delta * 8);
      weaponAnimRef.current.shootAnim = THREE.MathUtils.lerp(weaponAnimRef.current.shootAnim, 0, delta * 20);

      // ── Weapon bob ───────────────────────────────────────────────────────
      const isMoving = moveDir.lengthSq() > 0.01;
      if (isMoving) weaponAnimRef.current.bobPhase += delta * (isRunning ? 14 : 9);
      const bob = isMoving ? Math.sin(weaponAnimRef.current.bobPhase) * 0.012 : 0;
      const bobX = isMoving ? Math.cos(weaponAnimRef.current.bobPhase * 0.5) * 0.006 : 0;

      if (weaponMeshRef.current) {
        const baseY = -0.22 - (isCrouching ? 0.1 : 0);
        const reloadOffset = weaponAnimRef.current.reloadAnim > 0 ? -Math.sin(Date.now() * 0.005) * 0.06 : 0;
        weaponMeshRef.current.position.set(
          0.22 + bobX + weaponAnimRef.current.recoilX * 0.15,
          baseY + bob + reloadOffset - weaponAnimRef.current.recoilY * 0.08 - weaponAnimRef.current.shootAnim * 0.02,
          -0.38 - weaponAnimRef.current.recoilY * 0.1 + weaponAnimRef.current.shootAnim * 0.04
        );
        weaponMeshRef.current.rotation.x = weaponAnimRef.current.recoilY * 0.4;
        // Attach to camera
        weaponMeshRef.current.position.applyQuaternion(camera.quaternion);
        weaponMeshRef.current.position.add(camera.position);
        weaponMeshRef.current.rotation.set(
          camera.rotation.x + weaponAnimRef.current.recoilY * 0.4,
          camera.rotation.y + 0.08,
          camera.rotation.z
        );
        weaponMeshRef.current.rotation.order = "YXZ";
      }

      // ── Enemy AI (simple) ─────────────────────────────────────────────────
      enemiesRef.current.forEach((enemy, idx) => {
        const es = enemyStatesRef.current[idx];
        if (!es.alive) return;
        const toPlayer = camera.position.clone().sub(enemy.position);
        const dist = toPlayer.length();
        toPlayer.y = 0;
        if (dist > 1) {
          enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);
          // Move toward player if far
          if (dist > 8) {
            const move = toPlayer.normalize().multiplyScalar(2.5 * delta);
            enemy.position.add(move);
          }
        }
        // Enemy shoots at player
        if (dist < 25 && now - es.lastShot > 1500 + Math.random() * 1000) {
          es.lastShot = now;
          const hitChance = Math.max(0.1, 0.6 - dist * 0.02);
          if (Math.random() < hitChance) {
            setPlayer(p => {
              const dmg = Math.floor(15 + Math.random() * 20);
              const newHp = Math.max(0, p.health - dmg);
              setHud(h => ({ ...h, health: newHp, hitFlash: Date.now() }));
              if (newHp <= 0) setGameState(g => ({ ...g, phase: "dead" }));
              return { ...p, health: newHp };
            });
          }
        }
      });

      // ── Check win condition ───────────────────────────────────────────────
      if (enemyStatesRef.current.length > 0 && enemyStatesRef.current.every(e => !e.alive)) {
        setGameState(g => ({
          ...g,
          phase: "win",
          score: { ...g.score, [g.team!]: g.score[g.team!] + 1 },
        }));
      }

      // ── Particles ────────────────────────────────────────────────────────
      particlesRef.current = particlesRef.current.filter(p => {
        p.life += delta;
        const t = p.life / p.maxLife;
        (p.mesh.material as THREE.PointsMaterial).opacity = 1 - t;
        if (p.life >= p.maxLife) { sceneRef.current?.remove(p.mesh); return false; }
        return true;
      });

      // ── HUD update ────────────────────────────────────────────────────────
      const ammo = playerRef.current.ammo[playerRef.current.currentWeapon];
      setHud(h => ({
        ...h,
        health: playerRef.current.health,
        armor: playerRef.current.armor,
        mag: ammo?.mag ?? 0,
        reserve: ammo?.reserve ?? 0,
        weapon: WEAPONS[playerRef.current.currentWeapon]?.name ?? "",
      }));

      renderer.render(scene, camera);
    };

    clockRef.current.start();
    loop();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("resize", onResize);
      document.exitPointerLock();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase, gameState.team]);

  // ─── TEAM SELECT ─────────────────────────────────────────────────────────────
  const startGame = (team: "T" | "CT") => {
    setGameState({ phase: "playing", team, round: 1, score: { T: 0, CT: 0 } });
    setPlayer({
      health: 100, armor: 0, money: 3000,
      currentWeapon: "glock",
      weapons: ["knife", "glock"],
      ammo: { knife: { mag: 1, reserve: 0 }, glock: { mag: 20, reserve: 60 } },
    });
  };

  const nextRound = () => {
    setGameState(g => ({ ...g, phase: "playing", round: g.round + 1 }));
    setPlayer(p => ({
      ...p,
      health: 100,
      money: Math.min(16000, p.money + 3250),
      ammo: {
        ...p.ammo,
        ...Object.fromEntries(p.weapons.map(w => [w, { mag: WEAPONS[w].magSize, reserve: WEAPONS[w].magSize * 3 }]))
      }
    }));
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  if (gameState.phase === "menu") {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col items-center justify-center">
        <div className="text-center mb-10">
          <div className="text-5xl font-bold tracking-[0.3em] text-white mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
            STAND<span className="text-[#e63946]">OFF</span> 2
          </div>
          <div className="text-gray-400 tracking-widest text-sm uppercase">3D Tactical Shooter · Dust 2</div>
        </div>

        <div className="flex gap-6 mb-8">
          <button
            onClick={() => startGame("T")}
            className="group relative overflow-hidden bg-[#cc4422] hover:bg-[#e63946] text-white px-12 py-5 text-xl tracking-widest uppercase transition-all"
            style={{ fontFamily: "'Oswald', sans-serif", boxShadow: "0 0 30px rgba(204,68,34,0.4)" }}
          >
            <div className="text-2xl mb-1">💥 Атака (T)</div>
            <div className="text-sm opacity-70">Подрыви точку</div>
          </button>
          <button
            onClick={() => startGame("CT")}
            className="group relative overflow-hidden bg-[#2244cc] hover:bg-[#3355dd] text-white px-12 py-5 text-xl tracking-widest uppercase transition-all"
            style={{ fontFamily: "'Oswald', sans-serif", boxShadow: "0 0 30px rgba(34,68,204,0.4)" }}
          >
            <div className="text-2xl mb-1">🛡️ Защита (CT)</div>
            <div className="text-sm opacity-70">Обезвредь бомбу</div>
          </button>
        </div>

        <div className="bg-[#111118] border border-white/10 p-6 max-w-md text-center mb-6">
          <div className="text-[#e63946] text-sm tracking-widest uppercase mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>Управление</div>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
            <div><span className="text-white font-bold">WASD</span> — движение</div>
            <div><span className="text-white font-bold">Мышь</span> — прицел</div>
            <div><span className="text-white font-bold">ЛКМ</span> — стрелять</div>
            <div><span className="text-white font-bold">R</span> — перезарядка</div>
            <div><span className="text-white font-bold">Пробел</span> — прыжок</div>
            <div><span className="text-white font-bold">Ctrl/C</span> — присесть</div>
            <div><span className="text-white font-bold">B</span> — меню закупки</div>
            <div><span className="text-white font-bold">1/2/3</span> — оружие</div>
          </div>
        </div>

        <button onClick={onExit} className="text-gray-500 hover:text-white text-sm tracking-widest uppercase transition-colors border border-gray-700 hover:border-white px-6 py-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
          ← Назад в меню
        </button>
      </div>
    );
  }

  if (gameState.phase === "dead") {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
        <div className="text-[#e63946] text-7xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>ТЫ УБИТ</div>
        <div className="text-gray-300 text-xl mb-8">Раунд {gameState.round}</div>
        <div className="flex gap-4">
          <button onClick={nextRound} className="bg-[#e63946] hover:bg-[#c62836] text-white px-8 py-3 tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Следующий раунд
          </button>
          <button onClick={() => setGameState(g => ({ ...g, phase: "menu" }))} className="border border-white/30 text-white px-8 py-3 tracking-widest uppercase hover:bg-white/10" style={{ fontFamily: "'Oswald', sans-serif" }}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === "win") {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
        <div className="text-yellow-400 text-7xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>ПОБЕДА!</div>
        <div className="text-gray-300 text-xl mb-2">Все противники уничтожены</div>
        <div className="text-white text-3xl mb-8" style={{ fontFamily: "'Oswald', sans-serif" }}>
          T <span className="text-[#cc4422]">{gameState.score.T}</span> — <span className="text-[#2244cc]">{gameState.score.CT}</span> CT
        </div>
        <div className="flex gap-4">
          <button onClick={nextRound} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 tracking-widest uppercase font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Следующий раунд
          </button>
          <button onClick={() => setGameState(g => ({ ...g, phase: "menu" }))} className="border border-white/30 text-white px-8 py-3 tracking-widest uppercase hover:bg-white/10" style={{ fontFamily: "'Oswald', sans-serif" }}>
            В меню
          </button>
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ cursor: "none" }}>
      {/* 3D Canvas */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Crosshair */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className={`relative transition-colors duration-100 ${crosshairHit ? "text-red-500" : "text-white"}`}>
          <div className="absolute w-0.5 h-3 bg-current left-1/2 -translate-x-1/2 -top-5" />
          <div className="absolute w-0.5 h-3 bg-current left-1/2 -translate-x-1/2 top-2" />
          <div className="absolute h-0.5 w-3 bg-current top-1/2 -translate-y-1/2 -left-5" />
          <div className="absolute h-0.5 w-3 bg-current top-1/2 -translate-y-1/2 left-2" />
          <div className="w-1 h-1 rounded-full bg-current" style={{ opacity: crosshairHit ? 1 : 0.8 }} />
        </div>
      </div>

      {/* Hit flash overlay */}
      {hud.hitFlash > Date.now() - 300 && (
        <div className="fixed inset-0 pointer-events-none bg-red-900/40 animate-pulse" />
      )}

      {/* HUD — Bottom */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none px-6 pb-4">
        <div className="flex items-end justify-between">
          {/* Health & Armor */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">❤️</span>
              <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 0 10px rgba(0,0,0,0.8)" }}>
                {hud.health}
              </span>
            </div>
            {hud.armor > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="text-2xl font-bold text-blue-300" style={{ fontFamily: "'Oswald', sans-serif" }}>{hud.armor}</span>
              </div>
            )}
          </div>

          {/* Money */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-xl" style={{ fontFamily: "'Oswald', sans-serif" }}>$</span>
            <span className="text-yellow-400 text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 0 10px rgba(0,0,0,0.8)" }}>
              {player.money}
            </span>
          </div>

          {/* Ammo */}
          <div className="text-right">
            <div className="text-gray-300 text-xs uppercase tracking-widest mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>{hud.weapon}</div>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-white text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", textShadow: "0 0 10px rgba(0,0,0,0.8)" }}>
                {hud.mag}
              </span>
              <span className="text-gray-400 text-xl" style={{ fontFamily: "'Oswald', sans-serif" }}>/ {hud.reserve}</span>
            </div>
            {hud.reloading && <div className="text-yellow-400 text-xs tracking-widest animate-pulse" style={{ fontFamily: "'Oswald', sans-serif" }}>ПЕРЕЗАРЯДКА...</div>}
          </div>
        </div>

        {/* Health bar */}
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden w-40">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${hud.health}%`, background: hud.health > 50 ? "#22cc44" : hud.health > 25 ? "#ffaa00" : "#e63946" }}
          />
        </div>
      </div>

      {/* HUD — Round & Score */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-none text-center">
        <div className="bg-black/60 px-6 py-2 backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-4 text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
            <span className="text-[#cc4422]">T {gameState.score.T}</span>
            <span className="text-gray-400 text-sm">РАУНД {gameState.round}</span>
            <span className="text-[#2244cc]">{gameState.score.CT} CT</span>
          </div>
        </div>
      </div>

      {/* Weapon switcher */}
      <div className="fixed top-4 right-4 pointer-events-none">
        <div className="flex flex-col gap-1">
          {player.weapons.map((wId, i) => (
            <div
              key={wId}
              className={`px-3 py-1.5 text-xs tracking-widest uppercase border ${wId === player.currentWeapon ? "bg-[#e63946]/30 border-[#e63946] text-white" : "bg-black/40 border-white/20 text-gray-400"}`}
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              [{i + 1}] {WEAPONS[wId]?.name}
            </div>
          ))}
        </div>
      </div>

      {/* Kill feed */}
      <div className="fixed top-16 right-4 pointer-events-none">
        {killFeed.map((k, i) => (
          <div key={i} className="bg-black/70 border border-[#e63946]/40 px-3 py-1 text-xs text-[#e63946] mb-1 tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
            💀 {k}
          </div>
        ))}
      </div>

      {/* Click to play prompt */}
      {!mouseRef.current.locked && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 border border-white/20 px-8 py-4 text-center backdrop-blur-sm">
            <div className="text-white text-xl tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>Кликни для захвата мыши</div>
            <div className="text-gray-400 text-sm mt-1">ESC — выход из режима</div>
          </div>
        </div>
      )}

      {/* BUY MENU */}
      {showBuyMenu && (
        <div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-auto bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d14] border border-[#e63946]/30 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="text-2xl tracking-widest uppercase text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
                💰 Закупка — <span className="text-yellow-400">${player.money}</span>
              </div>
              <button onClick={() => setShowBuyMenu(false)} className="text-gray-500 hover:text-white text-2xl transition-colors">✕</button>
            </div>

            <div className="flex">
              {/* Categories */}
              <div className="w-48 border-r border-white/10">
                {BUY_MENU_ITEMS.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setBuyCategory(i)}
                    className={`w-full text-left px-4 py-3 text-sm tracking-wide transition-all ${buyCategory === i ? "bg-[#e63946]/20 text-white border-l-2 border-[#e63946]" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>

              {/* Items */}
              <div className="flex-1 p-4 grid grid-cols-1 gap-2">
                {BUY_MENU_ITEMS[buyCategory].items.map(wId => {
                  const wDef = WEAPONS[wId];
                  const canAfford = player.money >= wDef.price;
                  const owned = player.weapons.includes(wId);
                  return (
                    <button
                      key={wId}
                      onClick={() => canAfford && !owned && buyWeapon(wId)}
                      disabled={!canAfford || owned}
                      className={`flex items-center justify-between p-4 border transition-all text-left ${
                        owned ? "border-green-500/40 bg-green-900/20 opacity-70" :
                        canAfford ? "border-white/10 hover:border-[#e63946]/60 hover:bg-[#e63946]/10 cursor-pointer" :
                        "border-white/5 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div>
                        <div className="text-white font-bold tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                          {owned && "✓ "}{wDef.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Урон: {wDef.damage} · Магазин: {wDef.magSize} · {wDef.automatic ? "Авто" : "Полуавто"}
                        </div>
                      </div>
                      <div className={`text-xl font-bold ${canAfford ? "text-yellow-400" : "text-gray-600"}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                        ${wDef.price}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-white/10 flex justify-between text-xs text-gray-500">
              <span>[B] — закрыть меню закупки</span>
              <span>ESC — освободить мышь</span>
            </div>
          </div>
        </div>
      )}

      {/* Exit button */}
      <button
        onClick={() => { document.exitPointerLock(); setGameState(g => ({ ...g, phase: "menu" })); }}
        className="fixed top-4 left-4 z-[60] bg-black/60 hover:bg-[#e63946]/80 border border-white/20 text-white px-3 py-2 text-xs tracking-widest uppercase transition-all backdrop-blur-sm"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        ← Меню
      </button>
    </div>
  );
}