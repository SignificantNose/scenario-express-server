import { Router } from "express";
import { validateBody } from "api/middleware/validation";
import { CreateScenarioDataSchema } from "@models/scenario/create-scenario-data.model";
import { UpdateScenarioDataSchema } from "@models/scenario/update-scenario-data.model";
import * as scenarioService from "../../services/scenario.service";

const api = Router();

api.post("/", validateBody(CreateScenarioDataSchema), async (req, res) => {
  try {
    const id = await scenarioService.createScenario(req.body);
    res.status(201).json({ message: "Scenario saved", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save scenario" });
  }
});

api.get("/", async (req, res) => {
  try {
    const toStringParam = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (Array.isArray(v)) v = v[0];
      return typeof v === "string" ? v : undefined;
    };

    const name = toStringParam(req.query.name);
    const createdAfter = toStringParam(req.query.createdAfter);
    const createdBefore = toStringParam(req.query.createdBefore);
    const updatedAfter = toStringParam(req.query.updatedAfter);
    const updatedBefore = toStringParam(req.query.updatedBefore);

    const minDevicesRaw = toStringParam(req.query.minDevices);
    const maxDevicesRaw = toStringParam(req.query.maxDevices);

    const minDevices = minDevicesRaw != null ? Number(minDevicesRaw) : undefined;
    const maxDevices = maxDevicesRaw != null ? Number(maxDevicesRaw) : undefined;

    if ((minDevicesRaw != null && Number.isNaN(minDevices)) || 
        (maxDevicesRaw != null && Number.isNaN(maxDevices))) {
      return res.status(400).json({ error: "Invalid minDevices or maxDevices" });
    }

    const filters = { name, createdAfter, createdBefore, updatedAfter, updatedBefore, minDevices, maxDevices };

    const scenarios = await scenarioService.listScenarios(filters);
    res.json(scenarios);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch scenarios" });
  }
});

api.get("/:id", async (req, res) => {
  try {
    const scenario = await scenarioService.loadScenarioFromDB(Number(req.params.id));
    res.json(scenario);
  } catch (err: any) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

api.put("/:id", validateBody(UpdateScenarioDataSchema), async (req, res) => {
  try {
    await scenarioService.updateScenario(Number(req.params.id), req.body);
    res.json({ message: "Scenario updated" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

api.delete("/:id", async (req, res) => {
  try {
    await scenarioService.deleteScenario(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

export default api;

