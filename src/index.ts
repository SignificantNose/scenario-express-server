import express from "express";
import cors from "cors";
import apiV1 from "./api/v1/api";
import config from "@assets/config";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", apiV1);

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});
