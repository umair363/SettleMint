"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import styles from "./BottomSheet.module.css";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Renders a visible header row with a "Done" button. */
  title?: string;
  /**
   * Accessible name announced to screen readers on open. Falls back to
   * `title` when the visible header is used; pass this separately when the
   * sheet's heading is rendered as part of `children` instead (both current
   * call sites do this — the visual header is currently self-managed).
   */
  ariaLabel?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title, ariaLabel }: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);

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
      // Remember what had focus so it can be restored on close, then move
      // focus into the sheet so screen readers announce the new context.
      triggerRef.current = document.activeElement as HTMLElement | null;
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Keep Tab from escaping to the page behind the sheet while it's open.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
      return;
    }
    if (e.key !== "Tab" || !sheetRef.current) return;

    const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

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
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || "Dialog"}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
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
