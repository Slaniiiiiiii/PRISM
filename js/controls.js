// PRiSM: Light Seeker - Controls Manager

class Controls {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.joystickActive = false;
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickThumb = document.getElementById('joystick-thumb');
        this.joystickPos = { x: 0, y: 0 };
        this.doubleTapTimer = null;
        this.lastTapTime = 0;
        this.dashCooldown = 0;
        
        this.setupKeyboardControls();
        
        if (Utils.isMobile()) {
            document.getElementById('mobile-controls').classList.remove('hidden');
            this.setupTouchControls();
        }
    }
    
    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Dash ability with Shift key
            if (e.key.toLowerCase() === 'shift' && this.dashCooldown <= 0) {
                this.triggerDash();
            }
            
            // Prevent default for arrow keys and WASD to avoid page scrolling
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
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
            
            // Double tap detection for dash on mobile
            const currentTime = new Date().getTime();
            const tapLength = currentTime - this.lastTapTime;
            if (tapLength < 300 && tapLength > 0 && this.dashCooldown <= 0) {
                this.triggerDash();
            }
            this.lastTapTime = currentTime;
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
        
        // Add swipe detection for quick movements
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        });
    }
    
    handleSwipe(startX, startY, endX, endY) {
        const minSwipeDistance = 50;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Only process swipes outside the joystick area
        if (this.joystickActive) return;
        
        if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
            // Determine swipe direction for quick movement
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    // Quick right movement
                    this.quickMove({ x: 1, y: 0 });
                } else {
                    // Quick left movement
                    this.quickMove({ x: -1, y: 0 });
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    // Quick down movement
                    this.quickMove({ x: 0, y: 1 });
                } else {
                    // Quick up movement
                    this.quickMove({ x: 0, y: -1 });
                }
            }
        }
    }
    
    quickMove(direction) {
        // Implement a quick movement in the given direction
        // This will be used by the player class
        this.quickMoveDirection = direction;
        setTimeout(() => {
            this.quickMoveDirection = null;
        }, 100);
    }
    
    triggerDash() {
        // Trigger a dash in the current movement direction
        this.isDashing = true;
        this.dashCooldown = 1.5; // 1.5 second cooldown
        
        // Reset dash after a short duration
        setTimeout(() => {
            this.isDashing = false;
        }, 200);
    }
    
    updateJoystickPosition(touch) {
        const baseRect = this.joystickBase.getBoundingClientRect();
        const centerX = baseRect.left + baseRect.width / 2;
        const centerY = baseRect.top + baseRect.height / 2;
        
        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        
        // Calculate distance from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = baseRect.width / 2 - this.joystickThumb.getBoundingClientRect().width / 2;
        
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
        
        // Quick move direction (from swipes)
        if (this.quickMoveDirection) {
            direction.x = this.quickMoveDirection.x;
            direction.y = this.quickMoveDirection.y;
        }
        
        // Normalize diagonal movement
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (magnitude > 0) {
            direction.x /= magnitude;
            direction.y /= magnitude;
        }
        
        // Apply dash multiplier if dashing
        if (this.isDashing) {
            direction.x *= 2.5;
            direction.y *= 2.5;
        }
        
        return direction;
    }
    
    update(deltaTime) {
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
    }
}