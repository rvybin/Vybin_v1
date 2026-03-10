import { useEffect, useRef } from "react";

export function CursorGlow() {
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty("--mx", `${target.current.x}px`);
      document.documentElement.style.setProperty("--my", `${target.current.y}px`);
      rafRef.current = null;
    };

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      // throttle to animation frames (smooth + fast)
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(update);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        background:
          "radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), rgba(0,191,255,0.05), transparent 75%)",
      }}
    />
  );
}
