import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MagnetConveyor from "./OrderStatus/MagnetConveyor";
import "./OrderStatus/OrderStatus.css";

/* ── Background color ── */
const BG_COLOR = "#f9dbc2";

/* ── Chef data ── */
const CHEFS = [
  {
    id: "indian",
    name: "Chef Arjun",
    cuisine: "Indian",
    keyword: "indian",
    emoji: "🍛",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492269/WhatsApp_Image_2026-02-19_at_2.36.18_PM_lr2f58.jpg",
  },
  {
    id: "chinese",
    name: "Chef Wei",
    cuisine: "Chinese",
    keyword: "chinese",
    emoji: "🥡",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492269/WhatsApp_Image_2026-02-19_at_2.35.57_PM_hno5yz.jpg",
  },
  {
    id: "mexican",
    name: "Chef Carlos",
    cuisine: "Mexican",
    keyword: "mexican",
    emoji: "🌮",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492269/WhatsApp_Image_2026-02-19_at_2.35.01_PM_ilwys5.jpg",
  },
  {
    id: "italian",
    name: "Chef Marco",
    cuisine: "Italian",
    keyword: "italian",
    emoji: "🍝",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492268/WhatsApp_Image_2026-02-19_at_2.32.48_PM_q2i7lv.jpg",
  },
  {
    id: "french",
    name: "Chef Pierre",
    cuisine: "French",
    keyword: "french",
    emoji: "🥐",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492269/WhatsApp_Image_2026-02-19_at_2.33.51_PM_uvccw2.jpg",
  },
  {
    id: "japanese",
    name: "Chef Yuki",
    cuisine: "Japanese",
    keyword: "japanese",
    emoji: "🍣",
    img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492268/WhatsApp_Image_2026-02-19_at_2.33.28_PM_mju4jq.jpg",
  },
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/* Match exact cuisine keyword */
function matchChef(text) {
  const lower = text.toLowerCase().trim();
  const idx = CHEFS.findIndex((c) => c.keyword === lower);
  return idx >= 0 ? idx : null;
}

/* Which chefs could still match if user keeps typing */
function partialMatches(text) {
  const lower = text.toLowerCase().trim();
  if (!lower) return [];
  return CHEFS
    .map((c, i) => (c.keyword.startsWith(lower) ? i : -1))
    .filter((i) => i !== -1);
}

/* ══════════════════════════════════════════════════════════ */

function OrderStatus() {
  const navigate = useNavigate();

  const [typed, setTyped] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const selectedIndex = matchChef(typed);
  const partials = partialMatches(typed);
  const selectedChef = selectedIndex !== null ? CHEFS[selectedIndex] : null;

  /* Key click from the physics keyboard */
  const handleKeyClick = useCallback((char) => {
    setTyped((prev) => prev + char);
  }, []);

  const handleBackspace = () => setTyped((prev) => prev.slice(0, -1));

  /* Confirm */
  const handleConfirm = () => {
    if (selectedIndex === null) return;
    setTransitioning(true);
    setTimeout(() => {
      navigate("/select-ingredients", {
        state: { chef: CHEFS[selectedIndex] },
      });
    }, 2200);
  };

  /* ── Transition overlay ── */
  if (transitioning && selectedChef) {
    return (
      <div className="fixed inset-0 z-50" style={{ background: BG_COLOR }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 os-fade-in">
          <img
            src={selectedChef.img}
            alt={selectedChef.name}
            className="w-40 h-40 rounded-full border-4 border-amber-400 object-cover shadow-2xl os-zoom-bounce"
          />
          <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow-lg tracking-wide">
            {selectedChef.emoji} {selectedChef.name} is heading to the kitchen!
          </h2>
          <p className="text-amber-100/70 text-lg">
            Preparing ingredients for {selectedChef.cuisine} cuisine…
          </p>
        </div>
      </div>
    );
  }

  /* ── Main page ── */
  return (
    <div className="fixed inset-0 select-none overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0" style={{ background: BG_COLOR }} />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col p-4 gap-3">
        {/* ── Header bubble ── */}
        <div className="relative z-10 flex justify-center">
          <div className="relative inline-block bg-white/95 backdrop-blur-sm rounded-3xl px-10 py-3 shadow-xl border-4 border-amber-300">
            <h1 className="text-2xl md:text-3xl font-extrabold text-amber-900 tracking-wide">
              🍳 Choose Your Chef
            </h1>
            <p className="text-xs text-amber-700/60 mt-0.5 font-medium text-center">
              Type a cuisine on the conveyor belt to pick your chef
            </p>
            {/* Tail */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-0 h-0"
              style={{
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderTop: "14px solid rgb(255 255 255 / 0.95)",
              }}
            />
          </div>
        </div>

        {/* ── Body split ── */}
        <div className="flex flex-1 min-h-0 gap-3 relative z-10">
          {/* ──── Left: Chef gallery ──── */}
          <div className="w-[38%] shrink-0 flex flex-col gap-2">
            <div className="grid grid-cols-2 grid-rows-3 gap-2.5 flex-1 min-h-0">
              {CHEFS.map((chef, idx) => {
                const matched = selectedIndex === idx;
                const partial = !matched && partials.includes(idx);
                return (
                  <div
                    key={chef.id}
                    className={`
                      relative flex flex-col items-center justify-center gap-1.5
                      rounded-2xl border-3 p-2 transition-all duration-300 overflow-hidden
                      ${
                        matched
                          ? "bg-amber-50/95 border-amber-400 os-chef-glow scale-[1.02]"
                          : partial
                            ? "bg-white/85 border-amber-300/50 shadow-lg backdrop-blur-sm"
                            : "bg-white/50 border-white/20 shadow-md backdrop-blur-sm hover:bg-white/70 hover:border-amber-200/50"
                      }
                    `}
                  >
                    {/* Selected badge */}
                    {matched && (
                      <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md os-badge-pop z-10">
                        ✔ MATCHED
                      </span>
                    )}

                    {/* Image */}
                    <div
                      className={`
                        w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-3 shrink-0
                        transition-all duration-300
                        ${matched ? "border-amber-400 shadow-lg ring-2 ring-amber-300/50" : "border-amber-200/40"}
                      `}
                    >
                      <img
                        src={chef.img}
                        alt={chef.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Name + cuisine */}
                    <span className="text-xs md:text-sm font-bold text-amber-900 leading-tight text-center">
                      {chef.emoji} {chef.name}
                    </span>
                    <span
                      className={`
                        text-[10px] font-semibold tracking-[0.15em] uppercase leading-none
                        ${matched ? "text-amber-600" : partial ? "text-amber-700/60" : "text-amber-800/35"}
                      `}
                    >
                      {chef.cuisine}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──── Right: Keyboard panel ──── */}
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            {/* Input bar */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-3 border-amber-200 px-4 py-3 shadow-lg shrink-0">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={typed}
                  readOnly
                  className="flex-1 px-3 py-2 bg-amber-50/80 border-2 border-amber-200 rounded-xl
                    text-lg font-bold font-mono tracking-[0.2em] text-amber-900
                    focus:outline-none focus:border-amber-400 min-w-0"
                  placeholder="use the magnet to grab letters…"
                />
                {typed && (
                  <button
                    onClick={handleBackspace}
                    className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100
                      border border-red-300 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    ⌫
                  </button>
                )}
              </div>
              {/* Match status */}
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] text-amber-600/40 italic select-none">
                  type: indian · chinese · mexican · italian · french · japanese
                </span>
                <span className="text-xs font-medium italic shrink-0">
                  {typed.length === 0 ? (
                    ""
                  ) : selectedIndex !== null ? (
                    <span className="text-emerald-600">✅ Matched!</span>
                  ) : partials.length > 0 ? (
                    <span className="text-amber-600">🔍 keep typing…</span>
                  ) : (
                    <span className="text-red-400">❌ no match</span>
                  )}
                </span>
              </div>
            </div>

            {/* Magnet conveyor belt keyboard */}
            <MagnetConveyor alphabet={ALPHABET} onKeyClick={handleKeyClick} />

            {/* Confirm */}
            <button
              disabled={selectedIndex === null}
              onClick={handleConfirm}
              className={`
                w-full py-3 rounded-2xl font-bold text-base text-white
                border-3 transition-all duration-200 cursor-pointer shrink-0
                ${
                  selectedIndex !== null
                    ? "bg-linear-to-b from-emerald-400 to-emerald-600 border-emerald-700 shadow-[0_4px_0_#065f46,0_4px_12px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#065f46] active:translate-y-1 active:shadow-[0_2px_0_#065f46]"
                    : "bg-gray-400/50 border-gray-500/30 shadow-none cursor-not-allowed opacity-50"
                }
              `}
            >
              {selectedIndex === null
                ? "Type a cuisine name to continue…"
                : `Let's go with ${selectedChef.name}! ${selectedChef.emoji}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderStatus;
