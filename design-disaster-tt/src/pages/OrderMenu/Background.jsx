/**
 * Background Component
 * ---------------------
 * Renders the restaurant image as a fixed full-screen background.
 * Uses object-cover to ensure the image fills the viewport regardless of
 * aspect ratio, and a dark overlay for readability.
 */

const BG_URL =
  "https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771488919/ChatGPT_Image_Feb_19_2026_01_44_26_PM_g8ofgp.png";

function Background() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Restaurant background image */}
      <img
        src={BG_URL}
        alt="Restaurant background"
        className="w-full h-full object-cover"
      />
      {/* Dark overlay for better contrast with UI elements */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}

export default Background;
