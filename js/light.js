// PRiSM: Light Seeker - Light Fragment Class

class LightFragment {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x, y };
        this.collected = false;
        this.size = 0.3;
        this.floatHeight = 0.5;
        this.floatSpeed = 2;
        this.pulseIntensity = 0.2;
        this.orbitRadius = 0.1;
        this.orbitSpeed = 3;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.lightColor = new THREE.Color(0xffffff);
        this.particleSystem = null;
        this.attractionRange = 5; // Range at which light starts moving toward player
        this.attractionSpeed = 0.5; // Speed at which light moves toward player
        this.avoidingDarkness = false; // Whether light is currently avoiding darkness
        this.darknessSensitivity = 0.8; // How sensitive the light is to darkness
        this.baseIntensity = 0.7; // Base light intensity
        this.baseLightDistance = 2; // Base light distance
        
        // Randomly assign a color tint to some light fragments
        if (Math.random() < 0.3) {
            const colors = [
                new THREE.Color(0x88ffff), // Cyan
                new THREE.Color(0xffff88), // Yellow
                new THREE.Color(0xff88ff), // Magenta
                new THREE.Color(0x88ff88)  // Green
            ];
            this.lightColor = colors[Math.floor(Math.random() * colors.length)];
        }
        
        this.createMesh();
    }
    
    createMesh() {
        // Create light fragment geometry
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.lightColor,
            emissive: this.lightColor,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.position.x, this.floatHeight, this.position.y);
        
        // Add glow effect
        this.light = new THREE.PointLight(this.lightColor, this.baseIntensity, this.baseLightDistance);
        this.light.position.copy(this.mesh.position);
        
        // Add particle effect
        this.createParticleSystem();
        
        // Add to scene
        this.game.scene.add(this.mesh);
        this.game.scene.add(this.light);
    }
    
    createParticleSystem() {
        const particleCount = 10;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 0.3;
            positions[i3 + 1] = (Math.random() - 0.5) * 0.3;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.3;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: this.lightColor,
            size: 0.05,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.particleSystem.position.copy(this.mesh.position);
        this.game.scene.add(this.particleSystem);
    }
    
    update(deltaTime) {
        if (!this.collected) {
            // Floating animation
            this.floatHeight = 0.5 + Math.sin(performance.now() / 1000 * this.floatSpeed) * 0.2;
            
            // Orbital movement
            this.orbitAngle += deltaTime * this.orbitSpeed;
            const orbitX = Math.cos(this.orbitAngle) * this.orbitRadius;
            const orbitZ = Math.sin(this.orbitAngle) * this.orbitRadius;
            
            // Update position
            this.mesh.position.set(
                this.position.x + orbitX,
                this.floatHeight,
                this.position.y + orbitZ
            );
            
            // Pulse light intensity
            const pulse = this.baseIntensity + Math.sin(performance.now() / 500) * this.pulseIntensity;
            this.light.intensity = pulse;
            
            // Update light position
            this.light.position.copy(this.mesh.position);
            
            // Update particle system
            if (this.particleSystem) {
                this.particleSystem.position.copy(this.mesh.position);
                this.particleSystem.rotation.y += deltaTime * 2;
            }
            
            // Rotation animation
            this.mesh.rotation.y += deltaTime * 2;
            this.mesh.rotation.x += deltaTime * 1.5;
            
            // Check if player is nearby for attraction effect
            const playerPos = this.game.player.position;
            const distToPlayer = Utils.distance(this.position.x, this.position.y, playerPos.x, playerPos.y);
            
            if (distToPlayer < this.attractionRange && this.game.player.lightRadius > 2) {
                // Move toward player when they're close and have enough light
                const dirX = playerPos.x - this.position.x;
                const dirY = playerPos.y - this.position.y;
                const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                
                if (magnitude > 0) {
                    const moveSpeed = this.attractionSpeed * (1 - distToPlayer / this.attractionRange);
                    this.position.x += (dirX / magnitude) * moveSpeed * deltaTime;
                    this.position.y += (dirY / magnitude) * moveSpeed * deltaTime;
                }
                
                // Increase particle effect when being attracted
                if (this.particleSystem) {
                    this.particleSystem.material.size = 0.08;
                    this.particleSystem.material.opacity = 0.9;
                }
            } else {
                // Reset particle effect
                if (this.particleSystem) {
                    this.particleSystem.material.size = 0.05;
                    this.particleSystem.material.opacity = 0.7;
                }
                
                // Avoid darkness (move away from dark areas)
                if (Math.random() < 0.05 * this.darknessSensitivity) {
                    this.avoidingDarkness = true;
                    setTimeout(() => {
                        this.avoidingDarkness = false;
                    }, 1000);
                }
                
                if (this.avoidingDarkness) {
                    // Find direction with most light
                    const directions = [
                        { x: 1, y: 0 },
                        { x: -1, y: 0 },
                        { x: 0, y: 1 },
                        { x: 0, y: -1 }
                    ];
                    
                    let bestDir = null;
                    let maxLight = -1;
                    
                    for (const dir of directions) {
                        const testX = this.position.x + dir.x;
                        const testY = this.position.y + dir.y;
                        
                        // Skip if position is a wall
                        if (!this.game.level.isValidPosition(testX, testY)) continue;
                        
                        // Calculate light at this position
                        let lightAmount = 0;
                        
                        // Add light from player
                        const distToPlayer = Utils.distance(testX, testY, playerPos.x, playerPos.y);
                        if (distToPlayer < this.game.player.lightRadius) {
                            lightAmount += (this.game.player.lightRadius - distToPlayer);
                        }
                        
                        // Add light from other fragments
                        for (const fragment of this.game.level.lightFragments) {
                            if (fragment !== this && !fragment.collected) {
                                const dist = Utils.distance(testX, testY, fragment.position.x, fragment.position.y);
                                if (dist < fragment.light.distance) {
                                    lightAmount += (fragment.light.distance - dist) * 0.5;
                                }
                            }
                        }
                        
                        if (lightAmount > maxLight) {
                            maxLight = lightAmount;
                            bestDir = dir;
                        }
                    }
                    
                    // Move toward light
                    if (bestDir) {
                        this.position.x += bestDir.x * 0.2 * deltaTime;
                        this.position.y += bestDir.y * 0.2 * deltaTime;
                    }
                }
            }
        }
    }
    
    collect() {
        if (!this.collected) {
            this.collected = true;
            
            // Create collection effect
            this.createCollectionEffect();
            
            // Increase player's light radius and intensity
            this.game.player.increaseLight();
            
            // Dim remaining light fragments
            this.dimRemainingLightFragments();
            
            // Remove from scene after effect
            setTimeout(() => {
                this.game.scene.remove(this.mesh);
                this.game.scene.remove(this.light);
                if (this.particleSystem) {
                    this.game.scene.remove(this.particleSystem);
                }
            }, 500);
            
            return true;
        }
        return false;
    }
    
    createCollectionEffect() {
        // Scale up and fade out
        const duration = 0.5; // seconds
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale up
            const scale = 1 + progress * 2;
            this.mesh.scale.set(scale, scale, scale);
            
            // Fade out
            this.mesh.material.opacity = 1 - progress;
            if (this.particleSystem) {
                this.particleSystem.material.opacity = 0.7 * (1 - progress);
            }
            
            // Increase light intensity then fade
            if (progress < 0.3) {
                this.light.intensity = this.baseIntensity + progress * 5;
            } else {
                this.light.intensity = this.baseIntensity + (1 - progress) * 5;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    dimRemainingLightFragments() {
        // Calculate how many light fragments have been collected
        const totalFragments = this.game.level.lightFragments.length;
        const collectedCount = this.game.level.collectedLight;
        
        // Calculate the dimming factor based on collection progress
        // As more orbs are collected, the remaining ones will dim more
        const collectionProgress = collectedCount / totalFragments;
        const dimmingFactor = 1 - (collectionProgress * 0.5); // Reduce intensity by up to 50%
        
        // Apply dimming to all remaining light fragments
        for (const fragment of this.game.level.lightFragments) {
            if (!fragment.collected && fragment !== this) {
                // Reduce the base intensity and light distance
                fragment.baseIntensity = 0.7 * dimmingFactor;
                fragment.baseLightDistance = 2 * dimmingFactor;
                
                // Apply the new values to the light
                fragment.light.distance = fragment.baseLightDistance;
                // The intensity will be updated in the fragment's update method with pulse effect
            }
        }
    }
}

// Special light fragment types
class HealingLight extends LightFragment {
    constructor(game, x, y) {
        super(game, x, y);
        this.lightColor = new THREE.Color(0x00ff88); // Green healing color
        this.healAmount = 25; // Amount to heal player
        
        // Override material color
        this.mesh.material.color = this.lightColor;
        this.mesh.material.emissive = this.lightColor;
        this.light.color = this.lightColor;
        if (this.particleSystem) {
            this.particleSystem.material.color = this.lightColor;
        }
    }
    
    collect() {
        if (!this.collected) {
            // Heal player
            this.game.player.health = Math.min(this.game.player.maxHealth, 
                                             this.game.player.health + this.healAmount);
            
            // Create healing effect
            // TODO: Add special healing effect
            
            return super.collect();
        }
        return false;
    }
}

class PowerLight extends LightFragment {
    constructor(game, x, y) {
        super(game, x, y);
        this.lightColor = new THREE.Color(0xffaa00); // Orange power color
        this.powerBoost = 1.5; // Temporary speed boost
        this.powerDuration = 5; // Duration in seconds
        
        // Override material color
        this.mesh.material.color = this.lightColor;
        this.mesh.material.emissive = this.lightColor;
        this.light.color = this.lightColor;
        if (this.particleSystem) {
            this.particleSystem.material.color = this.lightColor;
        }
    }
    
    collect() {
        if (!this.collected) {
            // Give player temporary speed boost
            const originalSpeed = this.game.player.baseSpeed;
            this.game.player.baseSpeed *= this.powerBoost;
            
            // Reset after duration
            setTimeout(() => {
                this.game.player.baseSpeed = originalSpeed;
            }, this.powerDuration * 1000);
            
            return super.collect();
        }
        return false;
    }
}