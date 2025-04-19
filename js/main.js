// PRiSM: Light Seeker - Main Game Script

// Note: Utils is imported from utils.js

// This file contains all game classes for development
// In production, these would be split into separate files as referenced in index.html

// =============== CONTROLS MANAGER ===============
class Controls {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.joystickActive = false;
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickThumb = document.getElementById('joystick-thumb');
        this.joystickPos = { x: 0, y: 0 };
        
        this.setupKeyboardControls();
        
        if (Utils.isMobile()) {
            document.getElementById('mobile-controls').classList.remove('hidden');
            this.setupTouchControls();
        }
    }
    
    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupTouchControls() {
        const joystickArea = document.getElementById('joystick-area');
        const baseRect = this.joystickBase.getBoundingClientRect();
        const baseRadius = baseRect.width / 2;
        const thumbRadius = this.joystickThumb.getBoundingClientRect().width / 2;
        
        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.joystickActive = true;
            this.updateJoystickPosition(e.touches[0]);
        });
        
        joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystickActive) {
                this.updateJoystickPosition(e.touches[0]);
            }
        });
        
        joystickArea.addEventListener('touchend', () => {
            this.joystickActive = false;
            this.joystickPos = { x: 0, y: 0 };
            this.joystickThumb.style.transform = `translate(-50%, -50%)`;
        });
        
        this.updateJoystickPosition = (touch) => {
            const baseRect = this.joystickBase.getBoundingClientRect();
            const centerX = baseRect.left + baseRect.width / 2;
            const centerY = baseRect.top + baseRect.height / 2;
            
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            // Calculate distance from center
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = baseRect.width / 2 - thumbRadius;
            
            // If the thumb is too far from the center, normalize the position
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                deltaX = Math.cos(angle) * maxDistance;
                deltaY = Math.sin(angle) * maxDistance;
            }
            
            // Update joystick thumb position
            this.joystickThumb.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
            
            // Normalize joystick position for game input (-1 to 1)
            this.joystickPos.x = deltaX / maxDistance;
            this.joystickPos.y = deltaY / maxDistance;
        };
    }
    
    getMovementDirection() {
        const direction = { x: 0, y: 0 };
        
        // Keyboard controls
        if (this.keys['w'] || this.keys['arrowup']) direction.y = -1;
        if (this.keys['s'] || this.keys['arrowdown']) direction.y = 1;
        if (this.keys['a'] || this.keys['arrowleft']) direction.x = -1;
        if (this.keys['d'] || this.keys['arrowright']) direction.x = 1;
        
        // Joystick controls (mobile)
        if (this.joystickActive) {
            direction.x = this.joystickPos.x;
            direction.y = this.joystickPos.y;
        }
        
        // Normalize diagonal movement
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (magnitude > 0) {
            direction.x /= magnitude;
            direction.y /= magnitude;
        }
        
        return direction;
    }
}

// =============== PLAYER CLASS ===============
class Player {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.size = 0.8; // Player size relative to grid cell
        this.speed = 5;
        this.lightRadius = 3; // Initial light radius
        
        this.createMesh();
    }
    
    createMesh() {
        // Create player geometry
        const geometry = new THREE.SphereGeometry(this.size / 2, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        
        // Create player light
        this.light = new THREE.PointLight(0x00ffff, 1, this.lightRadius);
        this.light.position.copy(this.mesh.position);
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
    }
    
    update(deltaTime) {
        const direction = this.game.controls.getMovementDirection();
        
        // Calculate new position
        const newX = this.position.x + direction.x * this.speed * deltaTime;
        const newY = this.position.y + direction.y * this.speed * deltaTime;
        
        // Check collision with walls
        if (this.game.level.isValidPosition(newX, this.position.y)) {
            this.position.x = newX;
        }
        
        if (this.game.level.isValidPosition(this.position.x, newY)) {
            this.position.y = newY;
        }
        
        // Update mesh position
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
        
        // Check for light collection
        this.game.level.checkLightCollection(this.position.x, this.position.y);
        
        // Check for level exit
        if (this.game.level.isAtExit(this.position.x, this.position.y)) {
            this.game.completeLevel();
        }
    }
    
    increaseLight() {
        this.lightRadius += 0.5;
        this.light.distance = this.lightRadius;
    }
    
    reset(x, y) {
        this.position = { x, y };
        this.lightRadius = 3;
        this.light.distance = this.lightRadius;
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
    }
}

