"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Handle close animation
  const handleClose = () => {
    setIsClosing(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10); // Light haptic on close
    }
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(100%)`;
      }
    }, 300); // Matches CSS transition duration
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = "hidden"; // Prevent background scroll
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(15); // Light haptic on open
      }
      if (sheetRef.current) {
        // Reset transform
        sheetRef.current.style.transform = `translateY(0)`;
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Touch event handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    // Only allow dragging down
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
      sheetRef.current.style.transition = "none";
    }
  };

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
      
      // If dragged down more than 100px, close it
      if (diff > 100) {
        handleClose();
      } else {
        // Otherwise snap back
        sheetRef.current.style.transform = `translateY(0)`;
      }
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div 
        className={`${styles.overlay} ${isClosing ? styles.fadeOut : styles.fadeIn}`} 
        onClick={handleClose} 
      />
      <div
        className={`${styles.sheet} ${isClosing ? styles.slideOut : styles.slideIn}`}
        ref={sheetRef}
      >
        <div 
          className={styles.dragHandleContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.dragHandle} />
        </div>
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeBtn} onClick={handleClose}>
              Done
            </button>
          </div>
        )}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </>
  );
}
