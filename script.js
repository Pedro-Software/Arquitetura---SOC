import * as THREE from 'https://esm.sh/three@0.160.1';

// ============================================================
// CONFIG — Parâmetros centralizados
// ============================================================
const CONFIG = {
  camera: { x: 0, y: 2.8, z: 30 },
  baseFov: 42,
  mobileFov: 58,             // FOV maior para telas verticais
  initialScale: 0.8,
  scaleMin: 0.45,
  scaleMax: 2.5,
  rotationSensitivity: 0.004,
  lerpFactor: 0.07,
  scaleLerpFactor: 0.08,
  rotXClamp: 0.7,
  isMobile: window.innerWidth < 768,
  isPortrait: window.innerHeight > window.innerWidth,
  mobileNodeOffsetY: 3.5,    // Deslocamento Y da cena ao selecionar nó no mobile
  flowPoints: 80,             // Pontos dos fluxos (desktop)
  flowPointsMobile: 36,       // Pontos dos fluxos (mobile — performance)
  particleCount: 900,
  particleCountMobile: 400,
};

// IA Config
const API_KEY = 'SUA_CHAVE_AQUI';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// ============================================================
// PALETA MOURA — Engenharia Industrial Moderna
// ============================================================
const palette = {
  primary:    0x004a99,   // Azul Moura
  accent:     0xffcc00,   // Amarelo Moura
  white:      0xffffff,
  lightGray:  0xe0e4e8,
  midGray:    0x9ca3af,
  darkGray:   0x4b5563,
  warmGray:   0xf3f4f6,
  steel:      0xc8cdd3,   // Aço industrial
};

const ARCHITECTURE_KB = {
  'KALI LINUX': {
    title: 'Servidor de Simulação de Ataque',
    type: 'Red Team / Threat Source',
    status: 'Tráfego ofensivo emulado',
    description: 'Nó que representa a origem do tráfego hostil em um cenário controlado de demonstração. Ele envia eventos para validação do perímetro e da capacidade de detecção.'
  },
  SURICATA: {
    title: 'Appliance de Firewall Suricata',
    type: 'Perimeter Security',
    status: 'Inspeção e detecção ativas',
    description: 'Camada de perímetro responsável por inspeção de tráfego, detecção de padrões suspeitos e encaminhamento de alertas para a central analítica.'
  },
  SIEM: {
    title: 'Central Analítica SIEM',
    type: 'SOC / Correlation Platform',
    status: 'Correlação operacional',
    description: 'Camada central de visibilidade e correlação. Consolida eventos, organiza contexto operacional e acelera a análise de incidentes.'
  },
  MISP: {
    title: 'MISP',
    type: 'Threat Intelligence Platform',
    status: 'Base sincronizada',
    description: 'Repositório corporativo de inteligência de ameaças usado para enriquecer indicadores, eventos, campanhas e contexto investigativo.'
  }
};

// ============================================================
// DOM — Referências defensivas com optional chaining
// ============================================================
const loadingScreen = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const uiLayer = document.getElementById('ui-layer');
const outputCanvas = document.getElementById('output_canvas');

const modeLabel = document.getElementById('current-mode');
const statusFeed = document.getElementById('status-feed');

const infoPanel = document.getElementById('info-panel');
const nodeNameEl = document.getElementById('geo-name') || document.getElementById('node-name');
const nodeCoordEl = document.getElementById('geo-coord') || document.getElementById('node-coord');
const nodeDetailsEl = document.getElementById('geo-details') || document.getElementById('node-details');
const nodeStatusEl = document.getElementById('node-status');
const nodeTypeEl = document.getElementById('node-type');

const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatHistory = document.getElementById('chat-history');

const helpToggle = document.getElementById('help-toggle');
const controlsSummary = document.getElementById('controls-summary');

// ============================================================
// HELPERS UI
// ============================================================
function setLoadingMessage(message) {
  if (loadingText) loadingText.innerText = message;
}

function hideLoading() {
  if (loadingScreen) loadingScreen.style.display = 'none';
}

function showFatalError(message) {
  console.error(message);
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
    const text = loadingScreen.querySelector('.loading-text');
    if (text) {
      text.style.color = '#cc0000';
      text.innerText = message;
    }
  }
}

function setMode(text, color = '#4b5563') {
  if (!modeLabel) return;
  modeLabel.innerText = text;
  modeLabel.style.color = color;
}

function setStatus(text) {
  if (statusFeed) statusFeed.innerText = `STATUS: ${text}`;
}

