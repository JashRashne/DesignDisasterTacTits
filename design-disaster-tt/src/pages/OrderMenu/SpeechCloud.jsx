/**
 * SpeechCloud Component
 * ----------------------
 * Comic-style speech bubble that appears above the chef.
 * - Fades in with a slight bounce after the chef finishes entering.
 * - Displays blank placeholder slots for each word in the sentence.
 * - Filled words snap into their slots; empty slots show underscores.
 * - Glows on completion.
 *
 * Props:
 *   show         – boolean, controls fade-in visibility
 *   slots        – array of { word: string, filled: boolean }
 *   glow         – boolean, triggers glow on completion
 *   onSlotDrop   – (index) => void, called when a word is dropped on a slot
 *   slotRefs     – ref array for slot positions (used by drag logic)
 */

function SpeechCloud({ show, slots, glow, onSlotDrop, slotRefs }) {
  return (
    <div
      className={`
        fixed z-20
        left-1/2 -translate-x-1/2
        transition-all duration-700 ease-out
        ${show ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}
        ${show ? "speech-cloud-enter" : ""}
        ${glow ? "cloud-glow" : ""}
      `}
      style={{
        bottom: "clamp(220px, 30vw, 380px)",
        width: "clamp(320px, 55vw, 640px)",
      }}
    >
      {/* Speech bubble shape */}
      <div className="relative bg-white rounded-4xl px-6 py-5 shadow-2xl border-4 border-amber-200">
        {/* Tail / pointer towards chef */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-5 w-0 h-0"
          style={{
            borderLeft: "18px solid transparent",
            borderRight: "18px solid transparent",
            borderTop: "22px solid white",
            filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.08))",
          }}
        />

        {/* Instruction label */}
        <p className="text-center text-sm text-amber-800/70 font-medium mb-3 tracking-wide select-none">
          Complete the sentence:
        </p>

        {/* Word slots */}
        <div className="flex flex-wrap justify-center items-center gap-2">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              ref={(el) => {
                if (slotRefs?.current) slotRefs.current[idx] = el;
              }}
              /* Each slot is a drop target */
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onSlotDrop(idx, e.dataTransfer.getData("text/plain"));
              }}
              className={`
                min-w-15 h-10 flex items-center justify-center
                rounded-lg border-2 border-dashed
                transition-all duration-300
                select-none
                ${
                  slot.filled
                    ? "bg-amber-100 border-amber-400 text-amber-900 font-bold slot-snap"
                    : "bg-gray-100 border-gray-300 text-gray-400"
                }
                ${slot.shake ? "slot-shake" : ""}
              `}
              style={{ padding: "0 12px" }}
            >
              {slot.filled ? slot.word : "_".repeat(slot.word.length)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SpeechCloud;
