import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 100, y: 100 });
  const [cursorPos, setCursorPos] = useState({ x: 300, y: 300 });
  const [mouseVelocity, setMouseVelocity] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: window.innerWidth - 150, y: window.innerHeight - 100 });
  const animationFrameRef = useRef(null);
  
  // Physics constants
  const GRAVITY = 1200; // pixels/second²
  const GROUND_LEVEL = window.innerHeight - 20;
  const JUMP_SPEED = 800; // Base jump speed
  const MOUSE_SIZE = 100; // Bigger Remy!
  const BUTTON_WIDTH = 120;
  const BUTTON_HEIGHT = 60;
  
  // Button position (dynamic)
  const ENTER_BUTTON = {
    x: buttonPosition.x,
    y: buttonPosition.y,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT
  };
  
  // Generate random button position
  const getRandomButtonPosition = () => {
    const margin = 50;
    const maxX = window.innerWidth - BUTTON_WIDTH - margin;
    const minX = margin;
    const buttonY = GROUND_LEVEL - BUTTON_HEIGHT - 20;
    
    return {
      x: Math.random() * (maxX - minX) + minX,
      y: buttonY
    };
  };
  
  // Check if two rectangles collide
  const checkCollision = (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };
  
  // Calculate jump trajectory to reach cursor
  const calculateJumpVelocity = (fromX, fromY, toX, toY) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    // Calculate time to reach target (based on distance)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const time = distance / 400; // Adjust for jump duration
    
    // Calculate velocities needed
    const vx = dx / time;
    const vy = (dy / time) - (0.5 * GRAVITY * time);
    
    return { x: vx, y: vy };
  };
  
  // Update mouse position based on cursor
  const handleClick = (e) => {
    if (isJumping) return;
    
    const targetX = e.clientX;
    const targetY = e.clientY;
    
    // Calculate jump velocity to reach cursor
    const velocity = calculateJumpVelocity(
      mousePos.x,
      mousePos.y,
      targetX,
      targetY
    );
    
    setMouseVelocity(velocity);
    setIsJumping(true);
    
    // Move button to new random position on each jump!
    setButtonPosition(getRandomButtonPosition());
  };
  
  // Physics update loop
  useEffect(() => {
    if (!isJumping) return;
    
    let lastTime = Date.now();
    
    const updatePhysics = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      setMousePos(prev => {
        let newX = prev.x + mouseVelocity.x * deltaTime;
        let newY = prev.y + mouseVelocity.y * deltaTime;
        
        // Update velocity (gravity)
        const newVelocity = {
          x: mouseVelocity.x,
          y: mouseVelocity.y + GRAVITY * deltaTime
        };
        
        // Check if hit ground
        if (newY >= GROUND_LEVEL - MOUSE_SIZE) {
          newY = GROUND_LEVEL - MOUSE_SIZE;
          
          // Calculate landing velocity magnitude
          const landingSpeed = Math.abs(mouseVelocity.y);
          
          // Check if Remy overlaps with the button when landing
          // Use broader collision detection - any overlap counts as landing on button
          const mouseRect = {
            x: newX,
            y: newY,
            width: MOUSE_SIZE,
            height: MOUSE_SIZE
          };
          
          const landedOnButton = checkCollision(mouseRect, ENTER_BUTTON);
          
          if (landedOnButton) {
            setButtonPressed(true);
            setTimeout(() => setButtonPressed(false), 300);
            
            // First 2 attempts are ALWAYS unsuccessful (annoying!)
            if (attemptCount < 2) {
              setAttemptCount(attemptCount + 1);
              const messages = [
                '😂 Nice try, but no! Try again!',
                '🤡 SO CLOSE! But still no.',
                '😈 Nope! One more time!'
              ];
              setSuccessMessage(messages[Math.floor(Math.random() * messages.length)]);
              setTimeout(() => setSuccessMessage(''), 2000);
            } else {
              // Success threshold: need at least 600 pixels/second landing velocity
              if (landingSpeed > 600) {
                setSuccessMessage('FINALLY! 🙄 Took you long enough...');
                setTimeout(() => {
                  navigate('/order-menu');
                }, 1500);
              } else {
                const weakMessages = [
                  '🥱 That\'s it? WEAK! Jump HIGHER!',
                  '😴 Pathetic jump. Do better.',
                  '🤦 Are you even trying? MORE FORCE!',
                  '💀 My grandma jumps harder than that'
                ];
                setSuccessMessage(weakMessages[Math.floor(Math.random() * weakMessages.length)]);
                setTimeout(() => setSuccessMessage(''), 2500);
              }
            }
          } else {
            // Missed the button entirely
            if (Math.random() > 0.6) {
              const missMessages = [
                '🤨 ...really?', 
                '😑 Aim much?', 
                '🎯 Miss!',
                '😏 Oops! Button moved!',
                '🏃‍♂️ Catch me if you can!',
                '😈 The button loves to run!',
                '🤷 Wrong spot!'
              ];
              setSuccessMessage(missMessages[Math.floor(Math.random() * missMessages.length)]);
              setTimeout(() => setSuccessMessage(''), 1500);
            }
          }
          
          setIsJumping(false);
          setMouseVelocity({ x: 0, y: 0 });
        } else {
          setMouseVelocity(newVelocity);
        }
        
        return { x: newX, y: newY };
      });
      
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };
    
    animationFrameRef.current = requestAnimationFrame(updatePhysics);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isJumping, mouseVelocity, navigate]);
  
  // Track cursor position
  const handleMouseMove = (e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };
  
  return (
    <div 
      className="relative w-screen h-screen overflow-hidden cursor-none"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={{ 
        backgroundImage: `url('https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771485103/PHOTO-2026-02-19-12-38-06_zgd118.jpg')`,
        // backgroundImage: `url('https://triptomagic.com/wp-content/uploads/2024/01/disneyland-paris-attractions-ratatouille-the-adventure-01.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Patrick+Hand&family=Shadows+Into+Light&display=swap');
        
        @keyframes wiggle {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          25% { transform: translateY(-5px) rotate(1deg); }
          50% { transform: translateY(0) rotate(-1deg); }
          75% { transform: translateY(-3px) rotate(0deg); }
        }
        
        @keyframes letterSlide {
          0% { 
            transform: translate(-50%, -80%) scale(0.8); 
            opacity: 0; 
          }
          60% { 
            transform: translate(-50%, -48%) scale(1.02); 
          }
          100% { 
            transform: translate(-50%, -50%) scale(1); 
            opacity: 1; 
          }
        }
      `}</style>
      {/* Cheese cursor */}
      <img 
        src="https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771485458/Gemini_Generated_Image_po4hdgpo4hdgpo4h-removebg-preview_glwoek.png"
        alt="Cheese"
        className="absolute pointer-events-none z-50"
        style={{
          left: `${cursorPos.x - 24}px`,
          top: `${cursorPos.y - 24}px`,
          width: '48px',
          height: '48px',
          filter: 'drop-shadow(0 4px 8px rgba(255,215,0,0.6))',
          animation: 'wiggle 1s ease-in-out infinite'
        }}
      />
      
      {/* Success/Failure Message */}
      {successMessage && (
        <div 
          className="absolute top-1/3 left-1/2 z-50"
          style={{
            transform: 'translate(-50%, -50%)',
            animation: 'letterSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* Message with image background */}
          <div
            style={{
              backgroundImage: `url('https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771488185/PHOTO-2026-02-19-13-32-23_frbnib.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              width: '600px',
              height: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              filter: 'drop-shadow(0 15px 40px rgba(0,0,0,0.4))'
            }}
          >
            {/* Centered Text */}
            <div style={{
              fontFamily: '"Caveat", "Patrick Hand", cursive',
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#2C1810',
              textAlign: 'center',
              padding: '20px',
              maxWidth: '80%',
              textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
              lineHeight: '1.2'
            }}>
              {successMessage}
            </div>
          </div>
        </div>
      )}
      
      {/* Remy the Mouse */}
      <img
        src="https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771487128/Gemini_Generated_Image_6z1zh46z1zh46z1z-removebg-preview_yry0oq.png"
        // src="https://res.cloudinary.com/dgbgxtsrl/image/upload/v1771485474/margot-t-mouserun-for-as_y7t4pi.gif"
        alt="Remy"
        className={`absolute transition-none ${isJumping ? 'animate-none' : ''}`}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          width: `${MOUSE_SIZE}px`,
          height: `${MOUSE_SIZE}px`,
          pointerEvents: 'none',
          transform: mouseVelocity.x < 0 ? 'scaleX(-1)' : 'scaleX(1)'
        }}
      />
      
      {/* Ground Line (visual reference) */}
      <div 
        className="absolute w-full border-t-2 border-dashed border-white/30"
        style={{ top: `${GROUND_LEVEL}px` }}
      />
      
      {/* ENTER Button */}
      <button
        className="absolute text-white font-black text-3xl shadow-2xl border-8"
        style={{
          left: `${ENTER_BUTTON.x}px`,
          top: `${ENTER_BUTTON.y}px`,
          width: `${ENTER_BUTTON.width}px`,
          height: `${ENTER_BUTTON.height}px`,
          pointerEvents: 'none',
          background: buttonPressed 
            ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' 
            : 'linear-gradient(135deg, #f4e04d 0%, #f39c12 50%, #e67e22 100%)',
          borderRadius: '20px',
          borderColor: '#fff',
          borderStyle: 'solid',
          boxShadow: buttonPressed 
            ? '0 2px 10px rgba(0,0,0,0.3), inset 0 4px 8px rgba(0,0,0,0.3)'
            : '0 8px 20px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.2), 0 0 30px rgba(243,156,18,0.6)',
          transform: buttonPressed 
            ? 'scale(0.85) translateY(6px) rotate(1deg)' 
            : 'scale(1) translateY(0) rotate(-1deg)',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive',
          textShadow: '3px 3px 0px rgba(0,0,0,0.3), -1px -1px 0px rgba(255,255,255,0.3)',
          letterSpacing: '1px',
          animation: buttonPressed ? 'none' : 'wiggle 2s ease-in-out infinite',
          transition: 'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.15s, background 0.15s'
        }}
      >
        🧀 ENTER 🐀
      </button>
      
      {/* Debug Info (optional) */}
      {/* <div 
        className="absolute bottom-4 left-4 text-white text-sm font-bold px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
          borderRadius: '20px',
          border: '4px solid #fff',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2)',
          transform: 'rotate(-1deg)',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive',
          textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
        }}
      >
        <div>🐀 ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</div>
        <div>⚡ {Math.round(Math.abs(mouseVelocity.y))} px/s</div>
        <div>📍 {isJumping ? '🚀 Jumping!' : '✨ Ready!'}</div>
        <div>🎯 Tries: {attemptCount}/2</div>
      </div> */}
    </div>
  );
}

export default Home;
