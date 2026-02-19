/**
 * Chef Component
 * ---------------
 * Displays the chef PNG at the bottom-center of the screen.
 * - Starts hidden below the viewport (translate-y 100%).
 * - After mount, slides upward over ~3.5 s with smooth easing.
 * - On completion (all words placed), performs a bounce celebration.
 *
 * Props:
 *   visible  – boolean, triggers the slide-up entrance
 *   bounce   – boolean, triggers the success bounce animation
 */

const CHEF_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771490421/WhatsApp_Image_2026-02-19_at_13.47.21-removebg-preview_k94qbb.png";

function Chef({ visible, bounce }) {
  return (
    <div
      className={`
        fixed bottom-0 left-1/2 z-10
        -translate-x-1/2
        transition-transform duration-[5500ms] ease-[cubic-bezier(0.22,1,0.36,1)]
        ${visible ? "translate-y-0" : "translate-y-[110%]"}
        ${bounce ? "chef-bounce" : ""}
      `}
      style={{ width: "clamp(160px, 22vw, 300px)" }}
    >
      <img
        src={CHEF_URL}
        alt="Chef character"
        className="w-full h-auto drop-shadow-2xl pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
}

export default Chef;