// =============== LIGHT CLASS ===============
class LightFragment {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.collected = false;
        this.size = 0.3;
        this.floatHeight = 0.5;
        this.floatSpeed = 2;
        
        this.createMesh();
    }
    
    createMesh() {
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.floatHeight, this.position.y);
        
        // Add glow effect
        this.light = new THREE.PointLight(0xffffff, 0.7, 2);
        this.light.position.copy(this.mesh.position);
        
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
    }
    
    update(deltaTime) {
        if (!this.collected) {
            // Floating animation
            this.floatHeight = 0.5 + Math.sin(performance.now() / 1000 * this.floatSpeed) * 0.2;
            this.mesh.position.y = this.floatHeight;
            this.light.position.y = this.floatHeight;
            
            // Rotation animation
            this.mesh.rotation.y += deltaTime * 2;
        }
    }
    
    collect() {
        if (!this.collected) {
            this.collected = true;
            this.game.scene.remove(this.mesh);
            this.game.scene.remove(this.light);
            return true;
        }
        return false;
    }
}

// =============== LEVEL CLASS ===============
class Level {
    constructor(game, levelNumber) {
        this.game = game;
        this.levelNumber = levelNumber;
        this.gridSize = 20 + levelNumber * 2; // Increase size with level
        this.wallDensity = 0.2 + (levelNumber * 0.02); // Increase wall density with level
        this.lightCount = 5 + levelNumber * 2; // Increase required light with level
        
        this.grid = [];
        this.walls = [];
        this.lightFragments = [];
        this.collectedLight = 0;
        
        this.startPosition = { x: 0, y: 0 };
        this.exitPosition = { x: 0, y: 0 };
        
        this.generateLevel();
    }
    
