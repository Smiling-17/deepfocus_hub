import {
  formatVietnamDateTime,
  formatVietnamTime,
  toVietnamTime
} from "../utils/dayjs.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const formatTimer = (seconds) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60).toString().padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   YouTubePlayer — embeds a YouTube video via native iframe
───────────────────────────────────────────────────────────────────────────── */
const YouTubePlayer = ({ videoId, className = "" }) => {
  if (!videoId) return null;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-lg ${className}`}>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full rounded-2xl"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title="Study With Me — YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   TimerExperience — module level to prevent unmount/remount flicker.
   All state lives in FocusArenaPage; this component is purely presentational.
───────────────────────────────────────────────────────────────────────────── */
const TimerExperience = ({
  immersive,
  session,
  remainingSeconds,
  completionPercent,
  timerRingStyle,
  actionMessage,
  isCompleting,
  onCompleteSession,
  onToggleImmersive
}) => {
  const articleClass = immersive
    ? "relative flex h-[90vh] w-full max-w-[60rem] flex-col items-center justify-between overflow-hidden rounded-[48px] bg-gradient-to-br from-primary via-indigo-600 to-slate-900 text-white shadow-[0_50px_120px_-60px_rgba(15,23,42,0.9)]"
    : "relative flex min-h-[32rem] flex-1 flex-col items-center justify-between overflow-hidden rounded-[40px] bg-gradient-to-br from-primary via-indigo-600 to-slate-900 text-white shadow-[0_40px_85px_-45px_rgba(15,23,42,0.85)]";
  const timerClass = immersive
    ? "relative mx-auto flex flex-shrink-0 w-[min(46rem,55vh)] h-[min(46rem,55vh)] items-center justify-center"
    : "relative mx-auto flex aspect-square w-full max-w-[34rem] items-center justify-center sm:max-w-[38rem]";

  return (
    <article className={articleClass}>
      <div className="pointer-events-none absolute -top-24 -left-24 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="absolute right-6 top-6 z-20 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/70">
        <button
          type="button"
          onClick={onToggleImmersive}
          className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {immersive ? "Thu nhỏ" : "Toàn màn hình"}
        </button>
      </div>

      <header className={`relative z-10 flex w-full flex-col items-center gap-4 px-6 text-center sm:px-10 ${immersive ? "pt-8" : "pt-16"}`}>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-[0.4em] text-cyan-100 backdrop-blur">
          KHÔNG GIAN TẬP TRUNG
        </span>
        <h1 className="text-balance text-3xl font-bold leading-snug drop-shadow-lg sm:text-4xl">
          {session.goal}
        </h1>
        <p className="text-sm text-white/70">
          Thời lượng phiên: {session.durationSet} phút · Bắt đầu lúc{" "}
          {formatVietnamTime(session.startTime)}
        </p>
      </header>

      <div className={`relative z-10 flex w-full flex-1 items-center justify-center px-6 ${immersive ? "pb-6" : "pb-12"}`}>
        <div className={timerClass}>
          <div
            className="absolute inset-0 rounded-full p-2 shadow-[0_0_60px_rgba(14,116,144,0.45)]"
            style={timerRingStyle}
            aria-hidden="true"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/70 backdrop-blur-xl shadow-[inset_0_35px_60px_-25px_rgba(0,0,0,0.65)]">
              <div className="flex flex-col items-center justify-center gap-4">
                <span className="text-[clamp(3.5rem,9vw,6.5rem)] font-black tabular-nums leading-none tracking-tight drop-shadow-[0_15px_35px_rgba(15,23,42,0.55)] sm:text-[clamp(4rem,8vw,7.5rem)]">
                  {formatTimer(remainingSeconds)}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  Thời gian còn lại
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center px-6 pb-10">
        <button
          type="button"
          onClick={() => onCompleteSession(false)}
          disabled={isCompleting}
          className="focus-control-btn bg-rose-400/30 text-rose-100 hover:bg-rose-400/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCompleting ? "Đang kết thúc..." : "Kết thúc phiên"}
        </button>
      </div>

      {actionMessage && (
        <div className="relative z-10 w-full px-6 pb-6">
          <p className="mx-auto w-full max-w-xl rounded-2xl bg-slate-900/60 px-4 py-3 text-center text-sm text-white/80 shadow-lg backdrop-blur">
            {actionMessage}
          </p>
        </div>
      )}
    </article>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   FocusArenaPage — manages all state, refs, and side-effects.
───────────────────────────────────────────────────────────────────────────── */
const FocusArenaPage = () => {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [actionMessage, setActionMessage] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  const timerRef = useRef(null);
  const completionTriggerRef = useRef(false);

  // ── Fetch active session on mount ─────────────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await apiClient.get("/sessions/active");
        if (!response.data) {
          setSession(null);
          return;
        }
        const data = response.data;
        const totalSeconds = (data.durationSet || 50) * 60;
        const startMs = new Date(data.startTime).getTime();
        const elapsedFromStart = Math.floor((Date.now() - startMs) / 1000);
        const initialRemaining = Math.max(0, totalSeconds - elapsedFromStart);
        setSession(data);
        setRemainingSeconds(initialRemaining);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  // ── Main countdown interval ───────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      clearInterval(timerRef.current);
      return undefined;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [session]);

  // ── Auto-complete when timer reaches 0 ────────────────────────────────────
  useEffect(() => {
    if (session && remainingSeconds <= 0 && !completionTriggerRef.current) {
      handleCompleteSession(true);
      completionTriggerRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, session]);

  // ── Immersive mode: lock body scroll ─────────────────────────────────────
  useEffect(() => {
    if (isImmersive) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [isImmersive]);

  // ── Immersive mode: Escape key exits ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImmersive(false);
      }
    };

    if (isImmersive) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImmersive]);

  // ── Keep-alive: ping server every 10 min so Render free tier stays awake ─
  useEffect(() => {
    if (!session) return undefined;

    const keepAlive = setInterval(() => {
      apiClient.get("/").catch(() => { }); // fire-and-forget, ignore errors
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(keepAlive);
  }, [session]);

  // ── Audio helper ──────────────────────────────────────────────────────────
  const playCompletionSound = () => {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRuQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0YcQAAAB//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//w=="
      );
      audio.play().catch(() => { });
    } catch {
      // ignore
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCompleteSession = useCallback(
    async (autoFinish = false) => {
      if (!session || completionTriggerRef.current) return;

      completionTriggerRef.current = true;
      clearInterval(timerRef.current);
      setIsCompleting(true);
      try {
        const totalSeconds = (session.durationSet || 50) * 60;
        const secondsFocused = totalSeconds - remainingSeconds;
        const durationCompleted = Math.max(1, Math.round(secondsFocused / 60));

        const response = await apiClient.patch(
          `/sessions/${session._id}/complete`,
          { durationCompleted }
        );
        playCompletionSound();
        navigate(`/danh-gia-phien/${response.data._id}`, {
          replace: true,
          state: { autoFinished: autoFinish }
        });
      } catch (err) {
        setActionMessage(getErrorMessage(err));
        completionTriggerRef.current = false;
      } finally {
        setIsCompleting(false);
      }
    },
    [session, remainingSeconds, navigate]
  );

  const handleToggleImmersive = useCallback(
    () => setIsImmersive((prev) => !prev),
    []
  );

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="card">
        <p className="text-sm text-slate-500">
          Đang tìm phiên Deep Work hiện tại...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/bang-dieu-khien")}
          className="btn-primary w-fit"
        >
          Quay lại Bảng điều khiển
        </button>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="card space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Chưa có phiên Deep Work nào đang hoạt động
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Hãy quay lại Bảng điều khiển để chọn nhiệm vụ hoặc bắt đầu phiên mới.
        </p>
        <button
          type="button"
          onClick={() => navigate("/bang-dieu-khien")}
          className="btn-primary w-fit"
        >
          Trở về Bảng điều khiển
        </button>
      </section>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────
  const totalSeconds = (session.durationSet || 50) * 60;
  const remainingPercentage = Math.max(
    0,
    Math.min(100, Math.round((remainingSeconds / totalSeconds) * 100))
  );
  const completionPercent = 100 - remainingPercentage;
  const progressAngle = Math.max(0, Math.min(360, (completionPercent / 100) * 360));
  const timerRingStyle = {
    background: `conic-gradient(#38bdf8 ${progressAngle}deg, rgba(255,255,255,0.08) ${progressAngle}deg)`
  };

  const timerProps = {
    session,
    remainingSeconds,
    completionPercent,
    timerRingStyle,
    actionMessage,
    isCompleting,
    onCompleteSession: handleCompleteSession,
    onToggleImmersive: handleToggleImmersive
  };

  const hasVideo = Boolean(session.youtubeVideoId);

  // ── Immersive fullscreen layout ───────────────────────────────────────────
  if (isImmersive) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-2xl">
        <div className={`flex w-full max-w-[90rem] items-center justify-center gap-6 ${hasVideo ? "flex-col xl:flex-row" : ""}`}>
          <div className={hasVideo ? "w-full xl:flex-1" : "w-full"}>
            <TimerExperience immersive {...timerProps} />
          </div>
          {hasVideo && (
            <aside className="flex w-full flex-col gap-4 xl:w-[28rem] xl:max-w-[28rem]">
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                  <span className="text-sm font-semibold text-white/90">🎬 Video đang phát</span>
                </div>
                <div className="p-3">
                  <YouTubePlayer videoId={session.youtubeVideoId} />
                </div>
              </section>
            </aside>
          )}
        </div>
      </div>
    );
  }

  // ── Normal layout ─────────────────────────────────────────────────────────
  return (
    <section className={`grid flex-1 gap-8 ${hasVideo ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"}`}>
      <TimerExperience immersive={false} {...timerProps} />

      {hasVideo && (
        <aside className="flex w-full flex-col gap-6 xl:w-[22rem] xl:max-w-[22rem]">
          <section className="glass-panel space-y-3">
            <header>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                🎬 Video đang phát
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Video YouTube sẽ phát tự động để bạn tập trung cùng.
              </p>
            </header>
            <YouTubePlayer videoId={session.youtubeVideoId} />
          </section>
        </aside>
      )}
    </section>
  );
};

export default FocusArenaPage;
