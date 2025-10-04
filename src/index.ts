import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiV1 from "./api/v1/api";
import authV1 from "./api/v1/auth";
import config from "@assets/config";
import { authenticateJWT } from "api/middleware/auth";
import { Server } from "socket.io";
import { initWebSocket } from "api/v1/websocket";
import http from "http";

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: "http://localhost:4200",
  credentials: true,
}));

app.use("/api/v1/auth", authV1);
app.use("/api/v1", authenticateJWT, apiV1);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    credentials: true,
  },
});

initWebSocket(io);

server.listen(config.apiPort, () => {
  console.log(`Backend + WebSocket listening on http://localhost:${config.apiPort}`);
});
