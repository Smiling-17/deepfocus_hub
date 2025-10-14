import dayjs, {
  formatVietnamDate,
  formatVietnamDateTime,
  formatVietnamTime,
  toVietnamTime,
  VIETNAM_TIMEZONE
} from "../utils/dayjs.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const MAX_SUBTASKS_PER_TASK = 8;

const createBlankSubTask = () => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: "",
  isCompleted: false
});

const createDefaultTaskForm = () => ({
  title: "",
  project: "",
  startTime: "09:00",
  endTime: "10:00",
  subTasks: [createBlankSubTask()],
  progressNote: ""
});

const defaultGoalForm = {
  taskId: null,
  goal: "",
  durationMinutes: 50
};

const toVietnameseTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(toVietnamTime());
  const [selectedDate, setSelectedDate] = useState(
    toVietnamTime().format("YYYY-MM-DD")
  );
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");

  const [taskForm, setTaskForm] = useState(() => createDefaultTaskForm());
  const [taskFormErrors, setTaskFormErrors] = useState({});
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState("");
  const [progressNoteDrafts, setProgressNoteDrafts] = useState({});
  const [noteSaving, setNoteSaving] = useState({});
  const [noteFeedback, setNoteFeedback] = useState({});
  const [subTaskUpdating, setSubTaskUpdating] = useState({});
  const noteFeedbackTimeouts = useRef({});

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState(defaultGoalForm);
  const [goalError, setGoalError] = useState("");
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (location.state?.showWelcome) {
      setShowWelcomeModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(toVietnamTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setProgressNoteDrafts(
      tasks.reduce((accumulator, task) => {
        accumulator[task._id] = task.progressNote || "";
        return accumulator;
      }, {})
    );
  }, [tasks]);

  useEffect(() => {
    return () => {
      Object.values(noteFeedbackTimeouts.current).forEach((timeoutId) =>
        clearTimeout(timeoutId)
      );
    };
  }, []);

  const fetchTasks = async (date) => {
    setIsLoadingTasks(true);
    setTaskError("");
    try {
      const response = await apiClient.get("/tasks", { params: { date } });
      setTasks(response.data);
    } catch (error) {
      setTaskError(getErrorMessage(error));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks(selectedDate);
  }, [selectedDate]);

  const validateTaskForm = () => {
    const errors = {};

    if (!taskForm.title.trim()) {
      errors.title = "Vui lòng nhập tiêu đề nhiệm vụ.";
    }
    if (!taskForm.startTime) {
      errors.startTime = "Vui lòng chọn thời gian bắt đầu.";
    }
    if (!taskForm.endTime) {
      errors.endTime = "Vui lòng chọn thời gian kết thúc.";
    }

    if (taskForm.startTime && taskForm.endTime) {
      const start = dayjs.tz(
        `${selectedDate}T${taskForm.startTime}`,
        VIETNAM_TIMEZONE
      );
      const end = dayjs.tz(
        `${selectedDate}T${taskForm.endTime}`,
        VIETNAM_TIMEZONE
      );
      if (!start.isValid() || !end.isValid()) {
        errors.endTime = "Thời gian không hợp lệ.";
      } else if (end.isBefore(start)) {
        errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu.";
      }
    }

    setTaskFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaskSubTaskChange = (subTaskId, value) => {
    setTaskForm((prev) => ({
      ...prev,
      subTasks: prev.subTasks.map((subTask) =>
        subTask.id === subTaskId ? { ...subTask, title: value } : subTask
      )
    }));
  };

  const handleAddSubTaskField = () => {
    setTaskForm((prev) => {
      if (prev.subTasks.length >= MAX_SUBTASKS_PER_TASK) {
        return prev;
      }
      return {
        ...prev,
        subTasks: [...prev.subTasks, createBlankSubTask()]
      };
    });
  };

  const handleRemoveSubTaskField = (subTaskId) => {
    setTaskForm((prev) => {
      const remaining = prev.subTasks.filter(
        (subTask) => subTask.id !== subTaskId
      );
      return {
        ...prev,
        subTasks: remaining.length > 0 ? remaining : [createBlankSubTask()]
      };
    });
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setTaskSuccessMessage("");

    if (!validateTaskForm()) {
      return;
    }

    setIsSubmittingTask(true);
    try {
      const start = dayjs.tz(
        `${selectedDate}T${taskForm.startTime}`,
        VIETNAM_TIMEZONE
      );
      const end = dayjs.tz(
        `${selectedDate}T${taskForm.endTime}`,
        VIETNAM_TIMEZONE
      );
      const subTasksPayload = taskForm.subTasks
        .map((subTask) => ({
          title: subTask.title.trim(),
          isCompleted: false
        }))
        .filter((subTask) => subTask.title.length > 0);

      await apiClient.post("/tasks", {
        title: taskForm.title.trim(),
        project: taskForm.project.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        subTasks: subTasksPayload,
        progressNote: taskForm.progressNote.trim()
      });

      setTaskForm(createDefaultTaskForm());
      setTaskSuccessMessage("Nhiệm vụ đã được thêm vào lịch của bạn.");
      fetchTasks(selectedDate);
    } catch (error) {
      setTaskError(getErrorMessage(error));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleToggleComplete = async (taskId, isCompleted) => {
    try {
      const response = await apiClient.patch(
        `/tasks/${taskId}/complete`,
        { isCompleted }
      );
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? response.data : task))
      );
    } catch (error) {
      setTaskError(getErrorMessage(error));
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (error) {
      setTaskError(getErrorMessage(error));
    }
  };

  const handleToggleSubTask = async (taskId, subTaskId, isCompleted) => {
    setSubTaskUpdating((prev) => ({ ...prev, [taskId]: true }));
    try {
      const task = tasks.find((item) => item._id === taskId);
      if (!task) {
        return;
      }

      const updatedSubTasks = task.subTasks.map((subTask) =>
        subTask._id === subTaskId
          ? { ...subTask, isCompleted }
          : subTask
      );

      const response = await apiClient.patch(`/tasks/${taskId}`, {
        subTasks: updatedSubTasks.map(({ _id, title, isCompleted: done }) => ({
          _id,
          title,
          isCompleted: done
        }))
      });

      setTasks((prev) =>
        prev.map((item) => (item._id === taskId ? response.data : item))
      );
    } catch (error) {
      setTaskError(getErrorMessage(error));
    } finally {
      setSubTaskUpdating((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleProgressNoteChange = (taskId, value) => {
    setProgressNoteDrafts((prev) => ({
      ...prev,
      [taskId]: value
    }));
  };

  const handleSaveProgressNote = async (taskId) => {
    const note = (progressNoteDrafts[taskId] || "").trim();
    setNoteSaving((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, {
        progressNote: note
      });

      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? response.data : task))
      );
      setNoteFeedback((prev) => ({
        ...prev,
        [taskId]: "Đã lưu ghi chú tiến độ."
      }));
      if (noteFeedbackTimeouts.current[taskId]) {
        clearTimeout(noteFeedbackTimeouts.current[taskId]);
      }
      noteFeedbackTimeouts.current[taskId] = setTimeout(() => {
        setNoteFeedback((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        delete noteFeedbackTimeouts.current[taskId];
      }, 2000);
    } catch (error) {
      setTaskError(getErrorMessage(error));
      setNoteFeedback((prev) => ({
        ...prev,
        [taskId]: "Không thể lưu, vui lòng thử lại."
      }));
      if (noteFeedbackTimeouts.current[taskId]) {
        clearTimeout(noteFeedbackTimeouts.current[taskId]);
      }
      noteFeedbackTimeouts.current[taskId] = setTimeout(() => {
        setNoteFeedback((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        delete noteFeedbackTimeouts.current[taskId];
      }, 4000);
    } finally {
      setNoteSaving((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const openGoalModal = (task) => {
    setGoalForm({
      taskId: task?._id || null,
      goal: task ? `Hoàn thành: ${task.title}` : "",
      durationMinutes: 50
    });
    setGoalError("");
    setShowGoalModal(true);
  };

  const handleGoalFormChange = (event) => {
    const { name, value } = event.target;
    setGoalForm((prev) => ({
      ...prev,
      [name]: name === "durationMinutes" ? Number(value) : value
    }));
  };

  const handleStartSession = async (event) => {
    event.preventDefault();
    setGoalError("");

    if (!goalForm.goal.trim()) {
      setGoalError("Vui lòng nhập mục tiêu rõ ràng cho phiên này.");
      return;
    }
    if (goalForm.durationMinutes < 10 || goalForm.durationMinutes > 240) {
      setGoalError("Thời lượng cần nằm trong khoảng 10 - 240 phút.");
      return;
    }

    setIsSubmittingGoal(true);
    try {
      await apiClient.post("/sessions", {
        taskId: goalForm.taskId,
        goal: goalForm.goal.trim(),
        durationMinutes: goalForm.durationMinutes
      });
      setShowGoalModal(false);
      setGoalForm(defaultGoalForm);
      navigate("/khong-gian-tap-trung", {
        replace: true,
        state: { fromTask: goalForm.taskId }
      });
    } catch (error) {
      setGoalError(getErrorMessage(error));
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const schedules = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    [tasks]
  );

  const upcomingTask = useMemo(() => {
    const now = toVietnamTime();
    return schedules.find(
      (task) => toVietnamTime(task.endTime).isAfter(now) && !task.isCompleted
    );
  }, [schedules]);

  const completedCount = useMemo(
    () => schedules.filter((task) => task.isCompleted).length,
    [schedules]
  );
  const activeCount = schedules.length - completedCount;
  const totalMinutesPlanned = useMemo(() => {
    return schedules.reduce((sum, task) => {
      const start = toVietnamTime(task.startTime);
      const end = toVietnamTime(task.endTime);
      return sum + Math.max(0, end.diff(start, "minute"));
    }, 0);
  }, [schedules]);

  return (
    <>
      <section className="flex flex-1 flex-col gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-indigo-500 to-aurora-cyan text-white shadow-glow">
          <div
            className="absolute inset-0 opacity-30 md:opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25), transparent 60%)"
            }}
          />
          <div className="relative z-10 flex flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/20 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-6 text-white shadow-lg backdrop-blur-lg">
                  <div className="space-y-3 text-white/95">
                    <p className="text-xs uppercase tracking-[0.45em] text-white/80">
                      Thời gian Việt Nam
                    </p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base font-semibold md:text-lg">
                      <span>
                        Bây giờ:{" "}
                        <span className="font-bold">
                          {currentTime.format("HH:mm:ss")}
                        </span>
                      </span>
                      <span className="hidden select-none text-white/60 sm:inline">
                        •
                      </span>
                      <span>
                        {toVietnameseTitleCase(currentTime.format("dddd"))},{" "}
                        {currentTime.format("DD/MM/YYYY")}
                      </span>
                    </p>
                    <p className="text-xs font-medium text-white/85 md:text-sm">
                      Đang xem lịch:{" "}
                      {toVietnameseTitleCase(
                        formatVietnamDate(selectedDate, "dddd")
                      )}
                      , {formatVietnamDate(selectedDate, "DD/MM/YYYY")}
                    </p>
                  </div>
                </div>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                  Trung tâm điều phối DeepFocus
                </h1>
                <p className="max-w-2xl text-sm md:text-base text-white/80">
                  Biến danh sách việc cần làm thành hành trình tập trung sâu. Lên kế hoạch, khởi động phiên và theo dõi nhịp độ tập trung của bạn ngay tại đây.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 rounded-3xl bg-white/15 p-6 text-left text-sm text-white/85 shadow-lg backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                  Nhịp độ hôm nay
                </p>
                <div className="flex items-center gap-4 text-lg font-semibold">
                  <span>{schedules.length} nhiệm vụ</span>
                  <span className="text-white/70">•</span>
                  <span>{activeCount} đang chờ</span>
                </div>
                <p className="text-xs text-white/70">
                  Tổng thời lượng dự kiến: {totalMinutesPlanned} phút
                </p>
                <button
                  type="button"
                  onClick={() => openGoalModal(null)}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  Bắt đầu Deep Work nhanh
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/15 p-4 text-sm text-white/85 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Hoàn thành
                </p>
                <p className="mt-2 text-2xl font-bold">{completedCount}</p>
                <p>Nhiệm vụ đã khép lại</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 text-sm text-white/85 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Đang chờ
                </p>
                <p className="mt-2 text-2xl font-bold">{activeCount}</p>
                <p>Nhiệm vụ sẵn sàng cho Deep Work</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 text-sm text-white/85 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Tâm thế
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatVietnamDate(selectedDate, "DD/MM")}
                </p>
                <p>{formatVietnamDate(selectedDate, "dddd")}</p>
              </div>
            </div>
            {upcomingTask && (
              <div className="rounded-3xl bg-white/15 p-5 text-sm text-white/85 shadow-lg backdrop-blur">
                <p className="font-semibold text-white">
                  🎧 Nhiệm vụ sắp tới • {formatVietnamTime(upcomingTask.startTime)} -{" "}
                  {formatVietnamTime(upcomingTask.endTime)}
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {upcomingTask.title}
                </p>
                {upcomingTask.project && (
                  <p className="text-xs uppercase tracking-wide text-white/70">
                    Dự án: {upcomingTask.project}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <article className="glass-panel space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Dòng chảy nhiệm vụ hôm nay
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Theo dõi mốc thời gian Deep Work và chủ động điều chỉnh nhịp tập trung.
                </p>
              </div>
              <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Ngày làm việc
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="input-field mt-2 w-44 bg-white/90 dark:bg-slate-900/80"
                  aria-label="Chọn ngày cho lịch"
                />
              </label>
            </div>

            {taskError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {taskError}
              </div>
            )}

            {isLoadingTasks ? (
              <div className="flex items-center justify-center rounded-3xl bg-white/70 p-8 text-sm text-slate-500 shadow-inner dark:bg-slate-900/70 dark:text-slate-300">
                Đang tải nhiệm vụ của bạn...
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                Chưa có nhiệm vụ nào cho ngày này. Hãy tạo nhiệm vụ mới ở bảng bên cạnh để khóa lịch Deep Work của bạn nhé!
              </div>
            ) : (
              <ol className="relative space-y-6 border-l border-slate-200/70 pl-4 dark:border-slate-700/60">
                {schedules.map((task, index) => {
                  const start = formatVietnamTime(task.startTime);
                  const end = formatVietnamTime(task.endTime);
                  const isCompleted = task.isCompleted;
                  const subTasks = task.subTasks || [];
                  const completedSubTasks = subTasks.filter((subTask) => subTask.isCompleted).length;
                  const hasSubTasks = subTasks.length > 0;
                  const progressNoteDraft = progressNoteDrafts[task._id] ?? "";
                  const isSavingNote = Boolean(noteSaving[task._id]);
                  const noteMessage = noteFeedback[task._id];
                  const isSubTaskUpdating = Boolean(subTaskUpdating[task._id]);
                  const noteChanged =
                    progressNoteDraft.trim() !== (task.progressNote || "").trim();
                  return (
                    <li key={task._id} className="relative pl-6">
                      <span
                        className={[
                          "absolute -left-[13px] top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/80 text-xs font-semibold text-white shadow-lg dark:border-slate-900/80",
                          isCompleted
                            ? "bg-emerald-500"
                            : "bg-gradient-to-br from-primary to-indigo-500"
                        ].join(" ")}
                      >
                        {index + 1}
                      </span>
                      <div className="rounded-3xl bg-white/90 p-4 shadow-[0_12px_35px_-22px_rgba(15,23,42,0.6)] transition hover:shadow-[0_20px_50px_-25px_rgba(37,99,235,0.55)] dark:bg-slate-900/80">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                                {start} – {end}
                              </p>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                {task.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                                {task.project && (
                                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
                                    Dự án: {task.project}
                                  </span>
                                )}
                                {hasSubTasks && (
                                  <span className="rounded-full bg-amber-200/30 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-300/20 dark:text-amber-200">
                                    Checklist {completedSubTasks}/{subTasks.length}
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-300">
                                    Hoàn tất
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <label className="rainbow-checkbox">
                                <input
                                  type="checkbox"
                                  className="rainbow-checkbox__input"
                                  checked={task.isCompleted}
                                  onChange={(event) =>
                                    handleToggleComplete(task._id, event.target.checked)
                                  }
                                  aria-label={`Đánh dấu hoàn thành nhiệm vụ ${task.title}`}
                                  disabled={isSubTaskUpdating}
                                />
                                <span className="rainbow-checkbox__box" aria-hidden />
                                <span>Đánh dấu hoàn thành</span>
                              </label>
                              <button
                                type="button"
                                className="rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-primary-light dark:text-primary-light dark:hover:bg-primary-light dark:hover:text-slate-900"
                                onClick={() => openGoalModal(task)}
                              >
                                Bắt đầu phiên
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task._id)}
                                className="rounded-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-600"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>

                          {hasSubTasks && (
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-200">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Checklist tiến độ
                                </p>
                                <p className="text-xs font-semibold text-primary dark:text-primary-light">
                                  {completedSubTasks}/{subTasks.length} hạng mục
                                </p>
                              </div>
                              <ul className="space-y-2">
                                {subTasks.map((subTask) => (
                                  <li key={subTask._id} className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600"
                                      checked={subTask.isCompleted}
                                      disabled={isSubTaskUpdating}
                                      onChange={(event) =>
                                        handleToggleSubTask(task._id, subTask._id, event.target.checked)
                                      }
                                    />
                                    <span
                                      className={[
                                        "text-sm",
                                        subTask.isCompleted
                                          ? "line-through text-slate-400 dark:text-slate-500"
                                          : "text-slate-600 dark:text-slate-200"
                                      ].join(" ")}
                                    >
                                      {subTask.title}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {isSubTaskUpdating && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Đang cập nhật checklist...
                                </p>
                              )}
                            </div>
                          )}

                          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/60 dark:text-slate-200">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                              Ghi chú tiến độ
                            </label>
                            <textarea
                              className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                              value={progressNoteDraft}
                              onChange={(event) =>
                                handleProgressNoteChange(task._id, event.target.value)
                              }
                              onBlur={() => {
                                if (noteChanged && !isSavingNote) {
                                  handleSaveProgressNote(task._id);
                                }
                              }}
                              placeholder="Ghi lại phần việc bạn đã hoàn thành hoặc vướng mắc cần lưu ý..."
                            />
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleSaveProgressNote(task._id)}
                                className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
                                disabled={isSavingNote || !noteChanged}
                              >
                                {isSavingNote ? "Đang lưu..." : "Lưu ghi chú"}
                              </button>
                              {noteMessage && (
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-200">
                                  {noteMessage}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </article>

          <aside className="flex flex-col gap-6">
            <section className="glass-panel space-y-5">
              <header>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Thêm nhiệm vụ mới
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Khóa lịch Deep Work thông minh cho ngày của bạn.
                </p>
              </header>

              {taskSuccessMessage && (
                <div className="rounded-2xl border border-emerald-300/60 bg-emerald-100/70 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/60 dark:text-emerald-200">
                  {taskSuccessMessage}
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="task-title"
                    className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Tiêu đề nhiệm vụ
                  </label>
                  <input
                    id="task-title"
                    name="title"
                    value={taskForm.title}
                    onChange={handleTaskFormChange}
                    className="input-field bg-white/95 dark:bg-slate-900/80"
                    placeholder="Ví dụ: Hoàn thiện báo cáo tuần"
                    aria-invalid={Boolean(taskFormErrors.title)}
                    aria-describedby={taskFormErrors.title ? "task-title-error" : undefined}
                  />
                  {taskFormErrors.title && (
                    <p id="task-title-error" className="mt-1 text-sm text-red-600">
                      {taskFormErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="task-project"
                    className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Dự án (tùy chọn)
                  </label>
                  <input
                    id="task-project"
                    name="project"
                    value={taskForm.project}
                    onChange={handleTaskFormChange}
                    className="input-field bg-white/95 dark:bg-slate-900/80"
                    placeholder="Ví dụ: Chiến dịch Q4"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="task-startTime"
                      className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Bắt đầu
                    </label>
                    <input
                      id="task-startTime"
                      name="startTime"
                      type="time"
                      value={taskForm.startTime}
                      onChange={handleTaskFormChange}
                      className="input-field bg-white/95 dark:bg-slate-900/80"
                      aria-invalid={Boolean(taskFormErrors.startTime)}
                      aria-describedby={
                        taskFormErrors.startTime ? "task-startTime-error" : undefined
                      }
                    />
                    {taskFormErrors.startTime && (
                      <p id="task-startTime-error" className="mt-1 text-sm text-red-600">
                        {taskFormErrors.startTime}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="task-endTime"
                      className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Kết thúc
                    </label>
                    <input
                      id="task-endTime"
                      name="endTime"
                      type="time"
                      value={taskForm.endTime}
                      onChange={handleTaskFormChange}
                      className="input-field bg-white/95 dark:bg-slate-900/80"
                      aria-invalid={Boolean(taskFormErrors.endTime)}
                      aria-describedby={
                        taskFormErrors.endTime ? "task-endTime-error" : undefined
                      }
                    />
                    {taskFormErrors.endTime && (
                      <p id="task-endTime-error" className="mt-1 text-sm text-red-600">
                        {taskFormErrors.endTime}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:bg-slate-900/60 dark:text-slate-200">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Checklist nhỏ (tùy chọn)
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddSubTaskField}
                      className="text-xs font-semibold text-primary transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-primary-light"
                      disabled={taskForm.subTasks.length >= MAX_SUBTASKS_PER_TASK}
                    >
                      + Thêm hạng mục
                    </button>
                  </div>
                  <div className="space-y-3">
                    {taskForm.subTasks.map((subTask, index) => (
                      <div key={subTask.id} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={subTask.title}
                          onChange={(event) =>
                            handleTaskSubTaskChange(subTask.id, event.target.value)
                          }
                          placeholder={`Hạng mục ${index + 1}`}
                          className="input-field flex-1 bg-white/95 dark:bg-slate-900/80"
                        />
                        {taskForm.subTasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubTaskField(subTask.id)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-500 dark:border-slate-600 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-300"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Tạo các bước nhỏ để theo dõi phần công việc đã hoàn thành.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="task-progress-note"
                    className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Ghi chú tiến độ ban đầu (tùy chọn)
                  </label>
                  <textarea
                    id="task-progress-note"
                    name="progressNote"
                    rows="3"
                    value={taskForm.progressNote}
                    onChange={handleTaskFormChange}
                    className="input-field resize-none bg-white/95 dark:bg-slate-900/80"
                    placeholder="Bạn muốn hoàn thành phần nào? Cần lưu ý điều gì?"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmittingTask}
                >
                  {isSubmittingTask ? "Đang lưu..." : "Thêm nhiệm vụ"}
                </button>
              </form>
            </section>

            <section className="glass-panel space-y-4 bg-gradient-to-br from-aurora-emerald/15 via-white/70 to-aurora-cyan/20 dark:from-aurora-emerald/20 dark:via-slate-900/75 dark:to-aurora-cyan/20">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Nhịp tập trung gợi ý
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>• Chia buổi sáng cho công việc chiến lược và phiên 50 phút.</li>
                <li>• Sau mỗi phiên, ghi chú nhanh 1 ý tưởng để bám giữ động lực.</li>
                <li>• Tô đậm nhiệm vụ lớn bằng màu sắc riêng để dễ nhận diện trong ngày.</li>
              </ul>
              <p className="rounded-2xl bg-white/50 px-4 py-3 text-xs text-slate-500 shadow-sm dark:bg-slate-900/60 dark:text-slate-300">
                Mẹo: kết hợp 2 phiên Deep Work liên tiếp nhưng xen kẽ 10 phút nghỉ chủ động để hồi phục năng lượng.
              </p>
            </section>
          </aside>
        </div>
      </section>

      {showGoalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Đặt mục tiêu cho phiên Deep Work
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Mục tiêu rõ ràng giúp bạn tập trung hết mình trong suốt phiên làm việc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Đóng hộp thoại đặt mục tiêu"
              >
                ×
              </button>
            </div>

            {goalError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {goalError}
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label
                  htmlFor="goal-text"
                  className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Mục tiêu phiên
                </label>
                <textarea
                  id="goal-text"
                  name="goal"
                  rows="3"
                  className="input-field resize-none"
                  value={goalForm.goal}
                  onChange={handleGoalFormChange}
                  placeholder="Ví dụ: Hoàn thiện phần tổng kết báo cáo tuần."
                />
              </div>

              <div>
                <label
                  htmlFor="goal-duration"
                  className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Thời lượng (phút)
                </label>
                <input
                  id="goal-duration"
                  name="durationMinutes"
                  type="number"
                  min="10"
                  max="240"
                  step="5"
                  className="input-field"
                  value={goalForm.durationMinutes}
                  onChange={handleGoalFormChange}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Gợi ý: 50 phút là một chu kỳ Deep Work cân bằng giữa độ sâu và khả năng hồi phục.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmittingGoal}
                >
                  {isSubmittingGoal ? "Đang khởi tạo..." : "Bắt đầu ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWelcomeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary via-indigo-500 to-aurora-cyan opacity-70 blur-2xl" />
              <div className="relative p-7">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Chào mừng bạn đến với DeepFocus Hub!
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  Dưới đây là ba trụ cột chính giúp bạn dẫn dắt ngày làm việc hiệu quả:
                </p>
                <ul className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <li className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <strong className="block text-primary-dark dark:text-primary-light">
                      1. Lịch thông minh
                    </strong>
                    Lên kế hoạch Deep Work theo khung giờ vàng và theo dõi tiến độ hằng ngày.
                  </li>
                  <li className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/60">
                    <strong className="block text-emerald-600 dark:text-emerald-300">
                      2. Không Gian Tập Trung
                    </strong>
                    Không gian chuyên biệt với đồng hồ đếm ngược, ghi chú nhanh, tạm dừng và ghi dấu xao nhãng.
                  </li>
                  <li className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/60">
                    <strong className="block text-indigo-600 dark:text-indigo-300">
                      3. Thống kê & Game hóa
                    </strong>
                    Khai thác số liệu, streak, huy hiệu và gợi ý AI để tối ưu nhịp làm việc dài hạn.
                  </li>
                </ul>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWelcomeModal(false)}
                    className="btn-primary"
                  >
                    Sẵn sàng bắt đầu!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardPage;

