import { Router } from "express";
import { validateBody } from "api/middleware/validation";
import { CreateScenarioDataSchema } from "@models/scenario/create-scenario-data.model";
import { pool } from "interface/db";
import { UpdateScenarioDataSchema } from "@models/scenario/update-scenario-data.model";

const api = Router();

api.post("/", validateBody(CreateScenarioDataSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const now = new Date().toISOString();
    const { name, emitters, listeners } = req.body;

    const { rows } = await client.query(
      `INSERT INTO scenarios(name, created_at, updated_at) VALUES ($1, $2, $3) RETURNING id`,
      [name, now, now]
    );
    const scenarioId = rows[0].id;

    for (const emitter of emitters) {
      await client.query(
        `INSERT INTO emitters(scenario_id, x, y, z, audio_file_uri) VALUES ($1, $2, $3, $4, $5)`,
        [scenarioId, emitter.position.x, emitter.position.y, emitter.position.z, emitter.audioFileUri]
      );
    }

    for (const listener of listeners) {
      await client.query(
        `INSERT INTO listeners(scenario_id, x, y, z) VALUES ($1, $2, $3, $4)`,
        [scenarioId, listener.position.x, listener.position.y, listener.position.z]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Scenario saved", id: scenarioId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save scenario" });
  } finally {
    client.release();
  }
});

api.get("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const toStringParam = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (Array.isArray(v)) v = v[0];
      return typeof v === "string" ? v : undefined;
    };

    const nameParam = toStringParam(req.query.name);
    const createdAfterParam = toStringParam(req.query.createdAfter);
    const createdBeforeParam = toStringParam(req.query.createdBefore);
    const updatedAfterParam = toStringParam(req.query.updatedAfter);
    const updatedBeforeParam = toStringParam(req.query.updatedBefore);
    const minDevicesParam = toStringParam(req.query.minDevices);
    const maxDevicesParam = toStringParam(req.query.maxDevices);

    const filters: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (nameParam) {
      filters.push(`s.name ILIKE $${idx++}`);
      values.push(`%${nameParam}%`);
    }

    const pushDateFilter = (col: string, str?: string, op: string = ">=") => {
      if (!str) return true;
      const d = new Date(str);
      if (isNaN(d.getTime())) {
        res.status(400).json({ error: `Invalid date for ${col}` });
        return false;
      }
      filters.push(`s.${col} ${op} $${idx++}`);
      values.push(d.toISOString());
      return true;
    };

    if (!(pushDateFilter("created_at", createdAfterParam, ">="))) { return; }
    if (!(pushDateFilter("created_at", createdBeforeParam, "<="))) { return; }
    if (!(pushDateFilter("updated_at", updatedAfterParam, ">="))) { return; }
    if (!(pushDateFilter("updated_at", updatedBeforeParam, "<="))) { return; }

    const minDevices = minDevicesParam ? Number(minDevicesParam) : undefined;
    const maxDevices = maxDevicesParam ? Number(maxDevicesParam) : undefined;

    if (minDevices != null && !Number.isFinite(minDevices)) {
      return res.status(400).json({ error: "Invalid minDevices" });
    }
    if (maxDevices != null && !Number.isFinite(maxDevices)) {
      return res.status(400).json({ error: "Invalid maxDevices" });
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const havingClauses: string[] = [];
    if (minDevices != null) {
      havingClauses.push(`COUNT(DISTINCT e.id) + COUNT(DISTINCT l.id) >= ${minDevices}`);
    }
    if (maxDevices != null) {
      havingClauses.push(`COUNT(DISTINCT e.id) + COUNT(DISTINCT l.id) <= ${maxDevices}`);
    }
    const havingClause = havingClauses.length ? `HAVING ${havingClauses.join(" AND ")}` : "";

    const baseQuery = `
      SELECT s.id
      FROM scenarios s
      LEFT JOIN emitters e ON e.scenario_id = s.id
      LEFT JOIN listeners l ON l.scenario_id = s.id
      ${whereClause}
      GROUP BY s.id
      ${havingClause}
      ORDER BY s.id
    `;

    const { rows: scenarioIds } = await client.query(baseQuery, values);

    if (scenarioIds.length === 0) {
      return res.json([]);
    }

    const ids = scenarioIds.map((r: any) => r.id);

    const { rows: scenarios } = await client.query(
      `SELECT * FROM scenarios WHERE id = ANY($1) ORDER BY id`,
      [ids]
    );

    const { rows: emitterRows } = await client.query(
      `SELECT * FROM emitters WHERE scenario_id = ANY($1)`,
      [ids]
    );
    const { rows: listenerRows } = await client.query(
      `SELECT * FROM listeners WHERE scenario_id = ANY($1)`,
      [ids]
    );

    const emittersByScenario = new Map<number, any[]>();
    for (const e of emitterRows) {
      const arr = emittersByScenario.get(e.scenario_id) ?? [];
      arr.push(e);
      emittersByScenario.set(e.scenario_id, arr);
    }
    const listenersByScenario = new Map<number, any[]>();
    for (const l of listenerRows) {
      const arr = listenersByScenario.get(l.scenario_id) ?? [];
      arr.push(l);
      listenersByScenario.set(l.scenario_id, arr);
    }

    const results = scenarios.map((s: any) => ({
      id: s.id,
      name: s.name,
      createdAt: s.created_at?.toISOString?.() ?? s.created_at,
      updatedAt: s.updated_at?.toISOString?.() ?? s.updated_at,
      emitters: (emittersByScenario.get(s.id) ?? []).map((e: any) => ({
        id: e.id,
        position: { x: e.x, y: e.y, z: e.z },
        audioFileUri: e.audio_file_uri,
      })),
      listeners: (listenersByScenario.get(s.id) ?? []).map((l: any) => ({
        id: l.id,
        position: { x: l.x, y: l.y, z: l.z },
      })),
    }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scenarios" });
  } finally {
    client.release();
  }
});

