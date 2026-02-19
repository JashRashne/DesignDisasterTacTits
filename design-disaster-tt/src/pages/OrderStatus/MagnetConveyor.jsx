/**
 * MagnetConveyor
 * ───────────────
 * Multiple conveyor belt lanes scroll letters horizontally at different speeds
 * and directions. The user positions a magnet (follows cursor) and clicks to
 * "grab" whichever letter is under the magnet. After a grab, all belt speeds
 * randomise and letters reshuffle. Periodically belts reverse direction or
 * speed up to keep things chaotic.
 *
 * Props:
 *   alphabet   – array of single characters
 *   onKeyClick – (char) => void
 */

import { useEffect, useRef, useState, useCallback } from "react";

/* ── Tuning ── */
const LANE_COUNT = 4;                // number of horizontal belt lanes
const TILE = 40;                     // tile size px
const GAP = 6;                       // gap between tiles
const SPEED_LO = 40;                 // min belt speed (px/s)
const SPEED_HI = 140;                // max belt speed (px/s)
const CHAOS_INTERVAL = 5000;         // ms between speed/direction chaos events
const MAGNET_RADIUS = 48;            // visual magnet radius
const GRAB_RADIUS = 44;              // how close the magnet must be to "catch" a tile

/* ── Helpers ── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomSpeed() {
  return (SPEED_LO + Math.random() * (SPEED_HI - SPEED_LO)) * (Math.random() > 0.5 ? 1 : -1);
}

/* ═══════════════════════════════════════════════════════════ */

