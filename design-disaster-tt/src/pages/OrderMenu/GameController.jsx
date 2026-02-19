/**
 * GameController Component
 * -------------------------
 * Orchestrates the entire interactive scene:
 *
 * 1. Mount → Chef slides up (5.5 s).
 * 2. After chef entrance → Speech cloud fades in.
 * 3. User drags words into correct slots.
 *    - Correct  → snap into place, mark filled.
 *    - Incorrect → shake animation, word returns to tray.
 * 4. Every 5 s, one already-placed word gets displaced from
 *    its slot back to the tray — the user must re-place it.
 * 5. Sentence complete → cloud glows, chef bounces, 1 s success,
 *    then smooth fade-out and navigate to next page.
 *
 * All state management lives here; child components are presentational.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Background from "./Background";
import Chef from "./Chef";
import SpeechCloud from "./SpeechCloud";
import WordTray from "./WordTray";

// The target sentence in correct order
const SENTENCE = ["please", "draw", "to", "place", "order"];

// Utility: Fisher-Yates shuffle (returns new array)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gentle shuffle: swap only 1 random adjacent pair so the order
// barely changes — keeps it solvable in ~10 seconds.
function gentleShuffle(arr) {
  const a = [...arr];
  if (a.length < 2) return a;
  const i = Math.floor(Math.random() * (a.length - 1));
  [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a;
}

function GameController() {
  const navigate = useNavigate();

  /* ─── State ─────────────────────────────────────────────── */

  // Chef entrance
  const [chefVisible, setChefVisible] = useState(false);

  // Speech cloud visibility (after chef arrives)
  const [cloudVisible, setCloudVisible] = useState(false);

  // Slots: each word in the sentence with its filled status
  const [slots, setSlots] = useState(
    SENTENCE.map((word) => ({ word, filled: false }))
  );

  // Tray words: shuffled, with tracking
  const [trayWords, setTrayWords] = useState(() =>
    shuffle(SENTENCE.map((w, i) => ({ word: w, placed: false, id: i })))
  );

  // Animation flags
  const [cloudGlow, setCloudGlow] = useState(false);
  const [chefBounce, setChefBounce] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [shakeSlot, setShakeSlot] = useState(null); // index of slot to shake

  // Shuffle key — incremented to re-scatter tray words
  const [shuffleKey, setShuffleKey] = useState(0);

  // Completion flag
  const [completed, setCompleted] = useState(false);

  // Pointer-based drag state (for touch / mouse fallback)
  const [dragState, setDragState] = useState(null); // { word, x, y }

  // Refs for slot DOM elements (used by pointer-based drag)
  const slotRefs = useRef([]);

  /* ─── Timers: Chef entrance → cloud appear ─────────────── */

  useEffect(() => {
    // Start chef slide-up shortly after mount
    const t1 = setTimeout(() => setChefVisible(true), 300);

    // Show speech cloud after chef finishes sliding up (~6 s total)
    const t2 = setTimeout(() => setCloudVisible(true), 6200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  /* ─── Periodic shuffle every 3–4 seconds ───────────────── */

  useEffect(() => {
    if (completed || !cloudVisible) return;

    const interval = setInterval(() => {
      triggerShuffle();
    }, 5000);

    return () => clearInterval(interval);
  }, [completed, cloudVisible]);

  /* ─── Shuffle helper ───────────────────────────────────── */
  // Displaces 1 random filled word from the cloud back to the tray.
  // Uses functional setState to avoid stale closures in setInterval.

  const triggerShuffle = useCallback(() => {
    setSlots((prevSlots) => {
      // Find which slots are currently filled
      const filledIndices = prevSlots
        .map((s, i) => (s.filled ? i : -1))
        .filter((i) => i !== -1);

      // Nothing to displace
      if (filledIndices.length === 0) return prevSlots;

      // Pick 1 random filled slot to kick out
      const targetIdx =
        filledIndices[Math.floor(Math.random() * filledIndices.length)];
      const displacedWord = prevSlots[targetIdx].word;

      // Return the word to the tray
      setTrayWords((prevTray) => {
        const updated = prevTray.map((w) =>
          w.word === displacedWord && w.placed
            ? { ...w, placed: false }
            : w
        );
        return gentleShuffle(updated);
      });
      setShuffleKey((k) => k + 1);

      // Unfill that slot
      return prevSlots.map((s, i) =>
        i === targetIdx ? { ...s, filled: false } : s
      );
    });
  }, []);

  /* ─── Drop handler (HTML5 drag-and-drop) ───────────────── */

  const handleSlotDrop = useCallback(
    (slotIndex, droppedWord) => {
      if (completed) return;

      const slot = slots[slotIndex];

      // Already filled — ignore
      if (slot.filled) return;

      // Check correctness
      if (droppedWord === slot.word) {
        // ✅ Correct — snap into place
        const newSlots = slots.map((s, i) =>
          i === slotIndex ? { ...s, filled: true } : s
        );
        setSlots(newSlots);

        // Mark word as placed in tray
        setTrayWords((prev) =>
          prev.map((w) =>
            w.word === droppedWord && !w.placed ? { ...w, placed: true } : w
          )
        );

        // Check completion
        if (newSlots.every((s) => s.filled)) {
          handleCompletion();
        }
      } else {
        // ❌ Incorrect — shake that slot
        setShakeSlot(slotIndex);
        setTimeout(() => setShakeSlot(null), 500);
      }
    },
    [slots, completed]
  );

  /* ─── Pointer-based drag (touch/mobile support) ────────── */

  const handlePointerDown = useCallback((e, word) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      word,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      offsetX: e.clientX - (rect.left + rect.width / 2),
      offsetY: e.clientY - (rect.top + rect.height / 2),
    });
  }, []);

  // Global pointer move / up for drag
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e) => {
      setDragState((prev) =>
        prev ? { ...prev, x: e.clientX - prev.offsetX, y: e.clientY - prev.offsetY } : null
      );
    };

    const handleUp = (e) => {
      // Check if dropped over any slot
      const dropX = e.clientX;
      const dropY = e.clientY;

      let matched = false;
      slotRefs.current.forEach((el, idx) => {
        if (!el || matched) return;
        const rect = el.getBoundingClientRect();
        if (
          dropX >= rect.left &&
          dropX <= rect.right &&
          dropY >= rect.top &&
          dropY <= rect.bottom
        ) {
          handleSlotDrop(idx, dragState.word);
          matched = true;
        }
      });

      if (!matched) {
        // If not dropped on a slot – just return to tray (no-op)
      }

      setDragState(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState, handleSlotDrop]);

  /* ─── Completion sequence ──────────────────────────────── */

  const handleCompletion = useCallback(() => {
    setCompleted(true);
    setCloudGlow(true);
    setChefBounce(true);

    // After 1 s success animation, fade out and navigate
    setTimeout(() => {
      setFadeOut(true);

      // Navigate after fade-out completes (700 ms)
      setTimeout(() => {
        navigate("/menu");
      }, 800);
    }, 1200);
  }, [navigate]);

  /* ─── Render ───────────────────────────────────────────── */

  return (
    <div
      className={`
        relative w-screen h-screen overflow-hidden
        transition-opacity duration-700
        ${fadeOut ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Full-screen restaurant background */}
      <Background />

      {/* Chef character sliding up from bottom */}
      <Chef visible={chefVisible} bounce={chefBounce} />

      {/* Comic speech cloud with word slots */}
      <SpeechCloud
        show={cloudVisible}
        slots={slots.map((s, i) => ({
          ...s,
          // Add shake class to incorrect slot
          shake: shakeSlot === i,
        }))}
        glow={cloudGlow}
        onSlotDrop={handleSlotDrop}
        slotRefs={slotRefs}
      />

      {/* Draggable word cards at the bottom */}
      {cloudVisible && (
        <WordTray
          words={trayWords}
          onDragStart={() => {}}
          onPointerDown={handlePointerDown}
          shuffleKey={shuffleKey}
        />
      )}

      {/* Floating drag ghost for pointer-based drag */}
      {dragState && (
        <div
          className="
            fixed z-50 px-5 py-2.5 rounded-xl
            bg-linear-to-br from-amber-400 to-orange-500
            text-white font-bold text-lg shadow-2xl
            pointer-events-none select-none
            -translate-x-1/2 -translate-y-1/2
          "
          style={{ left: dragState.x, top: dragState.y }}
        >
          {dragState.word}
        </div>
      )}

      {/* Success flash overlay */}
      {completed && (
        <div className="fixed inset-0 z-40 pointer-events-none success-flash" />
      )}
    </div>
  );
}

export default GameController;
