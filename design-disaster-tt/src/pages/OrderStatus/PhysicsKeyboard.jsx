/**
 * PhysicsKeyboard
 * ----------------
 * Letters are physical particles that fall with gravity, bounce off walls,
 * and FLEE from the cursor. After each click every letter explodes outward
 * and the characters reshuffle. Periodic earthquakes add extra chaos.
 *
 * All position updates happen via direct DOM manipulation (no React re-renders
 * per frame) so it stays buttery smooth with 26 particles.
 */

import { useEffect, useRef, useCallback, useState } from "react";

/* ── Tuning knobs ── */
const S = 38;                   // particle size (px)
const GRAVITY = 400;            // px/s²
const REPULSE_R = 120;          // cursor repulsion radius
const REPULSE_K = 8000;         // repulsion strength
const DAMP = 0.998;             // velocity damping per frame
const BOUNCE = 0.7;             // wall bounce restitution
const EXPLODE_LO = 300;         // min explosion speed on click
const EXPLODE_HI = 580;         // max explosion speed on click
const QUAKE_EVERY = 8000;       // ms between earthquakes
const QUAKE_KICK = 350;         // earthquake impulse

/* Fisher-Yates */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhysicsKeyboard({ alphabet, onKeyClick }) {
  const boxRef = useRef(null);
  const ps = useRef([]);           // particle physics state
  const els = useRef([]);          // DOM element refs
  const mouse = useRef({ x: -999, y: -999 });
  const raf = useRef(null);
  const prevT = useRef(null);

  const [chars, setChars] = useState(() => shuffle([...alphabet]));
  const charsRef = useRef(chars);
  charsRef.current = chars;

  const [quake, setQuake] = useState(false);

  /* ── Initialise particles & animation loop ── */
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const { width: W, height: H } = box.getBoundingClientRect();

    // Scatter into a rough grid
    const cols = Math.ceil(Math.sqrt(alphabet.length));
    ps.current = alphabet.map((_, i) => ({
      x: ((i % cols) / cols) * (W - S) + Math.random() * 20,
      y: (Math.floor(i / cols) / Math.ceil(alphabet.length / cols)) * (H - S) + Math.random() * 20,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
    }));

    const step = (t) => {
      if (!prevT.current) prevT.current = t;
      const dt = Math.min((t - prevT.current) / 1000, 0.04);
      prevT.current = t;

      const r = box.getBoundingClientRect();
      const w = r.width, h = r.height;
      const mx = mouse.current.x, my = mouse.current.y;
      const arr = ps.current;

      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];

        // 1. Gravity
        p.vy += GRAVITY * dt;

        // 2. Cursor repulsion
        const dx = p.x + S / 2 - mx;
        const dy = p.y + S / 2 - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPULSE_R && d > 0.5) {
          const f = REPULSE_K / (d * d);
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * dt;
        }

        // 3. Inter-particle push (prevent overlap)
        for (let j = i + 1; j < arr.length; j++) {
          const q = arr[j];
          const ex = p.x - q.x, ey = p.y - q.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < S * 1.05 && ed > 0.1) {
            const push = (S * 1.05 - ed) * 3;
            const nx = ex / ed, ny = ey / ed;
            p.vx += nx * push;
            p.vy += ny * push;
            q.vx -= nx * push;
            q.vy -= ny * push;
          }
        }

        // 4. Damping
        p.vx *= DAMP;
        p.vy *= DAMP;

        // 5. Integrate
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 6. Wall bounce
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * BOUNCE; }
        if (p.x > w - S) { p.x = w - S; p.vx = -Math.abs(p.vx) * BOUNCE; }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * BOUNCE; }
        if (p.y > h - S) { p.y = h - S; p.vy = -Math.abs(p.vy) * BOUNCE; }

        // 7. Push to DOM
        const el = els.current[i];
        if (el) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }

      raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Periodic earthquakes ── */
  useEffect(() => {
    const iv = setInterval(() => {
      ps.current.forEach((p) => {
        p.vx += (Math.random() - 0.5) * QUAKE_KICK * 2;
        p.vy -= Math.random() * QUAKE_KICK;     // bias upward
      });
      setQuake(true);
      setTimeout(() => setQuake(false), 500);
    }, QUAKE_EVERY);
    return () => clearInterval(iv);
  }, []);

  /* ── Mouse tracking ── */
  const onMove = useCallback((e) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (r) mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onLeave = useCallback(() => {
    mouse.current = { x: -999, y: -999 };
  }, []);

  /* ── Click handler ── */
  const handleClick = useCallback(
    (idx) => {
      const char = charsRef.current[idx];
      onKeyClick(char);

      // Explode every particle
      ps.current.forEach((p) => {
        const a = Math.random() * Math.PI * 2;
        const s = EXPLODE_LO + Math.random() * (EXPLODE_HI - EXPLODE_LO);
        p.vx += Math.cos(a) * s;
        p.vy += Math.sin(a) * s - 180;
      });

      // Reshuffle displayed characters
      setChars(shuffle([...alphabet]));
    },
    [alphabet, onKeyClick],
  );

  /* ── Render ── */
  return (
    <div
      ref={boxRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`
        relative w-full flex-1 rounded-2xl overflow-hidden
        border-2 border-amber-400/30
        ${quake ? "os-quake" : ""}
      `}
      style={{
        minHeight: 180,
        background:
          "radial-gradient(ellipse at 50% 80%, rgba(120,53,15,0.3) 0%, rgba(0,0,0,0.45) 100%)",
      }}
    >
      {/* Faint grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(251,191,36,0.6) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(251,191,36,0.6) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Particles */}
      {chars.map((ch, i) => (
        <div
          key={i}
          ref={(el) => (els.current[i] = el)}
          onClick={() => handleClick(i)}
          className="
            absolute flex items-center justify-center rounded-xl
            bg-linear-to-br from-amber-400 to-orange-500
            text-white font-extrabold font-mono
            border-2 border-amber-600/80 cursor-pointer
            shadow-[0_3px_0_#92400e,0_3px_8px_rgba(0,0,0,0.35)]
            hover:from-yellow-300 hover:to-amber-500
            active:shadow-[0_1px_0_#92400e]
            select-none
          "
          style={{
            width: S,
            height: S,
            fontSize: 14,
            willChange: "transform",
            lineHeight: 1,
          }}
        >
          {ch}
        </div>
      ))}

      {/* Bottom label */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-amber-400/25 select-none pointer-events-none tracking-wider whitespace-nowrap">
        ⚡ letters flee your cursor &bull; earthquakes every 8 s &bull; keys reshuffle on click
      </div>
    </div>
  );
}
