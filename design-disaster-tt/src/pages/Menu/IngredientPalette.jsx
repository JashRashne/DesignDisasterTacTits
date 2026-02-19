/**
 * IngredientPalette Component  — BAD UI EDITION 🔥
 * ---------------------------------------------------
 * A deliberately frustrating colour picker designed for a
 * "Design Disaster" competition.
 *
 * Frustration mechanics:
 *  1. DODGE — ingredients flee the cursor when it gets close.
 *  2. MULTI-CHOP — need 3 rapid chops to actually select a colour;
 *     progress decays if you're too slow.
 *  3. WRONG COLOUR — 25 % chance of silently giving a random
 *     *different* colour after all that effort.
 *  4. SHUFFLE — ingredients swap positions every 4 seconds.
 *  5. TAUNTS — failed attempts show snarky floating text.
 *
 * Props:
 *   activeColor   – current brush colour (for highlight ring)
 *   onColorSelect – (color: string) => void
 */

import { useState, useRef, useEffect, useCallback } from "react";

const INGREDIENTS = [
  { emoji: "🍅", name: "Tomato",    color: "#e74c3c" },
  { emoji: "🥕", name: "Carrot",    color: "#e67e22" },
  { emoji: "🍋", name: "Lemon",     color: "#f1c40f" },
  { emoji: "🌿", name: "Basil",     color: "#27ae60" },
  { emoji: "🫐", name: "Blueberry", color: "#2980b9" },
  { emoji: "🍆", name: "Eggplant",  color: "#8e44ad" },
  { emoji: "🍫", name: "Chocolate", color: "#6d4c2a" },
  { emoji: "🧄", name: "Garlic",    color: "#ecf0f1" },
];

const TAUNTS = [
  "Too slow, chef! 🐌",
  "Almost! Try harder.",
  "Nope! 😈",
  "Wrong one, butterfingers!",
  "So close... not really.",
  "Keep chopping! 🔪",
  "You call that a chop?",
  "My grandmother chops faster.",
  "Ha! Missed!",
];

const CHOPS_REQUIRED = 3;       // rapid chops needed to select
const CHOP_WINDOW_MS = 900;     // max time between chops before reset
const DODGE_RADIUS = 75;        // px — cursor proximity that triggers flee
const SHUFFLE_INTERVAL = 4000;  // ms between position shuffles
const WRONG_COLOR_CHANCE = 0.25;

