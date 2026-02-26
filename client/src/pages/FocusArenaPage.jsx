import {
  formatVietnamDateTime,
  formatVietnamTime,
  toVietnamTime
} from "../utils/dayjs.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const MAX_PAUSE_SECONDS = 180;

const formatTimer = (seconds) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60).toString().padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   TimerExperience is defined at MODULE LEVEL (outside FocusArenaPage).
   
   WHY: If it were defined inside the render function, JavaScript would create
   a brand-new function reference on every re-render (i.e. every second due to
   the setInterval). React would treat it as a completely different component
   type, causing it to unmount the old tree and mount a fresh one each second —
   producing the visible flicker. Hoisting it here gives it a single, stable
   reference for the entire lifetime of the app.
───────────────────────────────────────────────────────────────────────────── */
const TimerExperience = ({
  immersive,
  session,
  remainingSeconds,
  isPaused,
  pauseCount,
  pauseCountdown,
  completionPercent,
  timerRingStyle,
  actionMessage,
  isCompleting,
  onPauseToggle,
  onLogDistraction,
  onCompleteSession,
  onToggleImmersive
}) => {
  const articleClass = immersive
    ? "relative flex h-[90vh] w-full max-w-[60rem] flex-col items-center justify-between overflow-hidden rounded-[48px] bg-gradient-to-br from-primary via-indigo-600 to-slate-900 text-white shadow-[0_50px_120px_-60px_rgba(15,23,42,0.9)]"
    : "relative flex min-h-[32rem] flex-1 flex-col items-center justify-between overflow-hidden rounded-[40px] bg-gradient-to-br from-primary via-indigo-600 to-slate-900 text-white shadow-[0_40px_85px_-45px_rgba(15,23,42,0.85)]";
  const timerClass = immersive
    ? "relative mx-auto flex aspect-square w-full max-w-[46rem] max-h-[55vh] items-center justify-center sm:max-w-[50rem]"
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
          <div className="absolute -bottom-6 flex w-full items-center justify-center">
            <div className="flex w-full max-w-sm items-center justify-between rounded-full bg-white/10 px-6 py-3 text-xs text-white/70 backdrop-blur">
              <span>
                Bắt đầu: {formatVietnamTime(session.startTime, "HH:mm:ss")}
              </span>
              <span>Hoàn thành: {completionPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center gap-3 px-6 pb-10 sm:flex-row sm:justify-center sm:gap-4">
        <button
          type="button"
          onClick={onPauseToggle}
          className="focus-control-btn bg-white/15 text-white hover:bg-white/25"
        >
          {isPaused ? "Tiếp tục" : `Tạm dừng (${pauseCount}/2)`}
          {isPaused && (
            <span className="ml-2 text-xs text-white/80">
              {formatTimer(pauseCountdown)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onLogDistraction}
          className="focus-control-btn bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
        >
          Tôi bị xao nhãng
          <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black/20 px-2 text-[11px] font-semibold">
            {session.distractionTimestamps?.length || 0}
          </span>
        </button>

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
   Derived display values and stable handler callbacks are passed down to
   TimerExperience as props.
───────────────────────────────────────────────────────────────────────────── */
const FocusArenaPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState(MAX_PAUSE_SECONDS);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  const completionTriggerRef = useRef(false);
  const timerRef = useRef(null);
  const pauseRef = useRef(null);
  const pauseStartRef = useRef(null);

  // ── Load active session on mount ──────────────────────────────────────────
  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get("/sessions/active");
        if (!response.data) {
          setSession(null);
        } else {
          initializeSession(response.data);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pauseRef.current);
    };
  }, []);

  const initializeSession = (sessionData) => {
    setSession(sessionData);
    setNotes(sessionData.quickNotes || "");
    setActionMessage("");
    completionTriggerRef.current = false;

    const totalSeconds = (sessionData.durationSet || 50) * 60;
    const completedSeconds = (sessionData.durationCompleted || 0) * 60;

    const pauseSeconds = (sessionData.pauseEvents || []).reduce(
      (total, event) => total + (event.durationSeconds || 0),
      0
    );

    const elapsedFromStart = Math.max(
      0,
      toVietnamTime().diff(toVietnamTime(sessionData.startTime), "second") -
      pauseSeconds
    );

    const initialRemaining = Math.max(
      0,
      totalSeconds - Math.max(elapsedFromStart, completedSeconds)
    );

    setRemainingSeconds(initialRemaining);
    setIsPaused(false);
    setPauseCountdown(MAX_PAUSE_SECONDS);
  };

  // ── Main countdown interval ───────────────────────────────────────────────
  useEffect(() => {
    if (!session || isPaused) {
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
  }, [session, isPaused]);

  // ── Auto-complete when timer reaches 0 ────────────────────────────────────
  useEffect(() => {
    if (
      session &&
      remainingSeconds <= 0 &&
      !completionTriggerRef.current &&
      !isPaused
    ) {
      handleCompleteSession(true);
      completionTriggerRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, session, isPaused]);

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

  // ── Derived values ────────────────────────────────────────────────────────
  const pauseCount = useMemo(
    () => session?.pauseEvents?.length || 0,
    [session]
  );

  // ── Audio helper (not a handler, no need for useCallback) ─────────────────
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

  // ── Handlers — all wrapped in useCallback so TimerExperience's props
  //    stay referentially stable between renders, preventing unnecessary
  //    re-renders of the (now-hoisted) TimerExperience component.
  // ─────────────────────────────────────────────────────────────────────────

  const resumeFromPause = useCallback(
    async (autoResume) => {
      clearInterval(pauseRef.current);
      const startedAt = pauseStartRef.current;
      const endedAt = new Date();

      if (!startedAt) {
        setIsPaused(false);
        return;
      }

      try {
        const response = await apiClient.patch(
          `/sessions/${session._id}/pause`,
          { startedAt, endedAt }
        );
        setSession(response.data);
        setIsPaused(false);
        setActionMessage(
          autoResume
            ? "Tạm dừng đã kết thúc sau 3 phút. Bạn tiếp tục nhé!"
            : "Bạn đã quay lại phiên tập trung. Tuyệt vời!"
        );
      } catch (err) {
        setActionMessage(getErrorMessage(err));
        setIsPaused(false);
      } finally {
        pauseStartRef.current = null;
        setPauseCountdown(MAX_PAUSE_SECONDS);
      }
    },
    [session]
  );

  const handlePauseToggle = useCallback(async () => {
    if (!session) return;

    if (!isPaused) {
      if (pauseCount >= 2) {
        setActionMessage("Bạn chỉ có thể tạm dừng tối đa 2 lần cho mỗi phiên.");
        return;
      }
      pauseStartRef.current = new Date();
      setIsPaused(true);
      setActionMessage("Phiên đã được tạm dừng. Thời gian tối đa 03:00.");
      setPauseCountdown(MAX_PAUSE_SECONDS);

      pauseRef.current = setInterval(() => {
        setPauseCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(pauseRef.current);
            resumeFromPause(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      resumeFromPause(false);
    }
  }, [session, isPaused, pauseCount, resumeFromPause]);

  const handleLogDistraction = useCallback(async () => {
    if (!session) return;
    try {
      const response = await apiClient.patch(
        `/sessions/${session._id}/distraction`,
        {}
      );
      setSession(response.data);
      setActionMessage("Đã ghi lại thời điểm bạn bị xao nhãng.");
    } catch (err) {
      setActionMessage(getErrorMessage(err));
    }
  }, [session]);

  // handleNotesSave is only called from the sidebar (not passed to TimerExperience),
  // so useCallback here is optional — kept plain for simplicity.
  const handleNotesSave = async () => {
    if (!session) return;
    setIsSavingNotes(true);
    setNoteSavedMessage("");
    try {
      const response = await apiClient.patch(
        `/sessions/${session._id}/notes`,
        { quickNotes: notes }
      );
      setSession(response.data);
      setNoteSavedMessage("Đã lưu ghi chú.");
    } catch (err) {
      setNoteSavedMessage(getErrorMessage(err));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCompleteSession = useCallback(
    async (autoFinish = false) => {
      if (!session || completionTriggerRef.current) return;

      completionTriggerRef.current = true;
      clearInterval(timerRef.current);
      clearInterval(pauseRef.current);
      setIsCompleting(true);
      try {
        const totalSeconds = (session.durationSet || 50) * 60;
        const secondsFocused = totalSeconds - remainingSeconds;
        const durationCompleted = Math.max(1, Math.round(secondsFocused / 60));

        const response = await apiClient.patch(
          `/sessions/${session._id}/complete`,
          { durationCompleted, quickNotes: notes }
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
    [session, remainingSeconds, notes, navigate]
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

  // ── Derived display values (computed once per render, passed as props) ────
  const remainingPercentage = Math.max(
    0,
    Math.min(
      100,
      Math.round((remainingSeconds / ((session.durationSet || 50) * 60)) * 100)
    )
  );
  const completionPercent = 100 - remainingPercentage;
  const progressAngle = Math.max(0, Math.min(360, (completionPercent / 100) * 360));
  const timerRingStyle = {
    background: `conic-gradient(#38bdf8 ${progressAngle}deg, rgba(255,255,255,0.08) ${progressAngle}deg)`
  };

  // Collect all props for TimerExperience in one object to keep JSX clean
  const timerProps = {
    session,
    remainingSeconds,
    isPaused,
    pauseCount,
    pauseCountdown,
    completionPercent,
    timerRingStyle,
    actionMessage,
    isCompleting,
    onPauseToggle: handlePauseToggle,
    onLogDistraction: handleLogDistraction,
    onCompleteSession: handleCompleteSession,
    onToggleImmersive: handleToggleImmersive
  };

  // ── Immersive fullscreen layout ───────────────────────────────────────────
  if (isImmersive) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-2xl">
        <TimerExperience immersive {...timerProps} />
      </div>
    );
  }

  // ── Normal layout ─────────────────────────────────────────────────────────
  return (
    <section className="grid flex-1 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <TimerExperience immersive={false} {...timerProps} />

      <aside className="flex w-full flex-col gap-6 xl:w-[22rem] xl:max-w-[22rem]">
        <section className="glass-panel space-y-3">
          <header>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Ghi chú nhanh
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Bất cứ ý tưởng nào xuất hiện, hãy ghi lại ngay để giải phóng tâm trí.
            </p>
          </header>
          <textarea
            className="input-field h-40 resize-none bg-white/60 text-sm dark:bg-slate-900/70"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={handleNotesSave}
            placeholder="Viết ra điều bạn muốn nhớ sau phiên này..."
          />
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
            <button
              type="button"
              onClick={handleNotesSave}
              className="rounded-full border border-slate-300 px-3 py-1 font-semibold transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              disabled={isSavingNotes}
            >
              {isSavingNotes ? "Đang lưu..." : "Lưu ghi chú"}
            </button>
            {noteSavedMessage && <span>{noteSavedMessage}</span>}
          </div>
        </section>

        <section className="glass-panel space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nhịp phiên hiện tại
          </h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2 dark:bg-slate-900/60">
              <span>Bắt đầu</span>
              <span className="font-semibold">
                {formatVietnamDateTime(session.startTime, "HH:mm DD/MM")}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2 dark:bg-slate-900/60">
              <span>Xao nhãng đã ghi</span>
              <span className="font-semibold">
                {session.distractionTimestamps?.length || 0} lần
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2 dark:bg-slate-900/60">
              <span>Thời lượng tạm dừng</span>
              <span className="font-semibold">
                {(session.pauseEvents || []).reduce(
                  (sum, event) => sum + (event.durationSeconds || 0),
                  0
                )}{" "}
                giây
              </span>
            </li>
          </ul>
          {session.distractionTimestamps?.length > 0 && (
            <div className="rounded-xl bg-white/60 px-4 py-3 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-200">
                Mốc xao nhãng
              </p>
              <ul className="space-y-1">
                {session.distractionTimestamps.map((timestamp, index) => (
                  <li key={timestamp}>
                    Lần {index + 1}: {formatVietnamTime(timestamp, "HH:mm:ss")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 px-4 py-3 text-xs text-slate-600 dark:from-slate-800 dark:to-slate-900 dark:text-slate-200">
            Đồng hồ chạm 00:00 sẽ tự chuyển sang màn hình đánh giá. Hãy để nhịp tập trung dẫn dắt bạn!
          </p>
        </section>
      </aside>
    </section>
  );
};

export default FocusArenaPage;
