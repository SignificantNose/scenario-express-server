import "dotenv/config";

interface AppConfig {
  apiPort: number;
  audioFileStorage: {
    url: string;
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucketName: string;
  },
  db: {
    url: string;
  }
}

const config: AppConfig = {
  apiPort: parseInt(process.env.API_PORT || "3000", 10),
  audioFileStorage: {
    url: process.env.AUDIO_STORAGE_URL || "http://localhost:9000",
    region: process.env.AUDIO_STORAGE_REGION || "us-east-1",
    accessKeyId: process.env.AUDIO_STORAGE_ACCESS_KEY_ID || "admin",
    accessKeySecret: process.env.AUDIO_STORAGE_ACCESS_KEY_SECRET || "supersecretpassword",
    bucketName: process.env.AUDIO_STORAGE_BUCKET_NAME || "audio-uploads"
  },
  db: {
    url: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/mydb"
  }
};

export default config;
