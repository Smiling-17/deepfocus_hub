import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Tên đăng nhập không được để trống."],
      unique: true,
      trim: true,
      minlength: [3, "Tên đăng nhập phải có ít nhất 3 ký tự."]
    },
    password: {
      type: String,
      required: [true, "Mật khẩu không được để trống."],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự."]
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
