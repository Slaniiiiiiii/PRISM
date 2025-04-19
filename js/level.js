// PRiSM: Light Seeker - Level Class

class Level {
    constructor(game, levelNumber) {
        this.game = game;
        this.levelNumber = levelNumber;
        this.gridSize = 20 + levelNumber * 2; // Increase size with level
        this.wallDensity = 0.2 + (levelNumber * 0.02); // Increase wall density with level
        this.lightCount = 5 + levelNumber * 2; // Increase required light with level
        this.specialLightChance = 0.2 + (levelNumber * 0.02); // Chance for special light fragments
        this.enemyCount = Math.floor(levelNumber / 2); // Add enemies in higher levels
        this.darknessPockets = []; // Areas of intense darkness
        this.darknessPocketCount = Math.floor(levelNumber / 3); // More darkness pockets in higher levels
        
        this.grid = [];
        this.walls = [];
        this.lightFragments = [];
        this.enemies = [];
        this.collectedLight = 0;
        
        this.startPosition = { x: 0, y: 0 };
        this.exitPosition = { x: 0, y: 0 };
        
        // Fog effect for higher levels
        this.fogDensity = 0.01 + (levelNumber * 0.005);
        
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
        
        // Use noise for more natural level generation
        if (this.levelNumber > 3) {
            this.generateNoiseBasedLevel();
        } else {
            this.generateRandomWalls();
        }
        
        // Set start position (always in top-left area)
        this.startPosition = {
            x: Utils.randomInt(2, Math.floor(this.gridSize / 4)),
            y: Utils.randomInt(2, Math.floor(this.gridSize / 4))
        };
        
        // Clear area around start position
        this.clearArea(this.startPosition.x, this.startPosition.y, 2);
        
        // Set exit position (always in bottom-right area)
        this.exitPosition = {
            x: Utils.randomInt(Math.floor(this.gridSize * 3 / 4), this.gridSize - 3),
            y: Utils.randomInt(Math.floor(this.gridSize * 3 / 4), this.gridSize - 3)
        };
        
        // Clear area around exit position
        this.clearArea(this.exitPosition.x, this.exitPosition.y, 2);
        
        // Ensure path exists from start to exit
        this.ensurePath();
        
        // Place light fragments
        this.placeLightFragments();
        
        // Place enemies in higher levels
        if (this.levelNumber >= 3) {
            this.placeEnemies();
        }
        
        // Create darkness pockets in higher levels
        if (this.levelNumber >= 2) {
            this.createDarknessPockets();
        }
        
        // Create walls in 3D space
        this.createWalls();
        
        // Create exit marker
        this.createExit();
        
        // Add fog effect for higher levels
        if (this.levelNumber > 1) {
            this.createFog();
        }
        
        // Update HUD
        document.getElementById('level-number').textContent = this.levelNumber;
        document.getElementById('light-count').textContent = this.collectedLight;
        document.getElementById('light-total').textContent = this.lightCount;
    }
    
    generateRandomWalls() {
        // Generate random walls
        for (let x = 2; x < this.gridSize - 2; x++) {
            for (let y = 2; y < this.gridSize - 2; y++) {
                if (Math.random() < this.wallDensity) {
                    this.grid[x][y] = 1; // Wall
                }
            }
        }
    }
    
    generateNoiseBasedLevel() {
        const noiseScale = 0.1;
        
        for (let x = 2; x < this.gridSize - 2; x++) {
            for (let y = 2; y < this.gridSize - 2; y++) {
                // Use Perlin noise for more natural cave-like structures
                const noiseValue = Utils.noise(x * noiseScale, y * noiseScale);
                
                // Adjust threshold based on distance from center to create more open areas in the middle
                const distFromCenter = Utils.distance(x, y, this.gridSize/2, this.gridSize/2) / (this.gridSize/2);
                const threshold = this.wallDensity + (distFromCenter * 0.2);
                
                if (noiseValue > threshold) {
                    this.grid[x][y] = 1; // Wall
                }
            }
        }
        
        // Add some maze-like structures for higher levels
        if (this.levelNumber > 5) {
            this.addMazeStructures();
        }
    }
    
