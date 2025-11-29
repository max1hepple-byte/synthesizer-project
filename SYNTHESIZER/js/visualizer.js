// =======================================================
// JS/VISUALIZER.JS: CANVAS SETUP AND DRAWING LOGIC
// =======================================================

// --- 1. Global Definitions (Configuration) ---
// Note: These need to be WINDOWS, to be accessed by audio-core.js and ui-handlers.js
window.WAVE_COLOR = '#00FFFF';       // Bright Cyan/Neon Green for waveform
window.BACKGROUND_COLOR = '#112222'; // Dark Teal/Charcoal for the screen background

// --- 2. Audio/Visualizer Setup ---
const canvas = document.getElementById('oscilloscope');
const canvasCtx = canvas.getContext('2d');
window.lastDrawTime = 0;

window.resizeCanvas = function() {
    const container = document.querySelector('.oscilloscope-container');
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
}

window.addEventListener('resize', window.resizeCanvas);
window.resizeCanvas(); // Initial call to set size

// --- 3. CRT Bulging (Convexity) Helper ---

/**
 * Applies barrel distortion (convexity) to simulate a CRT screen bulge.
 * @param {number} x - Original X coordinate.
 * @param {number} y - Original Y coordinate.
 * @param {number} w - Canvas width.
 * @param {number} h - Canvas height.
 * @returns {{x: number, y: number}} - Distorted coordinates.
 */
function applyConvexity(x, y, w, h) {
    // 1. Normalize coordinates (center is 0, 0; edges are 1.0 or -1.0)
    const centerX = w / 2;
    const centerY = h / 2;
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    // 2. Calculate the distance from the center
    const dist2 = normX * normX + normY * normY;
    
    // 3. Distortion factor (controls the strength of the bulge)
    const k = 0.1; 
    const distortionFactor = 1.0 + k * dist2;

    // 4. Apply the factor
    const distortedX = normX * distortionFactor * centerX + centerX;
    const distortedY = normY * distortionFactor * centerY + centerY;

    return { x: distortedX, y: distortedY };
}


// --- 4. Continuous Drawing Loop ---
window.draw = function(timestamp) {
    const updateRate = parseInt(window.updateSlider.value);
    const requiredDelay = 1000 / updateRate;

    window.animationFrameId = requestAnimationFrame(window.draw);

    if (timestamp < window.lastDrawTime + requiredDelay) {
        return;
    }
    window.lastDrawTime = timestamp;

    if (!window.analyser) return;
    
    const w = canvas.width;
    const h = canvas.height;

    const bufferLength = window.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    window.analyser.getByteTimeDomainData(dataArray);

    // --- Clear and Trail Effect ---

    // 1. Clear the canvas fully with the background color once
    canvasCtx.fillStyle = window.BACKGROUND_COLOR;
    canvasCtx.fillRect(0, 0, w, h);

    // 2. Draw a semi-transparent *background color* layer for persistence trail
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    canvasCtx.fillRect(0, 0, w, h);

    // Draw the grid (Assuming 8 divisions is desired)
    drawGrid(canvasCtx, w, h, 8, 'black'); 

    // --- Baseline/Amplitude Reference Line ---
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(100, 100, 100, 0.5)'; // Subtle gray line
    canvasCtx.lineWidth = 1;

    // Draw the zero-amplitude line (Center of the screen)
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, h / 2);
    canvasCtx.lineTo(w, h / 2);
    canvasCtx.stroke();
    canvasCtx.restore();

    // --- Waveform Rendering (Curved Analog Glow) ---
    canvasCtx.save();
    canvasCtx.shadowBlur = 15; 
    canvasCtx.shadowColor = window.WAVE_COLOR;
    canvasCtx.lineWidth = 3; 
    canvasCtx.strokeStyle = window.WAVE_COLOR;

    const displayLength = bufferLength / 8;

    // Use the curved drawing logic with convexity
    drawCurvedWave(canvasCtx, w, h, dataArray, displayLength);

    canvasCtx.restore();
    
    // --- CRT Scan Line Overlay (Using JS for full coverage) ---
    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black lines
    canvasCtx.lineWidth = 1;

    // Draw horizontal lines across the entire screen
    const lineSpacing = 3; 
    for (let y = 0; y < h; y += lineSpacing) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, y);
        canvasCtx.lineTo(w, y);
        canvasCtx.stroke();
    }
    
    // Add a very subtle dark vignette effect for old tube look
    const radialGradient = canvasCtx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w * 0.7);
    radialGradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Center is transparent
    radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)'); // Edges are darkened
    canvasCtx.fillStyle = radialGradient;
    canvasCtx.fillRect(0, 0, w, h);

    canvasCtx.restore();
    // --- END CRT Effect ---

    // --- Hz Readout ---
    drawHzReadout(canvasCtx, w, h);
}


