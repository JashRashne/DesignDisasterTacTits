/**
 * ConfirmButton Component — WRECKING BALL PENDULUM EDITION
 * ---------------------------------------------------------
 * A button that swings on a chain like a wrecking ball.
 * The user must time their click to hit it while it swings
 * through the clickable zone. 15-second countdown timer.
 *
 * Physics:
 *  - Realistic pendulum motion with gravity and damping.
 *  - Random "wind gusts" that change the swing amplitude.
 *  - Chain links rendered as SVG circles.
 *  - Button at the end of the chain swings with momentum.
 *
 * Props:
 *   visible    – show the button (after Gemini result)
 *   onConfirm  – () => void, called on successful click
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ── Physics constants ──────────────────────────────────── */
const GRAVITY       = 28;           // cranked-up gravity for fast swings
const CHAIN_LENGTH  = 320;          // px – visual chain length
const DAMPING       = 0.9985;       // barely any energy loss
const TIME_LIMIT    = 15;           // seconds
const CHAIN_LINKS   = 14;           // number of chain circles
const LINK_RADIUS   = 5;
const TARGET_RADIUS = 65;           // px – clickable zone radius
// Target zone: circle at the very bottom of the pendulum arc (angle ≈ 0)

/* ── Taunts shown on the timer bar ──────────────────────── */
const TAUNTS = [
  "Swing it, chef!",
  "Tick tock...",
  "Aim carefully!",
  "Time's running out!",
  "You got this... maybe.",
  "Wrecking ball incoming!",
];