    addMazeStructures() {
        // Add some straight wall sections to create maze-like paths
        const wallSections = Math.floor(this.levelNumber / 2);
        
        for (let i = 0; i < wallSections; i++) {
            // Random starting point
            const startX = Utils.randomInt(5, this.gridSize - 6);
            const startY = Utils.randomInt(5, this.gridSize - 6);
            
            // Random direction (horizontal or vertical)
            const horizontal = Math.random() > 0.5;
            
            // Random length
            const length = Utils.randomInt(3, 8);
            
            // Create wall section with a gap
            const gapPos = Utils.randomInt(1, length - 1);
            
            for (let j = 0; j < length; j++) {
                if (j !== gapPos) { // Leave a gap
                    const x = horizontal ? startX + j : startX;
                    const y = horizontal ? startY : startY + j;
                    
                    if (x > 0 && x < this.gridSize - 1 && y > 0 && y < this.gridSize - 1) {
                        this.grid[x][y] = 1; // Wall
                    }
                }
            }
        }
    }
    
    clearArea(centerX, centerY, radius) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                if (x > 0 && y > 0 && x < this.gridSize - 1 && y < this.gridSize - 1) {
                    this.grid[x][y] = 0; // Empty
                }
            }
        }
    }
    
    ensurePath() {
        // Simple implementation of A* pathfinding to ensure a path exists
        const openSet = [this.startPosition];
        const closedSet = [];
        const cameFrom = {};
        
        const gScore = {};
        gScore[`${this.startPosition.x},${this.startPosition.y}`] = 0;
        
        const fScore = {};
        fScore[`${this.startPosition.x},${this.startPosition.y}`] = Utils.distance(
            this.startPosition.x, this.startPosition.y, this.exitPosition.x, this.exitPosition.y
        );
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let lowestFScore = fScore[`${current.x},${current.y}`];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                const node = openSet[i];
                const nodeKey = `${node.x},${node.y}`;
                
                if (fScore[nodeKey] < lowestFScore) {
                    lowestFScore = fScore[nodeKey];
                    current = node;
                    currentIndex = i;
                }
            }
            
            // Check if we reached the exit
            if (current.x === this.exitPosition.x && current.y === this.exitPosition.y) {
                // Path found, no need to modify the grid
                return;
            }
            
            // Remove current from openSet and add to closedSet
            openSet.splice(currentIndex, 1);
            closedSet.push(current);
            
            // Check neighbors
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];
            
            for (const neighbor of neighbors) {
                // Skip if out of bounds
                if (neighbor.x < 0 || neighbor.y < 0 || 
                    neighbor.x >= this.gridSize || neighbor.y >= this.gridSize) {
                    continue;
                }
                
                // Skip if in closedSet
                if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    continue;
                }
                
                // Calculate tentative gScore
                const currentKey = `${current.x},${current.y}`;
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                const tentativeGScore = gScore[currentKey] + 1;
                
                // Check if neighbor is a wall
                const isWall = this.grid[neighbor.x][neighbor.y] === 1;
                
                // If neighbor is not in openSet, add it
                if (!openSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore[neighborKey] || Infinity)) {
                    // Not a better path
                    continue;
                }
                
                // This is the best path so far
                cameFrom[neighborKey] = current;
                gScore[neighborKey] = tentativeGScore;
                fScore[neighborKey] = gScore[neighborKey] + Utils.distance(
                    neighbor.x, neighbor.y, this.exitPosition.x, this.exitPosition.y
                );
                
                // If this is a wall, clear it to ensure path
                if (isWall) {
                    this.grid[neighbor.x][neighbor.y] = 0;
                }
            }
        }
        
        // If no path found, clear a direct path
        const pathPoints = this.getLinePath(this.startPosition, this.exitPosition);
        for (const point of pathPoints) {
            this.clearArea(point.x, point.y, 1);
        }
    }
    
    getLinePath(start, end) {
        const points = [];
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        const sx = start.x < end.x ? 1 : -1;
        const sy = start.y < end.y ? 1 : -1;
        let err = dx - dy;
        
        let x = start.x;
        let y = start.y;
        
        while (x !== end.x || y !== end.y) {
            points.push({x, y});
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        points.push({x: end.x, y: end.y});
        return points;
    }
    
    placeLightFragments() {
        let lightsPlaced = 0;
        const attempts = this.lightCount * 10; // Limit attempts to prevent infinite loop
        let attempt = 0;
        
        while (lightsPlaced < this.lightCount && attempt < attempts) {
            attempt++;
            const x = Utils.randomInt(2, this.gridSize - 3);
            const y = Utils.randomInt(2, this.gridSize - 3);
            
            // Don't place lights at start or exit
            const distToStart = Utils.distance(x, y, this.startPosition.x, this.startPosition.y);
            const distToExit = Utils.distance(x, y, this.exitPosition.x, this.exitPosition.y);
            
            if (this.grid[x][y] === 0 && distToStart > 3 && distToExit > 3) {
                // Determine if this should be a special light fragment
                if (Math.random() < this.specialLightChance && this.levelNumber > 2) {
                    if (Math.random() < 0.5) {
                        this.lightFragments.push(new HealingLight(this.game, x, y));
                    } else {
                        this.lightFragments.push(new PowerLight(this.game, x, y));
                    }
                } else {
                    this.lightFragments.push(new LightFragment(this.game, x, y));
                }
                lightsPlaced++;
            }
        }
    }
    
    placeEnemies() {
        for (let i = 0; i < this.enemyCount; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 50) {
                attempts++;
                const x = Utils.randomInt(2, this.gridSize - 3);
                const y = Utils.randomInt(2, this.gridSize - 3);
                
                // Don't place enemies at start or exit or on walls
                const distToStart = Utils.distance(x, y, this.startPosition.x, this.startPosition.y);
                const distToExit = Utils.distance(x, y, this.exitPosition.x, this.exitPosition.y);
                
                if (this.grid[x][y] === 0 && distToStart > 5 && distToExit > 3) {
                    // Choose enemy type based on level
                    let enemy;
                    if (this.levelNumber >= 5 && Math.random() < 0.3) {
                        enemy = new HunterEnemy(this.game, x, y);
                    } else {
                        enemy = new DarknessEnemy(this.game, x, y);
                    }
                    
                    this.enemies.push(enemy);
                    placed = true;
                }
            }
        }
    }
    
    createDarknessPockets() {
        for (let i = 0; i < this.darknessPocketCount; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 50) {
                attempts++;
                const x = Utils.randomInt(2, this.gridSize - 3);
                const y = Utils.randomInt(2, this.gridSize - 3);
                
                // Don't place darkness at start or exit
                const distToStart = Utils.distance(x, y, this.startPosition.x, this.startPosition.y);
                const distToExit = Utils.distance(x, y, this.exitPosition.x, this.exitPosition.y);
                
                if (this.grid[x][y] === 0 && distToStart > 4 && distToExit > 4) {
                    const radius = Utils.randomInt(2, 4);
                    const intensity = 0.7 + (this.levelNumber * 0.05);
                    
                    const darknessPocket = {
                        position: { x, y },
                        radius: radius,
                        intensity: intensity,
                        mesh: null,
                        light: null
                    };
                    
                    // Create visual representation
                    const geometry = new THREE.SphereGeometry(radius, 16, 16);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x000000,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    });
                    
                    darknessPocket.mesh = new THREE.Mesh(geometry, material);
                    darknessPocket.mesh.position.set(x, 1, y);
                    
                    // Create negative light (absorbs light)
                    darknessPocket.light = new THREE.PointLight(0x000000, intensity, radius * 2);
                    darknessPocket.light.position.set(x, 1, y);
                    
                    this.game.scene.add(darknessPocket.mesh);
                    this.game.scene.add(darknessPocket.light);
                    
                    this.darknessPockets.push(darknessPocket);
                    placed = true;
                }
            }
        }
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
    
    createFog() {
        this.game.scene.fog = new THREE.FogExp2(0x000000, this.fogDensity);
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
                        
                        // Note: The player's light increase and dimming of remaining orbs
                        // is now handled in the LightFragment.collect() method
                        
                        // Play collection sound
                        if (this.game.soundEnabled) {
                            this.game.sounds.collect.play();
                        }
                    }
                }
            }
        }
    }
    
    checkEnemyCollision(x, y, player) {
        const playerPos = { x, y };
        
        for (const enemy of this.enemies) {
            const distance = Utils.distance(playerPos.x, playerPos.y, enemy.position.x, enemy.position.y);
            
            if (distance < enemy.size + player.size / 2) {
                // Player collided with enemy
                player.takeDamage(enemy.damage);
                
                // Knockback effect
                const knockbackDirection = {
                    x: playerPos.x - enemy.position.x,
                    y: playerPos.y - enemy.position.y
                };
                
                // Normalize direction
                const magnitude = Math.sqrt(knockbackDirection.x * knockbackDirection.x + knockbackDirection.y * knockbackDirection.y);
                if (magnitude > 0) {
                    knockbackDirection.x /= magnitude;
                    knockbackDirection.y /= magnitude;
                }
                
                // Apply knockback
                player.targetPosition.x += knockbackDirection.x * 2;
                player.targetPosition.y += knockbackDirection.y * 2;
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
        
        // Update enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }
        
        // Animate darkness pockets
        for (const pocket of this.darknessPockets) {
            // Pulsating effect
            const pulse = 1 + Math.sin(performance.now() / 1000) * 0.2;
            pocket.mesh.scale.set(pulse, pulse, pulse);
            pocket.light.intensity = pocket.intensity * pulse;
        }
        
        // Animate exit light
        if (this.exitLight) {
            this.exitLight.intensity = 0.7 + Math.sin(performance.now() / 500) * 0.3;
            
            // Make exit more visible when all lights are collected
            if (this.collectedLight === this.lightCount) {
                this.exitLight.distance = 5 + Math.sin(performance.now() / 500) * 1;
                this.exitMarker.material.emissive = new THREE.Color(0xff00ff);
                this.exitMarker.material.emissiveIntensity = 1 + Math.sin(performance.now() / 300) * 0.5;
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
                if (light.particleSystem) {
                    this.game.scene.remove(light.particleSystem);
                }
            }
        }
        
        // Remove all enemies
        for (const enemy of this.enemies) {
            enemy.cleanup();
        }
        
        // Remove darkness pockets
        for (const pocket of this.darknessPockets) {
            this.game.scene.remove(pocket.mesh);
            this.game.scene.remove(pocket.light);
        }
        
        // Remove exit marker
        if (this.exitMarker) {
            this.game.scene.remove(this.exitMarker);
            this.game.scene.remove(this.exitLight);
        }
        
        // Remove fog
        this.game.scene.fog = null;
    }
}

// Enemy classes
class DarknessEnemy {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.size = 0.7;
        this.speed = 1.5;
        this.damage = 10;
        this.health = 100;
        this.detectionRadius = 8;
        this.state = 'patrol'; // patrol, chase, retreat
        this.patrolTarget = null;
        this.patrolWaitTime = 0;
        this.lastPlayerPos = null;
        
        this.createMesh();
    }
    
    createMesh() {
        // Create enemy geometry
        const geometry = new THREE.SphereGeometry(this.size / 2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x880000,
            emissive: 0x880000,
            emissiveIntensity: 0.5
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        
        // Create enemy light (dark light that absorbs player light)
        this.light = new THREE.PointLight(0x000000, 0.8, 3);
        this.light.position.copy(this.mesh.position);
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
    }
    
    update(deltaTime) {
        // Check if player is nearby
        const playerPos = this.game.player.position;
        const distToPlayer = Utils.distance(this.position.x, this.position.y, playerPos.x, playerPos.y);
        
        // Update state based on player distance and light
        if (distToPlayer < this.detectionRadius) {
            // Check if player has enough light to repel enemy
            if (this.game.player.lightRadius > 5) {
                this.state = 'retreat';
                this.lastPlayerPos = { ...playerPos };
            } else {
                this.state = 'chase';
                this.lastPlayerPos = { ...playerPos };
            }
        } else if (this.state === 'chase' && this.lastPlayerPos) {
            // Continue chasing last known position
            const distToLastPos = Utils.distance(
                this.position.x, this.position.y, 
                this.lastPlayerPos.x, this.lastPlayerPos.y
            );
            
            if (distToLastPos < 1) {
                // Reached last known position, go back to patrol
                this.state = 'patrol';
                this.lastPlayerPos = null;
            }
        } else {
            this.state = 'patrol';
        }
        
        // Handle movement based on state
        switch (this.state) {
            case 'patrol':
                this.handlePatrol(deltaTime);
                break;
            case 'chase':
                this.handleChase(deltaTime, playerPos);
                break;
            case 'retreat':
                this.handleRetreat(deltaTime, playerPos);
                break;
        }
        
        // Update mesh position
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
        
        // Pulsating effect
        const pulse = 1 + Math.sin(performance.now() / 500) * 0.2;
        this.mesh.scale.set(pulse, pulse, pulse);
        
        // Change color based on state
        switch (this.state) {
            case 'patrol':
                this.mesh.material.color.setRGB(0.5, 0, 0);
                this.mesh.material.emissiveIntensity = 0.5;
                break;
            case 'chase':
                this.mesh.material.color.setRGB(0.8, 0, 0);
                this.mesh.material.emissiveIntensity = 0.8;
                break;
            case 'retreat':
                this.mesh.material.color.setRGB(0.3, 0, 0);
                this.mesh.material.emissiveIntensity = 0.3;
                break;
        }
    }
    
    handlePatrol(deltaTime) {
        // If no patrol target or reached current target, set a new one
        if (!this.patrolTarget || 
            (Utils.distance(this.position.x, this.position.y, this.patrolTarget.x, this.patrolTarget.y) < 0.5)) {
            
            if (this.patrolWaitTime > 0) {
                // Wait at current position
                this.patrolWaitTime -= deltaTime;
                return;
            }
            
            // Set new random target within reasonable distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 3;
            
            this.patrolTarget = {
                x: this.position.x + Math.cos(angle) * distance,
                y: this.position.y + Math.sin(angle) * distance
            };
            
            // Make sure target is valid (not in a wall)
            if (!this.game.level.isValidPosition(this.patrolTarget.x, this.patrolTarget.y)) {
                this.patrolTarget = null;
                return;
            }
            
            // Set random wait time for next patrol
            this.patrolWaitTime = 1 + Math.random() * 2;
        }
        
        // Move toward patrol target
        const dx = this.patrolTarget.x - this.position.x;
        const dy = this.patrolTarget.y - this.position.y;
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            const moveX = dx / magnitude * this.speed * deltaTime * 0.5; // Move slower during patrol
            const moveY = dy / magnitude * this.speed * deltaTime * 0.5;
            
            // Check if new position is valid
            if (this.game.level.isValidPosition(this.position.x + moveX, this.position.y)) {
                this.position.x += moveX;
            }
            
            if (this.game.level.isValidPosition(this.position.x, this.position.y + moveY)) {
                this.position.y += moveY;
            }
        }
    }
    
    handleChase(deltaTime, playerPos) {
        // Move toward player
        const dx = playerPos.x - this.position.x;
        const dy = playerPos.y - this.position.y;
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            const moveX = dx / magnitude * this.speed * deltaTime;
            const moveY = dy / magnitude * this.speed * deltaTime;
            
            // Check if new position is valid
            if (this.game.level.isValidPosition(this.position.x + moveX, this.position.y)) {
                this.position.x += moveX;
            }
            
            if (this.game.level.isValidPosition(this.position.x, this.position.y + moveY)) {
                this.position.y += moveY;
            }
        }
    }
    
    handleRetreat(deltaTime, playerPos) {
        // Move away from player
        const dx = this.position.x - playerPos.x;
        const dy = this.position.y - playerPos.y;
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            const moveX = dx / magnitude * this.speed * deltaTime;
            const moveY = dy / magnitude * this.speed * deltaTime;
            
            // Check if new position is valid
            if (this.game.level.isValidPosition(this.position.x + moveX, this.position.y)) {
                this.position.x += moveX;
            }
            
            if (this.game.level.isValidPosition(this.position.x, this.position.y + moveY)) {
                this.position.y += moveY;
            }
        }
    }
    
    cleanup() {
        this.game.scene.remove(this.mesh);
        this.game.scene.remove(this.light);
    }
}

