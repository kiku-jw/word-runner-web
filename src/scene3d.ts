import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from "three";

import type { Side } from "./types";

const TRACK_SEGMENT_LENGTH = 12;
const TRACK_SEGMENT_COUNT = 11;
const TRACK_SPAN = TRACK_SEGMENT_LENGTH * TRACK_SEGMENT_COUNT;
const LANE_X: Record<Side, number> = { left: -2.15, right: 2.15 };

export interface RunnerSceneQuestion {
  runId: string;
  runSeed: number;
  questionIndex: number;
  id: string;
  leftLabel: string;
  rightLabel: string;
  selectedSide: Side | null;
  correctSide: Side;
  correctStreak: number;
  result: "correct" | "incorrect" | null;
}

export type RunnerReaction =
  | "none"
  | "correct"
  | "stumble"
  | "backpack"
  | "gate"
  | "rocket";

export interface RunnerPerformanceSample {
  fps: number;
  drawCalls: number;
  pixelRatio: number;
}

export interface RunnerSceneSnapshot extends RunnerPerformanceSample {
  ready: boolean;
  visible: boolean;
  questionId: string | null;
  lane: "center" | Side;
  gateZ: number;
  frameCount: number;
  reducedMotion: boolean;
  reaction: RunnerReaction;
  gateResponse: "approaching" | "opening" | "blocked" | "cleared";
  doorOpen: number;
  runnerLean: number;
  worldSpeed: number;
  backgroundGagVisible: boolean;
  backgroundGagQuestionIndex: number;
}

export interface RunnerSceneController {
  show(reducedMotion: boolean): void;
  hide(): void;
  attract(): void;
  sync(question: RunnerSceneQuestion): void;
  snapshot(): RunnerSceneSnapshot;
  dispose(): void;
}

interface RunnerSceneOptions {
  anchor: HTMLElement;
  onPerformanceSample(sample: RunnerPerformanceSample): void;
}

interface RunnerRig {
  group: Group;
  leftArm: Group;
  rightArm: Group;
  leftLeg: Group;
  rightLeg: Group;
  backpack: Mesh;
  rocketFlame: Mesh;
}

interface GateRig {
  group: Group;
  leftLane: Group;
  rightLane: Group;
  leftDoor: Mesh;
  rightDoor: Mesh;
  leftFrame: MeshStandardMaterial;
  rightFrame: MeshStandardMaterial;
  leftPanel: MeshStandardMaterial;
  rightPanel: MeshStandardMaterial;
}

interface BackgroundGagRig {
  group: Group;
}

const INCORRECT_REACTIONS = ["stumble", "backpack", "gate"] as const;

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function incorrectReactionForQuestionId(
  questionId: string,
): (typeof INCORRECT_REACTIONS)[number] {
  return INCORRECT_REACTIONS[stableHash(questionId) % INCORRECT_REACTIONS.length] ?? "stumble";
}

export function backgroundGagQuestionIndex(runSeed: number): number {
  return 2 + ((runSeed >>> 0) % 5);
}

export function cappedPixelRatio(
  devicePixelRatio: number,
  compactViewport: boolean,
): number {
  const safeRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(1, devicePixelRatio)
    : 1;
  return Math.min(safeRatio, compactViewport ? 1.25 : 1.5);
}

function createLimb(
  material: MeshStandardMaterial,
  length: number,
  radius: number,
): Group {
  const pivot = new Group();
  const limb = new Mesh(
    new CylinderGeometry(radius, radius * 0.9, length, 8),
    material,
  );
  limb.position.y = -length / 2;
  pivot.add(limb);
  return pivot;
}