function appendMessage(text, role = 'ai') {
  if (!chatHistory) return;
  const msg = document.createElement('div');
  msg.className = `msg msg-${role}`;
  msg.innerText = text;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTyping() {
  if (!chatHistory) return;
  const typing = document.createElement('div');
  typing.className = 'msg msg-ai typing-indicator';
  typing.id = 'typing-node';
  typing.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatHistory.appendChild(typing);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing-node')?.remove();
}

// Toggle do botão de ajuda (mobile)
if (helpToggle && controlsSummary) {
  helpToggle.addEventListener('click', () => {
    controlsSummary.classList.toggle('visible');
    helpToggle.classList.toggle('active');
  });
}

window.addEventListener('error', (event) => {
  console.error(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejeitada:', event.reason);
});

// ============================================================
// THREE SCENE — Fundo Branco, Iluminação Industrial
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.FogExp2(0xffffff, 0.014);

// FOV dinâmico — telas verticais recebem FOV maior para não parecer zoom exagerado
function computeFov() {
  return (window.innerHeight > window.innerWidth) ? CONFIG.mobileFov : CONFIG.baseFov;
}

const camera = new THREE.PerspectiveCamera(
  computeFov(),
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(CONFIG.camera.x, CONFIG.camera.y, CONFIG.camera.z);

const renderer = new THREE.WebGLRenderer({
  canvas: outputCanvas,
  antialias: !CONFIG.isMobile,
  alpha: true,
  powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const architectureGroup = new THREE.Group();
scene.add(architectureGroup);

const nodes = [];
const animatedFlows = [];
const animatedRings = [];

let selectedNode = null;
let isFetchingAI = false;
let targetScale = CONFIG.initialScale;
let rotY = -0.18;
let rotX = 0.12;

// Deslocamento Y alvo da cena (para bottom sheet mobile)
let targetGroupY = 0;

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const tempWorldPos = new THREE.Vector3();

// ============================================================
// INTERACTION STATE — Pointer Events (Touch + Mouse)
// ============================================================
let isPointerDown = false;
let pointerStartX = 0;
let pointerStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let isDragging = false;

// Inércia
let velocityRotY = 0;
let velocityRotX = 0;
const INERTIA_DAMPING = 0.92;
const INERTIA_THRESHOLD = 0.00005;
const DRAG_THRESHOLD = 6;

// Pinch-to-zoom
const evCache = [];
let prevPinchDist = -1;

// ============================================================
// FPS THROTTLE — Adaptação dinâmica de pixel ratio
// ============================================================
let frameCount = 0;
let lastFpsCheck = performance.now();
let currentPixelRatio = CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2);
const MIN_PIXEL_RATIO = 0.8;
const FPS_CHECK_INTERVAL = 2000; // Verifica FPS a cada 2s
const FPS_LOW_THRESHOLD = 24;    // Abaixo disso, reduz qualidade
const FPS_HIGH_THRESHOLD = 50;   // Acima disso, pode restaurar

function checkFpsAndAdapt() {
  const now = performance.now();
  const elapsed = now - lastFpsCheck;

  if (elapsed >= FPS_CHECK_INTERVAL) {
    const fps = (frameCount / elapsed) * 1000;

    if (fps < FPS_LOW_THRESHOLD && currentPixelRatio > MIN_PIXEL_RATIO) {
      // FPS baixo — reduzir qualidade gradualmente
      currentPixelRatio = Math.max(MIN_PIXEL_RATIO, currentPixelRatio - 0.15);
      renderer.setPixelRatio(currentPixelRatio);
      console.info(`[Performance] FPS=${fps.toFixed(0)} → pixelRatio reduzido para ${currentPixelRatio.toFixed(2)}`);
    } else if (fps > FPS_HIGH_THRESHOLD && currentPixelRatio < (CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2))) {
      // FPS estável — restaurar qualidade gradualmente
      const maxRatio = CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2);
      currentPixelRatio = Math.min(maxRatio, currentPixelRatio + 0.1);
      renderer.setPixelRatio(currentPixelRatio);
    }

    frameCount = 0;
    lastFpsCheck = now;
  }
}

// ============================================================
// MATERIAIS — Estilo Industrial (sem glow neon)
// ============================================================
function makeIndustrialMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0.12,
    metalness: options.metalness ?? 0.65,
    roughness: options.roughness ?? 0.42,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide
  });
}

function createLabelSprite(text, color = '#004a99', width = 512, height = 128) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.font = 'bold 34px Inter, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Sombra sutil para legibilidade sobre fundo branco
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.4, 1.35, 1);
  return sprite;
}

function createPortRow({
  count = 8, startX = -1, y = 0, z = 0.52,
  spacing = 0.28, color = 0xb0bec5, ledColor = palette.primary
} = {}) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.35 })
    );
    port.position.set(startX + i * spacing, y, z);
    group.add(port);

    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.03),
      new THREE.MeshBasicMaterial({ color: ledColor })
    );
    led.position.set(startX + i * spacing + 0.08, y + 0.08, z + 0.03);
    group.add(led);
  }
  return group;
}

function createEnterpriseFrame(width, height, depth, edgeColor = palette.primary) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.45 })
  );
}

