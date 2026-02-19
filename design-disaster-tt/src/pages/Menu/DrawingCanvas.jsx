/**
 * DrawingCanvas Component
 * -------------------------
 * A transparent canvas centered on screen for freehand drawing.
 *
 * Features:
 *  - Smooth freehand stroke drawing with slight line-smoothing.
 *  - Tiny paint splatter particles emitted at stroke start.
 *  - Drawing is clipped to the canvas boundary.
 *  - FAN MODE: cursor blows existing pixels away as dust particles
 *    in the direction of movement, like air sweeping away crumbs.
 *
 * Props:
 *   brushColor    – current CSS colour string
 *   canvasRef     – forwarded ref so parent can call toDataURL()
 *   onStrokeMove  – callback(dx, dy) giving stroke direction for cursor rotation
 *   fanMode       – boolean, when true the pointer blows pixels instead of drawing
 */

import { useRef, useEffect, useCallback } from "react";

// ── Splatter particle helper ────────────────────────────────
function spawnSplatter(ctx, x, y, color) {
  const count = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 4 + Math.random() * 14;
    const r     = 1.2 + Math.random() * 2.5;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.random() * 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Dust-crumb class for fan eraser ─────────────────────────
// Pixels become crumbs that slide across the canvas surface
// and only disappear when pushed past the canvas edge — like
// sweeping crumbs off a table.
class DustCrumb {
  constructor(x, y, r, g, b, a, vx, vy, size) {
    this.x = x;
    this.y = y;
    this.r = r;  this.g = g;  this.b = b;  this.a = a;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.friction = 0.985;      // gentle slowdown on the "table surface"
    this.jitter  = 0.15;        // slight random wobble while sliding
    this.edgeFade = 1;          // fades only right at the edge (visual polish)
  }
  update(canvasW, canvasH) {
    // Apply friction (crumbs slide on a flat surface)
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Tiny random jitter so crumbs wobble like real debris
    this.vx += (Math.random() - 0.5) * this.jitter;
    this.vy += (Math.random() - 0.5) * this.jitter;

    this.x += this.vx;
    this.y += this.vy;

    // Compute how close we are to any edge (0 = on edge, 1 = deep inside)
    const margin = 30;
    const dL = this.x / margin;
    const dR = (canvasW - this.x) / margin;
    const dT = this.y / margin;
    const dB = (canvasH - this.y) / margin;
    this.edgeFade = Math.max(0, Math.min(1, Math.min(dL, dR, dT, dB)));

    // Dead once fully outside canvas
    return (
      this.x < -10 || this.x > canvasW + 10 ||
      this.y < -10 || this.y > canvasH + 10
    );
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = (this.a / 255) * Math.max(this.edgeFade, 0.05);
    ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`;
    // Draw as a small rectangle — more "crumby" than circles
    const half = this.size / 2;
    ctx.fillRect(this.x - half, this.y - half, this.size, this.size);
    ctx.restore();
  }
}

function DrawingCanvas({ brushColor, canvasRef, onStrokeMove, fanMode }) {
  const wrapperRef   = useRef(null);
  const drawing      = useRef(false);
  const lastPt       = useRef(null);
  const smoothPt     = useRef(null);

  // Fan-mode dust overlay
  const dustCanvasRef = useRef(null);
  const dustParticles = useRef([]);
  const dustRafId     = useRef(null);
  const fanLastPt     = useRef(null);  // previous pointer pos for direction

  // ── Resize both canvases to match wrapper ────────────────
  useEffect(() => {
    const resize = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;

      if (canvasRef.current) {
        canvasRef.current.width  = w;
        canvasRef.current.height = h;
      }
      if (dustCanvasRef.current) {
        dustCanvasRef.current.width  = w;
        dustCanvasRef.current.height = h;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasRef]);

  // ── Dust-crumb animation loop ─────────────────────────────
  useEffect(() => {
    const tick = () => {
      const cvs = dustCanvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext("2d");
        const w = cvs.width;
        const h = cvs.height;
        ctx.clearRect(0, 0, w, h);

        const parts = dustParticles.current;
        for (let i = parts.length - 1; i >= 0; i--) {
          const dead = parts[i].update(w, h);
          if (dead) { parts.splice(i, 1); continue; }
          parts[i].draw(ctx);
        }
      }
      dustRafId.current = requestAnimationFrame(tick);
    };
    dustRafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(dustRafId.current);
  }, []);

  // ── Drawing helpers ──────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // ═══════════════════════════════════════════════════════════
  // FAN ERASER — sweep pixels off the canvas like a broom
  // ═══════════════════════════════════════════════════════════
  const FAN_RADIUS = 32;           // pixel sampling radius around cursor
  const FAN_SAMPLE_STEP = 2;       // sample every N pixels (perf)
  const FAN_PUSH_FORCE = 5;        // initial push strength
  const FAN_EXISTING_PUSH = 1.8;   // force applied to already-loose crumbs nearby

  const blowPixels = useCallback((pos, dx, dy) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const r = FAN_RADIUS;

    // ── 1. Push already-loose crumbs that are near the fan ───
    const pushRadius = r * 2;
    for (const crumb of dustParticles.current) {
      const cx = crumb.x - pos.x;
      const cy = crumb.y - pos.y;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < pushRadius && dist > 0) {
        const strength = 1 - dist / pushRadius;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        crumb.vx += (dx / len) * FAN_EXISTING_PUSH * strength;
        crumb.vy += (dy / len) * FAN_EXISTING_PUSH * strength;
      }
    }

    // ── 2. Rip new pixels off the canvas and spawn crumbs ────
    const sx = Math.max(0, Math.floor(pos.x - r));
    const sy = Math.max(0, Math.floor(pos.y - r));
    const sw = Math.min(cvs.width  - sx, Math.ceil(r * 2));
    const sh = Math.min(cvs.height - sy, Math.ceil(r * 2));
    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    // Normalise direction
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / len;
    const ndy = dy / len;
    const speed = Math.min(len, 18);

    let cleared = false;
    for (let py = 0; py < sh; py += FAN_SAMPLE_STEP) {
      for (let px = 0; px < sw; px += FAN_SAMPLE_STEP) {
        const idx = (py * sw + px) * 4;
        const a = data[idx + 3];
        if (a < 10) continue;

        const relX = (sx + px) - pos.x;
        const relY = (sy + py) - pos.y;
        const dist = Math.sqrt(relX * relX + relY * relY);
        if (dist > r) continue;

        const strength = 1 - (dist / r);
        const push = FAN_PUSH_FORCE * strength * (speed / 8);

        // Velocity = mostly in sweep direction + slight scatter
        const vx = ndx * push + (Math.random() - 0.5) * 1.5;
        const vy = ndy * push + (Math.random() - 0.5) * 1.5;
        const size = FAN_SAMPLE_STEP + Math.random() * 1.5;

        dustParticles.current.push(
          new DustCrumb(
            sx + px, sy + py,
            data[idx], data[idx + 1], data[idx + 2], a,
            vx, vy, size
          )
        );

        // Clear original pixels
        for (let cy2 = 0; cy2 < FAN_SAMPLE_STEP && py + cy2 < sh; cy2++) {
          for (let cx2 = 0; cx2 < FAN_SAMPLE_STEP && px + cx2 < sw; cx2++) {
            const ci = ((py + cy2) * sw + (px + cx2)) * 4;
            data[ci] = data[ci + 1] = data[ci + 2] = data[ci + 3] = 0;
          }
        }
        cleared = true;
      }
    }

    if (cleared) ctx.putImageData(imageData, sx, sy);
  }, [canvasRef]);

  // ═══════════════════════════════════════════════════════════
  // POINTER EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════
  const startStroke = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);

    if (fanMode) {
      drawing.current = true;
      fanLastPt.current = pos;
      return;
    }

    drawing.current = true;
    lastPt.current   = pos;
    smoothPt.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    spawnSplatter(ctx, pos.x, pos.y, brushColor);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [brushColor, canvasRef, fanMode]);

  const moveStroke = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);

    if (fanMode) {
      if (!drawing.current) {
        fanLastPt.current = pos;
        return;
      }
      // Compute movement direction
      const prev = fanLastPt.current || pos;
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) {
        blowPixels(pos, dx, dy);
        if (onStrokeMove) onStrokeMove(dx, dy);
      }
      fanLastPt.current = pos;
      return;
    }

    if (!drawing.current) return;

    const s = smoothPt.current;
    const smooth = {
      x: s.x + (pos.x - s.x) * 0.35,
      y: s.y + (pos.y - s.y) * 0.35,
    };
    smoothPt.current = smooth;

    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = brushColor;
    ctx.lineWidth   = 4;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.globalAlpha = 0.92;

    const mid = {
      x: (lastPt.current.x + smooth.x) / 2,
      y: (lastPt.current.y + smooth.y) / 2,
    };
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.quadraticCurveTo(mid.x, mid.y, smooth.x, smooth.y);
    ctx.stroke();

    const dx = smooth.x - (lastPt.current?.x ?? smooth.x);
    const dy = smooth.y - (lastPt.current?.y ?? smooth.y);
    if (onStrokeMove) onStrokeMove(dx, dy);

    lastPt.current = smooth;
  }, [brushColor, canvasRef, onStrokeMove, fanMode, blowPixels]);

  const endStroke = useCallback(() => {
    drawing.current  = false;
    lastPt.current   = null;
    smoothPt.current = null;
    fanLastPt.current = null;
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="drawing-canvas-wrapper"
      onPointerDown={startStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
    >
      {/* Main drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none" }}
      />
      {/* Dust-particle overlay (above drawing, pointer-transparent) */}
      <canvas
        ref={dustCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2 }}
      />
    </div>
  );
}

export default DrawingCanvas;