function createRunner(): RunnerRig {
  const group = new Group();
  group.position.set(0, 0.04, 3.4);
  group.scale.setScalar(0.78);

  const blue = new MeshStandardMaterial({
    color: 0x116fd1,
    roughness: 0.62,
    metalness: 0.04,
  });
  const yellow = new MeshStandardMaterial({
    color: 0xf4c430,
    roughness: 0.58,
    metalness: 0.04,
  });
  const skin = new MeshStandardMaterial({
    color: 0xe3a06d,
    roughness: 0.8,
  });
  const hair = new MeshStandardMaterial({
    color: 0x4c2e26,
    roughness: 0.92,
  });
  const shoe = new MeshStandardMaterial({
    color: 0xf3f7fa,
    roughness: 0.56,
  });

  const body = new Mesh(new CapsuleGeometry(0.42, 0.92, 6, 12), blue);
  body.position.y = 1.72;
  group.add(body);

  const backpack = new Mesh(new CapsuleGeometry(0.34, 0.52, 5, 10), yellow);
  backpack.position.set(0, 1.69, 0.38);
  backpack.scale.set(1, 1, 0.5);
  group.add(backpack);

  const rocketFlame = new Mesh(
    new ConeGeometry(0.22, 0.78, 8),
    new MeshStandardMaterial({
      color: 0xffa526,
      emissive: 0xff5a1f,
      emissiveIntensity: 1.15,
      roughness: 0.45,
    }),
  );
  rocketFlame.position.set(0, 1.08, 0.43);
  rocketFlame.rotation.z = Math.PI;
  rocketFlame.visible = false;
  group.add(rocketFlame);

  const head = new Mesh(new SphereGeometry(0.43, 16, 12), skin);
  head.position.y = 2.83;
  group.add(head);

  const hairCap = new Mesh(
    new SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  );
  hairCap.position.set(0, 2.99, 0.03);
  group.add(hairCap);

  const leftArm = createLimb(skin, 0.78, 0.105);
  leftArm.position.set(-0.51, 2.04, 0);
  leftArm.rotation.z = -0.12;
  const leftHand = new Mesh(new SphereGeometry(0.14, 10, 8), skin);
  leftHand.position.y = -0.78;
  leftArm.add(leftHand);
  group.add(leftArm);

  const rightArm = createLimb(skin, 0.78, 0.105);
  rightArm.position.set(0.51, 2.04, 0);
  rightArm.rotation.z = 0.12;
  const rightHand = new Mesh(new SphereGeometry(0.14, 10, 8), skin);
  rightHand.position.y = -0.78;
  rightArm.add(rightHand);
  group.add(rightArm);

  const leftLeg = createLimb(blue, 1.08, 0.15);
  leftLeg.position.set(-0.24, 1.18, 0);
  group.add(leftLeg);

  const rightLeg = createLimb(blue, 1.08, 0.15);
  rightLeg.position.set(0.24, 1.18, 0);
  group.add(rightLeg);

  const leftShoe = new Mesh(new BoxGeometry(0.34, 0.18, 0.62), shoe);
  leftShoe.position.set(0, -1.06, -0.16);
  leftLeg.add(leftShoe);

  const rightShoe = new Mesh(new BoxGeometry(0.34, 0.18, 0.62), shoe);
  rightShoe.position.set(0, -1.06, -0.16);
  rightLeg.add(rightShoe);

  const shadow = new Mesh(
    new CircleGeometry(0.75, 24),
    new MeshBasicMaterial({ color: 0x07172e, transparent: true, opacity: 0.24 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.015;
  shadow.scale.set(1.15, 1.7, 1);
  group.add(shadow);

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    backpack,
    rocketFlame,
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
  );
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function labelTexture(label: string, color: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 520;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "#082c57");
  roundedRect(context, 14, 14, 740, 492, 42);
  context.fillStyle = gradient;
  context.fill();
  context.lineWidth = 12;
  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.stroke();

  const normalized = label.toLocaleUpperCase("en-US");
  const fontSize = normalized.length > 10 ? 92 : normalized.length > 7 ? 114 : 142;
  context.font = `900 ${fontSize}px "Avenir Next Rounded", "Trebuchet MS", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 14;
  context.strokeStyle = "rgba(3,20,47,0.56)";
  context.strokeText(normalized, canvas.width / 2, canvas.height / 2 + 8);
  context.fillStyle = "#f8fbff";
  context.fillText(normalized, canvas.width / 2, canvas.height / 2 + 8);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createGateLane(
  x: number,
  frameMaterial: MeshStandardMaterial,
  panelMaterial: MeshStandardMaterial,
): { group: Group; door: Mesh } {
  const lane = new Group();
  lane.position.x = x;

  const postGeometry = new BoxGeometry(0.28, 3.15, 0.45);
  const leftPost = new Mesh(postGeometry, frameMaterial);
  leftPost.position.set(-1.7, 1.58, 0);
  lane.add(leftPost);
  const rightPost = new Mesh(postGeometry, frameMaterial);
  rightPost.position.set(1.7, 1.58, 0);
  lane.add(rightPost);

  const beam = new Mesh(new BoxGeometry(3.68, 0.38, 0.48), frameMaterial);
  beam.position.y = 3.12;
  lane.add(beam);

  const panel = new Mesh(new PlaneGeometry(3.15, 2.15), panelMaterial);
  panel.position.set(0, 1.48, 0.26);
  lane.add(panel);
  return { group: lane, door: panel };
}

function createGate(): GateRig {
  const group = new Group();
  group.position.set(0, 0, -25);

  const leftFrame = new MeshStandardMaterial({
    color: 0x188be1,
    emissive: 0x073961,
    emissiveIntensity: 0.45,
    roughness: 0.38,
    metalness: 0.22,
  });
  const rightFrame = new MeshStandardMaterial({
    color: 0xee704d,
    emissive: 0x5f1f16,
    emissiveIntensity: 0.42,
    roughness: 0.4,
    metalness: 0.18,
  });
  const leftPanel = new MeshStandardMaterial({
    map: labelTexture("LEFT", "#168fe2"),
    transparent: true,
    roughness: 0.48,
  });
  const rightPanel = new MeshStandardMaterial({
    map: labelTexture("RIGHT", "#e96c4a"),
    transparent: true,
    roughness: 0.48,
  });

  const leftLane = createGateLane(-2.15, leftFrame, leftPanel);
  const rightLane = createGateLane(2.15, rightFrame, rightPanel);
  group.add(leftLane.group);
  group.add(rightLane.group);
  return {
    group,
    leftLane: leftLane.group,
    rightLane: rightLane.group,
    leftDoor: leftLane.door,
    rightDoor: rightLane.door,
    leftFrame,
    rightFrame,
    leftPanel,
    rightPanel,
  };
}

function replacePanelTexture(
  material: MeshStandardMaterial,
  label: string,
  color: string,
): void {
  material.map?.dispose();
  material.map = labelTexture(label, color);
  material.needsUpdate = true;
}

function createTrack(scene: Scene): Mesh[] {
  const markers: Mesh[] = [];
  const roadMaterial = new MeshStandardMaterial({
    color: 0xe8c98b,
    roughness: 0.92,
  });
  const edgeMaterial = new MeshStandardMaterial({
    color: 0xf3c847,
    roughness: 0.66,
  });
  const markerMaterial = new MeshStandardMaterial({
    color: 0xf8f5df,
    roughness: 0.8,
  });

  const trackLength = TRACK_SPAN + 28;
  const trackCenterZ = 16 - trackLength / 2;
  const road = new Mesh(new BoxGeometry(8.8, 0.18, trackLength), roadMaterial);
  road.position.set(0, -0.11, trackCenterZ);
  scene.add(road);

  for (const edgeX of [-4.45, 4.45]) {
    const edge = new Mesh(
      new BoxGeometry(0.16, 0.14, trackLength),
      edgeMaterial,
    );
    edge.position.set(edgeX, 0.02, trackCenterZ);
    scene.add(edge);
  }

  const markerGeometry = new BoxGeometry(0.12, 0.04, 2.5);
  for (let index = 0; index < TRACK_SEGMENT_COUNT; index += 1) {
    const marker = new Mesh(markerGeometry, markerMaterial);
    marker.position.set(0, 0.025, 8 - index * TRACK_SEGMENT_LENGTH);
    scene.add(marker);
    markers.push(marker);
  }
  return markers;
}

function createTree(index: number): Group {
  const tree = new Group();
  const side = index % 2 === 0 ? -1 : 1;
  const lane = Math.floor(index / 2) % 3;
  tree.position.set(
    side * (6.1 + lane * 1.25),
    0,
    7 - Math.floor(index / 2) * 8.2,
  );
  const scale = 0.72 + ((index * 37) % 7) * 0.075;
  tree.scale.setScalar(scale);

  const trunk = new Mesh(
    new CylinderGeometry(0.14, 0.2, 1.25, 7),
    new MeshStandardMaterial({ color: 0x76503a, roughness: 0.95 }),
  );
  trunk.position.y = 0.62;
  tree.add(trunk);

  const crownMaterial = new MeshStandardMaterial({
    color: index % 3 === 0 ? 0x2f8c46 : 0x3aa75a,
    roughness: 0.88,
  });
  const lower = new Mesh(new ConeGeometry(0.88, 1.8, 8), crownMaterial);
  lower.position.y = 1.7;
  tree.add(lower);
  const upper = new Mesh(new ConeGeometry(0.64, 1.45, 8), crownMaterial);
  upper.position.y = 2.55;
  tree.add(upper);
  return tree;
}

function addEnvironment(scene: Scene): Group[] {
  const ground = new Mesh(
    new PlaneGeometry(90, 180),
    new MeshStandardMaterial({ color: 0x67ad56, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.22, -45);
  scene.add(ground);

  const waterMaterial = new MeshStandardMaterial({
    color: 0x2fa9dc,
    emissive: 0x0b4563,
    emissiveIntensity: 0.22,
    roughness: 0.28,
    metalness: 0.08,
  });
  for (const x of [-7.8, 7.8]) {
    const water = new Mesh(new PlaneGeometry(4.8, 170), waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, -0.17, -40);
    scene.add(water);
  }

  const mountainMaterial = new MeshStandardMaterial({
    color: 0x477fb0,
    roughness: 1,
  });
  for (let index = 0; index < 9; index += 1) {
    const mountain = new Mesh(
      new ConeGeometry(7 + (index % 3) * 2.2, 14 + (index % 4) * 2.5, 5),
      mountainMaterial,
    );
    const side = index % 2 === 0 ? -1 : 1;
    mountain.position.set(side * (12 + (index % 3) * 8), 5.6, -58 - index * 4);
    mountain.rotation.y = index * 0.72;
    scene.add(mountain);
  }

  const trees = Array.from({ length: 20 }, (_, index) => createTree(index));
  for (const tree of trees) {
    scene.add(tree);
  }
  return trees;
}

function createSpeedLines(): Points {
  const count = 42;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = ((index * 43) % 100) / 10 - 5;
    positions[index * 3 + 1] = 0.3 + ((index * 29) % 48) / 10;
    positions[index * 3 + 2] = -4 - ((index * 61) % 700) / 10;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const material = new PointsMaterial({
    color: 0xf8fbff,
    size: 0.065,
    transparent: true,
    opacity: 0.4,
  });
  return new Points(geometry, material);
}

function createFeedbackPulse(): Mesh<TorusGeometry, MeshBasicMaterial> {
  const material = new MeshBasicMaterial({
    color: 0xb7e63f,
    transparent: true,
    opacity: 0,
  });
  const pulse = new Mesh(new TorusGeometry(1.3, 0.12, 10, 40), material);
  pulse.position.set(0, 2.1, -7.7);
  pulse.visible = false;
  return pulse;
}

function createBackgroundGag(): BackgroundGagRig {
  const group = new Group();
  group.visible = false;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }
  context.lineWidth = 12;
  context.lineJoin = "round";
  context.strokeStyle = "#14254a";

  context.fillStyle = "#e44848";
  context.beginPath();
  context.moveTo(205, 112);
  context.lineTo(55, 55);
  context.lineTo(92, 205);
  context.lineTo(224, 168);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#fff5db";
  context.beginPath();
  context.ellipse(277, 145, 122, 66, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#ffd34f";
  context.beginPath();
  context.ellipse(260, 150, 62, 34, -0.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#fff5db";
  context.beginPath();
  context.arc(382, 94, 48, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#3193dc";
  context.beginPath();
  context.ellipse(395, 85, 35, 20, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#13213d";
  context.beginPath();
  context.arc(408, 82, 7, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff922f";
  context.beginPath();
  context.moveTo(425, 104);
  context.lineTo(495, 121);
  context.lineTo(426, 137);
  context.closePath();
  context.fill();
  context.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const bird = new Mesh(
    new PlaneGeometry(2.4, 1.2),
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  group.add(bird);
  group.scale.setScalar(1.2);
  return { group };
}

function disposeScene(scene: Scene): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshBasicMaterial | MeshStandardMaterial | PointsMaterial>();
  scene.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of objectMaterials) {
        if (
          material instanceof MeshBasicMaterial ||
          material instanceof MeshStandardMaterial ||
          material instanceof PointsMaterial
        ) {
          materials.add(material);
        }
      }
    }
  });
  for (const geometry of geometries) {
    geometry.dispose();
  }
  for (const material of materials) {
    if (
      material instanceof MeshStandardMaterial ||
      material instanceof MeshBasicMaterial
    ) {
      material.map?.dispose();
    }
    material.dispose();
  }
}

export function createRunnerScene(
  options: RunnerSceneOptions,
): RunnerSceneController | null {
  const renderCanvas = document.createElement("canvas");
  const context = renderCanvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
  });
  if (context === null) {
    return null;
  }
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: renderCanvas,
      context,
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  const canvas = renderer.domElement;
  canvas.className = "runner-canvas";
  canvas.dataset.testid = "runner-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  options.anchor.before(canvas);

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x59b9ea, 1);

  const scene = new Scene();
  scene.background = new Color(0x59b9ea);
  scene.fog = new Fog(0x8fd5ef, 28, 92);

  const camera = new PerspectiveCamera(53, 1, 0.1, 130);
  camera.position.set(0, 6.15, 13.8);
  camera.lookAt(0, 1.45, -13.5);

  scene.add(new HemisphereLight(0xd8f1ff, 0x365d2f, 2.25));
  const sun = new DirectionalLight(0xfff2ce, 2.5);
  sun.position.set(-8, 18, 8);
  scene.add(sun);

  const trackMarkers = createTrack(scene);
  const trees = addEnvironment(scene);
  const runner = createRunner();
  scene.add(runner.group);
  const gate = createGate();
  scene.add(gate.group);
  const speedLines = createSpeedLines();
  scene.add(speedLines);
  const pulse = createFeedbackPulse();
  scene.add(pulse);
  const backgroundGag = createBackgroundGag();
  scene.add(backgroundGag.group);

  let visible = false;
  let disposed = false;
  let reducedMotion = false;
  let questionId: string | null = null;
  let selectedSide: Side | null = null;
  let result: RunnerSceneQuestion["result"] = null;
  let correctSide: Side = "left";
  let activeReaction: RunnerReaction = "none";
  let incorrectReaction: (typeof INCORRECT_REACTIONS)[number] = "stumble";
  let scheduledBackgroundGagQuestionIndex = backgroundGagQuestionIndex(0);
  let backgroundGagActive = false;
  let backgroundGagAge = 0;
  let targetLaneX = 0;
  let runnerLean = 0;
  let gateZ = -25;
  let gateResponse: RunnerSceneSnapshot["gateResponse"] = "approaching";
  let doorOpen = 0;
  let currentCorrectStreak = 0;
  let currentWorldSpeed = 8.8;
  let lastTime = 0;
  let elapsed = 0;
  let frameCount = 0;
  let sampleElapsed = 0;
  let sampleFrames = 0;
  let measuredFps = 0;
  let performanceReported = false;
  let performanceRunId: string | null = null;
  let pulseAge = 0;

  const compactViewport = (): boolean => window.innerWidth <= 700;

  function resize(): void {
    if (disposed) {
      return;
    }
    const width = Math.min(window.innerWidth, 600);
    const height = window.visualViewport?.height ?? window.innerHeight;
    const pixelRatio = cappedPixelRatio(window.devicePixelRatio, compactViewport());
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function setFrameResult(): void {
    const idleLeft = 0x188be1;
    const idleRight = 0xee704d;
    if (selectedSide === null || result === null) {
      gate.leftFrame.color.setHex(idleLeft);
      gate.rightFrame.color.setHex(idleRight);
      return;
    }
    const success = 0x69b83f;
    const correction = 0xd94b46;
    gate.leftFrame.color.setHex(
      correctSide === "left" ? success : selectedSide === "left" ? correction : idleLeft,
    );
    gate.rightFrame.color.setHex(
      correctSide === "right" ? success : selectedSide === "right" ? correction : idleRight,
    );
  }

  function animate(time: number): void {
    if (!visible || disposed) {
      return;
    }
    const delta = lastTime === 0 ? 1 / 60 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    elapsed += delta;
    frameCount += 1;
    sampleElapsed += delta;
    sampleFrames += 1;

    if (selectedSide !== null && result !== null) {
      pulseAge += delta;
    }
    const reactionProgress = Math.min(1, pulseAge / 0.72);
    const reactionWave = reducedMotion ? 0 : Math.sin(reactionProgress * Math.PI);
    const reactionEnergy = Math.max(0, 1 - reactionProgress);
    const streakBoost = reducedMotion ? 0 : Math.min(currentCorrectStreak, 4) * 0.48;
    const answerBoost = result === "correct" ? reactionEnergy * 2.4 : 0;
    const wrongBrake = result === "incorrect" ? reactionEnergy * 5.2 : 0;
    const baseWorldSpeed = reducedMotion ? 3.2 : 8.8 + streakBoost;
    currentWorldSpeed = Math.max(reducedMotion ? 1.7 : 4.2, baseWorldSpeed + answerBoost - wrongBrake);
    const worldSpeed = currentWorldSpeed;
    for (const marker of trackMarkers) {
      marker.position.z += worldSpeed * delta;
      if (marker.position.z > 16) {
        marker.position.z -= TRACK_SPAN;
      }
    }
    for (const tree of trees) {
      tree.position.z += worldSpeed * delta;
      if (tree.position.z > 18) {
        tree.position.z -= 116;
      }
    }

    const speedPositions = speedLines.geometry.getAttribute("position");
    for (let index = 0; index < speedPositions.count; index += 1) {
      const z = speedPositions.getZ(index) + worldSpeed * delta * 1.45;
      speedPositions.setZ(index, z > 9 ? z - 78 : z);
    }
    speedPositions.needsUpdate = true;
    (speedLines.material as PointsMaterial).opacity = reducedMotion
      ? 0.08
      : 0.3 + Math.min(currentCorrectStreak, 4) * 0.045 + reactionEnergy * 0.08;

    if (selectedSide === null) {
      // Keep the decision cadence stable while reducing only decorative motion.
      gateZ = Math.min(-6.8, gateZ + 14 * delta);
      gateResponse = "approaching";
    } else if (result === "incorrect") {
      gateZ = Math.min(1.55, gateZ + (reducedMotion ? 16 : 22) * delta);
      gateResponse = "blocked";
    } else {
      gateZ += (reducedMotion ? 14 : 24) * delta;
      gateResponse = reactionProgress < 1 ? "opening" : "cleared";
    }
    gate.group.position.z = gateZ;

    const previousRunnerX = runner.group.position.x;
    runner.group.position.x = MathUtils.damp(
      runner.group.position.x,
      targetLaneX,
      reducedMotion ? 12 : 8.5,
      delta,
    );
    const lateralSpeed = (runner.group.position.x - previousRunnerX) / Math.max(delta, 0.001);
    runnerLean = MathUtils.damp(
      runnerLean,
      reducedMotion ? 0 : MathUtils.clamp(-lateralSpeed * 0.032, -0.26, 0.26),
      12,
      delta,
    );

    const strideRate = 13.5 + Math.min(currentCorrectStreak, 4) * 0.62;
    const stridePhase = elapsed * strideRate;
    const stride = reducedMotion ? 0.08 : Math.sin(stridePhase) * 0.78;
    runner.leftArm.rotation.x = stride;
    runner.rightArm.rotation.x = -stride;
    runner.leftLeg.rotation.x = -stride * 0.78;
    runner.rightLeg.rotation.x = stride * 0.78;
    runner.leftArm.rotation.z = -0.12;
    runner.rightArm.rotation.z = 0.12;
    runner.group.rotation.z = runnerLean;
    runner.group.rotation.y = -runnerLean * 0.65;
    runner.group.position.z = 3.4;
    const runningSquash = reducedMotion ? 0 : Math.abs(Math.sin(stridePhase)) * 0.025;
    runner.group.scale.set(0.78 + runningSquash * 0.35, 0.78 - runningSquash, 0.78);
    runner.backpack.position.set(0, 1.69, 0.38);
    runner.backpack.rotation.set(0, 0, 0);
    runner.rocketFlame.visible = false;
    runner.rocketFlame.position.set(0, 1.08, 0.43);
    runner.rocketFlame.scale.setScalar(1);
    gate.leftLane.position.y = 0;
    gate.rightLane.position.y = 0;
    gate.leftLane.rotation.z = 0;
    gate.rightLane.rotation.z = 0;
    gate.leftDoor.position.set(0, 1.48, 0.26);
    gate.rightDoor.position.set(0, 1.48, 0.26);
    gate.leftDoor.scale.set(1, 1, 1);
    gate.rightDoor.scale.set(1, 1, 1);
    gate.leftDoor.rotation.set(0, 0, 0);
    gate.rightDoor.rotation.set(0, 0, 0);
    gate.leftPanel.opacity = 1;
    gate.rightPanel.opacity = 1;

    if (backgroundGagActive) {
      backgroundGagAge += delta;
      if (backgroundGagAge >= 1.85) {
        backgroundGagActive = false;
        backgroundGag.group.visible = false;
      }
    }
    if (backgroundGagActive) {
      backgroundGag.group.visible = true;
      if (reducedMotion) {
        backgroundGag.group.position.set(-5.6, 4.75, -12.2);
        backgroundGag.group.rotation.z = -0.16;
      } else {
        const progress = Math.min(1, backgroundGagAge / 1.45);
        backgroundGag.group.position.set(
          MathUtils.lerp(-7.6, 7.4, progress),
          4.6 + Math.sin(progress * Math.PI) * 1.35,
          -12.2 + Math.cos(progress * Math.PI) * 0.8,
        );
        backgroundGag.group.rotation.z =
          Math.sin(progress * Math.PI * 3.4) * 0.14;
      }
    } else {
      backgroundGag.group.visible = false;
    }

    doorOpen = 0;
    if (selectedSide !== null && result === "correct") {
      doorOpen = MathUtils.smoothstep(reactionProgress, 0.05, 0.72);
      const selectedDoor = selectedSide === "left" ? gate.leftDoor : gate.rightDoor;
      const direction = selectedSide === "left" ? -1 : 1;
      selectedDoor.position.x = direction * doorOpen * 1.42;
      selectedDoor.rotation.y = -direction * doorOpen * 0.68;
      selectedDoor.scale.x = Math.max(0.08, 1 - doorOpen * 0.88);
      (selectedDoor.material as MeshStandardMaterial).opacity = 1 - doorOpen * 0.12;
    } else if (selectedSide !== null && result === "incorrect") {
      const selectedDoor = selectedSide === "left" ? gate.leftDoor : gate.rightDoor;
      selectedDoor.position.z += reactionWave * 0.58;
      selectedDoor.scale.setScalar(1 + reactionWave * 0.045);
      selectedDoor.rotation.z =
        Math.sin(reactionProgress * Math.PI * 5) * (1 - reactionProgress) * 0.055;
    }
    let reactionY = 0;
    if (result === "correct" && reactionProgress < 1) {
      const rocketBoost = activeReaction === "rocket";
      reactionY = rocketBoost
        ? reducedMotion
          ? 1.05
          : reactionWave * 1.75
        : reactionWave * 0.34;
      runner.leftArm.rotation.z -= reactionWave * (rocketBoost ? 1.9 : 1.6);
      runner.rightArm.rotation.z += reactionWave * (rocketBoost ? 1.9 : 1.6);
      if (rocketBoost) {
        runner.group.position.z += reactionWave * 0.12;
        runner.backpack.position.y -= reactionWave * 0.07;
        runner.backpack.rotation.z =
          Math.sin(reactionProgress * Math.PI * 10) * (1 - reactionProgress) * 0.12;
        runner.rocketFlame.visible = true;
        runner.rocketFlame.position.z = 0.43 + reactionWave * 0.08;
        runner.rocketFlame.scale.setScalar(
          reducedMotion ? 1.35 : 0.82 + reactionWave * 0.95,
        );
      }
    } else if (result === "incorrect" && reactionProgress < 1) {
      reactionY = -reactionWave * 0.08;
      if (activeReaction === "stumble") {
        runner.group.rotation.z =
          Math.sin(reactionProgress * Math.PI * 3) * (1 - reactionProgress) * 0.2;
        runner.group.position.z -= reactionWave * 0.22;
        runner.leftArm.rotation.z -= reactionWave * 0.48;
        runner.rightArm.rotation.z += reactionWave * 0.32;
      } else if (activeReaction === "backpack") {
        reactionY = -reactionWave * 0.04;
        runner.group.rotation.z =
          Math.sin(reactionProgress * Math.PI * 2.6) * (1 - reactionProgress) * 0.09;
        runner.backpack.position.y += reactionWave * 0.24;
        runner.backpack.rotation.z =
          Math.sin(reactionProgress * Math.PI * 8) * (1 - reactionProgress) * 0.4;
        runner.leftArm.rotation.z += reactionWave * 0.12;
        runner.rightArm.rotation.z -= reactionWave * 0.08;
      } else if (activeReaction === "gate" && selectedSide !== null) {
        const chosenGate = selectedSide === "left" ? gate.leftLane : gate.rightLane;
        chosenGate.position.y += reactionWave * 0.26;
        chosenGate.rotation.z =
          Math.sin(reactionProgress * Math.PI * 4) *
          (1 - reactionProgress) *
          0.16 *
          (selectedSide === "left" ? -1 : 1);
        runner.leftArm.rotation.z -= reactionWave * 0.2;
        runner.rightArm.rotation.z += reactionWave * 0.2;
      }
    }
    runner.group.position.y =
      0.04 +
      (reducedMotion ? 0 : Math.abs(Math.sin(stridePhase)) * 0.075) +
      reactionY;

    const wrongShake = result === "incorrect" && selectedSide !== null && !reducedMotion
      ? Math.sin(elapsed * 58) * Math.max(0, 1 - pulseAge / 0.55) * 0.13
      : 0;
    const correctPunch = result === "correct" && !reducedMotion ? reactionWave : 0;
    camera.position.x = runner.group.position.x * 0.08 + wrongShake;
    camera.position.y = 6.15 + (reducedMotion ? 0 : Math.sin(elapsed * 3.2) * 0.035);
    camera.position.z = 13.8 - correctPunch * 0.42;
    const targetFov = reducedMotion ? 53 : 53 + Math.max(0, worldSpeed - 8.8) * 0.72;
    const nextFov = MathUtils.damp(camera.fov, targetFov, 8, delta);
    if (Math.abs(nextFov - camera.fov) > 0.005) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(runner.group.position.x * 0.15, 1.45, -13.5);

    if (pulse.visible) {
      const progress = Math.min(1, pulseAge / 0.62);
      pulse.scale.setScalar(0.65 + progress * 2.4);
      pulse.material.opacity = (1 - progress) * 0.82;
      if (progress >= 1) {
        pulse.visible = false;
      }
    }

    renderer.render(scene, camera);

    if (sampleElapsed >= 4) {
      measuredFps = Math.round(sampleFrames / sampleElapsed);
      if (!performanceReported) {
        performanceReported = true;
        options.onPerformanceSample({
          fps: measuredFps,
          drawCalls: renderer.info.render.calls,
          pixelRatio: renderer.getPixelRatio(),
        });
      }
      sampleElapsed = 0;
      sampleFrames = 0;
    }
  }

  const controller: RunnerSceneController = {
    show(nextReducedMotion) {
      if (disposed) {
        return;
      }
      reducedMotion = nextReducedMotion;
      visible = true;
      canvas.hidden = false;
      canvas.classList.add("is-visible");
      document.documentElement.classList.add("webgl-capable");
      resize();
      lastTime = 0;
      renderer.setAnimationLoop(animate);
    },

    hide() {
      visible = false;
      canvas.classList.remove("is-visible");
      canvas.hidden = true;
      renderer.setAnimationLoop(null);
    },

    attract() {
      questionId = null;
      selectedSide = null;
      result = null;
      activeReaction = "none";
      gateResponse = "approaching";
      doorOpen = 0;
      currentCorrectStreak = 0;
      backgroundGagActive = false;
      targetLaneX = 0;
      gate.group.visible = false;
      pulse.visible = false;
      backgroundGag.group.visible = false;
    },

    sync(question) {
      if (question.runId !== performanceRunId) {
        performanceRunId = question.runId;
        scheduledBackgroundGagQuestionIndex = backgroundGagQuestionIndex(
          question.runSeed,
        );
        performanceReported = false;
        sampleElapsed = 0;
        sampleFrames = 0;
        measuredFps = 0;
      }
      if (question.id !== questionId) {
        questionId = question.id;
        selectedSide = null;
        result = null;
        correctSide = question.correctSide;
        incorrectReaction = incorrectReactionForQuestionId(question.id);
        activeReaction = "none";
        gateResponse = "approaching";
        doorOpen = 0;
        currentCorrectStreak = question.correctStreak;
        backgroundGagActive =
          question.questionIndex === scheduledBackgroundGagQuestionIndex;
        backgroundGagAge = 0;
        targetLaneX = 0;
        gateZ = -25;
        gate.group.visible = true;
        gate.group.position.z = gateZ;
        replacePanelTexture(gate.leftPanel, question.leftLabel, "#168fe2");
        replacePanelTexture(gate.rightPanel, question.rightLabel, "#e96c4a");
        setFrameResult();
      }
      if (question.selectedSide !== selectedSide) {
        selectedSide = question.selectedSide;
        result = question.result;
        correctSide = question.correctSide;
        activeReaction =
          selectedSide === null || result === null
            ? "none"
            : result === "incorrect"
              ? incorrectReaction
              : question.correctStreak === 3
                ? "rocket"
                : "correct";
        currentCorrectStreak = question.correctStreak;
        gateResponse =
          selectedSide === null || result === null
            ? "approaching"
            : result === "incorrect"
              ? "blocked"
              : "opening";
        targetLaneX = selectedSide === null ? 0 : LANE_X[selectedSide];
        setFrameResult();
        if (selectedSide !== null && result !== null) {
          pulseAge = 0;
          pulse.position.x = LANE_X[selectedSide];
          pulse.material.color.setHex(result === "correct" ? 0xb7e63f : 0xef6a5b);
          pulse.visible = !reducedMotion;
        }
      }
    },

    snapshot() {
      return {
        ready: !disposed,
        visible,
        questionId,
        reaction:
          selectedSide !== null && result !== null ? activeReaction : "none",
        gateResponse,
        doorOpen: Math.round(doorOpen * 100) / 100,
        runnerLean: Math.round(runnerLean * 100) / 100,
        worldSpeed: Math.round(currentWorldSpeed * 10) / 10,
        backgroundGagVisible: backgroundGagActive,
        backgroundGagQuestionIndex: scheduledBackgroundGagQuestionIndex,
        lane:
          Math.abs(runner.group.position.x) < 0.25
            ? "center"
            : runner.group.position.x < 0
              ? "left"
              : "right",
        gateZ: Math.round(gateZ * 10) / 10,
        frameCount,
        fps: measuredFps,
        drawCalls: renderer.info.render.calls,
        pixelRatio: renderer.getPixelRatio(),
        reducedMotion,
      };
    },

    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      visible = false;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      document.documentElement.classList.remove("webgl-capable");
    },
  };

  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  resize();
  return controller;
}
