const multer = require("multer");

const path = require("path");

const uploadPath = path.resolve(__dirname, "..", "../uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    console.log("file", file);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".").pop());
  },
});

const uploadImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});
const uploadFiles = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log("file", file);
    const validMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];
    console.log("file.mimetype", file.mimetype);
    if (validMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .xlsx, .csv and .xls format allowed!"));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

module.exports = {
  uploadImages,
  uploadFiles,
};