api.get("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid scenario id" });

    const { rows: scenarioRows } = await client.query(`SELECT * FROM scenarios WHERE id=$1`, [id]);
    if (!scenarioRows.length) return res.status(404).json({ error: "Scenario not found" });

    const s = scenarioRows[0];
    const { rows: emitters } = await client.query(`SELECT * FROM emitters WHERE scenario_id=$1`, [s.id]);
    const { rows: listeners } = await client.query(`SELECT * FROM listeners WHERE scenario_id=$1`, [s.id]);

    res.json({
      ...s,
      emitters: emitters.map((e) => ({
        id: e.id,
        position: { x: e.x, y: e.y, z: e.z },
        audioFileUri: e.audio_file_uri,
      })),
      listeners: listeners.map((l) => ({
        id: l.id,
        position: { x: l.x, y: l.y, z: l.z },
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scenario" });
  } finally {
    client.release();
  }
});

api.put("/:id", validateBody(UpdateScenarioDataSchema), async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid scenario id" });

    const { name, emitters, listeners } = req.body;

    await client.query("BEGIN");

    const { rowCount } = await client.query(
      `UPDATE scenarios SET name=$1, updated_at=$2 WHERE id=$3`,
      [name, new Date().toISOString(), id]
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Scenario not found" });
    }

    await client.query(`DELETE FROM emitters WHERE scenario_id=$1`, [id]);
    await client.query(`DELETE FROM listeners WHERE scenario_id=$1`, [id]);

    for (const e of emitters) {
      await client.query(
        `INSERT INTO emitters(scenario_id, x, y, z, audio_file_uri) VALUES ($1,$2,$3,$4,$5)`,
        [id, e.position.x, e.position.y, e.position.z, e.audioFileUri]
      );
    }
    for (const l of listeners) {
      await client.query(
        `INSERT INTO listeners(scenario_id, x, y, z) VALUES ($1,$2,$3,$4)`,
        [id, l.position.x, l.position.y, l.position.z]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Scenario updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update scenario" });
  } finally {
    client.release();
  }
});

api.delete("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid scenario id" });

    const { rowCount } = await client.query(`DELETE FROM scenarios WHERE id=$1`, [id]);
    if (!rowCount) return res.status(404).json({ error: "Scenario not found" });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete scenario" });
  } finally {
    client.release();
  }
});

export default api;