function createDashboardScreen({
  title = 'WAZUH SIEM', subtitle = 'SOC ANALYTICS', accent = '#004a99'
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 1024;
  canvas.height = 512;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fundo branco com leve cinza
  ctx.fillStyle = '#f8f9fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borda do painel
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  // Header bar
  ctx.fillStyle = '#004a99';
  ctx.fillRect(18, 18, canvas.width - 36, 70);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Inter, Segoe UI, sans-serif';
  ctx.fillText(title, 48, 72);

  ctx.fillStyle = '#004a99';
  ctx.font = '26px Inter, Segoe UI, sans-serif';
  ctx.fillText(subtitle, 50, 126);

  // Event Panel
  ctx.strokeStyle = '#004a99';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 165, 250, 220);

  ctx.fillStyle = '#004a99';
  ctx.font = 'bold 22px Inter, Segoe UI, sans-serif';
  ctx.fillText('EVENTS', 70, 200);

  const bars = [120, 150, 95, 180, 135];
  bars.forEach((w, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#004a99' : '#ffcc00';
    ctx.fillRect(70, 225 + i * 28, w, 16);
  });

  // Alert Flow panel
  ctx.strokeStyle = '#0066cc';
  ctx.strokeRect(340, 165, 300, 220);

  ctx.fillStyle = '#004a99';
  ctx.font = 'bold 22px Inter, Segoe UI, sans-serif';
  ctx.fillText('ALERT FLOW', 360, 200);

  ctx.beginPath();
  ctx.strokeStyle = '#004a99';
  ctx.lineWidth = 4;
  ctx.moveTo(365, 325);
  ctx.lineTo(410, 285);
  ctx.lineTo(470, 300);
  ctx.lineTo(530, 235);
  ctx.lineTo(590, 255);
  ctx.lineTo(615, 220);
  ctx.stroke();

  [[410, 285], [470, 300], [530, 235], [590, 255], [615, 220]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.fillStyle = '#ffcc00';
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // IOC Matches panel
  ctx.strokeStyle = '#004a99';
  ctx.lineWidth = 2;
  ctx.strokeRect(680, 165, 280, 100);
  // Agents Health panel
  ctx.strokeStyle = '#ffcc00';
  ctx.strokeRect(680, 285, 280, 100);

  ctx.fillStyle = '#004a99';
  ctx.font = 'bold 20px Inter, Segoe UI, sans-serif';
  ctx.fillText('IOC MATCHES', 700, 205);

  ctx.fillStyle = '#333333';
  ctx.fillText('AGENTS HEALTH', 700, 325);

  ctx.fillStyle = '#004a99';
  ctx.font = 'bold 34px Inter, Segoe UI, sans-serif';
  ctx.fillText('284', 835, 208);

  ctx.fillStyle = '#009933';
  ctx.fillText('97%', 840, 328);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 1,
    side: THREE.DoubleSide, depthWrite: false, depthTest: false
  });
}

// ============================================================
// CONSTRUTORES DE CENA — Estética Industrial Moura
// ============================================================
function createPanelGrid() {
  const grid = new THREE.GridHelper(60, 60, palette.primary, 0xd1d5db);
  grid.position.y = -5.4;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  architectureGroup.add(grid);

  const plane = new THREE.Mesh(
    new THREE.CircleGeometry(26, 64),
    new THREE.MeshBasicMaterial({ color: 0xf0f2f5, transparent: true, opacity: 0.3 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -5.45;
  architectureGroup.add(plane);
}

function createBackgroundParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  // Menos partículas no mobile para economizar GPU
  const count = CONFIG.isMobile ? CONFIG.particleCountMobile : CONFIG.particleCount;

  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.1) * 60,
      (Math.random() - 0.5) * 120
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // Partículas em Azul Moura sutil (não brancas sobre branco)
  const material = new THREE.PointsMaterial({
    color: palette.primary, size: 0.12, transparent: true, opacity: 0.22
  });

  scene.add(new THREE.Points(geometry, material));
}

function addSceneLights() {
  // Ambiente branca forte — iluminação de estúdio industrial
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0f0f0, 0.85));

  // Luz direcional tipo "sol" industrial — clara e limpa
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(7, 14, 14);
  scene.add(key);

  // Rim light suave azulada
  const rim = new THREE.PointLight(0xd0e4ff, 1.2, 70, 2);
  rim.position.set(0, 8, 8);
  scene.add(rim);

  // Fill light sutil do outro lado
  const fill = new THREE.DirectionalLight(0xf5f5f5, 0.6);
  fill.position.set(-8, 6, -6);
  scene.add(fill);
}

function createServerRack({ title, color = palette.accent, accent = palette.primary }) {
  const group = new THREE.Group();

  // Corpo do rack — Cinza Claro industrial
  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 4.8, 1.8),
    new THREE.MeshStandardMaterial({ color: palette.lightGray, metalness: 0.72, roughness: 0.38 })
  );
  group.add(outer);

  // Frente do rack — Branco
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(2.28, 4.45, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf0f2f5, metalness: 0.5, roughness: 0.45 })
  );
  front.position.z = 0.9;
  group.add(front);

  // Frame em Azul Moura
  group.add(createEnterpriseFrame(2.36, 4.56, 1.86, palette.primary));

  for (let i = 0; i < 6; i++) {
    const unit = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.45, 0.08),
      new THREE.MeshStandardMaterial({ color: palette.steel, metalness: 0.65, roughness: 0.4 })
    );
    unit.position.set(0, 1.55 - i * 0.68, 0.95);
    group.add(unit);

    // Strips alternando Azul Moura / Amarelo Moura
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.04, 0.02),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? palette.primary : palette.accent })
    );
    strip.position.set(-0.05, 1.55 - i * 0.68, 1.01);
    group.add(strip);

    // LEDs
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.03),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? palette.accent : palette.primary })
    );
    led.position.set(0.92, 1.55 - i * 0.68, 1.01);
    group.add(led);
  }

  const label = createLabelSprite(title, '#004a99');
  label.position.set(0, 3.7, 0);
  group.add(label);

  return group;
}

