/**
 * Ludo Pro Animations Engine
 * Provides glitch-free 3D physics dice tumble and high-fidelity goti hopping/settling
 */

(function (window) {
    'use strict';

    const DICE_TARGET_ANGLES = {
        1: { x: 0, y: 0 },
        2: { x: -90, y: 0 },
        3: { x: 0, y: -90 },
        4: { x: 0, y: 90 },
        5: { x: 90, y: 0 },
        6: { x: 0, y: 180 }
    };

    const DICE_UNICODE = {
        1: '⚀',
        2: '⚁',
        3: '⚂',
        4: '⚃',
        5: '⚄',
        6: '⚅'
    };

    const diceRotations = {};

    function prepareDiceElement(diceEl) {
        if (!diceEl) return null;
        if (!diceEl.querySelector('.dice-cube')) {
            diceEl.innerHTML = `
                <div class="dice-cube-container">
                    <div class="dice-cube">
                        <div class="dice-face front" style="color: #0f172a;">⚀</div>
                        <div class="dice-face top" style="color: #0f172a;">⚁</div>
                        <div class="dice-face right" style="color: #0f172a;">⚂</div>
                        <div class="dice-face left" style="color: #0f172a;">⚃</div>
                        <div class="dice-face bottom" style="color: #0f172a;">⚄</div>
                        <div class="dice-face back" style="color: #e11d48;">⚅</div>
                    </div>
                </div>`;
            diceEl.style.background = 'transparent';
            diceEl.style.border = 'none';
            diceEl.style.boxShadow = 'none';
        }
        return diceEl.querySelector('.dice-cube');
    }

    function animateDiceRoll(diceEl, rolledVal, onComplete) {
        if (!diceEl) {
            if (onComplete) onComplete();
            return;
        }

        const cube = prepareDiceElement(diceEl);
        const container = diceEl.querySelector('.dice-cube-container');
        const diceId = diceEl.id || ('dice-' + Math.random().toString(36).substring(2, 7));

        if (!diceRotations[diceId]) {
            diceRotations[diceId] = { x: 0, y: 0 };
        }

        const safeVal = Math.min(Math.max(parseInt(rolledVal) || 1, 1), 6);
        const target = DICE_TARGET_ANGLES[safeVal] || { x: 0, y: 0 };

        // 3 full 360-degree rotations on both axes + exact landing angle
        const spinsX = 3 * 360;
        const spinsY = 3 * 360;

        const nextX = Math.round(diceRotations[diceId].x / 360) * 360 + spinsX + target.x;
        const nextY = Math.round(diceRotations[diceId].y / 360) * 360 + spinsY + target.y;

        diceRotations[diceId].x = nextX;
        diceRotations[diceId].y = nextY;

        if (container) {
            container.classList.remove('dice-tumble-bounce');
            void container.offsetWidth; // Trigger reflow
            container.classList.add('dice-tumble-bounce');
        }

        if (cube) {
            cube.style.transition = 'transform 0.62s cubic-bezier(0.12, 0.85, 0.32, 1.12)';
            cube.style.transform = `rotateX(${nextX}deg) rotateY(${nextY}deg)`;
        }

        // Play rolling audio
        try {
            if (window.soundDice) {
                window.soundDice.currentTime = 0;
                window.soundDice.play().catch(() => {});
            }
        } catch (e) {}

        setTimeout(() => {
            if (container) container.classList.remove('dice-tumble-bounce');
            if (typeof onComplete === 'function') {
                onComplete(safeVal);
            }
        }, 640);
    }

    function animateTokenHopStep(token, renderFn, onStepSound) {
        if (!token || !token.element) return;
        token.element.classList.remove('goti-hop', 'hopping');
        void token.element.offsetWidth; // Reflow
        token.element.classList.add('goti-hop');

        if (typeof renderFn === 'function') {
            renderFn(token);
        }

        if (typeof onStepSound === 'function') {
            onStepSound();
        }
    }

    function animateTokenLanding(token) {
        if (!token || !token.element) return;
        token.element.classList.remove('goti-hop', 'hopping');
        token.element.classList.add('goti-settle');
        setTimeout(() => {
            if (token && token.element) {
                token.element.classList.remove('goti-settle');
            }
        }, 340);
    }

    function animateTokenCapture(token, renderFn, onCutSound, onComplete) {
        if (!token || !token.element) {
            if (onComplete) onComplete();
            return;
        }

        if (typeof onCutSound === 'function') {
            onCutSound();
        }

        token.element.classList.add('goti-captured');
        setTimeout(() => {
            token.element.classList.remove('goti-captured');
            token.step = -1;
            if (typeof renderFn === 'function') {
                renderFn(token);
            }
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, 400);
    }

    window.LudoAnimations = {
        DICE_TARGET_ANGLES,
        DICE_UNICODE,
        prepareDiceElement,
        animateDiceRoll,
        animateTokenHopStep,
        animateTokenLanding,
        animateTokenCapture
    };

})(window);
