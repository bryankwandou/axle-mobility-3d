import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

export interface HubPinData {
  id: string;
  type: 'bike' | 'charge' | 'pin';
  title: string;
  subtitle: string;
  metric: string;
  status: string;
  worldPos: [number, number, number];
}

export const HUB_PINS: HubPinData[] = [
  {
    id: 'bike-hub',
    type: 'bike',
    title: 'West Plaza Micro-Mobility Dock',
    subtitle: 'Autonomous e-Bike & Cargo Fleet',
    metric: '142 Active Units',
    status: '94% Charged',
    worldPos: [-13.5, 4.8, -5.5],
  },
  {
    id: 'charge-hub',
    type: 'charge',
    title: 'East District 350kW Superhub',
    subtitle: 'Bidirectional V2G Grid Balancing',
    metric: '18.4 MWh Dispatched',
    status: 'Ultra-Fast Ready',
    worldPos: [15.2, 3.6, -2.5],
  },
  {
    id: 'transit-pin',
    type: 'pin',
    title: 'South Boulevard Smart Corridor',
    subtitle: 'Adaptive Transit Signal Priority',
    metric: '-38% Wait Time',
    status: 'Synchronized',
    worldPos: [20.5, 2.5, 1.2],
  },
];

interface CityScene3DProps {
  activeSection: string;
  cameraPreset: number;
  zoomLevel: number;
  renderLayer: 'realistic' | 'energy' | 'lidar';
  showCommuterFlow: boolean;
  isometricMode: boolean;
  selectedPinId: string | null;
  onSelectPin: (pin: HubPinData) => void;
}

interface ProjectedPin extends HubPinData {
  x: number;
  y: number;
  visible: boolean;
}

