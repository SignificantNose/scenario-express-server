import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from '@assets/config';

const api = Router();

const s3 = new S3Client({
  endpoint: config.audioFileStorage.url,
  region: config.audioFileStorage.region,
  credentials: {
    accessKeyId: config.audioFileStorage.accessKeyId,
    secretAccessKey: config.audioFileStorage.accessKeySecret
  },
  forcePathStyle: true,
});
const upload = multer({ storage: multer.memoryStorage() });

api.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const key = `${Date.now()}-${req.file.originalname}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.audioFileStorage.bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Upload failed" });
  }

  return res.status(201).json({ uri: key });
});

export default api;
