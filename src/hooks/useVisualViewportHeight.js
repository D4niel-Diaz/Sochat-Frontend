import { useEffect } from "react";

/**
 * Size a full-screen layout to the visible area. iOS Safari doesn't shrink
 * `100dvh` when the keyboard opens; it pans the page instead, pushing the
 * header off screen. Tracking visualViewport keeps header and composer visible.
 */
const useVisualViewportHeight = (ref, active = true) => {
  useEffect(() => {
    const el = ref.current;
    const vv = window.visualViewport;
    if (!active || !el || !vv) return;

    const update = () => {
      // Pinch-zoomed: leave the layout alone
      if (vv.scale > 1.01) return;
      el.style.height = `${vv.height}px`;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.height = "";
    };
  }, [ref, active]);
};

export default useVisualViewportHeight;