function createFirewallNode() {
  const group = new THREE.Group();

  // Corpo da appliance — Cinza claro industrial
  group.add(new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.0, 1.4),
    new THREE.MeshStandardMaterial({ color: palette.lightGray, metalness: 0.72, roughness: 0.38 })
  ));

  // Top bar sólida Azul Moura
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.06, 1.2),
    new THREE.MeshBasicMaterial({ color: palette.primary })
  );
  topBar.position.y = 0.38;
  group.add(topBar);

  // Frente — branco industrial
  const frontPlate = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.74, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xf0f2f5, metalness: 0.55, roughness: 0.42 })
  );
  frontPlate.position.z = 0.73;
  group.add(frontPlate);

  // Portas com LEDs Azul e Amarelo Moura
  group.add(createPortRow({ count: 6, startX: -1.0, y: 0.12, z: 0.78, spacing: 0.32, color: 0xb0bec5, ledColor: palette.accent }));
  group.add(createPortRow({ count: 6, startX: -1.0, y: -0.16, z: 0.78, spacing: 0.32, color: 0xb0bec5, ledColor: palette.primary }));

  // Marca lateral — Amarelo Moura
  const sideMark = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.03),
    new THREE.MeshBasicMaterial({ color: palette.accent })
  );
  sideMark.position.set(1.18, 0.0, 0.79);
  group.add(sideMark);

  // Frame Azul Moura
  group.add(createEnterpriseFrame(3.28, 1.08, 1.48, palette.primary));

  // Pedestal sutil
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.45, 0.12, 40),
    new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.12 })
  );
  pedestal.position.y = -0.72;
  group.add(pedestal);

  // Label elevado acima da zona de passagem dos arcos de fluxo
  // e com renderOrder alto para garantir que renderize na frente das linhas
  const label = createLabelSprite('SURICATA FIREWALL', '#004a99', 620, 120);
  label.scale.set(4.8, 0.95, 1);
  label.position.set(0, 2.6, 0);
  label.renderOrder = 200;
  label.material.depthTest = false;
  group.add(label);

  return group;
}

function createSiemNode() {
  const group = new THREE.Group();

  // Mesa — Cinza claro industrial
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.6, 2.1),
    new THREE.MeshStandardMaterial({ color: palette.lightGray, metalness: 0.78, roughness: 0.32 })
  );
  desk.position.y = -2.0;
  group.add(desk);

  const deskFrame = createEnterpriseFrame(4.72, 0.68, 2.18, palette.primary);
  deskFrame.position.copy(desk.position);
  group.add(deskFrame);

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.3, 0.65),
    new THREE.MeshStandardMaterial({ color: palette.steel, metalness: 0.7, roughness: 0.32 })
  );
  pedestal.position.set(0, -0.58, -1.05);
  group.add(pedestal);

  // Sem glow de pedestal — apenas sutil hint Azul
  const pedestalAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 2.0, 0.55),
    new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.04, depthWrite: false, depthTest: false })
  );
  pedestalAccent.position.set(0, -0.58, -0.98);
  group.add(pedestalAccent);

  // Dashboard screens com tema Moura
  const mainScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.9),
    createDashboardScreen({ title: 'WAZUH SIEM', subtitle: 'SOC ANALYTICS CORE', accent: '#004a99' })
  );
  mainScreen.position.set(0, 1.0, 2.2);
  mainScreen.renderOrder = 100;
  group.add(mainScreen);

  const mainScreenFrame = createEnterpriseFrame(3.28, 1.98, 0.03, palette.primary);
  mainScreenFrame.position.copy(mainScreen.position);
  mainScreenFrame.renderOrder = 101;
  group.add(mainScreenFrame);

  const leftScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.0),
    createDashboardScreen({ title: 'ALERTS', subtitle: 'SURICATA FEED', accent: '#004a99' })
  );
  leftScreen.position.set(-2.25, 0.45, 1.75);
  leftScreen.rotation.y = 0.42;
  leftScreen.renderOrder = 100;
  group.add(leftScreen);

  const leftFrame = createEnterpriseFrame(1.62, 1.06, 0.03, palette.primary);
  leftFrame.position.copy(leftScreen.position);
  leftFrame.rotation.copy(leftScreen.rotation);
  leftFrame.renderOrder = 101;
  group.add(leftFrame);

  const rightScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.0),
    createDashboardScreen({ title: 'THREAT INTEL', subtitle: 'MISP SYNC', accent: '#004a99' })
  );
  rightScreen.position.set(2.25, 0.45, 1.75);
  rightScreen.rotation.y = -0.42;
  rightScreen.renderOrder = 100;
  group.add(rightScreen);

  const rightFrame = createEnterpriseFrame(1.62, 1.06, 0.03, palette.primary);
  rightFrame.position.copy(rightScreen.position);
  rightFrame.rotation.copy(rightScreen.rotation);
  rightFrame.renderOrder = 101;
  group.add(rightFrame);

  // Painel traseiro sutil
  const backPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 3.3),
    new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
  );
  backPanel.position.set(0, 0.15, -1.45);
  backPanel.renderOrder = 2;
  group.add(backPanel);

  const backPanelFrame = createEnterpriseFrame(1.98, 3.38, 0.03, palette.primary);
  backPanelFrame.position.copy(backPanel.position);
  backPanelFrame.renderOrder = 3;
  group.add(backPanelFrame);

  // Torus rings — Azul Moura industrial
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.55 + i * 0.22, 0.03, 16, 100),
      makeIndustrialMaterial(palette.primary, { emissiveIntensity: 0.2, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.0 + i * 0.9;
    group.add(ring);
    animatedRings.push({ mesh: ring, speed: 0.22 + i * 0.16, axis: i % 2 === 0 ? 'z' : 'y' });
  }

  // Floor halo — Azul Moura sutil
  const floorHalo = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.5, 64),
    new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
  );
  floorHalo.rotation.x = -Math.PI / 2;
  floorHalo.position.y = -2.28;
  group.add(floorHalo);

  const label = createLabelSprite('WAZUH SIEM PLATFORM', '#004a99', 760, 120);
  label.scale.set(6.0, 0.95, 1);
  label.position.set(0, 3.45, 0);
  group.add(label);

  return group;
}

