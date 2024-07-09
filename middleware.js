const multer = require('multer');

const MIME_TYPE_MAP = {
  'text/csv': 'csv',
  'image/bmp':'bmp',
  'image/jpeg':'jpeg',
  'image/jpg':'jpg',
  'image/png':'png',
  'image/gif':'gif'
};

const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './public/uploads');
    },
    filename: (req, file, cb) => {
       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
       const ext = MIME_TYPE_MAP[file.mimetype];
       cb(null, uniqueSuffix + '.' + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
   
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  }
});

module.exports = fileUpload;
