import fetch from "node-fetch";
import { YoutubeFavorite } from "../models/YoutubeFavorite.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// In-memory cache: key → { data, expires }
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getCachedOrFetch = async (cacheKey, fetchFn) => {
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }
    const data = await fetchFn();
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
};

export const searchYouTubeVideos = async (req, res, next) => {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                message: "Tính năng tìm kiếm YouTube cần cấu hình YOUTUBE_API_KEY trong máy chủ."
            });
        }

        const query = (req.query.q || "study with me").trim();
        const maxResults = Math.min(Number(req.query.maxResults) || 8, 20);

        const cacheKey = `yt:${query}:${maxResults}`;
        const videos = await getCachedOrFetch(cacheKey, async () => {
            const params = new URLSearchParams({
                part: "snippet",
                q: query,
                type: "video",
                maxResults: String(maxResults),
                order: "relevance",
                videoDuration: "long",
                key: apiKey
            });

            const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const status = response.status;
                if (status === 403) {
                    throw Object.assign(new Error("YouTube API quota exceeded"), { status: 503 });
                }
                throw Object.assign(
                    new Error(error.error?.message || "YouTube API error"),
                    { status: status >= 400 && status < 500 ? status : 502 }
                );
            }

            const data = await response.json();
            return (data.items || []).map((item) => ({
                videoId: item.id?.videoId,
                title: item.snippet?.title,
                channelTitle: item.snippet?.channelTitle,
                thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
                publishedAt: item.snippet?.publishedAt
            }));
        });

        return res.json({ videos });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        next(error);
    }
};

/* ── Favorites ──────────────────────────────────────────────────────────── */

const MAX_FAVORITES = 20;

export const getFavorites = async (req, res, next) => {
    try {
        const favorites = await YoutubeFavorite.find({ userId: req.user._id })
            .sort({ updatedAt: -1 })
            .limit(MAX_FAVORITES)
            .lean();
        return res.json(favorites);
    } catch (error) {
        next(error);
    }
};

export const addFavorite = async (req, res, next) => {
    try {
        const { videoId, title, url } = req.body;
        if (!videoId || !url) {
            return res.status(400).json({ message: "videoId và url là bắt buộc." });
        }

        const count = await YoutubeFavorite.countDocuments({ userId: req.user._id });
        if (count >= MAX_FAVORITES) {
            // Remove oldest to make room
            const oldest = await YoutubeFavorite.findOne({ userId: req.user._id })
                .sort({ updatedAt: 1 });
            if (oldest) await oldest.deleteOne();
        }

        const favorite = await YoutubeFavorite.findOneAndUpdate(
            { userId: req.user._id, videoId },
            { title: title || "", url },
            { upsert: true, new: true }
        );
        return res.status(201).json(favorite);
    } catch (error) {
        next(error);
    }
};

export const removeFavorite = async (req, res, next) => {
    try {
        const { videoId } = req.params;
        await YoutubeFavorite.deleteOne({ userId: req.user._id, videoId });
        return res.json({ message: "Đã xóa khỏi yêu thích." });
    } catch (error) {
        next(error);
    }
};
