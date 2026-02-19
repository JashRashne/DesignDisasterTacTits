import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════════
   ASSETS
   ═══════════════════════════════════════════════════════════════ */
const BG_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498304/Supermarket_puzzle_game_scene_h8agzj.png";
const BASKET_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498510/WhatsApp_Image_2026-02-19_at_16.20.10-removebg-preview_atloqz.png";
const BOMB_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771499270/istockphoto-842671590-612x612_Background_Removed_of32db.png";
const PAPAD_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771499056/4910079f448483defcda65b18e2e5ac6-removebg-preview_kkm9zt.png";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

/* ── ingredient pool ── */
const INGREDIENTS = [
  { id: "egg", name: "Egg", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498502/file_00000000a6047206927e842becc94af5_wfavtu.png" },
  { id: "flour", name: "Flour", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498504/file_00000000a3fc720694d81d85541e62b2_nkagvg.png" },
  { id: "cheese", name: "Cheese", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498507/file_00000000e94872099b5bd3ed9f02f15c_accyjc.png" },
  { id: "water", name: "Bottle of Water", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498508/file_000000008af87209aa557fec6e5167dd_jp8uzu.png" },
  { id: "milk", name: "Milk", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498510/file_00000000b09c72068ebf3d68ab07d643_mbmhsy.png" },
  { id: "tomato", name: "Tomato", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498512/file_00000000f81c7206a6a5bd9374522c43_k04j9w.png" },
  { id: "mushroom", name: "Mushroom", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498512/file_000000007d7c7209a724701bc8430ac1_dinzvz.png" },
  { id: "pasta", name: "Pasta", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498511/file_0000000029b872099c2d8af77103d68c_Background_Removed_rfkmnz.png" },
  { id: "carrot", name: "Carrot", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498514/file_0000000018e87206923618f730dcc443_hnnhmo.png" },
  { id: "mango", name: "Mango", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498701/WhatsApp_Image_2026-02-19_at_3.22_Background_Removed.00_PM_go84ve.png" },
  { id: "lime", name: "Lime", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498700/WhatsApp_Image_2026-02-19_at_3.22_Background_Removed.01_PM_tu8bxz.png" },
  { id: "bittergourd", name: "Bitter Gourd", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498697/WhatsApp_Image_2026-02-19_at_3.22.01_PM_1_Background_Removed_okehh1.png" },
  { id: "bottlegourd", name: "Bottle Gourd", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498696/WhatsApp_Image_2026-02-19_at_3.22.01_PM_2_Background_Removed_kjkg8a.png" },
  { id: "garlic", name: "Garlic", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498696/WhatsApp_Image_2026-02-19_at_3.22.02_PM_1_Background_Removed_pmkruw.png" },
  { id: "mustard", name: "Mustard Sauce", img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771498695/WhatsApp_Image_2026-02-19_at_3.22_Background_Removed.02_PM_jgn3tt.png" },
];

/* ── game tuning ── */
const TOTAL_SPAWNS = 25;
const BOMB_COUNT = 4;
const SPAWN_MS = 1100;
const BASE_SPEED = 2.5;
const BASKET_SPEED = 7;
const ITEM_W = 70;
const ITEM_H = 70;
const BASKET_W = 130;
const BASKET_H = 90;
const INVERT_CYCLE = 11000; // full cycle length
const INVERT_ON = 8000; // inverted portion of cycle

const fallbackChef = {
  id: "indian",
  name: "Chef Arjun",
  cuisine: "Indian",
  emoji: "🍛",
  img: "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771492269/WhatsApp_Image_2026-02-19_at_2.36.18_PM_lr2f58.jpg",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue() {
  const q = [];
  for (let i = 0; i < TOTAL_SPAWNS - BOMB_COUNT; i++) {
    q.push({
      ...INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)],
      isBomb: false,
    });
  }
  for (let i = 0; i < BOMB_COUNT; i++) {
    q.push({ id: "bomb", name: "Bomb", img: BOMB_URL, isBomb: true });
  }
  return shuffle(q);
}

/* ═══════════════════════════════════════════════════════════════
   CSS KEYFRAMES (injected once via <style>)
   ═══════════════════════════════════════════════════════════════ */
const KEYFRAMES = `
  @keyframes kf-explode {
    0%   { transform: scale(1); opacity: 1; }
    50%  { transform: scale(3); opacity: 0.8; }
    100% { transform: scale(5); opacity: 0; }
  }
  @keyframes kf-pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.15); }
  }
  @keyframes kf-flash {
    0%   { opacity: 0.5; }
    100% { opacity: 0; }
  }
  @keyframes kf-slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes kf-zoomSpin {
    0%   { transform: scale(0) rotate(0deg);   opacity: 0; }
    50%  { transform: scale(1.5) rotate(180deg); opacity: 1; }
    100% { transform: scale(1) rotate(360deg);   opacity: 1; }
  }
  @keyframes kf-shake {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-12px) rotate(-2deg); }
    75%      { transform: translateX(12px) rotate(2deg); }
  }
  @keyframes kf-fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes kf-bounceIn {
    0%   { transform: scale(0);   opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes kf-spinIn {
    0%   { transform: scale(0) rotate(0deg);   opacity: 0; }
    100% { transform: scale(1) rotate(720deg); opacity: 1; }
  }
  @keyframes kf-confetti {
    0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes kf-bombMsg {
    0%   { transform: scale(0.5); opacity: 0; }
    20%  { transform: scale(1.2); opacity: 1; }
    80%  { transform: scale(1);   opacity: 1; }
    100% { transform: scale(0.8); opacity: 0; }
  }
  @keyframes kf-wobble {
    0%, 100% { transform: rotate(0deg); }
    25%      { transform: rotate(6deg); }
    75%      { transform: rotate(-6deg); }
  }
`;

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function SelectIngredients() {
  const location = useLocation();
  const navigate = useNavigate();
  const chef = location.state?.chef || fallbackChef;

  /* ── phase & UI state ── */
  const [phase, setPhase] = useState("countdown");
  const [countNum, setCountNum] = useState(3);
  const [collected, setCollected] = useState([]);
  const [inverted, setInverted] = useState(true);
  const [explosion, setExplosion] = useState(null);
  const [bombMsg, setBombMsg] = useState(false);
  const [geminiText, setGeminiText] = useState("");
  const [transStep, setTransStep] = useState(0);
  const [, bump] = useState(0);

  /* ── game refs ── */
  const areaRef = useRef(null);
  const basketXRef = useRef(0);
  const itemsRef = useRef([]);
  const keysRef = useRef({});
  const queueRef = useRef([]);
  const spawnIdxRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const collectedRef = useRef([]);
  const invertedRef = useRef(true);

  /* ── pre-generated confetti data ── */
  const confettiRef = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 3}s`,
      emoji: ["🎉", "🎊", "✨", "🌟", "🪅", "🥳"][i % 6],
    }))
  );

  /* ════════════ IMAGE PRELOAD ════════════ */
  useEffect(() => {
    const urls = [
      BG_URL, BASKET_URL, BOMB_URL, PAPAD_URL,
      ...INGREDIENTS.map((i) => i.img),
    ];
    urls.forEach((u) => {
      const img = new Image();
      img.src = u;
    });
  }, []);

  /* ════════════ COUNTDOWN ════════════ */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countNum <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountNum((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countNum]);

  /* ════════════ KEYBOARD ════════════ */
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key] = true;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      )
        e.preventDefault();
    };
    const onUp = (e) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  /* ════════════ GAME LOOP ════════════ */
  useEffect(() => {
    if (phase !== "playing") return;
    const area = areaRef.current;
    if (!area) return;

    const W = area.clientWidth;
    const H = area.clientHeight;
    basketXRef.current = (W - BASKET_W) / 2;
    queueRef.current = buildQueue();
    spawnIdxRef.current = 0;
    lastSpawnRef.current = 0;
    startRef.current = performance.now();
    itemsRef.current = [];
    collectedRef.current = [];
    invertedRef.current = true;
    setCollected([]);
    setInverted(true);

    const loop = (ts) => {
      const elapsed = ts - startRef.current;

      /* ── inversion cycle: 8 s inverted → 3 s normal → repeat ── */
      const inCycle = elapsed % INVERT_CYCLE;
      const inv = inCycle < INVERT_ON;
      if (inv !== invertedRef.current) {
        invertedRef.current = inv;
        setInverted(inv);
      }

      /* ── move basket (inverted = left key goes right) ── */
      const k = keysRef.current;
      if (k.ArrowLeft || k.a) {
        basketXRef.current += invertedRef.current
          ? BASKET_SPEED
          : -BASKET_SPEED;
      }
      if (k.ArrowRight || k.d) {
        basketXRef.current += invertedRef.current
          ? -BASKET_SPEED
          : BASKET_SPEED;
      }
      basketXRef.current = Math.max(
        0,
        Math.min(W - BASKET_W, basketXRef.current)
      );

      /* ── spawn items ── */
      if (
        spawnIdxRef.current < queueRef.current.length &&
        elapsed - lastSpawnRef.current > SPAWN_MS
      ) {
        const data = queueRef.current[spawnIdxRef.current];
        itemsRef.current.push({
          uid: spawnIdxRef.current,
          data,
          x: Math.random() * (W - ITEM_W),
          y: -ITEM_H,
          speed:
            BASE_SPEED +
            Math.random() * 1.5 +
            spawnIdxRef.current * 0.06,
          caught: false,
          missed: false,
        });
        spawnIdxRef.current++;
        lastSpawnRef.current = elapsed;
      }

      /* ── update positions & detect collisions ── */
      const bTop = H - BASKET_H - 20;
      const bL = basketXRef.current;
      const bR = bL + BASKET_W;

      for (const it of itemsRef.current) {
        if (it.caught || it.missed) continue;
        it.y += it.speed;

        const cx = it.x + ITEM_W / 2;
        const bot = it.y + ITEM_H;

        /* catch */
        if (
          bot >= bTop &&
          bot <= bTop + BASKET_H + 15 &&
          cx >= bL &&
          cx <= bR
        ) {
          it.caught = true;
          if (it.data.isBomb) {
            /* 💣 BOOM — clear everything */
            collectedRef.current = [];
            setCollected([]);
            setExplosion({ x: it.x, y: it.y });
            setBombMsg(true);
            setTimeout(() => {
              setExplosion(null);
              setBombMsg(false);
            }, 1200);
          } else {
            collectedRef.current = [...collectedRef.current, it.data];
            setCollected([...collectedRef.current]);
          }
        }

        /* miss */
        if (it.y > H + ITEM_H) it.missed = true;
      }

      /* ── game over? ── */
      const allSpawned =
        spawnIdxRef.current >= queueRef.current.length;
      const allDone = itemsRef.current.every(
        (i) => i.caught || i.missed
      );
      if (allSpawned && allDone) {
        setPhase("review");
        return;
      }

      bump((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /* ════════════ GEMINI API ════════════ */
  const sendToGemini = async () => {
    setPhase("loading");
    const names =
      collected.length > 0
        ? collected.map((i) => i.name).join(", ")
        : "absolutely nothing";

    const prompt = `You are Remy the rat from Ratatouille, reviewing someone's pizza ingredient choices. Be extremely sarcastic, funny, and theatrical in 2-3 sentences max.

The user tried to collect pizza ingredients in a chaotic falling-item game. Here's what they caught: ${names}

If there are bizarre non-pizza items (bitter gourd, mango, bottle gourd, pasta, etc.), absolutely destroy them with humor. If they have good pizza items, grudgingly admit it but still roast them. If they caught nothing, mock their reflexes mercilessly. Be over-the-top dramatic. End with a signature dramatic sigh or eye-roll. Keep it short.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      const json = await res.json();
      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "Even I, Remy, am speechless. And I once cooked for a food critic. 😤";
      setGeminiText(text);
      setPhase("result");
    } catch {
      setGeminiText(
        "Mon dieu! The kitchen exploded before I could judge your choices! 🔥😤"
      );
      setPhase("result");
    }
  };

  /* ════════════ TRANSITION SEQUENCER ════════════ */
  const startTransition = () => {
    setPhase("transition");
    setTransStep(0);
    setTimeout(() => setTransStep(1), 1800);
    setTimeout(() => setTransStep(2), 3500);
    setTimeout(() => setPhase("final"), 5500);
  };

  /* ════════════ DERIVED VALUES ════════════ */
  const basketTop = areaRef.current
    ? areaRef.current.clientHeight - BASKET_H - 20
    : typeof window !== "undefined"
      ? window.innerHeight - BASKET_H - 20
      : 600;

  const activeItems = itemsRef.current.filter(
    (i) => !i.caught && !i.missed
  );

  /* ═══════════════════════════════════════════════════════════════
     JSX — single return with conditional phase rendering
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div ref={areaRef} className="fixed inset-0 overflow-hidden select-none">
      <style>{KEYFRAMES}</style>

      {/* ─── BG image (not shown during transition/final) ─── */}
      {phase !== "transition" && phase !== "final" && (
        <img
          src={BG_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ═══════════════════ COUNTDOWN ═══════════════════ */}
      {phase === "countdown" && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
          <p className="text-amber-400 text-lg font-bold mb-2 tracking-wider">
            🛒 Catch the pizza ingredients!
          </p>
          <p className="text-white/80 text-sm mb-6">
            Use <kbd className="bg-white/20 px-2 py-0.5 rounded text-amber-300 font-mono">←</kbd>{" "}
            <kbd className="bg-white/20 px-2 py-0.5 rounded text-amber-300 font-mono">→</kbd> arrow
            keys to move the basket
          </p>
          <div
            className="text-[120px] font-black text-white drop-shadow-2xl"
            style={{ animation: "kf-pulse 0.8s ease-in-out infinite" }}
          >
            {countNum || "GO!"}
          </div>
          <p className="text-red-400 text-sm mt-8 font-bold animate-pulse">
            ⚠️ WARNING: Controls may be... unreliable ⚠️
          </p>
          <p className="text-red-300/60 text-xs mt-2">
            🚫 Watch out for BOMBS — they&apos;ll destroy everything you
            collected!
          </p>
        </div>
      )}

      {/* ═══════════════════ PLAYING ═══════════════════ */}
      {phase === "playing" && (
        <>
          {/* HUD – top-left */}
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-3 z-20">
            <span>🧺 {collected.length}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-black transition-colors ${
                inverted
                  ? "bg-red-600 animate-pulse"
                  : "bg-green-600"
              }`}
            >
              {inverted ? "🔀 INVERTED" : "✅ NORMAL"}
            </span>
          </div>

          {/* HUD – top-right */}
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl text-white text-xs font-bold z-20">
            {spawnIdxRef.current}/{TOTAL_SPAWNS} items
          </div>

          {/* ── Falling items ── */}
          {activeItems.map((it) => (
            <div
              key={it.uid}
              className="absolute pointer-events-none z-10"
              style={{
                left: it.x,
                top: it.y,
                width: ITEM_W,
                height: ITEM_H,
              }}
            >
              <img
                src={it.data.img}
                alt={it.data.name}
                className="w-full h-full object-contain"
                style={{
                  filter: it.data.isBomb
                    ? "drop-shadow(0 0 10px #ef4444)"
                    : "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                  animation: it.data.isBomb
                    ? "kf-wobble 0.3s ease-in-out infinite"
                    : undefined,
                }}
              />
              <span
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: it.data.isBomb
                    ? "rgba(239,68,68,0.85)"
                    : "rgba(0,0,0,0.65)",
                  color: "white",
                }}
              >
                {it.data.isBomb ? "💣 BOMB" : it.data.name}
              </span>
            </div>
          ))}

          {/* ── Basket ── */}
          <img
            src={BASKET_URL}
            alt="basket"
            className="absolute pointer-events-none z-15"
            style={{
              left: basketXRef.current,
              top: basketTop,
              width: BASKET_W,
              height: BASKET_H,
              objectFit: "contain",
            }}
          />

          {/* ── Explosion flash + emoji ── */}
          {explosion && (
            <>
              <div
                className="absolute inset-0 bg-red-600/30 z-25 pointer-events-none"
                style={{ animation: "kf-flash 0.6s ease-out forwards" }}
              />
              <div
                className="absolute z-30 text-7xl pointer-events-none"
                style={{
                  left: explosion.x - 25,
                  top: explosion.y - 25,
                  animation: "kf-explode 0.9s forwards",
                }}
              >
                💥
              </div>
            </>
          )}

          {/* ── Bomb message ── */}
          {bombMsg && (
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              style={{ animation: "kf-bombMsg 1.2s ease-out forwards" }}
            >
              <p className="text-red-400 text-2xl font-black text-center bg-black/80 px-6 py-3 rounded-xl border-2 border-red-500 shadow-xl">
                💣 BOOM! ALL ITEMS LOST! 💣
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ REVIEW ═══════════════════ */}
      {phase === "review" && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10">
          <h2 className="text-3xl font-black text-amber-300 mb-6 drop-shadow-lg">
            🧺 Your Ingredient Haul
          </h2>

          {collected.length === 0 ? (
            <p className="text-white text-xl mb-6 text-center leading-relaxed">
              You caught... absolutely nothing.
              <br />
              Were the controls <em>that</em> bad? 🤦
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6 max-h-[50vh] overflow-y-auto px-2">
              {collected.map((item, i) => (
                <div
                  key={i}
                  className="bg-white/90 rounded-xl p-2 flex flex-col items-center shadow-lg"
                  style={{
                    animation: `kf-fadeIn 0.3s ease-out ${i * 0.08}s both`,
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-14 h-14 object-contain"
                  />
                  <span className="text-[11px] font-bold text-amber-900 mt-1 text-center leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={sendToGemini}
            className="
              px-8 py-4 rounded-2xl font-black text-white text-lg
              bg-linear-to-b from-green-400 to-green-600
              border-4 border-green-700
              shadow-[0_4px_0_#166534,0_4px_12px_rgba(0,0,0,0.4)]
              hover:-translate-y-1 hover:shadow-[0_6px_0_#166534]
              active:translate-y-1 active:shadow-[0_2px_0_#166534]
              transition-all duration-150 cursor-pointer
              animate-bounce
            "
          >
            🐀 Send to Chef Remy!
          </button>
        </div>
      )}

      {/* ═══════════════════ LOADING ═══════════════════ */}
      {phase === "loading" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
          <div
            className="text-7xl mb-4"
            style={{ animation: "kf-wobble 0.5s ease-in-out infinite" }}
          >
            🐀
          </div>
          <p className="text-amber-300 text-xl font-bold animate-pulse">
            Chef Remy is judging your choices...
          </p>
          <p className="text-amber-500/50 text-sm mt-2 italic">
            (This might hurt)
          </p>
        </div>
      )}

      {/* ═══════════════════ GEMINI RESULT ═══════════════════ */}
      {phase === "result" && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10">
          <div className="text-7xl mb-2">🐀</div>
          <p className="text-amber-400 text-sm font-bold mb-3 tracking-wide">
            Chef Remy says:
          </p>

          {/* Speech bubble */}
          <div
            className="bg-white rounded-3xl p-6 max-w-lg shadow-2xl border-4 border-amber-400 relative"
            style={{ animation: "kf-slideUp 0.6s ease-out" }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-r-12 border-b-16 border-l-transparent border-r-transparent border-b-amber-400" />
            <p className="text-amber-900 text-lg leading-relaxed font-medium italic">
              &ldquo;{geminiText}&rdquo;
            </p>
            <p className="text-right text-sm text-amber-600/70 mt-3 font-semibold">
              — Remy 🐀
            </p>
          </div>

          <button
            onClick={startTransition}
            className="
              mt-8 px-8 py-4 rounded-2xl font-black text-white text-lg
              bg-linear-to-b from-amber-400 to-orange-600
              border-4 border-orange-700
              shadow-[0_4px_0_#9a3412,0_4px_12px_rgba(0,0,0,0.4)]
              hover:-translate-y-1
              active:translate-y-1
              transition-all duration-150 cursor-pointer
            "
          >
            🍕 Make My Pizza Already!
          </button>
        </div>
      )}

      {/* ═══════════════════ TRANSITION ═══════════════════ */}
      {phase === "transition" && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-10 overflow-hidden">
          {transStep === 0 && (
            <div
              className="text-center"
              style={{ animation: "kf-zoomSpin 1.5s ease-in-out" }}
            >
              <div className="text-8xl mb-4">🍕</div>
              <p className="text-white text-3xl font-black">
                Firing up the oven...
              </p>
            </div>
          )}
          {transStep === 1 && (
            <div
              className="text-center"
              style={{ animation: "kf-shake 0.4s infinite" }}
            >
              <div className="text-8xl mb-4">🔥💨🔥</div>
              <p className="text-red-400 text-3xl font-black animate-pulse">
                WAIT... SOMETHING WENT WRONG
              </p>
              <p className="text-red-300/60 text-lg mt-2">
                The pizza... it&apos;s... transforming?!
              </p>
            </div>
          )}
          {transStep === 2 && (
            <div
              className="text-center"
              style={{ animation: "kf-fadeIn 1s ease-out" }}
            >
              <div className="text-8xl mb-4">🇮🇳</div>
              <p className="text-amber-300 text-2xl font-black">
                INDIAN CHEF OVERRIDE ACTIVATED
              </p>
              <p className="text-amber-200/60 text-base mt-2 italic">
                Chef Arjun has taken over the kitchen...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ FINAL — MASALA PAPAD REVEAL ═══════════════════ */}
      {phase === "final" && (
        <div className="absolute inset-0 bg-linear-to-b from-orange-900 via-amber-800 to-yellow-700 flex flex-col items-center justify-center z-10 overflow-hidden">
          {/* confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {confettiRef.current.map((c, i) => (
              <div
                key={i}
                className="absolute text-2xl"
                style={{
                  left: c.left,
                  top: "-5%",
                  animation: `kf-confetti ${c.duration} linear ${c.delay} infinite`,
                }}
              >
                {c.emoji}
              </div>
            ))}
          </div>

          {/* Chef image */}
          <img
            src={chef.img}
            alt={chef.name}
            className="w-36 h-36 rounded-full border-4 border-amber-400 object-cover shadow-2xl mb-3"
            style={{ animation: "kf-bounceIn 0.8s ease-out" }}
          />

          {/* Title */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center drop-shadow-2xl mb-1 px-4"
            style={{ animation: "kf-bounceIn 1s ease-out 0.3s both" }}
          >
            {chef.emoji} HERE IS YOUR
          </h1>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-black text-yellow-300 text-center drop-shadow-2xl mb-2"
            style={{ animation: "kf-bounceIn 1s ease-out 0.5s both" }}
          >
            MASALA PAPAD
          </h1>
          <h2
            className="text-2xl sm:text-3xl font-black text-amber-200 mb-4"
            style={{ animation: "kf-bounceIn 1s ease-out 0.7s both" }}
          >
            SIR! 🙏
          </h2>

          {/* Papad image – spins in */}
          <img
            src={PAPAD_URL}
            alt="Masala Papad"
            className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-2xl mb-4"
            style={{ animation: "kf-spinIn 1.2s ease-out 0.8s both" }}
          />

          {/* Tagline */}
          <p
            className="text-amber-200/80 text-sm sm:text-base italic text-center max-w-md px-6"
            style={{ animation: "kf-fadeIn 1s ease-out 1.5s both" }}
          >
            You spent all that time catching pizza ingredients...
            <br />
            and Chef Arjun made you a Masala Papad.
            <br />
            <strong className="text-amber-100">Deal with it. 😎</strong>
          </p>

          {/* Continue button */}
          <button
            onClick={() => navigate("/order-status")}
            className="
              mt-6 px-7 py-3 rounded-2xl font-bold text-white text-base
              bg-linear-to-b from-amber-400 to-orange-500
              border-3 border-amber-600
              shadow-[0_4px_0_#b45309]
              hover:-translate-y-0.5
              active:translate-y-1
              transition-all duration-150 cursor-pointer
            "
            style={{ animation: "kf-fadeIn 1s ease-out 2.2s both" }}
          >
            Accept Your Fate →
          </button>
        </div>
      )}
    </div>
  );
}

export default SelectIngredients;
