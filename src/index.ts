import express from "express";
import cors from "cors";
import apiV1 from "./api/v1/api";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/v1", apiV1);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