function createDatabaseNode() {
  const group = new THREE.Group();

  // Clusters — Cinza claro industrial
  const clusterLeft = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 3.2, 1.4),
    new THREE.MeshStandardMaterial({ color: palette.lightGray, metalness: 0.72, roughness: 0.38 })
  );
  clusterLeft.position.x = -0.9;
  group.add(clusterLeft);

  const clusterRight = clusterLeft.clone();
  clusterRight.position.x = 0.9;
  group.add(clusterRight);

  // Frames Azul Moura
  group.add((() => { const f = createEnterpriseFrame(1.36, 3.28, 1.48, palette.primary); f.position.x = -0.9; return f; })());
  group.add((() => { const f = createEnterpriseFrame(1.36, 3.28, 1.48, palette.primary); f.position.x = 0.9; return f; })());

  for (let i = 0; i < 5; i++) {
    const shelfL = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.32, 0.08),
      new THREE.MeshStandardMaterial({ color: palette.steel, metalness: 0.62, roughness: 0.4 })
    );
    shelfL.position.set(-0.9, 1.05 - i * 0.54, 0.74);
    group.add(shelfL);

    const shelfR = shelfL.clone();
    shelfR.position.x = 0.9;
    group.add(shelfR);

    // Luzes alternando Azul / Amarelo Moura
    const lightL = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? palette.primary : palette.accent })
    );
    lightL.position.set(-0.95, 1.05 - i * 0.54, 0.8);
    group.add(lightL);

    const lightR = lightL.clone();
    lightR.position.x = 0.85;
    group.add(lightR);
  }

  // Bridge link
  const linkBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.4),
    new THREE.MeshStandardMaterial({ color: palette.steel, metalness: 0.65, roughness: 0.35 })
  );
  linkBridge.position.set(0, 0.3, 0.65);
  group.add(linkBridge);

  const label = createLabelSprite('MISP THREAT INTEL', '#004a99', 760, 120);
  label.scale.set(6.0, 0.95, 1);
  label.position.set(0, 3.55, 0);
  group.add(label);

  return group;
}

function createNode(metadata) {
  const nodeGroup = metadata.factory();
  nodeGroup.position.copy(metadata.position);

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(metadata.hitRadius ?? 2.1, 18, 18),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  hitArea.userData.nodeMeta = metadata;
  nodeGroup.add(hitArea);

  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.52, 64),
    new THREE.MeshBasicMaterial({ color: metadata.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = -2.55;
  nodeGroup.add(pulse);

  metadata.group = nodeGroup;
  metadata.hitArea = hitArea;
  metadata.pulse = pulse;

  nodes.push(metadata);
  architectureGroup.add(nodeGroup);
  return metadata;
}

function createFlow(start, end, color, labelText, arcHeight = 3.6, speed = 0.18) {
  const curve = new THREE.CubicBezierCurve3(
    start.clone(),
    start.clone().add(new THREE.Vector3(2.4, arcHeight, 0)),
    end.clone().add(new THREE.Vector3(-2.4, arcHeight, 0)),
    end.clone()
  );

  // Menos pontos de geometria no mobile
  const numPoints = CONFIG.isMobile ? CONFIG.flowPointsMobile : CONFIG.flowPoints;
  const points = curve.getPoints(numPoints);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })
  );
  architectureGroup.add(line);

  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 18),
    makeIndustrialMaterial(color, { emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.15 })
  );
  architectureGroup.add(pulse);

  // Labels com cores adequadas à paleta Moura
  const labelColor = (color === palette.accent) ? '#cc9900' : '#004a99';
  const label = createLabelSprite(labelText, labelColor, 400, 96);
  label.scale.set(3.1, 0.72, 1);
  const midPoint = curve.getPoint(0.5);
  label.position.copy(midPoint.add(new THREE.Vector3(0, 0.55, 0)));
  architectureGroup.add(label);

  animatedFlows.push({
    curve, pulse, speed,
    offset: Math.random(),
    baseLabelY: label.position.y,
    label
  });
}

