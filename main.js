// Import statements with .js extensions (required in ESM)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AnimationMixer } from 'three';

// Constants
const CHARACTER_SCALE = 1.5;
const CHARACTER_START_POSITION = new THREE.Vector3(0, 0, 0);
const MOVEMENT_SPEED = 5;
const FLOOR_COLOR = 0x999999;
const BACKGROUND_COLOR = 0xa0a0a0;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND_COLOR);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('three-canvas'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: FLOOR_COLOR })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Load 3D house model
const loader = new GLTFLoader();
const cottageUrl = new URL('./models/Cottage_FREE.glb', import.meta.url);
loader.load(
  cottageUrl.href,
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(2, 2, 2);
    model.position.set(0, 0, 0);
    scene.add(model);
  },
  undefined,
  (error) => console.error('Model loading error:', error)
);

// Load animated character
let character, mixer, walkAction;
const charUrl = new URL('./models/Catwalk2.glb', import.meta.url);
loader.load(charUrl.href, (gltf) => {
  character = gltf.scene;
  character.scale.set(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);
  character.position.copy(CHARACTER_START_POSITION);
  scene.add(character);

  mixer = new AnimationMixer(character);
  walkAction = mixer.clipAction(gltf.animations[0]);
  walkAction.play();
});

// OrbitControls disabled
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;

// Keyboard Input
const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
};

document.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
document.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Mouse Look Control
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === renderer.domElement) {
    document.addEventListener('mousemove', onMouseMove);
  } else {
    document.removeEventListener('mousemove', onMouseMove);
  }
});

function onMouseMove(event) {
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // Clamp pitch
}

// Animate
let prevTime = performance.now();
const tempVector = new THREE.Vector3();
let wasMoving = false;

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.05); // cap max delta

  if (character) {
    // Character rotation
    const charQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    character.quaternion.copy(charQuat);

    // Movement
    const moveDir = new THREE.Vector3();
    if (keys['KeyW']) moveDir.z -= 1;
    if (keys['KeyS']) moveDir.z += 1;
    if (keys['KeyA']) moveDir.x -= 1;
    if (keys['KeyD']) moveDir.x += 1;

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize().applyQuaternion(charQuat);
      character.position.addScaledVector(moveDir, MOVEMENT_SPEED * delta);
    }

    // Animation
    if (walkAction) {
      if (isMoving && !wasMoving) {
        walkAction.reset().play();
      } else if (!isMoving && wasMoving) {
        walkAction.stop();
      }
      wasMoving = isMoving;
    }

    // Camera follow
    const viewQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw + Math.PI, 0));
    const frontOffset = new THREE.Vector3(0, 2.8, 4);
    frontOffset.applyQuaternion(viewQuat);
    const cameraPos = character.position.clone().add(frontOffset);
    camera.position.lerpVectors(camera.position, cameraPos, 0.2);

    // Look at character
    const lookAt = character.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    camera.lookAt(lookAt);
  }

  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  prevTime = time;
}
animate();

// Resize event
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
