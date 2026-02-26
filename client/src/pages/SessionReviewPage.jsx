import { formatVietnamDateTime } from "../utils/dayjs.js";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const ratingLabels = {
  1: "1 - Rất khó tập trung",
  2: "2 - Chưa đạt kỳ vọng",
  3: "3 - Ổn nhưng còn xao nhãng",
  4: "4 - Tốt, gần như hoàn hảo",
  5: "5 - Tập trung xuất sắc"
};

const SessionReviewPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const autoFinished = location.state?.autoFinished;

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get(`/sessions/${sessionId}`);
        if (response.data.status !== "completed") {
          navigate("/bang-dieu-khien", { replace: true });
          return;
        }
        setSession(response.data);
        if (response.data.focusRating) {
          setRating(response.data.focusRating);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!rating) {
      setSubmitError("Vui lòng chọn mức đánh giá phù hợp với phiên làm việc.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/sessions/${sessionId}/rating`, {
        focusRating: rating
      });
      setSubmitSuccess("Cảm ơn bạn! Đánh giá đã được ghi nhận.");
      setTimeout(() => {
        navigate("/thong-ke", { replace: true });
      }, 1500);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="card">
        <p className="text-sm text-slate-500">Đang tải thông tin phiên làm việc...</p>
      </section>
    );
  }

  if (error || !session) {
    return (
      <section className="card space-y-4">
        <p className="text-sm text-red-600">{error || "Không tìm thấy phiên cần đánh giá."}</p>
        <Link to="/bang-dieu-khien" className="btn-primary w-fit">
          Quay về Bảng điều khiển
        </Link>
      </section>
    );
  }

  return (
    <section className="grid flex-1 gap-6 lg:grid-cols-[3fr,2fr]">
      <article className="card space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary">
            Đánh giá phiên Deep Work
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Bạn cảm thấy mức độ tập trung như thế nào?
          </h1>
          {autoFinished && (
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              Phiên đã tự động kết thúc đúng thời gian. Hãy ghi nhận cảm nhận của bạn ngay nhé!
            </p>
          )}
        </header>

        <section className="rounded-2xl bg-slate-100 px-5 py-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          <p>
            <strong>Mục tiêu:</strong> {session.goal}
          </p>
          <p>
            <strong>Thời lượng đặt ra:</strong> {session.durationSet} phút ·{" "}
            <strong>Hoàn thành:</strong> {session.durationCompleted} phút
          </p>
          <p>
            <strong>Bắt đầu:</strong>{" "}
            {formatVietnamDateTime(session.startTime, "HH:mm DD/MM/YYYY")}
          </p>
          <p>
            <strong>Kết thúc:</strong>{" "}
            {formatVietnamDateTime(session.endTime, "HH:mm DD/MM/YYYY")}
          </p>
        </section>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Chọn mức đánh giá (1 - 5 sao)
            </legend>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-primary ${rating === value
                      ? "border-primary bg-primary/10 text-primary-dark dark:border-primary-light dark:text-primary-light"
                      : "border-slate-300 text-slate-600 hover:border-primary/60 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="focusRating"
                    value={value}
                    className="sr-only"
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  <span className="text-lg" aria-hidden="true">
                    {"★".repeat(value)}
                  </span>
                  <span>{ratingLabels[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {submitSuccess}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Đang lưu..." : "Gửi đánh giá"}
            </button>
            <Link
              to="/bang-dieu-khien"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Trở lại Bảng điều khiển
            </Link>
          </div>
        </form>
      </article>

      <aside className="card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Ghi chú nhanh của bạn
        </h2>
        {session.quickNotes ? (
          <p className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {session.quickNotes}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Bạn chưa ghi chú gì trong phiên này. Hãy cân nhắc ghi lại điểm nổi bật sau mỗi phiên để AI hiểu bạn hơn nhé!
          </p>
        )}

        <p className="rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          Đánh giá trung thực về mức độ tập trung sẽ giúp AI hiểu thói quen của bạn và gợi ý chính xác hơn.
        </p>
      </aside>
    </section>
  );
};

export default SessionReviewPage;
