import mongoose from "mongoose";

const youtubeFavoriteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        videoId: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            default: "",
            trim: true
        },
        url: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

youtubeFavoriteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const YoutubeFavorite = mongoose.model(
    "YoutubeFavorite",
    youtubeFavoriteSchema
);
