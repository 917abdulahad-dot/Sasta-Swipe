"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth cursor tracking effect
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    const animateCursor = () => {
      // Ease movement for smoothness
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      }
      
      requestAnimationFrame(animateCursor);
    };
    
    requestAnimationFrame(animateCursor);
    
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return <div ref={cursorRef} id="global-cursor-glow" className="cursor-glow"></div>;
}
