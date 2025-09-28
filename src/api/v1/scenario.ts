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
    const { name, createdAfter, createdBefore, updatedAfter, updatedBefore, minDevices, maxDevices } = req.query;

    const filters: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name) {
      filters.push(`name ILIKE $${idx++}`);
      values.push(`%${name}%`);
    }
    if (createdAfter) {
      filters.push(`created_at >= $${idx++}`);
      values.push(new Date(createdAfter as string));
    }
    if (createdBefore) {
      filters.push(`created_at <= $${idx++}`);
      values.push(new Date(createdBefore as string));
    }
    if (updatedAfter) {
      filters.push(`updated_at >= $${idx++}`);
      values.push(new Date(updatedAfter as string));
    }
    if (updatedBefore) {
      filters.push(`updated_at <= $${idx++}`);
      values.push(new Date(updatedBefore as string));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const { rows: scenarios } = await client.query(`SELECT * FROM scenarios ${whereClause} ORDER BY id`);

    const results = [];
    for (const s of scenarios) {
      const { rows: emitters } = await client.query(
        `SELECT * FROM emitters WHERE scenario_id=$1`,
        [s.id]
      );
      const { rows: listeners } = await client.query(
        `SELECT * FROM listeners WHERE scenario_id=$1`,
        [s.id]
      );

      const totalDevices = emitters.length + listeners.length;
      if ((minDevices && totalDevices < Number(minDevices)) || (maxDevices && totalDevices > Number(maxDevices))) {
        continue;
      }

      results.push({
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
    }

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

