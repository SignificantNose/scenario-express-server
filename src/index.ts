import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiV1 from "./api/v1/api";
import authV1 from "./api/v1/auth";
import config from "@assets/config";
import { authenticateJWT } from "api/middleware/auth";

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: "http://localhost:4200",
  credentials: true,
}));

app.use("/api/v1/auth", authV1);

// app.use("/api/v1", authenticateJWT, apiV1);
app.use("/api/v1", apiV1);

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});

