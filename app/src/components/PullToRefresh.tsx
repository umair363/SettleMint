"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import styles from "./PullToRefresh.module.css";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const MAX_PULL = 100;
  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull if we are at the very top of the page
    if (window.scrollY === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
      
      if (distance >= THRESHOLD && typeof navigator !== "undefined" && navigator.vibrate) {
        // Light haptic when threshold reached
        if (pullDistance < THRESHOLD) navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={styles.indicator}
        style={{ 
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px) scale(${isRefreshing ? 1 : Math.min(pullDistance / THRESHOLD, 1)})`,
          opacity: Math.min(pullDistance / 30, 1),
          transition: isDragging.current ? "none" : "transform 0.3s var(--ease-spring), opacity 0.3s"
        }}
      >
        <svg 
          className={isRefreshing ? styles.spinning : ""}
          width="24" height="24" viewBox="0 0 24 24" fill="none"
        >
          <path d="M12 4V1L8 5l4 4V6a6 6 0 11-6 6H4a8 8 0 108-8z" fill="var(--mint-400, #3DD68C)"/>
        </svg>
      </div>
      
      <div 
        className={styles.content}
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
}
