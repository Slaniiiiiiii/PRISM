// PRiSM: Light Seeker - Player Class

class Player {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.size = 0.8; // Player size relative to grid cell
        this.baseSpeed = 5;
        this.speed = this.baseSpeed;
        this.lightRadius = 3; // Initial light radius
        this.maxLightRadius = 8; // Maximum light radius
        this.lightDrainRate = 0.05; // Light drains over time
        this.lightDrainMultiplier = 1; // Increases with level difficulty
        this.health = 100; // Player health
        this.maxHealth = 100;
        this.stamina = 100; // Player stamina for dash ability
        this.maxStamina = 100;
        this.staminaRegenRate = 15; // Stamina regeneration per second
        this.staminaDashCost = 30; // Stamina cost for dash
        this.invulnerable = false; // Invulnerability after taking damage
        this.invulnerabilityTime = 0;
        this.darknessDamageRate = 5; // Damage taken per second in darkness
        this.pulseEffect = 0; // For visual pulse effect
        this.shakeIntensity = 0; // For camera shake when in danger
        
        // Movement smoothing
        this.targetPosition = { x, y };
        this.smoothingFactor = 0.2;
        
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
        
        // Create protective shield effect
        const shieldGeometry = new THREE.SphereGeometry(this.size / 1.5, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2
        });
        this.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shield.position.copy(this.mesh.position);
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
        this.game.scene.add(this.shield);
    }
    
    update(deltaTime) {
        // Update controls
        this.game.controls.update(deltaTime);
        
        // Get movement direction
        const direction = this.game.controls.getMovementDirection();
        
        // Apply speed modifiers based on stamina and dash
        this.speed = this.baseSpeed;
        if (this.game.controls.isDashing && this.stamina > this.staminaDashCost) {
            this.speed = this.baseSpeed * 2;
            this.stamina -= this.staminaDashCost * deltaTime * 5; // Drain stamina during dash
        }
        
        // Calculate new position
        const newX = this.position.x + direction.x * this.speed * deltaTime;
        const newY = this.position.y + direction.y * this.speed * deltaTime;
        
        // Check collision with walls
        if (this.game.level.isValidPosition(newX, this.position.y)) {
            this.targetPosition.x = newX;
        }
        
        if (this.game.level.isValidPosition(this.position.x, newY)) {
            this.targetPosition.y = newY;
        }
        
        // Smooth movement
        this.position.x = Utils.lerp(this.position.x, this.targetPosition.x, this.smoothingFactor);
        this.position.y = Utils.lerp(this.position.y, this.targetPosition.y, this.smoothingFactor);
        
        // Update mesh position
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
        this.shield.position.copy(this.mesh.position);
        
        // Update shield effect
        this.pulseEffect += deltaTime * 2;
        const pulseScale = 1 + Math.sin(this.pulseEffect) * 0.1;
        this.shield.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Drain light over time (harder difficulty)
        this.lightRadius -= this.lightDrainRate * this.lightDrainMultiplier * deltaTime;
        this.lightRadius = Math.max(1, this.lightRadius); // Minimum light radius
        this.light.distance = this.lightRadius;
        
        // Regenerate stamina
        if (!this.game.controls.isDashing) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * deltaTime);
        }
        
        // Check if player is in darkness
        const inDarkness = this.isInDarkness();
        if (inDarkness && !this.invulnerable) {
            // Take damage when in darkness
            this.health -= this.darknessDamageRate * deltaTime;
            
            // Visual feedback when taking damage
            this.mesh.material.color.setRGB(1, 0, 0);
            this.light.color.setRGB(1, 0, 0);
            
            // Camera shake effect when in danger
            this.shakeIntensity = Math.min(0.1, this.shakeIntensity + deltaTime * 0.2);
            
            // Check for death
            if (this.health <= 0) {
                this.die();
                return;
            }
        } else {
            // Reset color when not in darkness
            this.mesh.material.color.setRGB(0, 1, 1);
            this.light.color.setRGB(0, 1, 1);
            
            // Reduce shake intensity
            this.shakeIntensity = Math.max(0, this.shakeIntensity - deltaTime * 0.5);
        }
        
        // Apply camera shake
        if (this.shakeIntensity > 0) {
            const shake = Utils.shake(this.shakeIntensity);
            this.game.camera.position.x += shake.x;
            this.game.camera.position.y += shake.y;
            this.game.camera.position.z += shake.z;
        }
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            
            // Flicker effect when invulnerable
            this.mesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
            
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.mesh.visible = true;
            }
        }
        
        // Check for light collection
        this.game.level.checkLightCollection(this.position.x, this.position.y);
        
        // Check for level exit
        if (this.game.level.isAtExit(this.position.x, this.position.y)) {
            this.game.completeLevel();
        }
        
        // Check for enemies
        this.game.level.checkEnemyCollision(this.position.x, this.position.y, this);
    }
    
    isInDarkness() {
        // Check if player is in darkness by checking nearby light sources
        let totalLight = this.lightRadius;
        
        // Add light from nearby light fragments
        for (const light of this.game.level.lightFragments) {
            if (!light.collected) {
                const distance = Utils.distance(this.position.x, this.position.y, light.position.x, light.position.y);
                if (distance < light.light.distance) {
                    totalLight += (light.light.distance - distance) * 0.5;
                }
            }
        }
        
        // Add light from exit
        const distToExit = Utils.distance(this.position.x, this.position.y, this.game.level.exitPosition.x, this.game.level.exitPosition.y);
        if (distToExit < this.game.level.exitLight.distance) {
            totalLight += (this.game.level.exitLight.distance - distToExit) * 0.3;
        }
        
        // Player is in darkness if total light is below threshold
        return totalLight < 2;
    }
    
    takeDamage(amount) {
        if (this.invulnerable) return;
        
        this.health -= amount;
        
        // Visual and audio feedback
        this.mesh.material.color.setRGB(1, 0, 0);
        this.light.color.setRGB(1, 0, 0);
        
        // Temporary invulnerability
        this.invulnerable = true;
        this.invulnerabilityTime = 1.0; // 1 second of invulnerability
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        // Player death
        this.game.gameOver();
    }
    
    increaseLight(amount = 0.5) {
        // Increase light radius
        this.lightRadius = Math.min(this.maxLightRadius, this.lightRadius + amount);
        this.light.distance = this.lightRadius;
        
        // Increase light intensity
        this.light.intensity += 0.15;
        
        // Visual feedback - pulse effect
        this.pulseEffect = 1.0;
        
        // Scale up the player slightly for visual feedback
        const currentScale = this.mesh.scale.x;
        this.mesh.scale.set(currentScale * 1.2, currentScale * 1.2, currentScale * 1.2);
        
        // Return to normal scale after a short time
        setTimeout(() => {
            this.mesh.scale.set(1, 1, 1);
        }, 300);
        
        // Also heal the player a bit when collecting light
        this.health = Math.min(this.maxHealth, this.health + 5);
    }
    
    reset(x, y) {
        this.position = { x, y };
        this.targetPosition = { x, y };
        this.lightRadius = 3;
        this.light.distance = this.lightRadius;
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.invulnerable = false;
        this.shakeIntensity = 0;
        this.mesh.position.set(this.position.x, 0.5, this.position.y);
        this.light.position.copy(this.mesh.position);
        this.shield.position.copy(this.mesh.position);
        this.mesh.material.color.setRGB(0, 1, 1);
        this.light.color.setRGB(0, 1, 1);
        this.mesh.visible = true;
    }
    
    updateDifficultyModifiers(level) {
        // Make the game harder as levels progress
        this.lightDrainMultiplier = 1 + (level * 0.1); // Light drains faster in higher levels
        this.darknessDamageRate = 5 + (level * 0.5); // Darkness does more damage in higher levels
    }
}