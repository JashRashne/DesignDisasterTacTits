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
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Gemini API key (set VITE_GEMINI_API_KEY in .env) ────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const MODEL_NAME = "gemini-2.5-flash";
const MAX_RETRIES = 3;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (error) => {
  const status = error?.status;
  const message = (error?.message ?? "").toLowerCase();
  return status === 429 || message.includes("429") || message.includes("resource_exhausted");
};

function ChefButton({ canvasRef, onResult, loading, onLoading }) {
  const handleClick = useCallback(async () => {
    if (!canvasRef?.current) return;
    if (!GEMINI_API_KEY) {
      onResult("Missing VITE_GEMINI_API_KEY");
      return;
    }

    onLoading(true);

    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      const image = {
        inlineData: {
          data: base64,
          mimeType: "image/png",
        },
      };

      let attempt = 0;
      while (attempt <= MAX_RETRIES) {
        try {
          const result = await model.generateContent([PROMPT, image]);
          const text = result?.response?.text()?.trim() || "Unknown";
          onResult(text);
          return;
        } catch (error) {
          if (!isRateLimitError(error) || attempt === MAX_RETRIES) {
            throw error;
          }

          const backoffMs = 500 * 2 ** attempt + Math.floor(Math.random() * 300);
          await sleep(backoffMs);
          attempt += 1;
        }
      }
    } catch (err) {
      console.error("Gemini API error:", err);
      if (isRateLimitError(err)) {
        onResult("Chef is busy right now. Try again in a few seconds.");
      } else {
        onResult("Error — try again");
      }
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