function buildArchitecture() {
  createPanelGrid();
  createBackgroundParticles();
  addSceneLights();

  // KALI — Nó de ataque: Amarelo Moura (alerta/crítico)
  const kali = createNode({
    id: 'KALI LINUX', title: ARCHITECTURE_KB['KALI LINUX'].title,
    type: ARCHITECTURE_KB['KALI LINUX'].type, status: ARCHITECTURE_KB['KALI LINUX'].status,
    description: ARCHITECTURE_KB['KALI LINUX'].description,
    color: palette.accent, position: new THREE.Vector3(-12.5, 0.4, 0),
    factory: () => createServerRack({ title: 'KALI LINUX', color: palette.accent, accent: palette.primary })
  });

  // SURICATA — Perímetro: Azul Moura
  const suricata = createNode({
    id: 'SURICATA', title: ARCHITECTURE_KB.SURICATA.title,
    type: ARCHITECTURE_KB.SURICATA.type, status: ARCHITECTURE_KB.SURICATA.status,
    description: ARCHITECTURE_KB.SURICATA.description,
    color: palette.primary, position: new THREE.Vector3(-4.8, -0.2, 0),
    factory: () => createFirewallNode()
  });

  // SIEM — Central: Azul Moura
  const siem = createNode({
    id: 'SIEM', title: 'Wazuh SIEM / SOC Platform',
    type: 'SOC / Correlation Platform', status: 'Correlação e monitoramento ativos',
    description: 'Console central do SOC com Wazuh para visualização de eventos, correlação, alertas e monitoramento operacional integrado ao fluxo de detecção e inteligência.',
    color: palette.primary, position: new THREE.Vector3(3.2, 0.3, 0),
    hitRadius: 2.8, factory: () => createSiemNode()
  });

  // MISP — Inteligência: Azul Moura
  const misp = createNode({
    id: 'MISP', title: ARCHITECTURE_KB.MISP.title,
    type: ARCHITECTURE_KB.MISP.type, status: ARCHITECTURE_KB.MISP.status,
    description: ARCHITECTURE_KB.MISP.description,
    color: palette.primary, position: new THREE.Vector3(11.6, 0.15, 0),
    factory: () => createDatabaseNode()
  });

  // Fluxos — Amarelo Moura (alertas/hostil) e Azul Moura (dados normais)
  // Endpoints rebaixados (y: -0.3) para que os arcos não cruzem o label "SURICATA FIREWALL"
  createFlow(
    kali.position.clone().add(new THREE.Vector3(1.2, 0.4, 0)),
    suricata.position.clone().add(new THREE.Vector3(-1.3, -0.3, 0)),
    palette.accent, 'TRÁFEGO HOSTIL', 3.1, 0.16
  );

  createFlow(
    suricata.position.clone().add(new THREE.Vector3(1.3, -0.3, 0)),
    siem.position.clone().add(new THREE.Vector3(-1.8, 0.5, 0)),
    palette.primary, 'EVENTOS IDS/IPS', 3.8, 0.19
  );

  createFlow(
    siem.position.clone().add(new THREE.Vector3(1.75, 0.5, 0)),
    misp.position.clone().add(new THREE.Vector3(-1.5, 0.4, 0)),
    palette.primary, 'REQUISIÇÃO IOC', 3.4, 0.14
  );

  createFlow(
    misp.position.clone().add(new THREE.Vector3(-1.45, -0.6, 0)),
    siem.position.clone().add(new THREE.Vector3(1.55, -0.4, 0)),
    palette.accent, 'RETORNO INTEL', 2.0, 0.13
  );

  // Painel lateral SOC
  const sidePanel = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 2.4, 0.15),
    new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.08 })
  );
  sidePanel.position.set(2.8, 5.6, -1.8);
  architectureGroup.add(sidePanel);

  const sidePanelEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.5, 2.4, 0.15)),
    new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.5 })
  );
  sidePanelEdges.position.copy(sidePanel.position);
  architectureGroup.add(sidePanelEdges);

  const panelLabel = createLabelSprite('SOC SQUAD SI', '#004a99', 600, 120);
  panelLabel.scale.set(4.5, 0.9, 1);
  panelLabel.position.set(2.8, 5.6, -1.65);
  architectureGroup.add(panelLabel);
}

const selectionMarker = new THREE.Mesh(
  new THREE.TorusGeometry(1.9, 0.05, 16, 100),
  makeIndustrialMaterial(palette.accent, { emissiveIntensity: 0.3, transparent: true, opacity: 0.85 })
);
selectionMarker.rotation.x = -Math.PI / 2;
selectionMarker.visible = false;
architectureGroup.add(selectionMarker);

// ============================================================
// INFO PANEL — Seleção de nó com deslocamento mobile
// ============================================================
function updateInfoPanel(nodeMeta) {
  if (!infoPanel) return;

  if (!nodeMeta) {
    infoPanel.classList.remove('active');
    selectionMarker.visible = false;
    selectedNode = null;
    // No mobile, restaurar a posição Y da cena
    if (CONFIG.isMobile) targetGroupY = 0;
    setStatus('LINK MONITORING INATIVO');
    return;
  }

  selectedNode = nodeMeta;

  if (nodeNameEl) nodeNameEl.innerText = nodeMeta.title;
  if (nodeCoordEl) nodeCoordEl.innerText = nodeMeta.id;
  if (nodeDetailsEl) nodeDetailsEl.innerText = nodeMeta.description;
  if (nodeStatusEl) nodeStatusEl.innerText = nodeMeta.status;
  if (nodeTypeEl) nodeTypeEl.innerText = nodeMeta.type;

  infoPanel.classList.add('active');
  selectionMarker.visible = true;
  selectionMarker.position.copy(nodeMeta.position).add(new THREE.Vector3(0, -2.4, 0));
  setStatus(`FOCO ATIVO EM ${nodeMeta.id}`);

  // No mobile, desloca a cena para cima para que o servidor fique visível acima do bottom sheet
  if (CONFIG.isMobile) {
    targetGroupY = CONFIG.mobileNodeOffsetY;
  }
}

// ============================================================
// ANIMAÇÕES
// ============================================================
function animateFlows(elapsed) {
  animatedFlows.forEach((flow, index) => {
    const t = (elapsed * flow.speed + flow.offset + index * 0.07) % 1;
    const point = flow.curve.getPoint(t);
    flow.pulse.position.copy(point);
    flow.label.position.y = flow.baseLabelY + Math.sin(elapsed * 1.6 + index) * 0.08;
  });
}

