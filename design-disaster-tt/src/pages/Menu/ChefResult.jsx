/**
 * ChefResult Component
 * ----------------------
 * Displays Gemini's food-recognition response in a cartoony
 * label at the top-left of the screen.
 *
 * - Bounces in when `text` changes from empty → non-empty.
 * - Shows "Chef Thinks: ___" placeholder when idle.
 *
 * Props:
 *   text – string result from Gemini (or empty string)
 */

import { useEffect, useState } from "react";

function ChefResult({ text }) {
  // Trigger bounce animation when text changes
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (text) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(t);
    }
  }, [text]);

  return (
    <div className={`chef-result-label ${bounce ? "chef-result-bounce" : ""}`}>
      <span className="chef-result-prefix">Chef Thinks:</span>{" "}
      <span className="chef-result-text">{text || "___"}</span>
    </div>
  );
}

export default ChefResult;
