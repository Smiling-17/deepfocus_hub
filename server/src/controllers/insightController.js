import dayjs from "../utils/dayjs.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DeepWorkSession } from "../models/DeepWorkSession.js";
import { Task } from "../models/Task.js";
import { calculateStreaks } from "../utils/statUtils.js";

const MIN_DURATION_MINUTES = 10;
const MAX_SESSIONS_IN_PROMPT = 30;
const MAX_SESSION_DETAILS = 12;
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
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
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
  const totals = { count: sessions.length, minutes: 0, goalsMet: 0 };
  const segmentAccumulator = new Map();
  let longestSession = null;

  // Focus rating tracking
  let totalRating = 0;
  let ratedCount = 0;
  const ratingBuckets = { low: 0, mid: 0, high: 0 }; // 1-2, 3, 4-5

  sessions.forEach((session) => {
    const duration = session.durationCompleted || session.durationSet || MIN_DURATION_MINUTES;
    const target = session.durationSet || duration;
    const actual = session.durationCompleted || duration;
    const segmentLabel = getTimeSegmentLabel(session.startTime);

    totals.minutes += actual;

    // Focus rating
    if (session.focusRating && session.focusRating >= 1 && session.focusRating <= 5) {
      totalRating += session.focusRating;
      ratedCount += 1;
      if (session.focusRating <= 2) ratingBuckets.low += 1;
      else if (session.focusRating === 3) ratingBuckets.mid += 1;
      else ratingBuckets.high += 1;
    }

    const goalMet = target > 0 ? actual >= target * 0.95 : actual >= MIN_DURATION_MINUTES;
    if (goalMet) totals.goalsMet += 1;

    const existing = segmentAccumulator.get(segmentLabel) || {
      label: segmentLabel, sessions: 0, minutes: 0, goalsMet: 0, totalRating: 0, ratedCount: 0
    };
    segmentAccumulator.set(segmentLabel, {
      label: segmentLabel,
      sessions: existing.sessions + 1,
      minutes: existing.minutes + actual,
      goalsMet: existing.goalsMet + (goalMet ? 1 : 0),
      totalRating: existing.totalRating + (session.focusRating || 0),
      ratedCount: existing.ratedCount + (session.focusRating ? 1 : 0)
    });

    const candidate = {
      duration: actual,
      goal: session.goal,
      startTime: session.startTime,
      project: taskMap.get(session.taskId?.toString())?.project || session.project || "Không gắn dự án"
    };
    if (!longestSession || candidate.duration > longestSession.duration) {
      longestSession = candidate;
    }
  });

  const averageDuration = totals.count > 0 ? totals.minutes / totals.count : 0;
  const avgRating = ratedCount > 0 ? totalRating / ratedCount : null;
  const completionRate = totals.count > 0 ? (totals.goalsMet / totals.count) * 100 : 0;

  const segments = Array.from(segmentAccumulator.values())
    .map((seg) => ({
      ...seg,
      goalRate: seg.sessions > 0 ? Math.round((seg.goalsMet / seg.sessions) * 100) : 0,
      avgMinutes: seg.sessions > 0 ? Math.round((seg.minutes / seg.sessions) * 10) / 10 : 0,
      avgRating: seg.ratedCount > 0 ? Math.round((seg.totalRating / seg.ratedCount) * 10) / 10 : null
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return { totals, averageDuration, avgRating, ratedCount, ratingBuckets, completionRate, longestSession, segments };
};

/* Danh sách chi tiết từng phiên gần nhất */
const buildSessionDetails = (sessions) =>
  sessions.slice(0, MAX_SESSION_DETAILS).map((s) => {
    const actual = s.durationCompleted || s.durationSet || 0;
    const target = s.durationSet || actual;
    const date = dayjs(s.startTime).format("DD/MM HH:mm");
    const rating = s.focusRating ? `${s.focusRating}/5` : "chưa đánh giá";
    const completion = target > 0 ? Math.round((actual / target) * 100) : 0;
    const goal = truncate(s.goal, 60) || "Không ghi mục tiêu";
    return `- ${date} | "${goal}" | ${actual}/${target} phút (${completion}%) | Chất lượng: ${rating}`;
  });

/* So sánh tuần này vs tuần trước */
const buildWeekComparison = (allSessions) => {
  const startThisWeek = dayjs().startOf("week");
  const startLastWeek = startThisWeek.subtract(7, "day");

  const thisWeek = allSessions.filter((s) => dayjs(s.startTime).isAfter(startThisWeek));
  const lastWeek = allSessions.filter((s) => {
    const d = dayjs(s.startTime);
    return d.isAfter(startLastWeek) && d.isBefore(startThisWeek);
  });

  const calcStats = (sessions) => {
    const count = sessions.length;
    const minutes = sessions.reduce((sum, s) => sum + (s.durationCompleted || s.durationSet || 0), 0);
    const ratings = sessions.filter((s) => s.focusRating).map((s) => s.focusRating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return { count, minutes, avgRating };
  };

  const tw = calcStats(thisWeek);
  const lw = calcStats(lastWeek);

  const pctChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "+∞" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${Math.round(change)}%`;
  };

  return [
    `- Tuần này: ${tw.count} phiên, ${formatMinutes(tw.minutes)} phút${tw.avgRating ? `, chất lượng TB ${numberFormatter.format(tw.avgRating)}/5` : ""}`,
    `- Tuần trước: ${lw.count} phiên, ${formatMinutes(lw.minutes)} phút${lw.avgRating ? `, chất lượng TB ${numberFormatter.format(lw.avgRating)}/5` : ""}`,
    lw.count > 0
      ? `- Thay đổi: số phiên ${pctChange(tw.count, lw.count)}, thời lượng ${pctChange(tw.minutes, lw.minutes)}`
      : "- Tuần trước không có dữ liệu để so sánh."
  ].join("\n");
};

const buildTaskHighlights = (tasks) =>
  tasks
    .filter((task) => Boolean(task.progressNote?.trim()) || task.subTasks?.some((st) => !st.isCompleted))
    .sort((a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf())
    .slice(0, MAX_TASK_CONTEXT)
    .map((task) => {
      const completedSubTasks = task.subTasks?.filter((st) => st.isCompleted).length;
      const totalSubTasks = task.subTasks?.length || 0;
      const checklistStatus = totalSubTasks > 0 ? `Checklist ${completedSubTasks}/${totalSubTasks}` : "Không có checklist";
      const note = truncate(task.progressNote, 200) || "Không có ghi chú.";
      const projectLabel = task.project?.trim() || "Chung";
      const timeLabel = dayjs(task.startTime).format("DD/MM HH:mm");
      return `- ${timeLabel} | ${task.title} (Dự án: ${projectLabel}) -> ${checklistStatus}. Ghi chú: ${note}`;
    });

const buildProjectSummary = (sessions, tasks) => {
  const projectAccumulator = new Map();
  const ensureProject = (name) => {
    const key = name || "Chưa gắn dự án";
    if (!projectAccumulator.has(key)) {
      projectAccumulator.set(key, { project: key, focusedMinutes: 0, sessions: 0, upcomingTasks: 0, pendingChecklist: 0 });
    }
    return projectAccumulator.get(key);
  };

  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));
  sessions.forEach((session) => {
    const task = session.taskId ? taskMap.get(session.taskId.toString()) : null;
    const projectName = task?.project || session.project || "Chưa gắn dự án";
    const bucket = ensureProject(projectName);
    bucket.focusedMinutes += session.durationCompleted || session.durationSet || MIN_DURATION_MINUTES;
    bucket.sessions += 1;
  });

  const now = dayjs();
  tasks.forEach((task) => {
    const bucket = ensureProject(task.project || "Chưa gắn dự án");
    if (!task.isCompleted && dayjs(task.endTime).isAfter(now)) bucket.upcomingTasks += 1;
    bucket.pendingChecklist += task.subTasks?.filter((st) => !st.isCompleted).length || 0;
  });

  return Array.from(projectAccumulator.values())
    .sort((a, b) => b.focusedMinutes - a.focusedMinutes)
    .slice(0, MAX_PROJECT_CONTEXT)
    .map((p) => `- ${p.project}: ${formatMinutes(p.focusedMinutes)} phut tap trung qua ${p.sessions} phien. Nhiem vu sap toi: ${p.upcomingTasks}; checklist con mo: ${p.pendingChecklist}.`);
};

const buildStreakInfo = (sessions) => {
  const { currentStreak, longestStreak } = calculateStreaks(sessions);
  const lastSession = sessions[0];
  const lastSessionTime = lastSession ? dayjs(lastSession.endTime || lastSession.startTime) : null;
  const daysSinceLast = lastSessionTime
    ? dayjs().startOf("day").diff(lastSessionTime.startOf("day"), "day")
    : null;

  const minutesLast7Days = sessions
    .filter((s) => dayjs(s.endTime || s.startTime).isAfter(dayjs().subtract(7, "day")))
    .reduce((sum, s) => sum + (s.durationCompleted || s.durationSet || 0), 0);

  let nextMilestone = "Thiet lap chuoi 3 ngay lien tuc de tao da on dinh.";
  if (currentStreak >= 5) nextMilestone = "Duy tri chuoi >= 5 ngay de cham moc 7 ngay lien tiep.";
  else if (currentStreak >= 3) nextMilestone = "Tang chuoi tu 3 len 5 ngay de but pha thoi quen.";

  return { currentStreak, longestStreak, daysSinceLast: daysSinceLast ?? 999, minutesLast7Days, nextMilestone };
};

const buildPrompt = ({ sessions, sessionSummary, sessionDetails, weekComparison, taskHighlights, projectSummary, streakInfo }) => {
  const formatInstruction = `QUAN TRỌNG VỀ ĐỊNH DẠNG:
- Trả lời hoàn toàn bằng tiếng Việt.
- Dùng dấu gạch đầu dòng (-) cho các bullet point, KHÔNG dùng ký tự đặc biệt hay LaTeX.
- Đánh dấu tiêu đề các mục bằng **in đậm** (dấu ** hai bên), không dùng # hay ký hiệu khác.
- TUYỆT ĐỐI KHÔNG dùng: $, \\, ký tự LaTeX, HTML, hay bất kỳ ký hiệu markup nào ngoài ** và -.
- Viết chi tiết, phân tích sâu, đưa ra nhận xét cụ thể có dẫn chứng từ dữ liệu.
- Mỗi bullet point nên có 1-2 câu giải thích, không chỉ liệt kê.

`;

  if (sessions.length === 0) {
    return `${formatInstruction}Người dùng chưa có phiên Deep Work nào đạt tối thiểu ${MIN_DURATION_MINUTES} phút. Hãy gợi ý 5 lời khuyên chi tiết bằng tiếng Việt giúp họ bắt đầu xây dựng thói quen làm việc tập trung, dựa trên nghiên cứu khoa học về Deep Work của Cal Newport.`;
  }

  const longestSession = sessionSummary.longestSession
    ? `Phiên dài nhất: ${sessionSummary.longestSession.duration} phút cho mục tiêu "${sessionSummary.longestSession.goal || "Không ghi mục tiêu"}" vào ${dayjs(sessionSummary.longestSession.startTime).format("DD/MM HH:mm")} (dự án ${sessionSummary.longestSession.project}).`
    : "Chưa xác định được phiên dài nhất.";

  // Rating summary
  const ratingLine = sessionSummary.avgRating
    ? `- Chất lượng tập trung trung bình: ${numberFormatter.format(sessionSummary.avgRating)}/5 (${sessionSummary.ratedCount} phiên đã đánh giá). Phân bố: ${sessionSummary.ratingBuckets.high} phiên tốt (4-5), ${sessionSummary.ratingBuckets.mid} phiên trung bình (3), ${sessionSummary.ratingBuckets.low} phiên kém (1-2).`
    : "- Chưa có đánh giá chất lượng tập trung nào (focusRating). Người dùng nên đánh giá sau mỗi phiên.";

  const sessionOverview = [
    `- ${sessionSummary.totals.count} phiên, tổng ${formatMinutes(sessionSummary.totals.minutes)} phút.`,
    `- Thời lượng trung bình: ${formatMinutes(sessionSummary.averageDuration)} phút/phiên.`,
    `- Tỷ lệ đạt mục tiêu thời gian (≥95% durationSet): ${numberFormatter.format(sessionSummary.completionRate)}%.`,
    ratingLine,
    `- ${longestSession}`
  ].join("\n");

  const segmentLines =
    sessionSummary.segments.length > 0
      ? sessionSummary.segments.map((seg) => {
        const ratingStr = seg.avgRating ? `, chất lượng TB ${numberFormatter.format(seg.avgRating)}/5` : "";
        return `- ${seg.label}: ${seg.sessions} phiên, ${formatMinutes(seg.minutes)} phút, đạt mục tiêu ${seg.goalRate}%${ratingStr}`;
      }).join("\n")
      : "Chưa đủ dữ liệu để phân loại phiên theo khung giờ.";

  const sessionDetailLines = sessionDetails.length > 0
    ? sessionDetails.join("\n")
    : "Không có chi tiết phiên.";

  const taskNotes = taskHighlights.length > 0 ? taskHighlights.join("\n") : "Không có ghi chú tiến độ hoặc checklist nào nổi bật.";
  const projectLines = projectSummary.length > 0 ? projectSummary.join("\n") : "Chưa ghi nhận dữ liệu dự án cụ thể.";

  const streakLines = [
    `- Chuỗi hiện tại: ${streakInfo.currentStreak} ngày; dài nhất: ${streakInfo.longestStreak} ngày.`,
    streakInfo.daysSinceLast > 0 ? `- Đã ${streakInfo.daysSinceLast} ngày kể từ phiên gần nhất.` : "- Phiên gần nhất vừa hoàn thành hôm nay.",
    `- Tổng phút 7 ngày qua: ${formatMinutes(streakInfo.minutesLast7Days)} phút.`,
    `- Mốc tiếp theo: ${streakInfo.nextMilestone}`
  ].join("\n");

  return `${formatInstruction}Bạn là chuyên gia về Deep Work (phương pháp của Cal Newport) và coaching năng suất. Dưới đây là dữ liệu chi tiết về các phiên Deep Work gần đây của người dùng:

**TỔNG QUAN HIỆU SUẤT**
${sessionOverview}

**SO SÁNH TUẦN NÀY VS TUẦN TRƯỚC**
${weekComparison}

**CHI TIẾT ${sessionDetails.length} PHIÊN GẦN NHẤT**
${sessionDetailLines}

**PHÂN BỐ THEO KHUNG GIỜ**
${segmentLines}

**NHIỆM VỤ VÀ CHECKLIST NỔI BẬT**
${taskNotes}

**TỔNG QUAN DỰ ÁN**
${projectLines}

**ĐỘNG LỰC VÀ STREAK**
${streakLines}

Hãy phân tích CHI TIẾT và trả lời theo cấu trúc sau (dùng ** cho tiêu đề, dùng - cho bullet). Mỗi bullet phải có giải thích cụ thể dựa trên dữ liệu, không chỉ liệt kê:

**Điểm nổi bật** (4-5 bullet) — những gì người dùng đang làm tốt, dẫn chứng số liệu cụ thể (ví dụ: "Phiên ngày XX/XX đạt XX phút với chất lượng X/5, cho thấy...").

**Phân tích chất lượng tập trung** (3-4 bullet) — nhận xét về focusRating trung bình, xu hướng tăng/giảm, khung giờ nào chất lượng cao nhất, mục tiêu phiên có đủ rõ ràng không (dựa trên nội dung goal).

**Điểm cần cải thiện** (3-4 bullet) — dựa trên: phiên ngắn hơn mục tiêu, rating thấp, khung giờ yếu, mục tiêu phiên chung chung, so sánh tuần.

**Kế hoạch tuần tới** (đúng 3 gợi ý hành động) — mỗi gợi ý phải có: hành động cụ thể, mục tiêu đo lường được, và lý do dựa trên dữ liệu.

Kết thúc bằng 1-2 câu khích lệ cá nhân hóa gắn với streak và thành tích nổi bật nhất.`;
};

export const generateInsights = async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        message: "Tính năng phân tích AI cần cấu hình GEMINI_API_KEY trong máy chủ."
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3072
      }
    });

    const [recentSessions, recentTasks] = await Promise.all([
      DeepWorkSession.find({
        userId: req.user._id,
        status: "completed",
        $or: [
          { durationCompleted: { $gte: MIN_DURATION_MINUTES } },
          { durationCompleted: { $exists: false }, durationSet: { $gte: MIN_DURATION_MINUTES } }
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

    const eligibleSessions = recentSessions.filter((s) => {
      const completed = s.durationCompleted ?? s.durationSet ?? 0;
      return completed >= MIN_DURATION_MINUTES;
    });

    if (eligibleSessions.length === 0) {
      return res.json({
        suggestion: `Chưa có phiên Deep Work nào kéo dài tối thiểu ${MIN_DURATION_MINUTES} phút. Hãy hoàn thành ít nhất một phiên đạt chuẩn để nhận được phân tích chi tiết.`,
        generatedAt: dayjs().toDate()
      });
    }

    const taskMap = new Map(recentTasks.map((t) => [t._id.toString(), t]));
    const sessionSummary = summarizeSessions(eligibleSessions, taskMap);
    const sessionDetails = buildSessionDetails(eligibleSessions);
    const weekComparison = buildWeekComparison(eligibleSessions);
    const taskHighlights = buildTaskHighlights(recentTasks);
    const projectSummary = buildProjectSummary(eligibleSessions, recentTasks);
    const streakInfo = buildStreakInfo(eligibleSessions);

    const prompt = buildPrompt({ sessions: eligibleSessions, sessionSummary, sessionDetails, weekComparison, taskHighlights, projectSummary, streakInfo });

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text()?.trim() || "Chưa nhận được phản hồi từ dịch vụ AI. Vui lòng thử lại.";

    return res.json({ suggestion, generatedAt: dayjs().toDate() });
  } catch (error) {
    // 429 — Quota exceeded / rate limit
    if (error.status === 429) {
      return res.status(503).json({
        message: "Dịch vụ AI đang vượt quá hạn mức sử dụng. Vui lòng thử lại sau vài phút."
      });
    }
    // 400 / 403 — API key sai hoặc chưa enable
    if (error.status === 400 || error.status === 403) {
      return res.status(503).json({
        message: "Không thể kết nối tới Gemini API. Vui lòng kiểm tra lại API key và billing trên Google Cloud."
      });
    }
    // Lỗi Gemini khác (network, timeout...) — tránh lộ raw JSON ra client
    if (error.message?.includes("generativelanguage.googleapis.com") || error.message?.includes("GoogleGenerativeAI")) {
      return res.status(503).json({
        message: "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
      });
    }
    next(error);
  }
};