export default function MagnetConveyor({ alphabet, onKeyClick }) {
  const containerRef = useRef(null);
  const lanesRef = useRef([]);           // per-lane: { speed, chars[], offsets[] }
  const elemsRef = useRef([]);           // flat array of tile DOM elements
  const magnetRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999, inside: false });
  const rafRef = useRef(null);
  const prevTRef = useRef(null);

  /* React state for grab flash feedback */
  const [flash, setFlash] = useState(null); // { x, y, char }

  /* ── Distribute letters across lanes ── */
  const buildLanes = useCallback(() => {
    const shuffled = shuffle([...alphabet]);
    const perLane = Math.ceil(shuffled.length / LANE_COUNT);
    const lanes = [];
    for (let l = 0; l < LANE_COUNT; l++) {
      const chars = shuffled.slice(l * perLane, (l + 1) * perLane);
      lanes.push({
        speed: randomSpeed(),
        chars,
        // Start tiles evenly spaced
        offsets: chars.map((_, i) => i * (TILE + GAP)),
      });
    }
    return lanes;
  }, [alphabet]);

  /* ── Init & animation loop ── */
  useEffect(() => {
    lanesRef.current = buildLanes();
    prevTRef.current = null;

    const step = (t) => {
      if (!prevTRef.current) prevTRef.current = t;
      const dt = Math.min((t - prevTRef.current) / 1000, 0.05);
      prevTRef.current = t;

      const container = containerRef.current;
      if (!container) { rafRef.current = requestAnimationFrame(step); return; }
      const cw = container.clientWidth;

      let flatIdx = 0;
      for (let l = 0; l < lanesRef.current.length; l++) {
        const lane = lanesRef.current[l];
        const totalWidth = lane.chars.length * (TILE + GAP);

        for (let i = 0; i < lane.chars.length; i++) {
          // Move
          lane.offsets[i] += lane.speed * dt;

          // Wrap around
          if (lane.speed > 0 && lane.offsets[i] > cw + TILE) {
            lane.offsets[i] = -TILE - GAP;
          } else if (lane.speed < 0 && lane.offsets[i] < -TILE - GAP) {
            lane.offsets[i] = cw + TILE;
          }

          // Push to DOM
          const el = elemsRef.current[flatIdx];
          if (el) {
            el.style.transform = `translateX(${lane.offsets[i]}px)`;
          }
          flatIdx++;
        }
      }

      // Magnet follows cursor
      if (magnetRef.current && mouseRef.current.inside) {
        magnetRef.current.style.left = mouseRef.current.x + "px";
        magnetRef.current.style.top = mouseRef.current.y + "px";
        magnetRef.current.style.opacity = "1";
      } else if (magnetRef.current) {
        magnetRef.current.style.opacity = "0";
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [buildLanes]);

  /* ── Periodic chaos: reverse / speed change ── */
  useEffect(() => {
    const iv = setInterval(() => {
      lanesRef.current.forEach((lane) => {
        // 50% chance reverse, always new speed
        const newSpeed = randomSpeed();
        lane.speed = Math.random() > 0.5 ? -lane.speed * 1.3 : newSpeed;
        // Clamp
        if (Math.abs(lane.speed) > SPEED_HI * 1.8) lane.speed = randomSpeed();
      });
    }, CHAOS_INTERVAL);
    return () => clearInterval(iv);
  }, []);

  /* ── Mouse tracking ── */
  const onMove = useCallback((e) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (r) {
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
    }
  }, []);
  const onLeave = useCallback(() => { mouseRef.current.inside = false; }, []);

  /* ── Click → grab nearest letter under magnet ── */
  const handleClick = useCallback(() => {
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    if (!mouseRef.current.inside) return;

    // Find nearest tile
    let bestDist = Infinity;
    let bestLane = -1;
    let bestIdx = -1;

    const laneHeight = containerRef.current
      ? (containerRef.current.clientHeight - 16) / LANE_COUNT
      : 60;

    for (let l = 0; l < lanesRef.current.length; l++) {
      const lane = lanesRef.current[l];
      const cy = 8 + l * laneHeight + laneHeight / 2;
      for (let i = 0; i < lane.chars.length; i++) {
        const cx = lane.offsets[i] + TILE / 2;
        const d = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
        if (d < bestDist) {
          bestDist = d;
          bestLane = l;
          bestIdx = i;
        }
      }
    }

    if (bestDist > GRAB_RADIUS) return; // too far

    const char = lanesRef.current[bestLane].chars[bestIdx];
    onKeyClick(char);

    // Flash feedback
    const laneY = 8 + bestLane * laneHeight + laneHeight / 2;
    setFlash({ x: lanesRef.current[bestLane].offsets[bestIdx], y: laneY, char });
    setTimeout(() => setFlash(null), 400);

    // Chaos after grab: reshuffle chars across all lanes & randomise speeds
    const allChars = shuffle([...alphabet]);
    const perLane = Math.ceil(allChars.length / LANE_COUNT);
    for (let l = 0; l < lanesRef.current.length; l++) {
      const chunk = allChars.slice(l * perLane, (l + 1) * perLane);
      lanesRef.current[l].chars = chunk;
      lanesRef.current[l].speed = randomSpeed() * (1.2 + Math.random() * 0.5);

      // Update DOM text
      let flatBase = 0;
      for (let ll = 0; ll < l; ll++) flatBase += lanesRef.current[ll].chars.length;
      // recalc after reassignment — use old length for elem refs
    }
    // Force a re-render so tile labels update
    setForceKey((k) => k + 1);
  }, [alphabet, onKeyClick]);

  /* Force re-render key for tile labels after reshuffle */
  const [forceKey, setForceKey] = useState(0);

  /* ── Build flat list of tiles for rendering ── */
  const lanes = lanesRef.current.length > 0 ? lanesRef.current : buildLanes();
  // Keep ref in sync on first render
  if (lanesRef.current.length === 0) lanesRef.current = lanes;

  const laneHeight = 100 / LANE_COUNT; // percentage

  let flatIdx = 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={handleClick}
      className="relative w-full flex-1 rounded-2xl overflow-hidden border-2 border-amber-400/30 cursor-none"
      style={{
        minHeight: 200,
        background:
          "repeating-linear-gradient(90deg, rgba(120,53,15,0.15) 0px, rgba(120,53,15,0.15) 2px, transparent 2px, transparent 40px)," +
          "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(60,30,10,0.4) 100%)",
      }}
    >
      {/* Belt lane backgrounds */}
      {Array.from({ length: LANE_COUNT }).map((_, l) => (
        <div
          key={"lane-bg-" + l}
          className="absolute left-0 right-0"
          style={{
            top: `${l * laneHeight}%`,
            height: `${laneHeight}%`,
            background:
              l % 2 === 0
                ? "linear-gradient(180deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.03) 100%)"
                : "linear-gradient(180deg, rgba(251,191,36,0.03) 0%, rgba(251,191,36,0.08) 100%)",
            borderBottom: l < LANE_COUNT - 1 ? "1px solid rgba(251,191,36,0.12)" : "none",
          }}
        >
          {/* Belt track lines */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-600/15" />
          {/* Direction arrow hints */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-500/20 select-none pointer-events-none">
            {lanes[l]?.speed > 0 ? "→→→" : "←←←"}
          </div>
        </div>
      ))}

      {/* Letter tiles — absolutely positioned, animated via JS */}
      {lanes.map((lane, l) =>
        lane.chars.map((ch, i) => {
          const idx = flatIdx++;
          return (
            <div
              key={`${l}-${i}-${forceKey}`}
              ref={(el) => (elemsRef.current[idx] = el)}
              className="
                absolute flex items-center justify-center rounded-lg
                bg-linear-to-br from-amber-400 to-orange-500
                text-white font-extrabold font-mono text-sm
                border-2 border-amber-700/60
                shadow-[0_2px_0_#92400e,0_2px_6px_rgba(0,0,0,0.35)]
                select-none pointer-events-none
              "
              style={{
                width: TILE,
                height: TILE,
                top: `calc(${l * laneHeight}% + ${laneHeight / 2}% - ${TILE / 2}px)`,
                left: 0,
                willChange: "transform",
              }}
            >
              {ch}
            </div>
          );
        })
      )}

      {/* Grab flash */}
      {flash && (
        <div
          className="absolute pointer-events-none os-grab-flash"
          style={{
            left: flash.x + TILE / 2 - 24,
            top: flash.y - 24,
            width: 48,
            height: 48,
          }}
        >
          <div className="w-full h-full rounded-full bg-amber-300/60 border-2 border-amber-400" />
          <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-amber-900">
            {flash.char}
          </span>
        </div>
      )}

      {/* Magnet cursor */}
      <div
        ref={magnetRef}
        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 transition-opacity duration-150"
        style={{ opacity: 0 }}
      >
        {/* Magnet visual */}
        <div className="relative" style={{ width: MAGNET_RADIUS * 2, height: MAGNET_RADIUS * 2 }}>
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-red-500/70"
            style={{
              background: "radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)",
              boxShadow: "0 0 20px rgba(220,38,38,0.3), inset 0 0 15px rgba(220,38,38,0.15)",
            }}
          />
          {/* Horseshoe magnet icon */}
          <div className="absolute inset-0 flex items-center justify-center text-2xl select-none">
            🧲
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-red-400/40 os-magnet-pulse" />
        </div>
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-amber-400/30 select-none pointer-events-none tracking-wider whitespace-nowrap z-10">
        🧲 position magnet over a letter &bull; click to grab &bull; belts reshuffle after each grab
      </div>
    </div>
  );
}
