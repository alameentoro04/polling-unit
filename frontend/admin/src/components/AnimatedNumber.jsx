import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value, duration = 700, format }) {
  const [display, setDisplay] = useState(value ?? 0);
  const fromRef = useRef(value ?? 0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    cancelAnimationFrame(frameRef.current);

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>;
}