class HunterEnemy {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.size = 0.8;
        this.speed = 2.2; // Faster than regular enemies
        this.damage = 15;
        this.health = 150;
        this.detectionRadius = 12; // Better detection
        this.state = 'hunt'; // hunt, ambush
        this.huntTime = 0;
        this.ambushTime = 0;
        this.lastPlayerPos = null;
        this.teleportCooldown = 0;
        
        this.createMesh();
    }
    
    createMesh() {
        // Create enemy geometry
        const geometry = new THREE.SphereGeometry(this.size / 2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x880088,
            emissive: 0x880088,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        
        // Create enemy light (dark purple light)
        this.light = new THREE.PointLight(0x880088, 0.5, 2);
        this.light.position.copy(this.mesh.position);
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
    }
    
    update(deltaTime) {
        // Update teleport cooldown
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= deltaTime;
        }
        
        // Check if player is nearby
        const playerPos = this.game.player.position;
        const distToPlayer = Utils.distance(this.position.x, this.position.y, playerPos.x, playerPos.y);
        
        // Update state timers
        if (this.state === 'hunt') {
            this.huntTime += deltaTime;
            if (this.huntTime > 10) { // Hunt for 10 seconds, then ambush
                this.state = 'ambush';
                this.huntTime = 0;
                this.ambushTime = 0;
            }
        } else {
            this.ambushTime += deltaTime;
            if (this.ambushTime > 5) { // Ambush for 5 seconds, then hunt
                this.state = 'hunt';
                this.huntTime = 0;
                this.ambushTime = 0;
            }
        }
        
        // Handle behavior based on state
        if (this.state === 'hunt') {
            // Always chase player during hunt state
            if (distToPlayer < this.detectionRadius) {
                this.lastPlayerPos = { ...playerPos };
                this.chasePlayer(deltaTime);
            } else if (this.lastPlayerPos) {
                // Move to last known position
                this.moveToPosition(this.lastPlayerPos, deltaTime);
                
                // If reached last known position, try to teleport closer
                const distToLastPos = Utils.distance(
                    this.position.x, this.position.y, 
                    this.lastPlayerPos.x, this.lastPlayerPos.y
                );
                
                if (distToLastPos < 1 && this.teleportCooldown <= 0) {
                    this.tryTeleport();
                }
            } else {
                // Random movement
                this.randomMovement(deltaTime);
            }
        } else { // Ambush state
            // Stay still and become more transparent
            this.mesh.material.opacity = 0.3 + Math.sin(performance.now() / 300) * 0.2;
            
            // If player gets very close, switch to hunt and attack
            if (distToPlayer < 3) {
                this.state = 'hunt';
                this.huntTime = 0;
            }
        }
        
        // Update mesh position
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
        
        // Pulsating effect
        const pulse = 1 + Math.sin(performance.now() / 300) * 0.3;
        this.mesh.scale.set(pulse, pulse, pulse);
    }
    
    chasePlayer(deltaTime) {
        const playerPos = this.game.player.position;
        this.moveToPosition(playerPos, deltaTime);
    }
    
    moveToPosition(targetPos, deltaTime) {
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            const moveX = dx / magnitude * this.speed * deltaTime;
            const moveY = dy / magnitude * this.speed * deltaTime;
            
            // Check if new position is valid
            if (this.game.level.isValidPosition(this.position.x + moveX, this.position.y)) {
                this.position.x += moveX;
            }
            
            if (this.game.level.isValidPosition(this.position.x, this.position.y + moveY)) {
                this.position.y += moveY;
            }
        }
    }
    
    randomMovement(deltaTime) {
        // Move in a random direction
        const angle = performance.now() / 1000;
        const moveX = Math.cos(angle) * this.speed * 0.3 * deltaTime;
        const moveY = Math.sin(angle) * this.speed * 0.3 * deltaTime;
        
        // Check if new position is valid
        if (this.game.level.isValidPosition(this.position.x + moveX, this.position.y)) {
            this.position.x += moveX;
        }
        
        if (this.game.level.isValidPosition(this.position.x, this.position.y + moveY)) {
            this.position.y += moveY;
        }
    }
    
    tryTeleport() {
        // Try to teleport closer to player
        const playerPos = this.game.player.position;
        const distToPlayer = Utils.distance(this.position.x, this.position.y, playerPos.x, playerPos.y);
        
        if (distToPlayer > 5) {
            // Calculate position halfway to player
            const halfwayPos = {
                x: this.position.x + (playerPos.x - this.position.x) * 0.6,
                y: this.position.y + (playerPos.y - this.position.y) * 0.6
            };
            
            // Check if position is valid
            if (this.game.level.isValidPosition(halfwayPos.x, halfwayPos.y)) {
                // Teleport effect
                this.mesh.material.opacity = 0.1;
                
                // Move to new position
                this.position.x = halfwayPos.x;
                this.position.y = halfwayPos.y;
                
                // Set cooldown
                this.teleportCooldown = 5;
            }
        }
    }
    
    cleanup() {
        this.game.scene.remove(this.mesh);
        this.game.scene.remove(this.light);
    }
}