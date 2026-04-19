import './FloatingBall.css';

interface FloatingBallProps {
  isOpen: boolean;
  onClick: () => void;
}

function FloatingBall({ isOpen, onClick }: FloatingBallProps) {
  return (
    <div
      className={`floating-ball ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      data-tauri-drag-region
    >
      <div className="ball-inner">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export default FloatingBall;