function createWindowTexture(
  rows: number,
  cols: number,
  baseHex: string,
  litRatio: number,
  hasOrangeStrip = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padX = 14;
  const padY = 18;
  const cellW = (canvas.width - padX * 2) / cols;
  const cellH = (canvas.height - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = Math.sin(r * 17.3 + c * 31.7) * 0.5 + 0.5;
      const wx = padX + c * cellW + 3;
      const wy = padY + r * cellH + 4;
      const ww = Math.max(4, cellW - 6);
      const wh = Math.max(6, cellH - 8);

      if (seed < litRatio) {
        const warm = seed < litRatio * 0.5;
        ctx.fillStyle = warm ? '#FFB25B' : '#FFE3B3';
      } else {
        ctx.fillStyle = '#242A30';
      }
      ctx.fillRect(wx, wy, ww, wh);
    }
  }

  if (hasOrangeStrip) {
    const grad = ctx.createLinearGradient(0, 30, 0, canvas.height - 40);
    grad.addColorStop(0, '#FF7A2F');
    grad.addColorStop(0.5, '#F26522');
    grad.addColorStop(1, '#9E3808');
    ctx.fillStyle = grad;
    ctx.fillRect(canvas.width * 0.64, 24, 18, canvas.height - 60);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#8A949E');
  grad.addColorStop(0.5, '#99A3AD');
  grad.addColorStop(1, '#7D8791');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(60, 68, 76, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 78.233) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 45.164) * 0.5 + 0.5) * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(20,25,30,0.05)';
    ctx.fillRect(x, y, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

export const CityScene3D: React.FC<CityScene3DProps> = ({
  activeSection,
  cameraPreset,
  zoomLevel,
  renderLayer,
  showCommuterFlow,
  isometricMode,
  selectedPinId,
  onSelectPin,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.8, -1.5));
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [projectedPins, setProjectedPins] = useState<ProjectedPin[]>([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 680;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9FA8B2');
    scene.fog = new THREE.FogExp2('#A4ADB7', 0.0155);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 220);
    camera.position.set(-2.5, 5.4, 24.5);
    camera.lookAt(targetLookAtRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Overcast Sky Backdrop Dome
    const skyGeo = new THREE.SphereGeometry(110, 32, 24);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#7B8591');
    skyGrad.addColorStop(0.42, '#9BA5B1');
    skyGrad.addColorStop(0.68, '#BCC4CE');
    skyGrad.addColorStop(1, '#AEB6BF');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 64, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#DCE3EC', '#515A63', 1.35);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#F4F7FA', 1.55);
    dirLight.position.set(-18, 28, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 85;
    const d = 32;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Warm station interior glow lights
    const stationGlowCenter = new THREE.PointLight('#FF9436', 8.5, 22, 1.5);
    stationGlowCenter.position.set(0, 2.6, -5.8);
    scene.add(stationGlowCenter);

    const stationGlowLeft = new THREE.PointLight('#FFA64C', 5.2, 16, 1.6);
    stationGlowLeft.position.set(-5.2, 2.2, -5.5);
    scene.add(stationGlowLeft);

    const stationGlowRight = new THREE.PointLight('#FFA64C', 5.2, 16, 1.6);
    stationGlowRight.position.set(5.2, 2.2, -5.5);
    scene.add(stationGlowRight);

    // Wet Concrete Plaza Ground
    const concreteTex = createConcreteTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.22,
      metalness: 0.28,
      color: '#AAB3BC',
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Planar Wet Reflection Sheen Strips on the Plaza (simulating wet pavement reflections under the station & trams)
    const reflectionGroup = new THREE.Group();
    const sheenPositions: Array<[number, number, number, number, string, number]> = [
      [0, -1.5, 11.5, 6.5, '#FF9B42', 0.22],
      [-11, 0.5, 7.5, 4.2, '#FF8E36', 0.16],
      [9.5, 3.2, 8.2, 4.5, '#FF963D', 0.18],
      [6.5, 8.5, 7.0, 5.5, '#F26522', 0.15],
    ];
    sheenPositions.forEach(([x, z, w, h, color, op]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: op,
          depthWrite: false,
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      reflectionGroup.add(m);
    });
    scene.add(reflectionGroup);

    // =========================================================
    // CENTERPIECE ARCHITECTURAL CURVED TRANSIT HUB (Axle Station)
    // =========================================================
    const stationGroup = new THREE.Group();
    stationGroup.position.set(0, 0, -6.5);

    // Sweeping Curved Canopy Roof
    const archWidth = 19.6;
    const archDepth = 7.4;
    const archSegmentsX = 72;
    const archSegmentsZ = 16;

    const buildCanopyGeometry = (thicknessOffset: number) => {
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let iz = 0; iz <= archSegmentsZ; iz++) {
        const vz = iz / archSegmentsZ;
        const z = (vz - 0.5) * archDepth;
        for (let ix = 0; ix <= archSegmentsX; ix++) {
          const vx = ix / archSegmentsX;
          const x = (vx - 0.5) * archWidth;
          // Bell-shaped architectural curve matching the station roof in the reference frame
          const normX = x / (archWidth * 0.5);
          const archHeight = Math.exp(-Math.pow(normX * 1.45, 2)) * 2.55;
          const frontCurve = (1 - Math.pow(vz * 2 - 1, 2)) * 0.22;
          const y = 1.75 + archHeight + frontCurve + thicknessOffset;

          positions.push(x, y, z);
          uvs.push(vx, vz);
        }
      }

      for (let iz = 0; iz < archSegmentsZ; iz++) {
        for (let ix = 0; ix < archSegmentsX; ix++) {
          const a = iz * (archSegmentsX + 1) + ix;
          const b = a + 1;
          const c = (iz + 1) * (archSegmentsX + 1) + ix;
          const dIdx = c + 1;
          indices.push(a, c, b);
          indices.push(b, c, dIdx);
        }
      }

      geo.setIndex(indices);
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      return geo;
    };

    const topCanopyMat = new THREE.MeshStandardMaterial({
      color: '#5C656E',
      roughness: 0.35,
      metalness: 0.45,
      side: THREE.DoubleSide,
    });
    const topCanopy = new THREE.Mesh(buildCanopyGeometry(0.18), topCanopyMat);
    topCanopy.castShadow = true;
    stationGroup.add(topCanopy);

    // Warm timber/amber illuminated underside soffit of the sweeping arch
    const soffitMat = new THREE.MeshStandardMaterial({
      color: '#D87A32',
      emissive: '#C85E14',
      emissiveIntensity: 0.72,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const soffitCanopy = new THREE.Mesh(buildCanopyGeometry(0.0), soffitMat);
    stationGroup.add(soffitCanopy);

    // Glowing Interior Concourse Core behind Glass Curtain Wall
    const concourseCore = new THREE.Mesh(
      new THREE.BoxGeometry(14.6, 3.6, 5.6),
      new THREE.MeshStandardMaterial({
        color: '#FFD09B',
        emissive: '#FF9E44',
        emissiveIntensity: 0.9,
        roughness: 0.3,
      })
    );
    concourseCore.position.set(0, 1.9, -0.3);
    stationGroup.add(concourseCore);

    // Glass Curtain Wall Front & Mullions
    const glassCurtain = new THREE.Mesh(
      new THREE.BoxGeometry(15.2, 3.8, 6.0),
      new THREE.MeshPhysicalMaterial({
        color: '#D8E3EC',
        transparent: true,
        opacity: 0.34,
        roughness: 0.1,
        metalness: 0.15,
        transmission: 0.55,
      })
    );
    glassCurtain.position.set(0, 1.95, -0.1);
    stationGroup.add(glassCurtain);

    // Structural dark vertical & horizontal mullions on the station glass facade
    const mullionMat = new THREE.MeshStandardMaterial({
      color: '#23282E',
      roughness: 0.4,
      metalness: 0.6,
    });
    for (let mx = -7.0; mx <= 7.0; mx += 1.4) {
      const normX = mx / (archWidth * 0.5);
      const h = 1.65 + Math.exp(-Math.pow(normX * 1.45, 2)) * 2.45;
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.14), mullionMat);
      mullion.position.set(mx, h / 2, 2.92);
      stationGroup.add(mullion);
    }
    [1.35, 2.65].forEach((hy) => {
      const transom = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.08, 0.14), mullionMat);
      transom.position.set(0, hy, 2.92);
      stationGroup.add(transom);
    });

    // Left and Right Exterior Escalator / Stair Ramps flanking the central concourse
    const createStairWing = (xPos: number) => {
      const wing = new THREE.Group();
      const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.25, 3.4),
        new THREE.MeshStandardMaterial({ color: '#8C96A0', roughness: 0.5 })
      );
      ramp.rotation.x = 0.36;
      ramp.position.set(xPos, 0.68, 3.2);
      wing.add(ramp);

      const railLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.45, 3.4),
        new THREE.MeshStandardMaterial({ color: '#CBD3DC', transparent: true, opacity: 0.65 })
      );
      railLeft.rotation.x = 0.36;
      railLeft.position.set(xPos - 0.58, 0.88, 3.2);
      wing.add(railLeft);

      const railRight = railLeft.clone();
      railRight.position.x = xPos + 0.58;
      wing.add(railRight);
      return wing;
    };
    stationGroup.add(createStairWing(-4.35));
    stationGroup.add(createStairWing(4.35));

    // Orange Geometric 'A' Emblem mounted on the center of the Station Facade
    const emblemGroup = new THREE.Group();
    const emblemMat = new THREE.MeshStandardMaterial({
      color: '#F26522',
      emissive: '#F26522',
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.12), emblemMat);
    leftLeg.position.set(-0.28, 0, 0);
    leftLeg.rotation.z = -0.44;
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.12), emblemMat);
    rightLeg.position.set(0.28, 0, 0);
    rightLeg.rotation.z = 0.44;
    emblemGroup.add(leftLeg, rightLeg);
    emblemGroup.position.set(-0.4, 2.75, 3.02);
    stationGroup.add(emblemGroup);

    scene.add(stationGroup);

    // =========================================================
    // SURROUNDING CITY BUILDINGS & SKYLINE
    // =========================================================
    const cityGroup = new THREE.Group();

    const addBuilding = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      baseColor: string,
      litRatio: number,
      hasOrangeStrip = false
    ) => {
      const tex = createWindowTexture(
        Math.max(4, Math.round(h * 1.8)),
        Math.max(2, Math.round(w * 1.2)),
        baseColor,
        litRatio,
        hasOrangeStrip
      );
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.42,
        metalness: 0.18,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
        mat,
        mat,
        roofMat,
        roofMat,
        mat,
        mat,
      ]);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cityGroup.add(mesh);
      return mesh;
    };

    // Foreground & Midground Iconic Buildings from Reference Frame
    // 1. Tall left tower with vertical glowing orange slot
    addBuilding(-16.2, -9.5, 3.4, 11.2, 3.4, '#8A929A', 0.25, true);
    // 2. Tall right-center dark ribbed skyscraper with vertical orange core
    addBuilding(10.2, -9.2, 3.6, 9.8, 3.4, '#363C42', 0.38, true);
    // 3. Dark charcoal modern pavilion in front-left of the station
    addBuilding(-1.8, -1.2, 3.2, 2.8, 2.8, '#262B30', 0.35, false);
    // 4. White mid-rise brutalist block on left of plaza
    addBuilding(-5.2, -2.2, 2.5, 3.8, 2.6, '#C8CFD6', 0.18, false);
    addBuilding(-11.4, -2.5, 3.2, 4.2, 3.0, '#BCC4CC', 0.22, false);
    // 5. White mid-rise block on right of plaza (with orange charger icon above it)
    addBuilding(15.2, -2.2, 4.2, 3.6, 3.4, '#C5CCD3', 0.16, false);
    addBuilding(11.6, -4.8, 3.0, 3.9, 2.8, '#40464D', 0.28, false);
    // 6. Far right tall modernist slabs
    addBuilding(21.5, -5.5, 3.2, 8.6, 3.2, '#CFD6DC', 0.12, false);
    addBuilding(24.2, -3.2, 3.0, 6.8, 3.0, '#98A1AA', 0.2, false);

    // Background Skyline Silhouettes
    const skylineSpecs: Array<[number, number, number, number, number, string]> = [
      [-23, -16, 4.0, 9.5, 4.0, '#7C858F'],
      [-19, -15, 3.5, 7.2, 3.5, '#919AA3'],
      [-12, -16, 3.8, 6.8, 3.5, '#858E98'],
      [-6.5, -17, 3.2, 8.4, 3.2, '#7E8791'],
      [-1.5, -18, 4.2, 6.2, 3.8, '#8E97A1'],
      [4.8, -16.5, 3.4, 7.6, 3.4, '#838C96'],
      [15.8, -15.5, 3.8, 6.5, 3.6, '#7F8892'],
      [19.5, -14.0, 3.5, 5.8, 3.5, '#949DA6'],
    ];
    skylineSpecs.forEach(([x, z, w, h, d, col]) => {
      addBuilding(x, z, w, h, d, col, 0.15, false);
    });

    // Foreground low concrete architectural blocks & planters
    const addPlanterBlock = (x: number, z: number, w: number, h: number, d: number) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: '#7D858E', roughness: 0.65 })
      );
      m.position.set(x, h / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      cityGroup.add(m);
    };
    addPlanterBlock(-15.5, 5.2, 2.8, 1.8, 2.4);
    addPlanterBlock(-10.8, 5.8, 1.4, 1.5, 1.4);
    addPlanterBlock(-3.2, 6.4, 3.2, 0.75, 1.8);
    addPlanterBlock(3.8, 10.2, 2.2, 1.6, 1.8);

    // Orange Fast-Charging Totems along the Plaza
    const totemPositions: Array<[number, number]> = [
      [2.6, 2.2],
      [6.4, -1.2],
      [13.0, 0.2],
      [18.8, 0.5],
    ];
    totemPositions.forEach(([tx, tz]) => {
      const totem = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.85, 0.22),
        new THREE.MeshStandardMaterial({
          color: '#F26522',
          emissive: '#F26522',
          emissiveIntensity: 0.55,
        })
      );
      totem.position.set(tx, 0.425, tz);
      cityGroup.add(totem);
    });

    scene.add(cityGroup);

    // =========================================================
    // ARCHITECTURAL STREET TREES
    // =========================================================
    const treeGroup = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3B3530', roughness: 0.85 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#394333', roughness: 0.75 });

    const addTree = (x: number, z: number, scale = 1.0) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 8), trunkMat);
      trunk.position.y = 0.55;
      t.add(trunk);

      const offsets: Array<[number, number, number, number]> = [
        [0, 1.35, 0, 0.62],
        [-0.28, 1.2, 0.18, 0.46],
        [0.3, 1.25, -0.15, 0.48],
        [0.05, 1.62, 0.1, 0.44],
      ];
      offsets.forEach(([ox, oy, oz, r]) => {
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), foliageMat);
        crown.position.set(ox, oy, oz);
        crown.castShadow = true;
        t.add(crown);
      });
      t.position.set(x, 0, z);
      t.scale.setScalar(scale);
      treeGroup.add(t);
    };

    const treeCoords: Array<[number, number, number]> = [
      [-13.2, 1.5, 1.0],
      [-9.2, 5.2, 0.95],
      [-7.8, 0.2, 1.05],
      [-2.2, 5.8, 1.15],
      [1.2, 1.5, 0.9],
      [6.8, 4.8, 1.1],
      [8.2, 5.2, 0.95],
      [12.5, 6.2, 1.2],
      [15.8, 1.2, 0.95],
      [17.5, 5.5, 1.1],
      [-12.5, 10.8, 1.4],
      [2.5, 11.8, 1.45],
    ];
    treeCoords.forEach(([x, z, s]) => addTree(x, z, s));
    scene.add(treeGroup);

    // =========================================================
    // CURVED TRAM TRACKS & 3 ARTICULATED WHITE/ORANGE TRAMS
    // =========================================================
    const trackCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 0.05, -0.5),
      new THREE.Vector3(-11, 0.05, 1.2),
      new THREE.Vector3(-1, 0.05, 2.8),
      new THREE.Vector3(8, 0.05, 5.2),
      new THREE.Vector3(16, 0.05, 11.5),
    ]);

    const trackCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 0.05, -1.8),
      new THREE.Vector3(-10, 0.05, -0.2),
      new THREE.Vector3(2, 0.05, 1.4),
      new THREE.Vector3(13, 0.05, 2.6),
      new THREE.Vector3(24, 0.05, 3.8),
    ]);

    // Render steel rails along both curves
    const addRailsForCurve = (curve: THREE.CatmullRomCurve3) => {
      const points = curve.getPoints(100);
      const railGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        100,
        0.045,
        6,
        false
      );
      const railMat = new THREE.MeshStandardMaterial({
        color: '#545D66',
        metalness: 0.8,
        roughness: 0.25,
      });
      const rail1 = new THREE.Mesh(railGeo, railMat);
      const rail2 = rail1.clone();
      rail2.position.z += 0.42;
      scene.add(rail1, rail2);
    };
    addRailsForCurve(trackCurve1);
    addRailsForCurve(trackCurve2);

    // Articulated Tram Builder (matching the sleek white trams with orange doors & dark windows)
    const createArticulatedTram = (carCount: number) => {
      const tramGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: '#F2F5F8',
        roughness: 0.2,
        metalness: 0.15,
      });
      const windowMat = new THREE.MeshStandardMaterial({
        color: '#1A2026',
        roughness: 0.1,
        metalness: 0.5,
      });
      const orangeDoorMat = new THREE.MeshStandardMaterial({
        color: '#F26522',
        emissive: '#F26522',
        emissiveIntensity: 0.35,
        roughness: 0.25,
      });
      const roofTrimMat = new THREE.MeshStandardMaterial({
        color: '#2A3036',
        roughness: 0.5,
      });

      const carLength = 2.45;
      const gap = 0.22;

      for (let i = 0; i < carCount; i++) {
        const car = new THREE.Group();
        const offsetX = (i - (carCount - 1) / 2) * (carLength + gap);

        // Main white shell
        const shell = new THREE.Mesh(new THREE.BoxGeometry(carLength, 0.88, 0.82), bodyMat);
        shell.position.y = 0.52;
        shell.castShadow = true;
        car.add(shell);

        // Dark panoramic window band
        const winBand = new THREE.Mesh(
          new THREE.BoxGeometry(carLength + 0.02, 0.44, 0.84),
          windowMat
        );
        winBand.position.y = 0.58;
        car.add(winBand);

        // Orange double-door accent module
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.72, 0.85),
          orangeDoorMat
        );
        door.position.set(0.25, 0.48, 0);
        car.add(door);

        // Roof battery pack
        const roofPack = new THREE.Mesh(
          new THREE.BoxGeometry(carLength * 0.75, 0.12, 0.58),
          roofTrimMat
        );
        roofPack.position.y = 1.02;
        car.add(roofPack);

        // Headlights on front/rear car
        if (i === carCount - 1) {
          const headLight = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.14, 0.65),
            new THREE.MeshBasicMaterial({ color: '#FFF4D6' })
          );
          headLight.position.set(carLength / 2 + 0.02, 0.32, 0);
          car.add(headLight);
        }

        car.position.x = offsetX;
        tramGroup.add(car);
      }

      return tramGroup;
    };

    const tram1 = createArticulatedTram(2); // Left mid-ground tram
    const tram2 = createArticulatedTram(3); // Center articulated tram
    const tram3 = createArticulatedTram(3); // Foreground right articulated tram
    scene.add(tram1, tram2, tram3);

    // Commuter Energy Pulse Particles along Tracks
    const pulseGeo = new THREE.BufferGeometry();
    const pulseCount = 90;
    const pulsePositions = new Float32Array(pulseCount * 3);
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    const pulseMat = new THREE.PointsMaterial({
      color: '#F26522',
      size: 0.28,
      transparent: true,
      opacity: 0.85,
    });
    const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
    scene.add(pulsePoints);

    // Animation Loop
    let clock = new THREE.Clock();
    let animId = 0;

    const placeTramOnCurve = (
      tram: THREE.Group,
      curve: THREE.CatmullRomCurve3,
      t: number
    ) => {
      const clampedT = ((t % 1) + 1) % 1;
      const pos = curve.getPointAt(clampedT);
      const tangent = curve.getTangentAt(clampedT).normalize();
      tram.position.copy(pos);
      const angle = Math.atan2(-tangent.z, tangent.x);
      tram.rotation.y = angle;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle motion along the tracks centered around their signature composition positions
      const t1 = 0.27 + Math.sin(elapsed * 0.22) * 0.045;
      const t2 = 0.56 + Math.sin(elapsed * 0.18 + 1.2) * 0.05;
      const t3 = 0.84 + Math.cos(elapsed * 0.2) * 0.04;

      placeTramOnCurve(tram1, trackCurve2, t1);
      placeTramOnCurve(tram2, trackCurve2, t2);
      placeTramOnCurve(tram3, trackCurve1, t3);

      // Update commuter flow particles
      const posAttr = pulseGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pulseCount; i++) {
        const pt = ((i / pulseCount + elapsed * 0.08) % 1);
        const curve = i % 2 === 0 ? trackCurve1 : trackCurve2;
        const p = curve.getPointAt(pt);
        posAttr.setXYZ(i, p.x, p.y + 0.18, p.z);
      }
      posAttr.needsUpdate = true;

      camera.lookAt(targetLookAtRef.current);
      renderer.render(scene, camera);

      // Project 3D pins to 2D viewport overlay coordinates
      const rect = container.getBoundingClientRect();
      const updatedPins: ProjectedPin[] = HUB_PINS.map((pin) => {
        const v = new THREE.Vector3(...pin.worldPos);
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-(v.y * 0.5) + 0.5) * rect.height;
        return {
          ...pin,
          x,
          y,
          visible: v.z < 1,
        };
      });
      setProjectedPins(updatedPins);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  // React to navigation tab, camera preset, zoom, isometric mode, and render layer changes
  useEffect(() => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    const presets: Record<string, { pos: [number, number, number]; look: [number, number, number] }> = {
      Home: { pos: [-2.5, 5.4, 24.5], look: [0, 1.8, -1.5] },
      'City Mobility': { pos: [-9.5, 6.2, 18.5], look: [-2.5, 1.5, 1.0] },
      'Energy Hubs': { pos: [8.8, 5.8, 19.2], look: [6.5, 2.0, -2.0] },
      'Our Progress': { pos: [0.0, 9.5, 22.0], look: [0, 1.5, -3.5] },
      'Better Journeys': { pos: [4.5, 4.2, 16.8], look: [1.2, 2.0, -2.5] },
    };

    const dotOverrides: Array<{ pos: [number, number, number]; look: [number, number, number] }> = [
      presets[activeSection] || presets.Home,
      { pos: [-11.2, 5.2, 19.8], look: [-4.5, 2.2, -2.5] },
      { pos: [11.5, 5.6, 19.5], look: [5.5, 2.1, -2.0] },
    ];

    const chosen = dotOverrides[cameraPreset] || presets[activeSection] || presets.Home;
    const zoomFactor = Math.max(0.62, 1 - zoomLevel * 0.14);
    const isoElevation = isometricMode ? 7.5 : 0;

    gsap.to(camera.position, {
      x: chosen.pos[0] * zoomFactor,
      y: (chosen.pos[1] + isoElevation) * zoomFactor,
      z: chosen.pos[2] * zoomFactor,
      duration: 1.35,
      ease: 'power3.out',
    });

    gsap.to(targetLookAtRef.current, {
      x: chosen.look[0],
      y: chosen.look[1],
      z: chosen.look[2],
      duration: 1.35,
      ease: 'power3.out',
    });

    if (renderLayer === 'energy') {
      scene.fog = new THREE.FogExp2('#2A313A', 0.018);
      scene.background = new THREE.Color('#252C34');
    } else if (renderLayer === 'lidar') {
      scene.fog = new THREE.FogExp2('#6E7A86', 0.016);
      scene.background = new THREE.Color('#778390');
    } else {
      scene.fog = new THREE.FogExp2('#A4ADB7', 0.0155);
      scene.background = new THREE.Color('#9FA8B2');
    }
  }, [activeSection, cameraPreset, zoomLevel, isometricMode, renderLayer, showCommuterFlow]);

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* 3D Projected Orange Interactive Hub Pins matching the reference video */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {projectedPins.map((pin) => {
          if (!pin.visible) return null;
          const isSelected = selectedPinId === pin.id;
          return (
            <button
              key={pin.id}
              type="button"
              onClick={() => onSelectPin(pin)}
              style={{
                transform: `translate3d(${pin.x}px, ${pin.y}px, 0) translate(-50%, -50%)`,
              }}
              aria-label={pin.title}
              className={`pointer-events-auto absolute left-0 top-0 group transition-transform duration-200 ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
              }`}
            >
              {pin.type === 'pin' ? (
                <div className="relative flex items-center justify-center">
                  <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14C0 23.2 14 34 14 34C14 34 28 23.2 28 14C28 6.268 21.732 0 14 0Z"
                      fill="#F26522"
                    />
                    <circle cx="14" cy="13" r="4.2" fill="#FFFFFF" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#F26522] text-white shadow-lg shadow-[#F26522]/40 flex items-center justify-center border border-white/30">
                  {pin.type === 'bike' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="5.5" cy="17.5" r="3.5" />
                      <circle cx="18.5" cy="17.5" r="3.5" />
                      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                    </svg>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
