import { useState, useRef, useEffect, useCallback } from "react";
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
const SPAWN_MS = 750;
const BASE_SPEED = 4.5;
const BASKET_SPEED = 9;
const ITEM_W = 70;
const ITEM_H = 70;
const BASKET_W = 130;
const BASKET_H = 90;
const INVERT_CYCLE = 11000; // full cycle length
const INVERT_ON = 8000; // inverted portion of cycle

const FONT = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive';

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
            Math.random() * 2 +
            spawnIdxRef.current * 0.12,
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
  const startTransition = useCallback(() => {
    setPhase("transition");
    setTransStep(0);
    setTimeout(() => setTransStep(1), 1800);
    setTimeout(() => setTransStep(2), 3500);
    setTimeout(() => setPhase("final"), 5500);
  }, []);

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

      {/* ─── BG image (only during countdown/playing/review) ─── */}
      {!["transition", "final", "loading", "result"].includes(phase) && (
        <img
          src={BG_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ═══════════════════ COUNTDOWN ═══════════════════ */}
      {phase === "countdown" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ background: 'rgba(44, 24, 16, 0.88)', fontFamily: FONT }}>
          <p style={{ color: '#f4e04d', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>
            🛒 Catch the pizza ingredients!
          </p>
          <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: 20, opacity: 0.85 }}>
            Use <span style={{ background: '#5a3318', padding: '2px 10px', borderRadius: 8, color: '#f4e04d', fontWeight: 700, border: '2px solid #c5993a' }}>←</span>{" "}
            <span style={{ background: '#5a3318', padding: '2px 10px', borderRadius: 8, color: '#f4e04d', fontWeight: 700, border: '2px solid #c5993a' }}>→</span> to move basket
          </p>
          <div
            style={{ fontSize: 120, fontWeight: 900, color: '#f4e04d', textShadow: '4px 4px 0 #b45309', animation: 'kf-pulse 0.8s ease-in-out infinite' }}
          >
            {countNum || "GO!"}
          </div>
          <div style={{ marginTop: 30, background: '#7f1d1d', border: '3px solid #ef4444', borderRadius: 16, padding: '10px 24px', textAlign: 'center' }}>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 800 }}>
              ⚠️ Controls may be... unreliable ⚠️
            </p>
            <p style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: 4, opacity: 0.7 }}>
              🚫 BOMBS destroy everything you collected!
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════ PLAYING ═══════════════════ */}
      {phase === "playing" && (
        <>
          {/* HUD – top-left */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2"
            style={{ fontFamily: FONT }}>
            <div style={{ background: '#5a3318', border: '3px solid #c5993a', borderRadius: 14, padding: '6px 14px', color: '#f4e04d', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 3px 0 #3d200e' }}>
              🧺 {collected.length}
            </div>
            <div style={{
              background: inverted ? '#991b1b' : '#166534',
              border: `3px solid ${inverted ? '#ef4444' : '#22c55e'}`,
              borderRadius: 14,
              padding: '6px 12px',
              color: '#fff',
              fontWeight: 900,
              fontSize: '0.7rem',
              boxShadow: `0 3px 0 ${inverted ? '#7f1d1d' : '#14532d'}`,
              animation: inverted ? 'kf-pulse 1s infinite' : 'none',
            }}>
              {inverted ? '🔀 INVERTED' : '✅ NORMAL'}
            </div>
          </div>

          {/* HUD – top-right */}
          <div className="absolute top-3 right-3 z-20"
            style={{ fontFamily: FONT, background: '#5a3318', border: '3px solid #c5993a', borderRadius: 14, padding: '6px 14px', color: '#f4e04d', fontWeight: 800, fontSize: '0.75rem', boxShadow: '0 3px 0 #3d200e' }}>
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
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
                style={{
                  fontFamily: FONT,
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 8,
                  border: it.data.isBomb ? '2px solid #ef4444' : '2px solid #c5993a',
                  background: it.data.isBomb ? '#991b1b' : '#5a3318',
                  color: it.data.isBomb ? '#fca5a5' : '#f4e04d',
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
              <p style={{
                fontFamily: FONT,
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#fca5a5',
                textAlign: 'center',
                background: '#7f1d1d',
                border: '4px solid #ef4444',
                borderRadius: 20,
                padding: '12px 28px',
                boxShadow: '0 6px 0 #991b1b',
              }}>
                💣 BOOM! ALL ITEMS LOST! 💣
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ REVIEW ═══════════════════ */}
      {phase === "review" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10"
          style={{ background: 'rgba(44, 24, 16, 0.92)', fontFamily: FONT }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f4e04d', textShadow: '3px 3px 0 #b45309', marginBottom: 20 }}>
            🧺 Your Ingredient Haul
          </h2>

          {collected.length === 0 ? (
            <div style={{ background: '#5a3318', border: '4px solid #c5993a', borderRadius: 20, padding: '20px 32px', marginBottom: 20, textAlign: 'center', boxShadow: '0 4px 0 #3d200e' }}>
              <p style={{ color: '#f4e04d', fontSize: '1.2rem', fontWeight: 700 }}>
                You caught... absolutely nothing.
              </p>
              <p style={{ color: '#f4e04d', fontSize: '0.9rem', opacity: 0.7, marginTop: 6 }}>
                Were the controls <em>that</em> bad? 🤦
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6 max-h-[50vh] overflow-y-auto px-2">
              {collected.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f9e4b7',
                    border: '3px solid #c5993a',
                    borderRadius: 16,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 3px 0 #b08630',
                    animation: `kf-fadeIn 0.3s ease-out ${i * 0.08}s both`,
                  }}
                >
                  <img src={item.img} alt={item.name} className="w-14 h-14 object-contain" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#5a3318', marginTop: 4, textAlign: 'center', lineHeight: 1.2 }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={sendToGemini}
            style={{
              fontFamily: FONT,
              padding: '14px 32px',
              fontSize: '1.1rem',
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: '4px solid #166534',
              borderRadius: 20,
              boxShadow: '0 5px 0 #14532d',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              animation: 'kf-pulse 1.5s ease-in-out infinite',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🐀 Send to Chef Remy!
          </button>
        </div>
      )}

      {/* ═══════════════════ LOADING ═══════════════════ */}
      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ background: '#2C1810', fontFamily: FONT }}>
          <div style={{ fontSize: 80, animation: 'kf-wobble 0.5s ease-in-out infinite' }}>🐀</div>
          <p style={{ color: '#f4e04d', fontSize: '1.3rem', fontWeight: 800, marginTop: 12, animation: 'kf-pulse 1s infinite' }}>
            Chef Remy is judging your choices...
          </p>
          <p style={{ color: '#c5993a', fontSize: '0.8rem', marginTop: 8, opacity: 0.6, fontStyle: 'italic' }}>
            (This might hurt)
          </p>
        </div>
      )}

      {/* ═══════════════════ GEMINI RESULT ═══════════════════ */}
      {phase === "result" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10"
          style={{ background: 'rgba(44, 24, 16, 0.94)', fontFamily: FONT }}>
          <div style={{ fontSize: 80, marginBottom: 4 }}>🐀</div>
          <p style={{ color: '#c5993a', fontSize: '0.85rem', fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
            Chef Remy says:
          </p>

          {/* Speech bubble */}
          <div
            style={{
              position: 'relative',
              background: '#f9e4b7',
              border: '4px solid #c5993a',
              borderRadius: 24,
              padding: '24px 28px',
              maxWidth: 480,
              boxShadow: '0 6px 0 #b08630',
              animation: 'kf-slideUp 0.6s ease-out',
            }}
          >
            <div style={{ position: 'absolute', top: -14, left: '50%', marginLeft: -12, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '14px solid #c5993a' }} />
            <div style={{ position: 'absolute', top: -9, left: '50%', marginLeft: -10, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '12px solid #f9e4b7' }} />
            <p style={{ color: '#5a3318', fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 600, fontStyle: 'italic' }}>
              &ldquo;{geminiText}&rdquo;
            </p>
            <p style={{ textAlign: 'right', fontSize: '0.85rem', color: '#b08630', marginTop: 10, fontWeight: 700 }}>
              — Remy 🐀
            </p>
          </div>

          <button
            onClick={startTransition}
            style={{
              fontFamily: FONT,
              marginTop: 28,
              padding: '14px 32px',
              fontSize: '1.1rem',
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(135deg, #f4e04d 0%, #f39c12 50%, #e67e22 100%)',
              border: '4px solid #b45309',
              borderRadius: 20,
              boxShadow: '0 5px 0 #9a3412',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🍕 Make My Pizza Already!
          </button>
        </div>
      )}

      {/* ═══════════════════ TRANSITION ═══════════════════ */}
      {phase === "transition" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden"
          style={{ background: '#2C1810', fontFamily: FONT }}>
          {transStep === 0 && (
            <div className="text-center" style={{ animation: 'kf-zoomSpin 1.5s ease-in-out' }}>
              <div style={{ fontSize: 100 }}>🍕</div>
              <p style={{ color: '#f4e04d', fontSize: '1.8rem', fontWeight: 900, textShadow: '3px 3px 0 #b45309', marginTop: 10 }}>
                Firing up the oven...
              </p>
            </div>
          )}
          {transStep === 1 && (
            <div className="text-center" style={{ animation: 'kf-shake 0.4s infinite' }}>
              <div style={{ fontSize: 100 }}>🔥💨🔥</div>
              <p style={{ color: '#ef4444', fontSize: '1.8rem', fontWeight: 900, animation: 'kf-pulse 0.8s infinite', marginTop: 10 }}>
                WAIT... SOMETHING WENT WRONG
              </p>
              <p style={{ color: '#fca5a5', fontSize: '1rem', marginTop: 8, opacity: 0.6 }}>
                The pizza... it&apos;s... transforming?!
              </p>
            </div>
          )}
          {transStep === 2 && (
            <div className="text-center" style={{ animation: 'kf-fadeIn 1s ease-out' }}>
              <div style={{ fontSize: 100 }}>🇮🇳</div>
              <p style={{ color: '#f4e04d', fontSize: '1.6rem', fontWeight: 900, textShadow: '3px 3px 0 #b45309', marginTop: 10 }}>
                INDIAN CHEF OVERRIDE ACTIVATED
              </p>
              <p style={{ color: '#c5993a', fontSize: '0.95rem', marginTop: 8, fontStyle: 'italic', opacity: 0.7 }}>
                Chef Arjun has taken over the kitchen...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ FINAL — MASALA PAPAD REVEAL ═══════════════════ */}
      {phase === "final" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 overflow-hidden"
          style={{ background: '#2C1810', fontFamily: FONT }}>
          {/* confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {confettiRef.current.map((c, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: c.left,
                  top: '-5%',
                  fontSize: 24,
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
            style={{
              width: 140, height: 140, borderRadius: '50%', objectFit: 'cover',
              border: '5px solid #c5993a', boxShadow: '0 6px 0 #b08630',
              marginBottom: 12, animation: 'kf-bounceIn 0.8s ease-out',
            }}
          />

          {/* Title */}
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, color: '#f4e04d', textShadow: '4px 4px 0 #b45309', textAlign: 'center', marginBottom: 2, animation: 'kf-bounceIn 1s ease-out 0.3s both' }}>
            {chef.emoji} HERE IS YOUR
          </h1>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 900, color: '#f39c12', textShadow: '5px 5px 0 #9a3412', textAlign: 'center', marginBottom: 4, animation: 'kf-bounceIn 1s ease-out 0.5s both' }}>
            MASALA PAPAD
          </h1>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 900, color: '#c5993a', marginBottom: 16, animation: 'kf-bounceIn 1s ease-out 0.7s both' }}>
            SIR! 🙏
          </h2>

          {/* Papad image – spins in */}
          <img
            src={PAPAD_URL}
            alt="Masala Papad"
            style={{
              width: 'clamp(160px, 30vw, 220px)', height: 'clamp(160px, 30vw, 220px)',
              objectFit: 'contain', marginBottom: 16,
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
              animation: 'kf-spinIn 1.2s ease-out 0.8s both',
            }}
          />

          {/* Tagline */}
          <div style={{
            background: '#5a3318', border: '4px solid #c5993a', borderRadius: 20,
            padding: '16px 28px', maxWidth: 440, textAlign: 'center',
            boxShadow: '0 4px 0 #3d200e', animation: 'kf-fadeIn 1s ease-out 1.5s both',
          }}>
            <p style={{ color: '#f9e4b7', fontSize: '0.9rem', lineHeight: 1.7, fontStyle: 'italic' }}>
              You spent all that time catching pizza ingredients...
              <br />
              and Chef Arjun made you a Masala Papad.
              <br />
              <strong style={{ color: '#f4e04d' }}>Deal with it. 😎</strong>
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => navigate("/order-status")}
            style={{
              fontFamily: FONT,
              marginTop: 24,
              padding: '12px 28px',
              fontSize: '1rem',
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(135deg, #f4e04d 0%, #f39c12 50%, #e67e22 100%)',
              border: '4px solid #b45309',
              borderRadius: 20,
              boxShadow: '0 5px 0 #9a3412',
              cursor: 'pointer',
              textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
              animation: 'kf-fadeIn 1s ease-out 2.2s both',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Accept Your Fate →
          </button>
        </div>
      )}
    </div>
  );
}

export default SelectIngredients;
