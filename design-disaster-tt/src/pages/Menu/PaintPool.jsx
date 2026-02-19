/**
 * PaintPool Component
 * --------------------
 * A circular "wooden bowl" at the bottom of the screen containing
 * floating paint blobs that obey simple physics.
 *
 * Physics:
 *  - Each blob has position, velocity, radius, and colour.
 *  - Light downward gravity + friction.
 *  - Elastic edge collision inside the circular bowl.
 *  - Random impulses every few seconds for drifting.
 *  - Slow blob-blob collision → merge & blend colours.
 *  - Fast blob-blob collision → bounce.
 *
 * On click:
 *  - Blob stretches (scale animation via class).
 *  - Emit splash particles (drawn on overlay canvas).
 *  - Set parent's brush colour.
 *  - Animate a "dip" effect on the brush.
 *
 * Runs on requestAnimationFrame — no external physics libs.
 *
 * Props:
 *   onColorSelect – (cssColor: string) => void
 */

import { useRef, useEffect, useState, useCallback } from "react";

// ── Initial blob palette ────────────────────────────────────
const INITIAL_COLORS = [
  "#e74c3c", // red
  "#f39c12", // orange
  "#2ecc71", // green
  "#3498db", // blue
  "#9b59b6", // purple
  "#e67e22", // dark orange
  "#1abc9c", // teal
  "#f1c40f", // yellow
];

// Radius of the bowl in CSS px (matches the rendered element)
const BOWL_R = 110;

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}
function blendColors(c1, c2) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
}

function createBlob(color, cx, cy) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = Math.random() * (BOWL_R * 0.5);
  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    r: 16 + Math.random() * 8,
    color,
    id: Math.random(),
  };
}

function PaintPool({ onColorSelect }) {
  const containerRef = useRef(null);
  const blobsRef     = useRef([]);
  const rafId        = useRef(null);
  const splashRef    = useRef(null);         // overlay canvas for splash particles
  const particles    = useRef([]);           // splash particles array
  const [blobState, setBlobState] = useState([]); // drives React render

  // ── Initialise blobs ──────────────────────────────────────
  useEffect(() => {
    const cx = BOWL_R;
    const cy = BOWL_R;
    blobsRef.current = INITIAL_COLORS.map((c) => createBlob(c, cx, cy));
    setBlobState([...blobsRef.current]);
  }, []);

  // ── Physics loop (requestAnimationFrame) ──────────────────
  useEffect(() => {
    const GRAVITY  = 0.04;
    const FRICTION = 0.985;
    const cx = BOWL_R;
    const cy = BOWL_R;
    let impulseTimer = 0;

    const tick = () => {
      const blobs = blobsRef.current;
      impulseTimer++;

      // Random impulse every ~180 frames (~3 s at 60 fps)
      if (impulseTimer > 180) {
        impulseTimer = 0;
        blobs.forEach((b) => {
          b.vx += (Math.random() - 0.5) * 1.5;
          b.vy += (Math.random() - 0.5) * 1.5;
        });
      }

      // Update each blob
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];

        // Gravity (light downward pull)
        b.vy += GRAVITY;

        // Friction
        b.vx *= FRICTION;
        b.vy *= FRICTION;

        // Move
        b.x += b.vx;
        b.y += b.vy;

        // Edge collision — keep inside circle
        const dx = b.x - cx;
        const dy = b.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = BOWL_R - b.r - 4;
        if (dist > maxDist) {
          // Push back inside
          const angle = Math.atan2(dy, dx);
          b.x = cx + Math.cos(angle) * maxDist;
          b.y = cy + Math.sin(angle) * maxDist;
          // Reflect velocity
          const dot = b.vx * Math.cos(angle) + b.vy * Math.sin(angle);
          b.vx -= 1.6 * dot * Math.cos(angle);
          b.vy -= 1.6 * dot * Math.sin(angle);
        }
      }

      // Blob-blob collisions
      for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
          const a = blobs[i], b = blobs[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.r + b.r;

          if (dist < minDist && dist > 0) {
            const relSpeed = Math.sqrt(
              (a.vx - b.vx) ** 2 + (a.vy - b.vy) ** 2
            );

            if (relSpeed < 0.8 && blobs.length > 4) {
              // Slow collision → merge (blend colours, grow radius)
              a.color = blendColors(a.color, b.color);
              a.r = Math.min(a.r + b.r * 0.3, 30);
              a.vx = (a.vx + b.vx) / 2;
              a.vy = (a.vy + b.vy) / 2;
              blobs.splice(j, 1);
              j--;
            } else {
              // Fast collision → bounce
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = minDist - dist;
              a.x -= nx * overlap / 2;
              a.y -= ny * overlap / 2;
              b.x += nx * overlap / 2;
              b.y += ny * overlap / 2;
              const dvx = a.vx - b.vx;
              const dvy = a.vy - b.vy;
              const dot = dvx * nx + dvy * ny;
              a.vx -= dot * nx * 0.8;
              a.vy -= dot * ny * 0.8;
              b.vx += dot * nx * 0.8;
              b.vy += dot * ny * 0.8;
            }
          }
        }
      }

      // Update splash particles
      const parts = particles.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= 0.025;
        if (p.life <= 0) parts.splice(i, 1);
      }

      // Draw splash particles on overlay canvas
      const splashCvs = splashRef.current;
      if (splashCvs) {
        const sctx = splashCvs.getContext("2d");
        sctx.clearRect(0, 0, splashCvs.width, splashCvs.height);
        for (const p of parts) {
          sctx.save();
          sctx.globalAlpha = p.life;
          sctx.fillStyle = p.color;
          sctx.beginPath();
          sctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          sctx.fill();
          sctx.restore();
        }
      }

      setBlobState([...blobs]);
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  // ── Click handler: select colour + splash ─────────────────
  const handleBlobClick = useCallback(
    (blob, e) => {
      e.stopPropagation();
      onColorSelect(blob.color);

      // Spawn splash particles
      const count = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        particles.current.push({
          x: blob.x,
          y: blob.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          r: 2 + Math.random() * 3,
          color: blob.color,
          life: 1,
        });
      }
    },
    [onColorSelect]
  );

  return (
    <div className="paint-pool-wrapper" ref={containerRef}>
      {/* Wooden bowl – CSS styled */}
      <div className="paint-pool-bowl">
        {/* Splash particle overlay */}
        <canvas
          ref={splashRef}
          width={BOWL_R * 2}
          height={BOWL_R * 2}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Rendered blobs */}
        {blobState.map((b) => (
          <div
            key={b.id}
            onClick={(e) => handleBlobClick(b, e)}
            className="paint-blob"
            style={{
              left: b.x - b.r,
              top: b.y - b.r,
              width: b.r * 2,
              height: b.r * 2,
              background: b.color,
              boxShadow: `0 0 10px ${b.color}88, inset 0 -3px 6px rgba(0,0,0,0.2)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default PaintPool;
