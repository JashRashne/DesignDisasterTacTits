/**
 * WordTray Component
 * -------------------
 * Displays the draggable word cards scattered along the bottom of the screen.
 * - Words are shuffled into a random order and given slight random rotations.
 * - Cards support both HTML5 drag-and-drop and pointer-based (touch) dragging.
 * - Already-placed words are hidden from the tray.
 * - On shuffle events, the remaining words re-randomize position.
 *
 * Props:
 *   words         – array of { word: string, placed: boolean, id: number }
 *   onDragStart   – (word) => void
 *   onDragEnd     – () => void
 *   shuffleKey    – number, changes to trigger re-render with new random positions
 *   dragState     – { dragging: boolean, word: string, x: number, y: number }
 *   onPointerDown – (e, word) => void
 */

import { useMemo } from "react";

function WordTray({ words, onDragStart, shuffleKey, onPointerDown }) {
  // Generate random rotations & offsets each time shuffleKey changes
  const positions = useMemo(() => {
    return words.map(() => ({
      rotate: Math.random() * 16 - 8,           // -8 to +8 degrees
      offsetX: Math.random() * 20 - 10,         // -10 to +10 px
      offsetY: Math.random() * 10 - 5,          // -5 to +5 px
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleKey, words.length]);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center items-end gap-3 flex-wrap px-6 pb-2 select-none">
      {words.map((w, idx) => {
        if (w.placed) return null; // Already placed — hide from tray
        const pos = positions[idx] || { rotate: 0, offsetX: 0, offsetY: 0 };

        return (
          <div
            key={w.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", w.word);
              onDragStart(w.word);
            }}
            onPointerDown={(e) => onPointerDown(e, w.word)}
            className="
              word-card
              px-5 py-2.5 rounded-xl
              bg-linear-to-br from-amber-400 to-orange-500
              text-white font-bold text-lg
              shadow-lg cursor-grab active:cursor-grabbing
              hover:scale-110 hover:shadow-xl
              transition-transform duration-200
              select-none touch-none
            "
            style={{
              transform: `rotate(${pos.rotate}deg) translate(${pos.offsetX}px, ${pos.offsetY}px)`,
            }}
          >
            {w.word}
          </div>
        );
      })}
    </div>
  );
}

export default WordTray;