    generateLevel() {
        // Initialize empty grid
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.gridSize; y++) {
                // Border walls
                if (x === 0 || y === 0 || x === this.gridSize - 1 || y === this.gridSize - 1) {
                    this.grid[x][y] = 1; // Wall
                } else {
                    this.grid[x][y] = 0; // Empty
                }
            }
        }
        
        // Generate random walls
        for (let x = 2; x < this.gridSize - 2; x++) {
            for (let y = 2; y < this.gridSize - 2; y++) {
                if (Math.random() < this.wallDensity) {
                    this.grid[x][y] = 1; // Wall
                }
            }
        }
        
        // Set start position (always in top-left area)
        this.startPosition = {
            x: Utils.randomInt(2, Math.floor(this.gridSize / 4)),
            y: Utils.randomInt(2, Math.floor(this.gridSize / 4))
        };
        
        // Clear area around start position
        for (let x = this.startPosition.x - 2; x <= this.startPosition.x + 2; x++) {
            for (let y = this.startPosition.y - 2; y <= this.startPosition.y + 2; y++) {
                if (x > 0 && y > 0 && x < this.gridSize - 1 && y < this.gridSize - 1) {
                    this.grid[x][y] = 0; // Empty
                }
            }
        }
        
        // Set exit position (always in bottom-right area)
        this.exitPosition = {
            x: Utils.randomInt(Math.floor(this.gridSize * 3 / 4), this.gridSize - 3),
            y: Utils.randomInt(Math.floor(this.gridSize * 3 / 4), this.gridSize - 3)
        };
        
        // Clear area around exit position
        for (let x = this.exitPosition.x - 2; x <= this.exitPosition.x + 2; x++) {
            for (let y = this.exitPosition.y - 2; y <= this.exitPosition.y + 2; y++) {
                if (x > 0 && y > 0 && x < this.gridSize - 1 && y < this.gridSize - 1) {
                    this.grid[x][y] = 0; // Empty
                }
            }
        }
        
        // Place light fragments
        let lightsPlaced = 0;
        while (lightsPlaced < this.lightCount) {
            const x = Utils.randomInt(2, this.gridSize - 3);
            const y = Utils.randomInt(2, this.gridSize - 3);
            
            // Don't place lights at start or exit
            const distToStart = Utils.distance(x, y, this.startPosition.x, this.startPosition.y);
            const distToExit = Utils.distance(x, y, this.exitPosition.x, this.exitPosition.y);
            
            if (this.grid[x][y] === 0 && distToStart > 3 && distToExit > 3) {
                this.lightFragments.push(new LightFragment(this.game, x, y));
                lightsPlaced++;
            }
        }
        
        // Create walls in 3D space
        this.createWalls();
        
        // Create exit marker
        this.createExit();
        
        // Update HUD
        document.getElementById('level-number').textContent = this.levelNumber;
        document.getElementById('light-count').textContent = this.collectedLight;
        document.getElementById('light-total').textContent = this.lightCount;
    }
    
    createWalls() {
        // Wall material
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create wall instances
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (this.grid[x][y] === 1) {
                    const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(x, 1, y);
                    this.game.scene.add(wall);
                    this.walls.push(wall);
                }
            }
        }
        
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(this.gridSize / 2 - 0.5, 0, this.gridSize / 2 - 0.5);
        this.game.scene.add(floor);
    }
    
    createExit() {
        // Exit marker
        const exitGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const exitMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        this.exitMarker = new THREE.Mesh(exitGeometry, exitMaterial);
        this.exitMarker.position.set(this.exitPosition.x, 0.05, this.exitPosition.y);
        
        // Exit light
        this.exitLight = new THREE.PointLight(0xff00ff, 1, 3);
        this.exitLight.position.set(this.exitPosition.x, 0.5, this.exitPosition.y);
        
        this.game.scene.add(this.exitMarker);
        this.game.scene.add(this.exitLight);
    }
    
    isValidPosition(x, y) {
        // Check if position is within grid bounds
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return false;
        }
        
        // Check if position is a wall
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        if (this.grid[gridX][gridY] === 1) {
            return false;
        }
        
        return true;
    }
    
    checkLightCollection(x, y) {
        const playerPos = { x, y };
        
        for (const light of this.lightFragments) {
            if (!light.collected) {
                const distance = Utils.distance(playerPos.x, playerPos.y, light.position.x, light.position.y);
                
                if (distance < 0.7) { // Collection radius
                    if (light.collect()) {
                        this.collectedLight++;
                        document.getElementById('light-count').textContent = this.collectedLight;
                        this.game.player.increaseLight();
                    }
                }
            }
        }
    }
    
    isAtExit(x, y) {
        const distance = Utils.distance(x, y, this.exitPosition.x, this.exitPosition.y);
        return distance < 1 && this.collectedLight === this.lightCount;
    }
    
    update(deltaTime) {
        // Update light fragments
        for (const light of this.lightFragments) {
            light.update(deltaTime);
        }
        
        // Animate exit light
        if (this.exitLight) {
            this.exitLight.intensity = 0.7 + Math.sin(performance.now() / 500) * 0.3;
            
            // Make exit more visible when all lights are collected
            if (this.collectedLight === this.lightCount) {
                this.exitLight.distance = 5 + Math.sin(performance.now() / 500) * 1;
            }
        }
    }
    
    cleanup() {
        // Remove all walls
        for (const wall of this.walls) {
            this.game.scene.remove(wall);
        }
        
        // Remove all light fragments
        for (const light of this.lightFragments) {
            if (!light.collected) {
                this.game.scene.remove(light.mesh);
                this.game.scene.remove(light.light);
            }
        }
        
        // Remove exit marker
        if (this.exitMarker) {
            this.game.scene.remove(this.exitMarker);
            this.game.scene.remove(this.exitLight);
        }
    }
}

