import * as THREE from 'three';

export interface PhysicalDie {
  mesh: THREE.Mesh;
  sides: number;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  isSettled: boolean;
  targetValue: number;
  finalValue: number;
}

export class Dice3dPhysicsEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dice: PhysicalDie[] = [];
  private animationFrameId: number | null = null;
  private onRollComplete?: (results: { total: number; dice: PhysicalDie[] }) => void;
  private isRunning = false;

  constructor(container: HTMLCanvasElement) {
    // 1. Scene & Camera setup
    this.scene = new THREE.Scene();
    
    const aspect = container.clientWidth / container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 14, 18);
    this.camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer with antialiasing & shadow support
    this.renderer = new THREE.WebGLRenderer({
      canvas: container,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 3. Lighting setup: Ambient + Directional Key Light + Warm Rim Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff1d0, 2.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const rimLight = new THREE.PointLight(0xf59e0b, 1.8, 30);
    rimLight.position.set(-10, 8, -5);
    this.scene.add(rimLight);

    // 4. Invisible ground bounce plane with soft shadow receiver
    const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  // Create canvas texture with face number and gold border
  private createNumberTexture(text: string, bgColor = '#18181b', textColor = '#f59e0b'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 256, 256);

      // Gold border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 14;
      ctx.strokeRect(8, 8, 240, 240);

      // Number text
      ctx.fillStyle = textColor;
      ctx.font = 'bold 100px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // Build 3D mesh based on dice sides (d4, d6, d8, d12, d20)
  private createDiceMesh(sides: number, targetValue: number): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    let mat: THREE.Material | THREE.Material[];

    if (sides === 6) {
      geo = new THREE.BoxGeometry(2, 2, 2);
      // Create materials for 6 faces
      const faceNumbers = [1, 6, 2, 5, 3, 4];
      mat = faceNumbers.map((num) => {
        const isTarget = num === targetValue;
        return new THREE.MeshStandardMaterial({
          map: this.createNumberTexture(
            num.toString(),
            isTarget ? '#27272a' : '#18181b',
            isTarget ? '#fbbf24' : '#e4e4e7'
          ),
          roughness: 0.35,
          metalness: 0.25,
        });
      });
    } else if (sides === 20) {
      geo = new THREE.IcosahedronGeometry(1.6);
      mat = new THREE.MeshStandardMaterial({
        color: targetValue === 20 ? 0xf59e0b : targetValue === 1 ? 0xe11d48 : 0x27272a,
        roughness: 0.3,
        metalness: 0.4,
        flatShading: true,
      });
    } else if (sides === 12) {
      geo = new THREE.DodecahedronGeometry(1.5);
      mat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.3,
        metalness: 0.35,
        flatShading: true,
      });
    } else if (sides === 8) {
      geo = new THREE.OctahedronGeometry(1.6);
      mat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.3,
        metalness: 0.4,
        flatShading: true,
      });
    } else {
      // d4
      geo = new THREE.TetrahedronGeometry(1.6);
      mat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.3,
        metalness: 0.3,
        flatShading: true,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add gold wireframe outline for gemstone / scholar dice effect
    const wireframeGeo = new THREE.WireframeGeometry(geo);
    const wireframeMat = new THREE.LineBasicMaterial({ 
      color: targetValue === 20 ? 0xfef08a : 0xf59e0b, 
      linewidth: 2,
      transparent: true,
      opacity: 0.6 
    });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    mesh.add(wireframe);

    return mesh;
  }

  // Roll dice across the 3D surface
  public roll(
    diceRequests: Array<{ sides: number; targetValue: number }>,
    onComplete?: (results: { total: number; dice: PhysicalDie[] }) => void
  ): void {
    // Clear existing dice
    this.clear();
    this.onRollComplete = onComplete;
    this.isRunning = true;

    diceRequests.forEach((req, idx) => {
      const mesh = this.createDiceMesh(req.sides, req.targetValue);
      
      // Spawn dice in air with offset and downward momentum
      const xOffset = (idx - (diceRequests.length - 1) / 2) * 3.5;
      mesh.position.set(xOffset + (Math.random() - 0.5) * 2, 9 + Math.random() * 2, (Math.random() - 0.5) * 3);

      // Random starting orientation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      this.scene.add(mesh);

      // Physics velocities
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        -7 - Math.random() * 3, // Strong downward throw
        (Math.random() - 0.5) * 4
      );

      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 22
      );

      this.dice.push({
        mesh,
        sides: req.sides,
        velocity,
        angularVelocity,
        isSettled: false,
        targetValue: req.targetValue,
        finalValue: req.targetValue,
      });
    });

    this.startLoop();
  }

  // Newtonian Physics Tick Loop
  private tick(delta: number): void {
    const gravity = -22.0;
    const floorY = 1.0;
    const bounceRestitution = 0.52;
    const friction = 0.985;
    const angularFriction = 0.95;

    let allSettled = true;

    this.dice.forEach((die) => {
      if (die.isSettled) return;

      // Apply Gravity
      die.velocity.y += gravity * delta;

      // Update position
      die.mesh.position.x += die.velocity.x * delta;
      die.mesh.position.y += die.velocity.y * delta;
      die.mesh.position.z += die.velocity.z * delta;

      // Update rotation
      die.mesh.rotation.x += die.angularVelocity.x * delta;
      die.mesh.rotation.y += die.angularVelocity.y * delta;
      die.mesh.rotation.z += die.angularVelocity.z * delta;

      // Apply air friction
      die.velocity.x *= friction;
      die.velocity.z *= friction;
      die.angularVelocity.multiplyScalar(angularFriction);

      // Floor collision
      if (die.mesh.position.y <= floorY) {
        die.mesh.position.y = floorY;
        die.velocity.y = -die.velocity.y * bounceRestitution;

        // Ground friction
        die.velocity.x *= 0.8;
        die.velocity.z *= 0.8;

        // Settle check: when both linear and angular velocities are near zero
        const speed = die.velocity.length();
        const rotSpeed = die.angularVelocity.length();

        if (speed < 0.25 && rotSpeed < 0.35) {
          die.isSettled = true;
          die.velocity.set(0, 0, 0);
          die.angularVelocity.set(0, 0, 0);
          die.mesh.position.y = floorY;
        }
      }

      // Screen boundary bounces
      if (Math.abs(die.mesh.position.x) > 12) {
        die.velocity.x = -die.velocity.x * 0.6;
      }
      if (Math.abs(die.mesh.position.z) > 8) {
        die.velocity.z = -die.velocity.z * 0.6;
      }

      if (!die.isSettled) {
        allSettled = false;
      }
    });

    if (allSettled && this.dice.length > 0 && this.isRunning) {
      this.isRunning = false;
      const total = this.dice.reduce((acc, d) => acc + d.finalValue, 0);
      if (this.onRollComplete) {
        this.onRollComplete({ total, dice: this.dice });
      }
    }
  }

  private startLoop(): void {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      this.tick(delta);
      this.renderer.render(this.scene, this.camera);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public clear(): void {
    this.dice.forEach((die) => {
      this.scene.remove(die.mesh);
      die.mesh.geometry.dispose();
      if (Array.isArray(die.mesh.material)) {
        die.mesh.material.forEach((m) => m.dispose());
      } else {
        die.mesh.material.dispose();
      }
    });
    this.dice = [];
    this.isRunning = false;
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clear();
    this.renderer.dispose();
  }
}
