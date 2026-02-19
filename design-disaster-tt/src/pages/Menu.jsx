/**
 * Menu Page
 * ----------
 * Ratatouille-themed drawing page.
 * - Book background with a centered drawing canvas.
 * - Knife cursor that rotates with stroke direction (rendered at PAGE level
 *   so CSS transforms on inner wrappers don't break fixed positioning).
 * - Ingredient palette on the left — click to "chop" and pick colour.
 * - "Ask Chef" button sends drawing to Gemini for food recognition.
 * - Result displayed in a bouncy label at the top-left.
 */

import { useRef, useState, useCallback } from "react";
import DrawingCanvas from "./Menu/DrawingCanvas";
import IngredientPalette from "./Menu/IngredientPalette";
import ChefButton from "./Menu/ChefButton";
import ChefResult from "./Menu/ChefResult";
import "./Menu/menu.css";

// Background image (open book)
const BG_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771491180/PHOTO-2026-02-19-14-12-14_xdho7e.jpg";

// Knife cursor image
const KNIFE_URL =
  "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/06b04ff8-8821-4499-b347-de1bb0fb57b9/dgv7gcc-f7892143-8ca6-48c3-8ffa-f83ab2d3853e.png/v1/fill/w_1280,h_1273/butcher_knife_asset_by_donetsk837_dgv7gcc-fullview.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTI3MyIsInBhdGgiOiIvZi8wNmIwNGZmOC04ODIxLTQ0OTktYjM0Ny1kZTFiYjBmYjU3YjkvZGd2N2djYy1mNzg5MjE0My04Y2E2LTQ4YzMtOGZmYS1mODNhYjJkMzg1M2UucG5nIiwid2lkdGgiOiI8PTEyODAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.EYS3VwtrcL6lnBRVjVaOxs40hoGj5VeGlE1JYBVo5No";

// Fan (eraser) cursor image
const FAN_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771493552/table_fan_by_studiomasha_dghivgp-375w-2x_Background_Removed_g8k6jd.png";

function Menu() {
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState("#e74c3c");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [dip, setDip] = useState(false);
  const [fanMode, setFanMode] = useState(false); // fan eraser toggle

  // ── Knife cursor state (page-level) ─────────────────────
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorAngle, setCursorAngle] = useState(-45);
  const [cursorVisible, setCursorVisible] = useState(false);

  // Track mouse across the whole page
  const handlePagePointerMove = useCallback((e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    setCursorVisible(true);
  }, []);

  const handlePagePointerLeave = useCallback(() => {
    setCursorVisible(false);
  }, []);

  // Called by DrawingCanvas during strokes so the knife rotates
  const handleStrokeMove = useCallback((dx, dy) => {
    if (Math.abs(dx) + Math.abs(dy) > 1) {
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 45;
      setCursorAngle(angle);
    }
  }, []);

  // Colour selected from the ingredient palette
  const handleColorSelect = useCallback((color) => {
    setBrushColor(color);
    // Trigger a brief "dip" animation
    setDip(true);
    setTimeout(() => setDip(false), 450);
  }, []);

  return (
    <div
      className={`menu-page ${dip ? "brush-dip" : ""}`}
      onPointerMove={handlePagePointerMove}
      onPointerLeave={handlePagePointerLeave}
    >
      {/* Full-screen book background */}
      <div className="menu-bg">
        <img src={BG_URL} alt="Open book background" draggable={false} />
      </div>

      {/* Drawing canvas – centered */}
      <DrawingCanvas
        brushColor={brushColor}
        canvasRef={canvasRef}
        onStrokeMove={handleStrokeMove}
        fanMode={fanMode}
      />

      {/* ── Page-level cursor (knife OR fan) ── */}
      <div
        className={fanMode ? "fan-cursor" : "knife-cursor"}
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: fanMode
            ? "translate(-50%, -50%)"
            : `translate(-50%, -80%) rotate(${cursorAngle}deg)`,
          opacity: cursorVisible ? 1 : 0,
        }}
      >
        <img
          src={fanMode ? FAN_URL : KNIFE_URL}
          alt=""
          draggable={false}
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ filter: fanMode
            ? "drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
        />
        {/* Colour dot only when in knife mode */}
        {!fanMode && (
          <div
            className="knife-color-dot"
            style={{
              background: brushColor,
              boxShadow: `0 0 6px ${brushColor}`,
            }}
          />
        )}
      </div>

      {/* Chef's food recognition result */}
      <ChefResult text={result} />

      {/* Current colour indicator */}
      <div className="color-indicator">
        <div className="color-swatch" style={{ background: brushColor }} />
        Brush
      </div>

      {/* Ingredient palette – chop to pick colour */}
      <IngredientPalette
        activeColor={brushColor}
        onColorSelect={handleColorSelect}
      />

      {/* Fan toggle (eraser) button */}
      <button
        className={`fan-toggle-btn ${fanMode ? "fan-toggle-active" : ""}`}
        onClick={() => setFanMode(f => !f)}
      >
        {fanMode ? "🔪 Knife" : "💨 Fan"}
      </button>

      {/* Send to Gemini */}
      <ChefButton
        canvasRef={canvasRef}
        onResult={setResult}
        loading={loading}
        onLoading={setLoading}
      />
    </div>
  );
}

export default Menu;