function animateNodes(elapsed) {
  nodes.forEach((node, index) => {
    if (node.pulse) {
      const scale = 1 + Math.sin(elapsed * 2.2 + index) * 0.08;
      node.pulse.scale.set(scale, scale, scale);
      node.pulse.material.opacity = node === selectedNode
        ? 0.85 : 0.5 + Math.sin(elapsed * 2 + index) * 0.15;
    }

    if (node.id === 'KALI LINUX') {
      node.group.position.y = node.position.y + Math.sin(elapsed * 1.4) * 0.12;
    }

    if (node.id === 'MISP') {
      node.group.rotation.y += 0.004;
    }
  });

  animatedRings.forEach((ring) => {
    ring.mesh.rotation[ring.axis] += ring.speed * 0.01;
  });

  if (selectionMarker.visible) {
    selectionMarker.rotation.z += 0.016;
    const pulseScale = 1 + Math.sin(elapsed * 4.5) * 0.07;
    selectionMarker.scale.set(pulseScale, pulseScale, pulseScale);
  }
}

function animate() {
  requestAnimationFrame(animate);
  frameCount++;

  const elapsed = clock.getElapsedTime();

  // Inércia após soltar o pointer
  if (!isPointerDown) {
    if (Math.abs(velocityRotY) > INERTIA_THRESHOLD) {
      rotY += velocityRotY;
      velocityRotY *= INERTIA_DAMPING;
    } else {
      velocityRotY = 0;
    }
    if (Math.abs(velocityRotX) > INERTIA_THRESHOLD) {
      rotX += velocityRotX;
      velocityRotX *= INERTIA_DAMPING;
    } else {
      velocityRotX = 0;
    }
  }

  // Lerp suave — rotação
  architectureGroup.rotation.y += (rotY - architectureGroup.rotation.y) * CONFIG.lerpFactor;
  architectureGroup.rotation.x += (rotX - architectureGroup.rotation.x) * CONFIG.lerpFactor;
  architectureGroup.rotation.x = Math.max(-CONFIG.rotXClamp, Math.min(CONFIG.rotXClamp, architectureGroup.rotation.x));

  // Lerp suave — escala
  const currentScale = architectureGroup.scale.x || 1;
  const nextScale = currentScale + (targetScale - currentScale) * CONFIG.scaleLerpFactor;
  architectureGroup.scale.set(nextScale, nextScale, nextScale);

  // Lerp suave — deslocamento Y (para bottom sheet mobile)
  const currentY = architectureGroup.position.y;
  architectureGroup.position.y += (targetGroupY - currentY) * CONFIG.lerpFactor;

  // Animar elementos da cena
  animateFlows(elapsed);
  animateNodes(elapsed);

  // Verificar FPS e adaptar qualidade (throttle)
  checkFpsAndAdapt();

  renderer.render(scene, camera);
}

// ============================================================
// CHAT IA
// ============================================================
function fallbackCyberReply(question) {
  const q = question.toLowerCase();
  if (q.includes('siem')) return 'O SIEM centraliza logs, correlaciona eventos e destaca anomalias vindas do perímetro e da inteligência de ameaças.';
  if (q.includes('suricata') || q.includes('firewall')) return 'O Suricata fica na borda, inspeciona tráfego e envia alertas estruturados para o núcleo de correlação.';
  if (q.includes('misp')) return 'O MISP mantém inteligência de ameaças e enriquece indicadores usados pelo SIEM durante investigação e resposta.';
  if (q.includes('kali') || q.includes('atacante')) return 'O servidor Kali representa a origem ofensiva do fluxo, permitindo visualizar a cadeia ataque → detecção → correlação → inteligência.';
  if (q.includes('fluxo') || q.includes('arquitetura')) return 'O fluxo principal é Kali Linux atacante → firewall Suricata → painel SIEM → banco MISP, com retorno de inteligência para o SIEM.';
  return 'A cena mostra uma arquitetura SOC com ataque, perímetro, correlação e inteligência de ameaças conectados por fluxos visuais.';
}

async function askAI(question) {
  if (!question) return;
  appendMessage(question, 'user');
  if (chatInput) chatInput.value = '';
  showTyping();

  try {
    let answer;
    if (!API_KEY || API_KEY === 'SUA_CHAVE_AQUI') {
      answer = fallbackCyberReply(question);
    } else if (isFetchingAI) {
      answer = 'Aguarde a resposta anterior terminar.';
    } else {
      isFetchingAI = true;
      const prompt = `Você é uma IA tática que descreve uma arquitetura de cibersegurança estilizada. Responda em português, sem saudação, em no máximo 3 frases. Pergunta: ${question}`;
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 180 }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\*/g, '') || fallbackCyberReply(question);
    }
    hideTyping();
    appendMessage(answer, 'ai');
  } catch (error) {
    console.error(error);
    hideTyping();
    appendMessage(`Erro de conexão IA. ${fallbackCyberReply(question)}`, 'error');
  } finally {
    isFetchingAI = false;
  }
}

if (chatSend) chatSend.onclick = () => askAI(chatInput?.value?.trim());
if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') chatSend?.click(); });

// ============================================================
// INTERACTION — Pointer Events (Touch + Mouse)
// ============================================================

