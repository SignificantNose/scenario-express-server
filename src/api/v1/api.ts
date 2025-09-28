import { Router } from "express";
import scenario from "./scenario";
import audio from "./audio";

const api = Router();

api.use('/scenario', scenario);
api.use('/audio', audio);

export default api;
