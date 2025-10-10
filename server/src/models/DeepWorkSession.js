import mongoose from "mongoose";

const deepWorkSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    },
    goal: {
      type: String,
      required: [true, "Phiên tập trung cần có mục tiêu."]
    },
    durationSet: {
      type: Number,
      default: 50
    },
    durationCompleted: {
      type: Number,
      default: 0
    },
    focusRating: {
      type: Number,
      min: 1,
      max: 5
    },
    distractionTimestamps: [
      {
        type: Date
      }
    ],
    pauseEvents: [
      {
        startedAt: {
          type: Date,
          required: true
        },
        endedAt: {
          type: Date
        },
        durationSeconds: {
          type: Number,
          default: 0
        }
      }
    ],
    quickNotes: {
      type: String,
      trim: true,
      default: ""
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled"],
      default: "in_progress"
    },
    pointsEarned: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const DeepWorkSession = mongoose.model(
  "DeepWorkSession",
  deepWorkSessionSchema
);
