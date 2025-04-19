// PRiSM: Light Seeker - Utility Functions

const Utils = {
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    distance: function(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    showScreen: function(screenId) {
        // Hide all screens
        document.querySelectorAll('#game-container > div').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show the requested screen
        document.getElementById(screenId).classList.remove('hidden');
    },
    
    // Enhanced utility functions for improved gameplay
    lerp: function(start, end, amt) {
        return (1 - amt) * start + amt * end;
    },
    
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Easing functions for smoother animations
    easeInOut: function(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    
    // Perlin noise implementation for more natural level generation
    noise: function(x, y) {
        // Simple implementation of value noise
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        
        const topRight = this.randomFromPoint(X + 1, Y + 1);
        const topLeft = this.randomFromPoint(X, Y + 1);
        const bottomRight = this.randomFromPoint(X + 1, Y);
        const bottomLeft = this.randomFromPoint(X, Y);
        
        // Interpolate
        const u = this.smoothStep(xf);
        const v = this.smoothStep(yf);
        
        return this.lerp(
            this.lerp(bottomLeft, bottomRight, u),
            this.lerp(topLeft, topRight, u),
            v
        ) * 2 - 1;
    },
    
    randomFromPoint: function(x, y) {
        const n = x + y * 57;
        return (Math.sin(n * 21.5453) * 43758.5453) % 1;
    },
    
    smoothStep: function(t) {
        return t * t * (3 - 2 * t);
    },
    
    // Shake effect for camera when player is in danger
    shake: function(intensity) {
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity,
            z: (Math.random() - 0.5) * intensity
        };
    },
    
    // Color utilities
    lerpColor: function(color1, color2, amount) {
        const r = Math.round(this.lerp(color1.r, color2.r, amount));
        const g = Math.round(this.lerp(color1.g, color2.g, amount));
        const b = Math.round(this.lerp(color1.b, color2.b, amount));
        return new THREE.Color(r/255, g/255, b/255);
    }
};