// =============== GAME CLASS ===============
class Game {
    constructor() {
        this.currentLevel = 1;
        this.isRunning = false;
        this.setupThreeJS();
        this.setupEventListeners();
    }
    
    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x111111);
        this.scene.add(ambientLight);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('how-to-play').addEventListener('click', () => Utils.showScreen('how-to-play-screen'));
        document.getElementById('back-to-menu').addEventListener('click', () => Utils.showScreen('menu-screen'));
        
        // Game buttons
        document.getElementById('pause-button').addEventListener('click', () => this.pauseGame());
        document.getElementById('resume-game').addEventListener('click', () => this.resumeGame());
        document.getElementById('exit-to-menu').addEventListener('click', () => this.exitToMenu());
        
        // Level complete buttons
        document.getElementById('next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('level-complete-menu').addEventListener('click', () => this.exitToMenu());
        
        // Game over buttons
        document.getElementById('retry-level').addEventListener('click', () => this.retryLevel());
        document.getElementById('game-over-menu').addEventListener('click', () => this.exitToMenu());
    }
    
    init() {
        // Show loading screen
        Utils.showScreen('loading-screen');
        
        // Initialize game after a short delay to show loading screen
        setTimeout(() => {
            Utils.showScreen('menu-screen');
        }, 1500);
    }
    
    startGame() {
        this.currentLevel = 1;
        this.startLevel();
    }
    
    startLevel() {
        // Show game screen
        Utils.showScreen('game-screen');
        
        // Create level
        this.level = new Level(this, this.currentLevel);
        
        // Create player at start position
        if (!this.player) {
            this.player = new Player(this, this.level.startPosition.x, this.level.startPosition.y);
            this.controls = new Controls(this);
        } else {
            this.player.reset(this.level.startPosition.x, this.level.startPosition.y);
        }
        
        // Position camera
        this.camera.position.set(
            this.level.startPosition.x,
            this.level.gridSize / 2,
            this.level.startPosition.y + this.level.gridSize / 2
        );
        this.camera.lookAt(this.level.startPosition.x, 0, this.level.startPosition.y);
        
        // Start game loop
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = now;
        
        // Update player
        this.player.update(deltaTime);
        
        // Update level
        this.level.update(deltaTime);
        
        // Update camera to follow player
        this.camera.position.x = this.player.position.x;
        this.camera.position.z = this.player.position.y + 8;
        this.camera.lookAt(this.player.position.x, 0, this.player.position.y);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    pauseGame() {
        this.isRunning = false;
        Utils.showScreen('pause-screen');
    }
    
    resumeGame() {
        Utils.showScreen('game-screen');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    completeLevel() {
        this.isRunning = false;
        
        // Update level complete screen
        document.getElementById('level-complete-light').textContent = this.level.collectedLight;
        document.getElementById('level-complete-light-total').textContent = this.level.lightCount;
        
        Utils.showScreen('level-complete-screen');
    }
    
    nextLevel() {
        // Clean up current level
        this.level.cleanup();
        
        // Increment level
        this.currentLevel++;
        
        // Start next level
        this.startLevel();
    }
    
    retryLevel() {
        // Clean up current level
        this.level.cleanup();
        
        // Restart current level
        this.startLevel();
    }
    
    exitToMenu() {
        this.isRunning = false;
        
        // Clean up current level if exists
        if (this.level) {
            this.level.cleanup();
        }
        
        Utils.showScreen('menu-screen');
    }
}

// =============== INITIALIZE GAME ===============
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});