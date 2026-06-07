const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_${uuidv4()}${ext}`);
  },
});

const csvFilter = (req, file, cb) => {
  if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    file.originalname.endsWith('.csv')
  ) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error('Only CSV files are allowed'), {
        code: 'INVALID_FILE_TYPE',
        status: 400,
      }),
      false
    );
  }
};

const uploadCSV = multer({
  storage: csvStorage,
  fileFilter: csvFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
}).single('file');

// Promise wrapper for cleaner async usage
const uploadCSVMiddleware = (req, res, next) => {
  uploadCSV(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'CSV file is required' },
      });
    }
    next();
  });
};

module.exports = { uploadCSVMiddleware };
