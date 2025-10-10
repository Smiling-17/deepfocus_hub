import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useTheme } from "../context/ThemeContext.jsx";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const rootRef = useRef(null);
  const coverRef = useRef(null);
  const wakeupTlRef = useRef(null);
  const highlightTlRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const highlights = gsap.utils.toArray("#highlights path");

      highlights.forEach((line) => {
        const length =
          typeof line.getTotalLength === "function"
            ? line.getTotalLength()
            : 120;
        gsap.set(line, {
          strokeDasharray: length,
          strokeDashoffset: length,
          autoAlpha: 0
        });
        line.dataset.length = String(length);
      });

      gsap.set("#stick-figure-svg", { autoAlpha: 1 });
      gsap.set("#stick-figure", { x: -135 });
      gsap.set("#eyes-mouth", { transformOrigin: "50% 50%" });
      gsap.set("#L-foot", { attr: { x1: 46, x2: 58 } });
      gsap.set("#highlights", { autoAlpha: 0 });
      gsap.set(
        ["#R-foot", "#L-foot", "#R-thigh", "#R-calf", "#L-thigh", "#L-calf"],
        { autoAlpha: 0 }
      );
      gsap.set(coverRef.current, {
        xPercent: -50,
        yPercent: -50,
        width: 75,
        height: 75
      });

      const readyForDrag = gsap.timeline({
        paused: true,
        defaults: { ease: "power1.in", duration: 0.2 }
      });

      readyForDrag
        .to("#eyes-mouth", { x: "+=20" }, "<")
        .to("#R-calf", { attr: { x2: 95, y2: 198 } })
        .to("#R-foot", { attr: { x2: 95, x1: 107 } }, "<")
        .to("#R-foot", { attr: { y2: 198, y1: 190 } })
        .to("#L-calf", { attr: { x2: 71, y2: 198 } })
        .to("#L-foot", { attr: { x1: 74, x2: 86 } }, "<")
        .to("#L-foot", { attr: { y2: 190 } });

      const highlightTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power4.in", duration: 0.25 }
      });

      highlightTl
        .to("#highlights", { autoAlpha: 1, duration: 0.1 })
        .to(
          highlights,
          {
            strokeDashoffset: 0,
            stagger: 0.05
          },
          "<"
        )
        .to(
          highlights,
          {
            strokeDashoffset: (line) =>
              Number(line.dataset.length) || 120,
            autoAlpha: 0,
            stagger: 0.05
          },
          "+=0.1"
        );

      const wakeupTl = gsap.timeline({
        paused: true,
        defaults: { ease: "power1.in", duration: 0.4 }
      });

      wakeupTl
        .to(
          ["#R-foot", "#L-foot", "#R-thigh", "#R-calf", "#L-thigh", "#L-calf"],
          { autoAlpha: 1, duration: 0.1 }
        )
        .to("#face", { attr: { cy: 90 }, duration: 0.2 })
        .fromTo(
          ["#R-thigh", "#R-calf"],
          { attr: { x1: 85, y1: 198 } },
          { attr: { x1: 85, y1: 173 }, duration: 0.2 },
          "<"
        )
        .fromTo(
          ["#L-thigh", "#L-calf"],
          { attr: { x1: 61, y1: 198 } },
          { attr: { x1: 61, y1: 173 }, duration: 0.2 },
          "<"
        )
        .from("#eyes-mouth", { x: 25, y: 40, autoAlpha: 0 }, "<")
        .from(["#L-eye", "#R-eye"], {
          transformOrigin: "50% 50%",
          scaleY: 0
        })
        .fromTo(
          ["#L-eye", "#R-eye"],
          { scaleY: 0 },
          { scaleY: 1, duration: 0.1, transformOrigin: "50% 50%" }
        )
        .add(readyForDrag.play(), "<")
        .to("#stick-figure", { x: 142.5, duration: 0.8 })
        .to(["#R-foot", "#L-foot"], { attr: { y1: 198, y2: 198 }, duration: 0.1 })
        .to(["#L-foot"], { attr: { x1: 71, x2: 59 }, duration: 0.2 }, "<")
        .to(["#L-calf", "#L-thigh"], { attr: { x1: 71, x2: 71 }, duration: 0.1 }, "<")
        .to(["#R-calf", "#R-thigh"], { attr: { x1: 95, x2: 95 }, duration: 0.1 }, "<")
        .to("#face", { attr: { cx: 83, cy: 75 }, ease: "back" }, "<")
        .to("#eyes-mouth", { x: "-=9", y: "-=5" }, "<")
        .addLabel("goingtosleep")
        .to(["#L-calf", "#L-thigh"], { attr: { x1: 61, x2: 71 } })
        .to(["#R-calf", "#R-thigh"], { attr: { x1: 105, x2: 95 } }, "<")
        .to("#eyes-mouth", {
          y: "+=60",
          transformOrigin: "50% 50%",
          autoAlpha: 0
        })
        .to("#face", { attr: { cx: 83, cy: 132 } }, "-=0.2");

      wakeupTl.timeScale(1.5);

      wakeupTlRef.current = wakeupTl;
      highlightTlRef.current = highlightTl;
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const runCoverTransition = (onMidpoint) => {
    gsap
      .timeline()
      .set(coverRef.current, {
        width: 75,
        height: 75,
        xPercent: -50,
        yPercent: -50
      })
      .to(coverRef.current, {
        width: "140vmax",
        height: "140vmax",
        duration: 0.9,
        ease: "power2.inOut",
        onComplete: () => {
          onMidpoint();
        }
      })
      .to(coverRef.current, {
        width: 75,
        height: 75,
        duration: 0.6,
        ease: "power2.inOut"
      });
  };

  useEffect(() => {
    if (!wakeupTlRef.current || wakeupTlRef.current.isActive()) {
      return;
    }
    wakeupTlRef.current.progress(isDark ? 1 : 0);
  }, [isDark]);

  const handleToggle = () => {
    if (!wakeupTlRef.current || !highlightTlRef.current) {
      return;
    }

    const goingDark = !isDark;
    const wakeupTl = wakeupTlRef.current;
    const highlightTl = highlightTlRef.current;

    if (goingDark) {
      highlightTl.restart();
      wakeupTl.eventCallback("onComplete", () => {
        wakeupTl.eventCallback("onComplete", null);
        runCoverTransition(() => toggleTheme());
      });
      wakeupTl.play(0);
    } else {
      highlightTl.restart();
      wakeupTl.eventCallback("onReverseComplete", () => {
        wakeupTl.eventCallback("onReverseComplete", null);
        runCoverTransition(() => toggleTheme());
      });
      wakeupTl.reverse();
    }
  };

  return (
    <div ref={rootRef} className="theme-toggle-wrapper">
      <span ref={coverRef} className="theme-toggle-cover" aria-hidden="true" />
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isDark}
        aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
        className="theme-toggle-btn"
      >
        <svg
          width="100%"
          id="stick-figure-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 150 200"
        >
          <g id="stick-figure">
            <g
              id="R-leg"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            >
              <line id="R-thigh" x1="70" y1="168" x2="70" y2="138" />
              <line id="R-calf" x1="70" y1="168" x2="70" y2="198" />
              <line id="R-foot" x1="70" y1="198" x2="82" y2="198" />
            </g>
            <g
              id="L-leg"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            >
              <line id="L-thigh" x1="46" y1="168" x2="46" y2="138" />
              <line id="L-calf" x1="46" y1="168" x2="46" y2="198" />
              <line id="L-foot" x1="46" y1="198" x2="34" y2="198" />
            </g>
            <circle id="face" cx="58" cy="132" r="68" fill="#facc15" />
            <g id="eyes-mouth">
              <circle id="L-eye" cx="57.68" cy="83.18" r="3.5" />
              <circle id="R-eye" cx="90.68" cy="83.18" r="3.5" />
              <path
                id="mouth"
                d="M79.53,91.98c.15,0,.25,.22,.22,.45-.27,2-2.29,3.55-4.74,3.55s-4.48-1.55-4.74-3.55c-.03-.23,.07-.45,.22-.45h9.05Z"
                fill="#fff"
                transform-origin="center"
                transform="scale(1.3)"
              />
            </g>
            <g
              id="highlights"
              stroke="white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path id="hl-1" d="M76.06,145.54l-13.33-13.33" />
              <path id="hl-2" d="M92.73,132.21l-13.33,13.33" />
              <path id="hl-3" d="M63.63,161.31l13.33-13.33" />
              <path id="hl-4" d="M92.73,161.31l-13.33-13.33" />
            </g>
          </g>
        </svg>
        <div className="ml-3 flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-300">
            Chế độ
          </span>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-100">
            {isDark ? "Tối ưu" : "Sáng tạo"}
          </span>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
