import dayjs from "../utils/dayjs.js";
import OpenAI from "openai";
import { DeepWorkSession } from "../models/DeepWorkSession.js";
import { Task } from "../models/Task.js";
import { calculateStreaks } from "../utils/statUtils.js";

const MIN_DURATION_MINUTES = 10;
const MAX_SESSIONS_IN_PROMPT = 20;
const MAX_TASK_CONTEXT = 8;
const MAX_PROJECT_CONTEXT = 5;
const TIME_SEGMENTS = [
  { label: "Buổi sáng (05h-11h)", startHour: 5, endHour: 11 },
  { label: "Buổi trưa (11h-14h)", startHour: 11, endHour: 14 },
  { label: "Buổi chiều (14h-18h)", startHour: 14, endHour: 18 },
  { label: "Buổi tối (18h-22h)", startHour: 18, endHour: 22 },
  { label: "Ban đêm (22h-05h)", startHour: 22, endHour: 24 },
  { label: "Ban đêm (22h-05h)", startHour: 0, endHour: 5 }
];

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0
});

const truncate = (value = "", maxLength = 160) => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trim()}…`;
};

const formatMinutes = (value) =>
  numberFormatter.format(Math.round((value + Number.EPSILON) * 10) / 10);

const getTimeSegmentLabel = (date) => {
  const hour = dayjs(date).hour();
  const segment =
    TIME_SEGMENTS.find(({ startHour, endHour, label }) => {
      if (label.startsWith("Ban đêm") && startHour === 22) {
        return hour >= 22 || hour < 5;
      }
      return hour >= startHour && hour < endHour;
    }) || TIME_SEGMENTS[0];
  return segment.label;
};

const summarizeSessions = (sessions, taskMap) => {
  const totals = {
    count: sessions.length,
    minutes: 0,
    distractions: 0,
    goalsMet: 0
  };
  const segmentAccumulator = new Map();
  let longestSession = null;

  sessions.forEach((session) => {
    const duration =
      session.durationCompleted || session.durationSet || MIN_DURATION_MINUTES;
    const target = session.durationSet || duration;
    const actual = session.durationCompleted || duration;
    const distractions = session.distractionTimestamps?.length || 0;
    const segmentLabel = getTimeSegmentLabel(session.startTime);

    totals.minutes += actual;
    totals.distractions += distractions;

    const goalMet =
      target > 0 ? actual >= target * 0.95 : actual >= MIN_DURATION_MINUTES;
    if (goalMet) {
      totals.goalsMet += 1;
    }

    const existing = segmentAccumulator.get(segmentLabel) || {
      label: segmentLabel,
      sessions: 0,
      minutes: 0,
      goalsMet: 0,
      distractions: 0
    };

    segmentAccumulator.set(segmentLabel, {
      label: segmentLabel,
      sessions: existing.sessions + 1,
      minutes: existing.minutes + actual,
      goalsMet: existing.goalsMet + (goalMet ? 1 : 0),
      distractions: existing.distractions + distractions
    });

    const candidate = {
      duration: actual,
      goal: session.goal,
      startTime: session.startTime,
      project:
        taskMap.get(session.taskId?.toString())?.project ||
        session.project ||
        "Không gắn dự án"
    };

    if (!longestSession || candidate.duration > longestSession.duration) {
      longestSession = candidate;
    }
  });

  const averageDuration =
    totals.count > 0 ? totals.minutes / totals.count : 0;
  const avgDistractions =
    totals.count > 0 ? totals.distractions / totals.count : 0;
  const completionRate =
    totals.count > 0 ? (totals.goalsMet / totals.count) * 100 : 0;

  const segments = Array.from(segmentAccumulator.values())
    .map((segment) => ({
      ...segment,
      goalRate:
        segment.sessions > 0
          ? Math.round((segment.goalsMet / segment.sessions) * 100)
          : 0,
      avgMinutes:
        segment.sessions > 0
          ? Math.round((segment.minutes / segment.sessions) * 10) / 10
          : 0,
      avgDistractions:
        segment.sessions > 0
          ? Math.round((segment.distractions / segment.sessions) * 10) / 10
          : 0
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totals,
    averageDuration,
    avgDistractions,
    completionRate,
    longestSession,
    segments
  };
};

const buildTaskHighlights = (tasks) => {
  return tasks
    .filter((task) => {
      const hasProgressNote = Boolean(task.progressNote?.trim());
      const unfinishedChecklist =
        task.subTasks?.some((subTask) => !subTask.isCompleted) || false;
      return hasProgressNote || unfinishedChecklist;
    })
    .sort((a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf())
    .slice(0, MAX_TASK_CONTEXT)
    .map((task) => {
      const completedSubTasks = task.subTasks?.filter(
        (subTask) => subTask.isCompleted
      ).length;
      const totalSubTasks = task.subTasks?.length || 0;
      const checklistStatus =
        totalSubTasks > 0
          ? `Checklist ${completedSubTasks}/${totalSubTasks}`
          : "Không có checklist";
      const note = truncate(task.progressNote, 200) || "Không có ghi chú.";
      const projectLabel = task.project?.trim() || "Chung";
      const timeLabel = dayjs(task.startTime).format("DD/MM HH:mm");

      return `• ${timeLabel} • ${task.title} (Dự án: ${projectLabel}) → ${checklistStatus}. Ghi chú: ${note}`;
    });
};

const buildProjectSummary = (sessions, tasks) => {
  const projectAccumulator = new Map();
  const ensureProject = (projectName) => {
    const key = projectName || "Chưa gắn dự án";
    if (!projectAccumulator.has(key)) {
      projectAccumulator.set(key, {
        project: key,
        focusedMinutes: 0,
        sessions: 0,
        upcomingTasks: 0,
        pendingChecklist: 0
      });
    }
    return projectAccumulator.get(key);
  };

  const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));

  sessions.forEach((session) => {
    const task = session.taskId
      ? taskMap.get(session.taskId.toString())
      : null;
    const projectName =
      task?.project || session.project || "Chưa gắn dự án";
    const bucket = ensureProject(projectName);
    const minutes =
      session.durationCompleted || session.durationSet || MIN_DURATION_MINUTES;
    bucket.focusedMinutes += minutes;
    bucket.sessions += 1;
  });

  const now = dayjs();

  tasks.forEach((task) => {
    const projectName = task.project || "Chưa gắn dự án";
    const bucket = ensureProject(projectName);

    if (!task.isCompleted && dayjs(task.endTime).isAfter(now)) {
      bucket.upcomingTasks += 1;
    }

    const pendingSubTasks =
      task.subTasks?.filter((subTask) => !subTask.isCompleted).length || 0;
    bucket.pendingChecklist += pendingSubTasks;
  });

  return Array.from(projectAccumulator.values())
    .sort((a, b) => b.focusedMinutes - a.focusedMinutes)
    .slice(0, MAX_PROJECT_CONTEXT)
    .map((project) => {
      const minutes = formatMinutes(project.focusedMinutes);
      return `• ${project.project}: ${minutes} phút tập trung qua ${project.sessions} phiên. Nhiệm vụ sắp tới: ${project.upcomingTasks}; checklist còn mở: ${project.pendingChecklist}.`;
    });
};

const buildPrompt = ({
  sessions,
  sessionSummary,
  taskHighlights,
  projectSummary,
  streakInfo
}) => {
  if (sessions.length === 0) {
    return `Người dùng chưa có phiên Deep Work nào đạt tối thiểu ${MIN_DURATION_MINUTES} phút. Hãy gợi ý 3 lời khuyên chung bằng tiếng Việt giúp họ bắt đầu xây dựng thói quen làm việc tập trung.`;
  }

  const longestSession = sessionSummary.longestSession
    ? `Phiên dài nhất: ${sessionSummary.longestSession.duration} phút cho mục tiêu "${sessionSummary.longestSession.goal || "Không ghi mục tiêu"}" vào ${dayjs(sessionSummary.longestSession.startTime).format("DD/MM HH:mm")} (dự án ${sessionSummary.longestSession.project}).`
    : "Chưa xác định được phiên dài nhất.";

  const sessionOverview = [
    `• ${sessionSummary.totals.count} phiên, tổng ${formatMinutes(sessionSummary.totals.minutes)} phút.`,
    `• Thời lượng trung bình: ${formatMinutes(sessionSummary.averageDuration)} phút/phiên.`,
    `• Tỷ lệ đạt mục tiêu thời gian: ${numberFormatter.format(sessionSummary.completionRate)}%.`,
    `• Trung bình ${numberFormatter.format(sessionSummary.avgDistractions)} lần xao nhãng/phiên.`,
    `• ${longestSession}`
  ].join("\n");

  const segmentLines =
    sessionSummary.segments.length > 0
      ? sessionSummary.segments
          .map(
            (segment) =>
              `- ${segment.label}: ${segment.sessions} phiên • ${formatMinutes(segment.minutes)} phút • Mục tiêu đạt ${segment.goalRate}% • Xao nhãng TB ${numberFormatter.format(segment.avgDistractions)} lần`
          )
          .join("\n")
      : "Chưa đủ dữ liệu để phân loại phiên theo khung giờ.";

  const taskNotes =
    taskHighlights.length > 0
      ? taskHighlights.join("\n")
      : "Không có ghi chú tiến độ hoặc checklist nào nổi bật trong thời gian gần đây.";

  const projectLines =
    projectSummary.length > 0
      ? projectSummary.join("\n")
      : "Chưa ghi nhận dữ liệu dự án cụ thể.";

  const streakLines = [
    `• Chuỗi hiện tại: ${streakInfo.currentStreak} ngày; dài nhất: ${streakInfo.longestStreak} ngày.`,
    streakInfo.daysSinceLast > 0
      ? `• Đã ${streakInfo.daysSinceLast} ngày kể từ phiên hoàn thành gần nhất.`
      : "• Phiên gần nhất vừa hoàn thành hôm nay.",
    `• Tổng phút tập trung bảy ngày qua: ${formatMinutes(streakInfo.minutesLast7Days)} phút.`,
    `• Trạng thái huy hiệu sắp đạt: ${streakInfo.nextMilestone || "Không có mốc mới ngay lập tức."}`
  ].join("\n");

  return `Dưới đây là dữ liệu gần đây về các phiên Deep Work (đã loại bỏ những phiên dưới ${MIN_DURATION_MINUTES} phút) cùng ngữ cảnh nhiệm vụ:

=== TỔNG QUAN HIỆU SUẤT ===
${sessionOverview}

=== PHÂN BỐ THEO KHUNG GIỜ ===
${segmentLines}

=== NHIỆM VỤ & CHECKLIST NỔI BẬT ===
${taskNotes}

=== TỔNG QUAN DỰ ÁN ===
${projectLines}

=== ĐỘNG LỰC & STREAK ===
${streakLines}

Hãy phân tích bằng tiếng Việt với giọng điệu thân thiện, cụ thể:
1. **Điểm nổi bật** (ít nhất 3 bullet) về thói quen tập trung hiện tại, nêu rõ khung giờ, dự án hoặc điều kiện giúp làm việc hiệu quả.
2. **Điểm nghẽn** (ít nhất 3 bullet) dựa trên checklist còn dở, khung giờ yếu, xao nhãng, dự án bị chậm.
3. **Kế hoạch đề xuất cho tuần tới** (đúng 3 gợi ý hành động): mỗi gợi ý cần nêu mục tiêu cụ thể, thời lượng hoặc số phiên, và cách đo lường tiến độ.
4. Kết thúc bằng một câu khích lệ hoặc mini-challenge gắn với streak hiện tại.

Giữ câu trả lời súc tích, dùng bullet hoặc đánh số dễ theo dõi.`;
};

const buildStreakInfo = (sessions) => {
  const { currentStreak, longestStreak } = calculateStreaks(sessions);
  const lastSession = sessions[0];
  const lastSessionTime = lastSession
    ? dayjs(lastSession.endTime || lastSession.startTime)
    : null;
  const daysSinceLast = lastSessionTime
    ? dayjs().startOf("day").diff(lastSessionTime.startOf("day"), "day")
    : null;

  const minutesLast7Days = sessions
    .filter((session) =>
      dayjs(session.endTime || session.startTime).isAfter(
        dayjs().subtract(7, "day")
      )
    )
    .reduce(
      (sum, session) =>
        sum + (session.durationCompleted || session.durationSet || 0),
      0
    );

  let nextMilestone = null;
  if (currentStreak >= 5) {
    nextMilestone = "Duy trì chuỗi ≥5 ngày để chạm mốc 7 ngày liên tiếp.";
  } else if (currentStreak >= 3) {
    nextMilestone = "Tăng chuỗi từ 3 lên 5 ngày để bứt phá thói quen.";
  } else {
    nextMilestone = "Thiết lập chuỗi 3 ngày liên tục để tạo đà ổn định.";
  }

  return {
    currentStreak,
    longestStreak,
    daysSinceLast: daysSinceLast ?? 999,
    minutesLast7Days,
    nextMilestone
  };
};

export const generateInsights = async (req, res, next) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        message:
          "Tính năng phân tích AI cần cấu hình OPENAI_API_KEY trong máy chủ."
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const [recentSessions, recentTasks] = await Promise.all([
      DeepWorkSession.find({
        userId: req.user._id,
        status: "completed",
        $or: [
          { durationCompleted: { $gte: MIN_DURATION_MINUTES } },
          {
            durationCompleted: { $exists: false },
            durationSet: { $gte: MIN_DURATION_MINUTES }
          }
        ]
      })
        .sort({ endTime: -1 })
        .limit(MAX_SESSIONS_IN_PROMPT)
        .lean(),
      Task.find({ userId: req.user._id })
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean()
    ]);

    const eligibleSessions = recentSessions.filter((session) => {
      const completed = session.durationCompleted ?? session.durationSet ?? 0;
      return completed >= MIN_DURATION_MINUTES;
    });

    if (eligibleSessions.length === 0) {
      return res.json({
        suggestion: `Chưa có phiên Deep Work nào kéo dài tối thiểu ${MIN_DURATION_MINUTES} phút trong thời gian gần đây. Hãy hoàn thành ít nhất một phiên đạt chuẩn để nhận được phân tích chi tiết.`,
        generatedAt: dayjs().toDate()
      });
    }

    const taskMap = new Map(
      recentTasks.map((task) => [task._id.toString(), task])
    );

    const sessionSummary = summarizeSessions(eligibleSessions, taskMap);
    const taskHighlights = buildTaskHighlights(recentTasks);
    const projectSummary = buildProjectSummary(eligibleSessions, recentTasks);
    const streakInfo = buildStreakInfo(eligibleSessions);

    const prompt = buildPrompt({
      sessions: eligibleSessions,
      sessionSummary,
      taskHighlights,
      projectSummary,
      streakInfo
    });

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.7
    });

    const suggestion =
      response.output_text?.trim() ||
      "Chưa nhận được phản hồi từ dịch vụ AI. Vui lòng thử lại.";

    return res.json({
      suggestion,
      generatedAt: dayjs().toDate()
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return res.status(503).json({
        message:
          "Không thể kết nối tới dịch vụ OpenAI. Vui lòng kiểm tra lại API key."
      });
    }
    next(error);
  }
};