// --- 5. Helper Functions ---

/**
 * Draws the frequency readout in the bottom right corner.
 */
function drawHzReadout(ctx, w, h) {
    ctx.save();
    
    ctx.fillStyle = window.WAVE_COLOR;
    ctx.font = '20px Pixel, Monospace'; // Use a digital font style
    ctx.textAlign = 'right';
    
    let displayHz = window.currentFrequency.toFixed(2);
    if (window.currentFrequency === 0) {
        displayHz = "--- Hz";
    } else {
        displayHz += " Hz";
    }
    
    ctx.fillText(displayHz, w - 10, h - 10);
    
    ctx.restore();
}

/**
 * Draws the grid lines with square cells and axis markings.
 */
function drawGrid(ctx, w, h, divisions, color) {
    ctx.save();
    
    // Use the vertical height to determine the width of a square division
    const divHeight = h / divisions;
    const horizontalDivisions = Math.floor(w / divHeight);
    
    const mainLineColor = color; 
    const tickColor = 'black'; 

    ctx.setLineDash([]);

    // --- Horizontal Axis Lines and Ticks ---
    for(let i = 0; i <= divisions; i++) {
        const y = h * i / divisions;
        
        ctx.strokeStyle = mainLineColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        
        // Horizontal Tick Marks (on the vertical grid lines)
        const subdivisions = horizontalDivisions * 4;
        const tickSpacing = w / subdivisions;

        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 0.5;

        for (let j = 0; j <= subdivisions; j++) {
            if (j % 4 === 0 && j !== 0 && j !== subdivisions) continue;
            
            const x = tickSpacing * j;
            
            ctx.beginPath();
            ctx.moveTo(x, y - 2);
            ctx.lineTo(x, y + 2);
            ctx.stroke();
        }
    }

    // --- Vertical Axis Lines and Ticks ---
    const gridUnitWidth = w / horizontalDivisions; 

    for(let i = 0; i <= horizontalDivisions; i++) {
        const x = gridUnitWidth * i;
        
        ctx.strokeStyle = mainLineColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        // Vertical Tick Marks (on the horizontal grid lines)
        const subdivisions = divisions * 4;
        const tickSpacing = h / subdivisions;

        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 0.5;
        
        for (let j = 0; j <= subdivisions; j++) {
            if (j % 4 === 0 && j !== 0 && j !== subdivisions) continue;
            
            const y = tickSpacing * j;
            
            ctx.beginPath();
            ctx.moveTo(x - 2, y);
            ctx.lineTo(x + 2, y);
            ctx.stroke();
        }
    }
    
    // --- Center Axis Refinement ---
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    
    // Center Horizontal (y=h/2)
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Center Vertical (x=w/2)
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    
    ctx.restore();
}

/**
* Draws the waveform using quadratic Bézier curves for a smooth, analog look with CRT convexity.
*/
function drawCurvedWave(ctx, w, h, dataArray, displayLength) {
    const sliceWidth = w * 1.0 / displayLength;
    let x = 0;
    
    ctx.beginPath();
    
    // Start at the first point
    let v = dataArray[0] / 128.0;
    let y = v * h / 2;
    
    // Apply bulge to the starting point
    const startPoint = applyConvexity(x, y, w, h);
    ctx.moveTo(startPoint.x, startPoint.y);

    for (let i = 1; i < displayLength - 2; i++) {
        // Calculate midpoints for smooth curve control points
        const xc = (x + sliceWidth + x + sliceWidth * 2) / 2;
        const v_next = dataArray[i + 1] / 128.0;
        const yc = v_next * h / 2;
        
        // Apply bulge to the control point and the curve end point
        const controlPoint = applyConvexity(x + sliceWidth, y, w, h);
        const endPoint = applyConvexity(xc, yc, w, h);

        // Draw a quadratic curve to the midpoint using distorted coordinates
        ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
        
        // Update x and y for the next segment
        x += sliceWidth;
        v = dataArray[i] / 128.0;
        y = v * h / 2;
    }
    
    // Line to the final point
    const v_last = dataArray[displayLength - 1] / 128.0;
    const y_last = v_last * h / 2;
    
    const finalControlPoint = applyConvexity(x + sliceWidth, y, w, h);
    const finalEndPoint = applyConvexity(w, y_last, w, h);

    ctx.quadraticCurveTo(finalControlPoint.x, finalControlPoint.y, finalEndPoint.x, finalEndPoint.y);
    
    ctx.stroke();
}