import dayjs from "./dayjs.js";

export const buildHeatmap = (sessions) => {
  const map = new Map();
  sessions.forEach((session) => {
    const dateKey = dayjs(session.endTime || session.startTime).format(
      "YYYY-MM-DD"
    );
    const current = map.get(dateKey) || { minutes: 0, sessions: 0 };
    const minutes = session.durationCompleted || session.durationSet || 0;
    map.set(dateKey, {
      minutes: current.minutes + minutes,
      sessions: current.sessions + 1
    });
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({
      date,
      ...value
    }));
};

export const buildWeeklyBreakdown = (sessions) => {
  const weeks = new Map();

  sessions.forEach((session) => {
    const date = dayjs(session.endTime || session.startTime);
    const weekKey = date.startOf("isoWeek").format("YYYY-MM-DD");
    const value = weeks.get(weekKey) || { minutes: 0, sessions: 0 };
    const minutes = session.durationCompleted || session.durationSet || 0;
    weeks.set(weekKey, {
      minutes: value.minutes + minutes,
      sessions: value.sessions + 1
    });
  });

  return Array.from(weeks.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, value]) => ({
      weekStart,
      ...value
    }));
};

export const buildRatingDistribution = (sessions) => {
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  sessions.forEach((session) => {
    if (session.focusRating) {
      const key = String(session.focusRating);
      distribution[key] = (distribution[key] || 0) + 1;
    }
  });

  return distribution;
};

export const calculateStreaks = (sessions) => {
  const dates = [
    ...new Set(
      sessions.map((session) =>
        dayjs(session.endTime || session.startTime).format("YYYY-MM-DD")
      )
    )
  ].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let previousDate = null;

  dates.forEach((dateStr) => {
    if (!previousDate) {
      currentStreak = 1;
      longestStreak = 1;
      previousDate = dateStr;
      return;
    }

    const prev = dayjs(previousDate);
    const current = dayjs(dateStr);

    if (current.diff(prev, "day") === 1) {
      currentStreak += 1;
    } else if (current.isSame(prev, "day")) {
      // same day, ignore
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    previousDate = dateStr;
  });

  // Check if the streak includes today
  const today = dayjs().format("YYYY-MM-DD");
  if (!dates.includes(today)) {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    if (previousDate !== yesterday) {
      currentStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
};

export const buildFocusWindows = (sessions) => {
  const windows = new Array(24).fill(0);
  sessions.forEach((session) => {
    const start = dayjs(session.startTime);
    const minutes = session.durationCompleted || session.durationSet || 0;
    windows[start.hour()] += minutes;
  });

  return windows.map((minutes, hour) => ({
    hour,
    minutes
  }));
};

export const calculateBadges = (stats) => {
  const badges = [];
  const now = new Date();

  if (stats.currentStreak >= 3) {
    badges.push({
      id: "streak-3",
      name: "Chuỗi 3 ngày",
      description: "Hoàn thành phiên Deep Work trong 3 ngày liên tiếp.",
      earnedAt: now
    });
  }

  if (stats.currentStreak >= 7) {
    badges.push({
      id: "streak-7",
      name: "Chuỗi 7 ngày",
      description: "Chuỗi tập trung 7 ngày không gián đoạn.",
      earnedAt: now
    });
  }

  if (stats.totalPoints >= 200) {
    badges.push({
      id: "points-200",
      name: "200 điểm tập trung",
      description: "Chạm mốc 200 điểm tập trung tích lũy.",
      earnedAt: now
    });
  }

  if (stats.maxRating === 5) {
    badges.push({
      id: "first-5-star",
      name: "Phiên 5 sao",
      description: "Có ít nhất một phiên đạt 5 sao.",
      earnedAt: now
    });
  }

  if (stats.longSessionCount >= 5) {
    badges.push({
      id: "marathoner",
      name: "Chiến binh 60 phút",
      description: "Hoàn thành 5 phiên dài từ 60 phút trở lên.",
      earnedAt: now
    });
  }

  return badges;
};
