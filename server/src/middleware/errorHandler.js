export const notFound = (req, res, next) => {
  res.status(404);
  res.json({
    message: "Không tìm thấy tài nguyên bạn yêu cầu."
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error("Lỗi máy chủ:", err);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || "Có lỗi xảy ra. Vui lòng thử lại sau."
  });
};