function IngredientPalette({ activeColor, onColorSelect }) {
  // ── Order shuffle state ─────────────────────────────────
  const [order, setOrder] = useState(() => INGREDIENTS.map((_, i) => i));

  // ── Dodge offsets (each ingredient can flee) ────────────
  const [offsets, setOffsets] = useState(() => INGREDIENTS.map(() => ({ x: 0, y: 0 })));

  // ── Chop progress per ingredient ────────────────────────
  const chopCounts  = useRef(INGREDIENTS.map(() => 0));
  const chopTimers  = useRef(INGREDIENTS.map(() => 0)); // last chop timestamp
  const [chopProgress, setChopProgress] = useState(INGREDIENTS.map(() => 0));

  // ── Chop / animation state ─────────────────────────────
  const [choppedIdx, setChoppedIdx] = useState(null);

  // ── Floating taunt text ─────────────────────────────────
  const [taunt, setTaunt] = useState(null); // { text, x, y, id }
  const tauntId = useRef(0);

  // ── Splatter particles ─────────────────────────────────
  const splatCanvasRef = useRef(null);
  const particles = useRef([]);
  const rafId = useRef(null);

  // ── Periodic position shuffle ──────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setOrder(prev => {
        const next = [...prev];
        // Fisher-Yates shuffle
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
    }, SHUFFLE_INTERVAL);
    return () => clearInterval(iv);
  }, []);

  // ── Chop progress decay (reset if idle) ────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      let changed = false;
      chopCounts.current.forEach((cnt, i) => {
        if (cnt > 0 && now - chopTimers.current[i] > CHOP_WINDOW_MS) {
          chopCounts.current[i] = 0;
          changed = true;
        }
      });
      if (changed) {
        setChopProgress(chopCounts.current.map(c => c));
      }
    }, 300);
    return () => clearInterval(iv);
  }, []);

  // ── Particle animation loop ───────────────────────────────
  useEffect(() => {
    const tick = () => {
      const cvs = splatCanvasRef.current;
      if (!cvs) { rafId.current = requestAnimationFrame(tick); return; }
      const ctx = cvs.getContext("2d");
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      const parts = particles.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        if (p.life <= 0) { parts.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  // ── Dodge — ingredients flee the cursor ───────────────────
  const handlePalettePointerMove = useCallback((e) => {
    const palette = e.currentTarget;
    const items = palette.querySelectorAll(".ingredient-item");
    const newOffsets = [...offsets];

    items.forEach((el, visualIdx) => {
      const realIdx = order[visualIdx];
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = cx - e.clientX;
      const dy = cy - e.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DODGE_RADIUS && dist > 0) {
        // Flee away from cursor
        const flee = (DODGE_RADIUS - dist) * 0.8;
        const nx = (dx / dist) * flee;
        const ny = (dy / dist) * flee;
        newOffsets[realIdx] = {
          x: Math.max(-40, Math.min(40, nx)),
          y: Math.max(-30, Math.min(30, ny)),
        };
      } else {
        // Ease back to original position
        newOffsets[realIdx] = {
          x: newOffsets[realIdx].x * 0.85,
          y: newOffsets[realIdx].y * 0.85,
        };
      }
    });

    setOffsets(newOffsets);
  }, [offsets, order]);

  // ── Show taunt ────────────────────────────────────────────
  const showTaunt = useCallback((x, y) => {
    const text = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    const id = ++tauntId.current;
    setTaunt({ text, x, y, id });
    setTimeout(() => setTaunt(prev => prev?.id === id ? null : prev), 1200);
  }, []);

  // ── Chop handler ──────────────────────────────────────────
  const handleChop = useCallback((realIdx, e) => {
    const now = Date.now();
    const ing = INGREDIENTS[realIdx];

    // Check if previous chop was within window
    if (now - chopTimers.current[realIdx] > CHOP_WINDOW_MS) {
      chopCounts.current[realIdx] = 0; // reset — too slow
    }

    chopCounts.current[realIdx] += 1;
    chopTimers.current[realIdx] = now;
    setChopProgress([...chopCounts.current]);

    // Chop animation
    setChoppedIdx(realIdx);
    setTimeout(() => setChoppedIdx(null), 400);

    // Spawn splatter
    const rect = splatCanvasRef.current?.getBoundingClientRect();
    const btn  = e.currentTarget.getBoundingClientRect();
    if (rect) {
      const cx = btn.left + btn.width / 2 - rect.left;
      const cy = btn.top  + btn.height / 2 - rect.top;
      const count = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.current.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: 2 + Math.random() * 4,
          color: ing.color,
          life: 1,
        });
      }
    }

    // ── Check if enough chops reached ──────────────────────
    if (chopCounts.current[realIdx] >= CHOPS_REQUIRED) {
      chopCounts.current[realIdx] = 0;
      setChopProgress([...chopCounts.current]);

      // 25 % chance: give a WRONG colour 😈
      if (Math.random() < WRONG_COLOR_CHANCE) {
        const others = INGREDIENTS.filter((_, i) => i !== realIdx);
        const wrong = others[Math.floor(Math.random() * others.length)];
        onColorSelect(wrong.color);
        // Delayed taunt
        setTimeout(() => {
          const r2 = e.currentTarget?.getBoundingClientRect?.();
          showTaunt(r2 ? r2.left : 60, r2 ? r2.top - 10 : 200);
        }, 100);
      } else {
        onColorSelect(ing.color);
      }
    } else {
      // Not enough chops yet — taunt
      const r2 = e.currentTarget.getBoundingClientRect();
      showTaunt(r2.left + r2.width / 2, r2.top - 10);
    }
  }, [onColorSelect, showTaunt]);

  return (
    <div
      className="ingredient-palette"
      onPointerMove={handlePalettePointerMove}
    >
      {/* Splatter particle overlay */}
      <canvas
        ref={splatCanvasRef}
        width={180}
        height={700}
        className="ingredient-splat-canvas"
      />

      {/* Shelf label */}
      <div className="ingredient-shelf-label">Ingredients</div>

      {/* Ingredient buttons in shuffled order */}
      <div className="ingredient-list">
        {order.map((realIdx, visualIdx) => {
          const ing = INGREDIENTS[realIdx];
          const isActive  = activeColor === ing.color;
          const isChopped = choppedIdx === realIdx;
          const off = offsets[realIdx];
          const progress = chopProgress[realIdx] || 0;

          return (
            <button
              key={ing.name}
              onClick={(e) => handleChop(realIdx, e)}
              className={`ingredient-item ${isChopped ? "ingredient-chopped" : ""} ${isActive ? "ingredient-active" : ""}`}
              title={ing.name}
              style={{
                transform: `translate(${off.x}px, ${off.y}px)`,
                transition: "transform 0.15s ease, border-color 0.2s ease, background 0.2s ease",
              }}
            >
              <span className="ingredient-emoji">{ing.emoji}</span>
              <span
                className="ingredient-dot"
                style={{ background: ing.color }}
              />
              {/* Chop progress pips */}
              {progress > 0 && (
                <div className="chop-progress">
                  {Array.from({ length: CHOPS_REQUIRED }).map((_, i) => (
                    <div
                      key={i}
                      className={`chop-pip ${i < progress ? "chop-pip-filled" : ""}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating taunt text */}
      {taunt && (
        <div
          className="ingredient-taunt"
          key={taunt.id}
          style={{ left: taunt.x, top: taunt.y }}
        >
          {taunt.text}
        </div>
      )}
    </div>
  );
}

export default IngredientPalette;
