import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: [true, "Nhiệm vụ phải có tiêu đề."]
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    project: {
      type: String,
      default: ""
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    progressNote: {
      type: String,
      default: ""
    },
    subTasks: {
      type: [
        new mongoose.Schema(
          {
            title: {
              type: String,
              required: [true, "Tiêu đề hạng mục cần được nhập."],
              trim: true
            },
            isCompleted: {
              type: Boolean,
              default: false
            }
          },
          { _id: true }
        )
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Task = mongoose.model("Task", taskSchema);
