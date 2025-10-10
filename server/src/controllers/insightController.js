import dayjs from "dayjs";
import OpenAI from "openai";
import { DeepWorkSession } from "../models/DeepWorkSession.js";

const buildPrompt = (sessions) => {
  if (sessions.length === 0) {
    return `Người dùng chưa có phiên Deep Work nào. Hãy gợi ý 3 lời khuyên chung bằng tiếng Việt giúp họ bắt đầu xây dựng thói quen làm việc tập trung.`;
  }

  const summary = sessions
    .map((session) => {
      const date = dayjs(session.endTime || session.startTime).format(
        "DD/MM/YYYY HH:mm"
      );
      const duration = session.durationCompleted || session.durationSet || 0;
      const rating = session.focusRating || "chưa đánh giá";
      const distractions = session.distractionTimestamps?.length || 0;
      return `- ${date}: ${duration} phút, đánh giá ${rating}, xao nhãng ${distractions} lần. Mục tiêu: ${session.goal}.`;
    })
    .join("\n");

  return `Dưới đây là dữ liệu gần đây về các phiên Deep Work của người dùng:

${summary}

Hãy phân tích theo các yêu cầu:
1. Nhận xét xu hướng về mức độ tập trung (ít nhất 2 câu).
2. Nêu thời điểm hoặc điều kiện người dùng tập trung tốt nhất (nếu có).
3. Đưa ra đúng 3 gợi ý cải thiện, ưu tiên cá nhân hóa dựa trên dữ liệu. Viết tiếng Việt, ngắn gọn, giọng khích lệ.`;
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

    const sessions = await DeepWorkSession.find({
      userId: req.user._id,
      status: "completed"
    })
      .sort({ endTime: -1 })
      .limit(15)
      .lean();

    const prompt = buildPrompt(sessions);

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
      generatedAt: new Date()
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return res.status(503).json({
        message:
          "Không thể kết nối tới dịch vụ OpenAI. Vui lòng kiểm tra API key."
      });
    }
    next(error);
  }
};
