import "dotenv/config";

interface AppConfig {
  port: number;
  audioFileStorage: {
    url: string;
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucketName: string;
  }
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  audioFileStorage: {
    url: process.env.AUDIO_STORAGE_URL || "http://localhost:9000",
    region: process.env.AUDIO_STORAGE_REGION || "us-east-1",
    accessKeyId: process.env.AUDIO_STORAGE_ACCESS_KEY_ID || "admin",
    accessKeySecret: process.env.AUDIO_STORAGE_ACCESS_KEY_SECRET || "supersecretpassword",
    bucketName: process.env.AUDIO_STORAGE_BUCKET_NAME || "audio-uploads"
  },
};

export default config;
