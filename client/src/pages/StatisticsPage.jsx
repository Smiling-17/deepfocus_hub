import {
  formatVietnamDate,
  formatVietnamDateTime
} from "../utils/dayjs.js";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const formatHours = (minutes) => Number((minutes / 60).toFixed(1));

const StatisticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get("/stats/overview");
        setData(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const maxHeatmapMinutes = useMemo(() => {
    if (!data?.heatmap?.length) return 0;
    return Math.max(...data.heatmap.map((item) => item.minutes));
  }, [data]);

  const handleAnalyze = async () => {
    setInsightError("");
    setInsight(null);
    setIsLoadingInsights(true);
    try {
      const response = await apiClient.post("/insights/analyze", {}, {
        timeout: 60000 // 60 giây chờ AI xử lý
      });
      setInsight(response.data);
    } catch (err) {
      setInsightError(getErrorMessage(err));
    } finally {
      setIsLoadingInsights(false);
    }
  };

  if (loading) {
    return (
      <section className="card">
        <p className="text-sm text-slate-500">Đang tổng hợp thống kê...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card space-y-4">
        <p className="text-sm text-red-600">
          {error || "Không thể tải dữ liệu thống kê lúc này."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary w-fit"
        >
          Thử tải lại
        </button>
      </section>
    );
  }

  const { metrics, heatmap, weeklyBreakdown, ratingDistribution, focusWindows, badges, taskSummary, recentSessions } =
    data;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="card space-y-2">
        <p className="text-xs uppercase tracking-widest text-primary">
          Thống kê & Game hóa
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Nhìn lại hành trình tập trung của bạn
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Tổng giờ Deep Work, streak, điểm số và gợi ý AI giúp bạn hiểu rõ nhịp làm việc hiệu quả nhất.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-primary-dark dark:border-primary/30 dark:bg-primary/15 dark:text-primary-light">
          <p className="text-sm font-semibold">Tổng giờ Deep Work</p>
          <p className="mt-2 text-3xl font-bold">
            {formatHours(metrics.totalMinutes)}h
          </p>
          <p className="text-xs text-primary-dark/80 dark:text-primary-light/80">
            {metrics.completedSessions} phiên đã hoàn thành
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="text-sm font-semibold">Chuỗi tập trung hiện tại</p>
          <p className="mt-2 text-3xl font-bold">{metrics.currentStreak} ngày</p>
          <p className="text-xs">
            Dài nhất: {metrics.longestStreak} ngày liên tiếp
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          <p className="text-sm font-semibold">Mức tập trung trung bình</p>
          <p className="mt-2 text-3xl font-bold">
            {metrics.averageRating != null ? `${metrics.averageRating} / 5` : "—"}
          </p>
          <p className="text-xs">
            {metrics.averageRating != null
              ? `★`.repeat(Math.round(metrics.averageRating)) + ` (${metrics.completedSessions} phiên)`
              : "Chưa có phiên nào được đánh giá"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <p className="text-sm font-semibold">Tóm tắt nhiệm vụ</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Tổng: {taskSummary.total}</li>
            <li>Hoàn thành: {taskSummary.completed}</li>
            <li>Sắp diễn ra: {taskSummary.upcoming}</li>
            <li>Quá hạn: {taskSummary.overdue}</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <article className="card">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Heatmap Deep Work
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Mỗi ô biểu diễn tổng phút Deep Work trong một ngày. Màu đậm hơn nghĩa là bạn tập trung nhiều hơn.
          </p>
          {heatmap.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu để hiển thị.</p>
          ) : (
            <div className="mt-4 grid grid-cols-7 gap-2 text-xs">
              {heatmap.map((entry) => {
                const intensity = maxHeatmapMinutes
                  ? entry.minutes / maxHeatmapMinutes
                  : 0;
                const alpha = Math.min(0.85, 0.2 + intensity * 0.6);
                return (
                  <div
                    key={entry.date}
                    className="flex h-14 flex-col justify-center rounded-xl bg-primary/10 text-center text-[11px] font-semibold text-primary-dark dark:text-primary-light"
                    style={{
                      backgroundColor: `rgba(37, 99, 235, ${alpha})`
                    }}
                    aria-label={`${entry.date}: ${entry.minutes} phút`}
                  >
                    <span>{formatVietnamDate(entry.date, "DD/MM")}</span>
                    <span>{entry.minutes}p</span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <aside className="card space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Phân phối đánh giá
            </h3>
            <ul className="mt-3 space-y-2">
              {Object.entries(ratingDistribution).map(([key, value]) => (
                <li key={key} className="text-sm text-slate-600 dark:text-slate-300">
                  <p className="flex items-center justify-between">
                    <span>{key} sao</span>
                    <span>{value} phiên</span>
                  </p>
                  <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, value * 20)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Khung giờ tập trung
            </h3>
            {(() => {
              const maxFocusMinutes = Math.max(
                ...focusWindows.map((window) => window.minutes),
                0
              );

              const getFocusClasses = (minutes) => {
                if (!maxFocusMinutes || minutes === 0) {
                  return "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-800/30";
                }
                const ratio = minutes / maxFocusMinutes;
                if (ratio >= 0.75) {
                  return "border-emerald-400 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] dark:border-emerald-400/80 dark:text-white";
                }
                if (ratio >= 0.5) {
                  return "border-emerald-300 bg-gradient-to-br from-emerald-400/90 to-teal-400/80 text-emerald-50 shadow-[0_8px_20px_rgba(16,185,129,0.18)] dark:border-emerald-400/70 dark:text-emerald-50";
                }
                if (ratio >= 0.25) {
                  return "border-emerald-200 bg-emerald-200/70 text-emerald-800 shadow-[0_6px_18px_rgba(16,185,129,0.12)] dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-100";
                }
                return "border-emerald-100 bg-emerald-100/60 text-emerald-700 shadow-[0_4px_14px_rgba(16,185,129,0.08)] dark:border-emerald-300/40 dark:bg-emerald-400/10 dark:text-emerald-200";
              };

              return (
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  {focusWindows.map((window) => (
                    <div
                      key={window.hour}
                      className={`rounded-xl border px-3 py-2 text-center transition duration-200 ${getFocusClasses(
                        window.minutes
                      )}`}
                    >
                      <p className="font-semibold">{window.hour}h</p>
                      <p>{window.minutes}p</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="card">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Thống kê theo tuần
          </h2>
          {weeklyBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Chưa có dữ liệu để hiển thị.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {weeklyBreakdown.map((week) => (
                <li
                  key={week.weekStart}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-semibold">
                      Tuần bắt đầu {formatVietnamDate(week.weekStart, "DD/MM")}
                    </p>
                    <p>{week.sessions} phiên</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{week.minutes} phút</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <aside className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Huy hiệu & thành tựu
          </h2>
          {badges.length === 0 ? (
            <p className="text-sm text-slate-500">
              Hoàn thành nhiều phiên hơn để mở khóa huy hiệu khích lệ tinh thần!
            </p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {badges.map((badge) => (
                <li
                  key={badge.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/50"
                >
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    {badge.name}
                  </p>
                  <p>{badge.description}</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-200/80">
                    {formatVietnamDate(badge.earnedAt, "DD/MM/YYYY")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <article className="card space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Phân tích từ AI
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              AI sẽ đọc lịch sử Deep Work và gợi ý chiến lược phù hợp với bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingInsights}
          >
            {isLoadingInsights ? "Đang phân tích..." : "Nhận gợi ý thông minh"}
          </button>
        </div>

        {insightError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {insightError}
          </div>
        )}

        {insight ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <p className="text-xs uppercase tracking-wide text-primary">
              Gợi ý ngày {formatVietnamDate(insight.generatedAt, "DD/MM/YYYY")}
            </p>
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900 dark:text-slate-50">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="my-2 space-y-1 pl-4">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{children}</span>
                  </li>
                ),
                h1: ({ children }) => (
                  <h3 className="mt-4 mb-1 font-bold text-slate-900 dark:text-slate-50">{children}</h3>
                ),
                h2: ({ children }) => (
                  <h3 className="mt-4 mb-1 font-bold text-slate-900 dark:text-slate-50">{children}</h3>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-3 mb-1 font-semibold text-slate-800 dark:text-slate-100">{children}</h3>
                )
              }}
            >
              {insight.suggestion}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Nhấn “Nhận gợi ý thông minh” để AI phân tích dữ liệu và đưa ra lời khuyên bằng tiếng Việt.
          </p>
        )}
      </article>

      <article className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Phiên gần đây
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-slate-500">Bạn chưa hoàn thành phiên nào.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {recentSessions.map((session) => (
              <li
                key={session._id}
                className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {session.goal}
                </p>
                <p>
                  {formatVietnamDateTime(session.startTime, "DD/MM/YYYY HH:mm")} ·{" "}
                  {session.durationCompleted || session.durationSet} phút ·{" "}
                  {session.focusRating ? `${session.focusRating} sao` : "Chưa đánh giá"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
};

export default StatisticsPage;
