import React, { useState, useEffect, useRef } from 'react';

export default function SwipeToReload({ children }) {
  const [reloading, setReloading] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isTracking = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isTracking.current = true;
    };

    const handleTouchMove = (e) => {
      if (!isTracking.current || reloading) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = touchStartY.current - currentY; // positive = swipe up
      const diffX = Math.abs(currentX - touchStartX.current);

      // Ignore if user is mainly swiping horizontally
      if (diffX > Math.abs(diffY) && diffX > 30) {
        isTracking.current = false;
        return;
      }

      // Only trigger reload when user swipes UP
      if (diffY > 65) {
        setPullDistance(Math.min(diffY, 100));
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = (e) => {
      if (!isTracking.current || reloading) return;
      isTracking.current = false;

      if (pullDistance >= 60) {
        triggerReload();
      } else {
        setPullDistance(0);
      }
    };

    const triggerReload = () => {
      setReloading(true);
      setPullDistance(0);
      try {
        if (navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch (err) {}

      // Short delay for visual feedback before reloading
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, reloading]);

  return (
    <>
      {/* Floating Reload Badge Indicator */}
      {(pullDistance > 0 || reloading) && (
        <div
          style={{
            position: 'fixed',
            top: 'max(20px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.88)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease',
            pointerEvents: 'none'
          }}
        >
          <i
            className={`fa-solid fa-arrows-rotate ${reloading ? 'fa-spin' : ''}`}
            style={{
              fontSize: '15px',
              color: '#38bdf8',
              transform: reloading ? 'none' : `rotate(${pullDistance * 3.6}deg)`
            }}
          ></i>
          <span>{reloading ? 'Reloading...' : pullDistance >= 65 ? 'Release to reload' : 'Swipe up to reload'}</span>
        </div>
      )}
      {children}
    </>
  );
}
