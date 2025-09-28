import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const api = Router();


const UPLOAD_DIR = '/home/significantnose/audio-uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

api.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUri = `${req.file.filename}`;
  return res.status(201).json({ uri: fileUri });
});

export default api;
