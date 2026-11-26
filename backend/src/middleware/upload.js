const multer = require("multer");
const { ApiError } = require("../utils/apiError");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== "application/pdf") {
      return callback(new ApiError(400, "Only PDF CV files are allowed", "INVALID_CV_FILE"));
    }
    return callback(null, true);
  },
});

function uploadCv(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "CV files must be 5 MB or smaller", "CV_FILE_TOO_LARGE"));
    }
    return next(error);
  });
}

module.exports = { uploadCv };
