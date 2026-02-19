/**
 * ChefButton Component
 * ----------------------
 * Cartoony "Ask Chef" button that:
 *  1. Converts the drawing canvas to base64 PNG.
 *  2. Sends it to Gemini 2.5-flash with a strict food-recognition prompt.
 *  3. Returns the text response to the parent via onResult callback.
 *
 * Props:
 *   canvasRef – React ref to the <canvas> element
 *   onResult  – (text: string) => void
 *   loading   – boolean (parent can show spinner state)
 *   onLoading – (bool) => void
 */

import { useCallback } from "react";

// ── Gemini API key (replace with your key) ──────────────────
const GEMINI_API_KEY = "AIzaSyAuaghGnnOxuGA68HnaQgL35MINKm51az0";

// ── Strict food recognition prompt ──────────────────────────
const PROMPT = `You are a strict food recognition classifier.
You must ONLY identify food if the drawing clearly matches a well-known dish by structural features.
Rules:
- Do NOT guess based on color alone.
- Do NOT infer toppings that are not clearly drawn.
- Ignore artistic imperfections.
- Focus on shape, structure, layering, and clear distinguishing features.
- If confidence is below 90%, respond ONLY with: 'Unknown'
Respond with ONLY the food name.
Do not explain.
Do not add commentary.
Be extremely strict.`;

function ChefButton({ canvasRef, onResult, loading, onLoading }) {
  const handleClick = useCallback(async () => {
    if (!canvasRef?.current) return;
    onLoading(true);

    try {
      // Convert canvas to base64 PNG (strip data URL prefix)
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const base64  = dataUrl.replace(/^data:image\/png;base64,/, "");

      // Build Gemini API request
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const body = {
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64,
                },
              },
            ],
          },
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      // Extract text from response
      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "Unknown";
      onResult(text);
    } catch (err) {
      console.error("Gemini API error:", err);
      onResult("Error — try again");
    } finally {
      onLoading(false);
    }
  }, [canvasRef, onResult, onLoading]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="chef-ask-btn"
    >
      {loading ? (
        <span className="chef-btn-spinner" />
      ) : (
        <>🍳 Ask Chef</>
      )}
    </button>
  );
}

export default ChefButton;