function ConfirmButton({ visible, onConfirm }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  // Pendulum physics state (refs for rAF performance)
  const angleRef      = useRef(Math.PI / 3);    // start angle (radians)
  const angVelRef     = useRef(0);               // angular velocity
  const lastFrameRef  = useRef(0);

  // React state for rendering
  const [angle, setAngle]         = useState(Math.PI / 3);
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [expired, setExpired]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [taunt, setTaunt]         = useState(TAUNTS[0]);
  const [inZone, setInZone]       = useState(false); // ball inside target?

  // Pivot point (top-center of screen)
  const pivotX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
  const pivotY = 0;

  // ── Compute ball position from angle ─────────────────────
  const getBallPos = useCallback((a) => ({
    x: pivotX + Math.sin(a) * CHAIN_LENGTH,
    y: pivotY + Math.cos(a) * CHAIN_LENGTH,
  }), [pivotX, pivotY]);

  // ── Physics tick ─────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const remaining = Math.max(0, TIME_LIMIT - elapsed);
    setTimeLeft(remaining);

    if (remaining <= 0) {
      setExpired(true);
      return; // stop the loop
    }

    // Delta time in seconds (capped to avoid spiral)
    const dt = Math.min((timestamp - (lastFrameRef.current || timestamp)) / 1000, 0.05);
    lastFrameRef.current = timestamp;

    // Pendulum equation: α'' = -(g/L) * sin(α) 
    const angAccel = -(GRAVITY / (CHAIN_LENGTH / 100)) * Math.sin(angleRef.current);
    angVelRef.current += angAccel * dt;
    angVelRef.current *= DAMPING;
    angleRef.current  += angVelRef.current * dt;

    // Random wind gusts — more frequent & stronger
    if (Math.random() < 0.008) {
      angVelRef.current += (Math.random() - 0.5) * 4;
    }

    // Speed up as timer gets lower (increasing panic)
    if (remaining < 8) {
      angVelRef.current *= 1.002;
    }
    if (remaining < 4) {
      angVelRef.current *= 1.003;
    }

    setAngle(angleRef.current);

    // Check if ball is inside the target zone (bottom of arc)
    const ballX = (typeof window !== "undefined" ? window.innerWidth / 2 : 500)
                  + Math.sin(angleRef.current) * CHAIN_LENGTH;
    const ballY = Math.cos(angleRef.current) * CHAIN_LENGTH;
    const targetX = (typeof window !== "undefined" ? window.innerWidth / 2 : 500);
    const targetY = CHAIN_LENGTH;
    const distToTarget = Math.sqrt((ballX - targetX) ** 2 + (ballY - targetY) ** 2);
    setInZone(distToTarget <= TARGET_RADIUS);

    // Rotate taunts
    if (Math.floor(elapsed) % 3 === 0 && dt > 0) {
      setTaunt(TAUNTS[Math.floor(elapsed / 3) % TAUNTS.length]);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Start / stop physics loop ────────────────────────────
  useEffect(() => {
    if (visible && !confirmed) {
      // Reset — start with a big swing
      angleRef.current    = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.4);
      angVelRef.current   = (Math.random() - 0.5) * 3;
      lastFrameRef.current = 0;
      startTimeRef.current = null;
      setExpired(false);
      setConfirmed(false);
      setTimeLeft(TIME_LIMIT);

      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, confirmed, tick]);

  // ── Click handler — only works when ball is in the target zone ──
  const handleBallClick = useCallback((e) => {
    e.stopPropagation();
    if (expired || confirmed) return;
    if (!inZone) return; // miss! ball isn't in the target zone
    setConfirmed(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (onConfirm) onConfirm();
    setTimeout(() => navigate("/order-status"), 600);
  }, [expired, confirmed, inZone, onConfirm, navigate]);

  // ── Retry after time-out ─────────────────────────────────
  const handleRetry = useCallback(() => {
    setExpired(false);
    setConfirmed(false);
    angleRef.current    = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3 + Math.random() * 0.4);
    angVelRef.current   = (Math.random() - 0.5) * 3;
    lastFrameRef.current = 0;
    startTimeRef.current = null;
    setTimeLeft(TIME_LIMIT);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  if (!visible) return null;

  const ballPos = getBallPos(angle);
  const timerPct = (timeLeft / TIME_LIMIT) * 100;

  // Build chain link positions (evenly spaced along the chain)
  const chainLinks = [];
  for (let i = 1; i <= CHAIN_LINKS; i++) {
    const frac = i / (CHAIN_LINKS + 1);
    const linkAngle = angle * frac; // partial angle for natural drape
    chainLinks.push({
      x: pivotX + Math.sin(linkAngle) * (CHAIN_LENGTH * frac),
      y: pivotY + Math.cos(linkAngle) * (CHAIN_LENGTH * frac),
    });
  }

  return (
    <div ref={containerRef} className="confirm-btn-zone pendulum-zone">
      {/* ── Timer bar ── */}
      <div className="pendulum-timer-bar">
        <div
          className="pendulum-timer-fill"
          style={{
            width: `${timerPct}%`,
            background: timeLeft < 5
              ? "linear-gradient(90deg, #e74c3c, #c0392b)"
              : "linear-gradient(90deg, #2ecc71, #27ae60)",
          }}
        />
        <span className="pendulum-timer-text">
          {expired ? "TIME'S UP!" : `${Math.ceil(timeLeft)}s — ${taunt}`}
        </span>
      </div>

      {/* ── SVG chain + pivot + target zone ── */}
      <svg className="pendulum-svg" width="100%" height="100%">
        {/* Target zone indicator — pulsing circle at the bottom of the arc */}
        <circle
          cx={pivotX}
          cy={CHAIN_LENGTH}
          r={TARGET_RADIUS}
          fill="none"
          stroke={inZone ? "#2ecc71" : "rgba(255,255,255,0.25)"}
          strokeWidth={inZone ? 4 : 2}
          strokeDasharray={inZone ? "none" : "8 6"}
          className="pendulum-target-ring"
        />
        {/* "Click here" label below the target */}
        <text
          x={pivotX}
          y={CHAIN_LENGTH + TARGET_RADIUS + 22}
          textAnchor="middle"
          fill={inZone ? "#2ecc71" : "rgba(255,255,255,0.35)"}
          fontSize="13"
          fontWeight="800"
          fontFamily="'Comic Sans MS', cursive"
        >
          {inZone ? "NOW! CLICK!" : "⬇ Target Zone ⬇"}
        </text>

        {/* Pivot bracket */}
        <rect
          x={pivotX - 20} y={0}
          width={40} height={10}
          rx={3}
          fill="#5a3318"
          stroke="#3e2210"
          strokeWidth={2}
        />
        <circle cx={pivotX} cy={6} r={6} fill="#8b5e34" stroke="#3e2210" strokeWidth={2} />

        {/* Chain line (behind links) */}
        <line
          x1={pivotX} y1={6}
          x2={ballPos.x} y2={ballPos.y}
          stroke="#5a5a5a"
          strokeWidth={3}
          opacity={0.3}
        />

        {/* Chain links */}
        {chainLinks.map((link, i) => (
          <circle
            key={i}
            cx={link.x}
            cy={link.y}
            r={LINK_RADIUS}
            fill={i % 2 === 0 ? "#7f8c8d" : "#95a5a6"}
            stroke="#5a5a5a"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {/* ── Wrecking ball button ── */}
      {!expired && !confirmed && (
        <button
          className={`pendulum-ball-btn ${inZone ? "pendulum-ball-in-zone" : "pendulum-ball-out-zone"}`}
          onClick={handleBallClick}
          style={{
            left: ballPos.x,
            top: ballPos.y,
            transform: `translate(-50%, -50%) rotate(${angle * 20}deg)`,
            cursor: inZone ? "pointer" : "not-allowed",
          }}
        >
          {inZone ? "CLICK NOW! 🍽️" : "Confirm 🍽️"}
        </button>
      )}

      {/* ── Confirmed flash ── */}
      {confirmed && (
        <div className="pendulum-confirmed-msg">
          Order Confirmed! 🎉
        </div>
      )}

      {/* ── Expired overlay ── */}
      {expired && !confirmed && (
        <div className="pendulum-expired">
          <div className="pendulum-expired-text">Time's Up! ⏰</div>
          <button className="pendulum-retry-btn" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default ConfirmButton;