/** Raycasting para seleção de nó ao clicar/tocar */
function trySelectNode(clientX, clientY) {
  const mouse = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodes.map(n => n.hitArea), false);
  if (intersects.length > 0 && intersects[0].object?.userData?.nodeMeta) {
    updateInfoPanel(intersects[0].object.userData.nodeMeta);
    return true;
  }
  return false;
}

/** Distância entre dois pontos de toque (pinch) */
function getPinchDistance() {
  if (evCache.length < 2) return -1;
  const dx = evCache[0].clientX - evCache[1].clientX;
  const dy = evCache[0].clientY - evCache[1].clientY;
  return Math.hypot(dx, dy);
}

function updateEvCache(ev) {
  for (let i = 0; i < evCache.length; i++) {
    if (evCache[i].pointerId === ev.pointerId) { evCache[i] = ev; return; }
  }
}

function removeFromEvCache(ev) {
  for (let i = 0; i < evCache.length; i++) {
    if (evCache[i].pointerId === ev.pointerId) { evCache.splice(i, 1); return; }
  }
}

// --- Pointer Down ---
function onPointerDown(event) {
  if (event.target?.closest('#ui-layer') || event.target?.closest('#chat-container')) return;

  evCache.push(event);

  if (evCache.length === 1) {
    isPointerDown = true;
    isDragging = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    velocityRotY = 0;
    velocityRotX = 0;
  }

  if (evCache.length === 2) {
    prevPinchDist = getPinchDistance();
    isDragging = true; // Evita seleção durante pinch
    setMode('PINCH ZOOM', '#ffcc00');
  }
}

// --- Pointer Move ---
function onPointerMove(event) {
  updateEvCache(event);

  // Pinch-to-zoom
  if (evCache.length === 2) {
    const curDist = getPinchDistance();
    if (prevPinchDist > 0 && curDist > 0) {
      const delta = curDist - prevPinchDist;
      targetScale = Math.max(CONFIG.scaleMin, Math.min(CONFIG.scaleMax, targetScale + delta * 0.005));
    }
    prevPinchDist = curDist;
    return;
  }

  // Drag — rotação
  if (!isPointerDown || evCache.length !== 1) return;

  const deltaX = event.clientX - lastPointerX;
  const deltaY = event.clientY - lastPointerY;

  const totalDelta = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
  if (totalDelta > DRAG_THRESHOLD) isDragging = true;

  if (isDragging) {
    rotY += deltaX * CONFIG.rotationSensitivity;
    rotX += deltaY * CONFIG.rotationSensitivity;
    velocityRotY = deltaX * CONFIG.rotationSensitivity;
    velocityRotX = deltaY * CONFIG.rotationSensitivity;
  }

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
}

// --- Pointer Up ---
function onPointerUp(event) {
  removeFromEvCache(event);

  // Tap (sem drag) = selecionar nó
  if (!isDragging && evCache.length === 0) {
    trySelectNode(event.clientX, event.clientY);
  }

  if (evCache.length < 2) prevPinchDist = -1;

  if (evCache.length === 0) {
    isPointerDown = false;
    isDragging = false;
    setMode('TOQUE PARA INTERAGIR', '#004a99');
    setStatus(selectedNode ? `FOCO ATIVO EM ${selectedNode.id}` : 'LINK MONITORING INATIVO');
  }
}

// --- Pointer Cancel ---
function onPointerCancel(event) {
  removeFromEvCache(event);
  if (evCache.length === 0) {
    isPointerDown = false;
    isDragging = false;
    prevPinchDist = -1;
  }
}

// Registrar eventos no canvas
const eventTarget = outputCanvas || window;
eventTarget.addEventListener('pointerdown', onPointerDown, { passive: false });
eventTarget.addEventListener('pointermove', onPointerMove, { passive: false });
eventTarget.addEventListener('pointerup', onPointerUp);
eventTarget.addEventListener('pointercancel', onPointerCancel);
eventTarget.addEventListener('pointerleave', onPointerCancel);

if (outputCanvas) {
  outputCanvas.style.touchAction = 'none';
  outputCanvas.style.pointerEvents = 'auto';
}

// Zoom com scroll do mouse
window.addEventListener('wheel', (event) => {
  targetScale = Math.max(CONFIG.scaleMin, Math.min(CONFIG.scaleMax, targetScale - event.deltaY * 0.001));
}, { passive: true });

// ============================================================
// INIT
// ============================================================
function initScene() {
  buildArchitecture();
  animate();
  setStatus('LINK MONITORING INATIVO');
  setMode('TOQUE PARA INTERAGIR', '#004a99');
}

function initApp() {
  try {
    setLoadingMessage('CARREGANDO CENA 3D...');
    initScene();
    setTimeout(() => hideLoading(), 1200);
  } catch (error) {
    console.error(error);
    showFatalError(`ERRO AO INICIAR APLICAÇÃO: ${error.message}`);
  }
}

// --- Resize responsivo ---
window.addEventListener('resize', () => {
  CONFIG.isMobile = window.innerWidth < 768;
  CONFIG.isPortrait = window.innerHeight > window.innerWidth;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = computeFov();
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2));
  currentPixelRatio = CONFIG.isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2);

  // Se não está mobile e bottom sheet estava deslocando, reseta
  if (!CONFIG.isMobile) {
    targetGroupY = 0;
  }
});

// Iniciar aplicação
initApp();
