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
  id: string;
  leftLabel: string;
  rightLabel: string;
  selectedSide: Side | null;
  correctSide: Side;
  result: "correct" | "incorrect" | null;
}

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
}

interface GateRig {
  group: Group;
  leftFrame: MeshStandardMaterial;
  rightFrame: MeshStandardMaterial;
  leftPanel: MeshStandardMaterial;
  rightPanel: MeshStandardMaterial;
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
  group.add(leftArm);

  const rightArm = createLimb(skin, 0.78, 0.105);
  rightArm.position.set(0.51, 2.04, 0);
  rightArm.rotation.z = 0.12;
  group.add(rightArm);

  const leftLeg = createLimb(blue, 1.08, 0.15);
  leftLeg.position.set(-0.24, 1.18, 0);
  group.add(leftLeg);

  const rightLeg = createLimb(blue, 1.08, 0.15);
  rightLeg.position.set(0.24, 1.18, 0);
  group.add(rightLeg);

  const leftShoe = new Mesh(new BoxGeometry(0.34, 0.18, 0.62), shoe);
  leftShoe.position.set(-0.24, 0.05, -0.16);
  group.add(leftShoe);

  const rightShoe = new Mesh(new BoxGeometry(0.34, 0.18, 0.62), shoe);
  rightShoe.position.set(0.24, 0.05, -0.16);
  group.add(rightShoe);

  const shadow = new Mesh(
    new CircleGeometry(0.75, 24),
    new MeshBasicMaterial({ color: 0x07172e, transparent: true, opacity: 0.24 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.015;
  shadow.scale.set(1.15, 1.7, 1);
  group.add(shadow);

  return { group, leftArm, rightArm, leftLeg, rightLeg };
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
  canvas.height = 288;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "#082c57");
  roundedRect(context, 14, 14, 740, 260, 42);
  context.fillStyle = gradient;
  context.fill();
  context.lineWidth = 12;
  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.stroke();

  const normalized = label.toLocaleUpperCase("en-US");
  const fontSize = normalized.length > 10 ? 86 : normalized.length > 7 ? 104 : 126;
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
): Group {
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

  const panel = new Mesh(new PlaneGeometry(3.15, 1.18), panelMaterial);
  panel.position.set(0, 2.37, 0.26);
  lane.add(panel);
  return lane;
}

function createGate(): GateRig {
  const group = new Group();
  group.position.set(0, 0, -42);

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

  group.add(createGateLane(-2.15, leftFrame, leftPanel));
  group.add(createGateLane(2.15, rightFrame, rightPanel));
  return { group, leftFrame, rightFrame, leftPanel, rightPanel };
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
    if (material instanceof MeshStandardMaterial) {
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

  let visible = false;
  let disposed = false;
  let reducedMotion = false;
  let questionId: string | null = null;
  let selectedSide: Side | null = null;
  let result: RunnerSceneQuestion["result"] = null;
  let correctSide: Side = "left";
  let targetLaneX = 0;
  let gateZ = -42;
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

    const worldSpeed = reducedMotion ? 3.2 : 8.8;
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
    (speedLines.material as PointsMaterial).opacity = reducedMotion ? 0.08 : 0.36;

    if (selectedSide === null) {
      // Keep the decision cadence stable while reducing only decorative motion.
      gateZ = Math.min(-8.5, gateZ + 6.4 * delta);
    } else {
      gateZ += (reducedMotion ? 14 : 24) * delta;
    }
    gate.group.position.z = gateZ;

    runner.group.position.x = MathUtils.damp(
      runner.group.position.x,
      targetLaneX,
      reducedMotion ? 12 : 8.5,
      delta,
    );

    const stride = reducedMotion ? 0.08 : Math.sin(elapsed * 13.5) * 0.72;
    runner.leftArm.rotation.x = stride;
    runner.rightArm.rotation.x = -stride;
    runner.leftLeg.rotation.x = -stride * 0.78;
    runner.rightLeg.rotation.x = stride * 0.78;
    runner.group.position.y = 0.04 + (reducedMotion ? 0 : Math.abs(Math.sin(elapsed * 13.5)) * 0.06);

    const wrongShake = result === "incorrect" && selectedSide !== null && !reducedMotion
      ? Math.sin(elapsed * 58) * Math.max(0, 0.13 - pulseAge * 0.1)
      : 0;
    camera.position.x = runner.group.position.x * 0.08 + wrongShake;
    camera.position.y = 6.15 + (reducedMotion ? 0 : Math.sin(elapsed * 3.2) * 0.035);
    camera.lookAt(runner.group.position.x * 0.15, 1.45, -13.5);

    if (pulse.visible) {
      pulseAge += delta;
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
      targetLaneX = 0;
      gate.group.visible = false;
    },

    sync(question) {
      if (question.runId !== performanceRunId) {
        performanceRunId = question.runId;
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
        targetLaneX = 0;
        gateZ = -42;
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
