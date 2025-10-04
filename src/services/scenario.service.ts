import { ScenarioFilter } from "@models/scenario/filter.model";
import { ScenarioData } from "@models/scenario/list-scenario-data.model";
import { pool } from "interface/db";

export async function createScenario(data: {
  name: string;
  emitters: any[];
  listeners: any[];
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const now = new Date().toISOString();
    const { name, emitters, listeners } = data;

    const { rows } = await client.query(
      `INSERT INTO scenarios(name, created_at, updated_at) VALUES ($1, $2, $3) RETURNING id`,
      [name, now, now]
    );
    const scenarioId = rows[0].id;

    for (const e of emitters) {
      await client.query(
        `INSERT INTO emitters(scenario_id, x, y, z, audio_file_uri) VALUES ($1,$2,$3,$4,$5)`,
        [scenarioId, e.position.x, e.position.y, e.position.z, e.audioFileUri]
      );
    }
    for (const l of listeners) {
      await client.query(
        `INSERT INTO listeners(scenario_id, x, y, z) VALUES ($1,$2,$3,$4)`,
        [scenarioId, l.position.x, l.position.y, l.position.z]
      );
    }

    await client.query("COMMIT");
    return scenarioId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listScenarios(filters: ScenarioFilter) {
  const client = await pool.connect();
  try {
    const values: any[] = [];
    const where: string[] = [];
    let idx = 1;

    if (filters.name) {
      where.push(`s.name ILIKE $${idx++}`);
      values.push(`%${filters.name}%`);
    }

    const pushDate = (col: string, val?: string, op: string = ">=") => {
      if (!val) return;
      const d = new Date(val);
      if (isNaN(d.getTime())) throw new Error(`Invalid date for ${col}`);
      where.push(`s.${col} ${op} $${idx++}`);
      values.push(d.toISOString());
    };

    pushDate("created_at", filters.createdAfter, ">=");
    pushDate("created_at", filters.createdBefore, "<=");
    pushDate("updated_at", filters.updatedAfter, ">=");
    pushDate("updated_at", filters.updatedBefore, "<=");

    const having: string[] = [];
    if (filters.minDevices != null) having.push(`COUNT(DISTINCT e.id) + COUNT(DISTINCT l.id) >= ${filters.minDevices}`);
    if (filters.maxDevices != null) having.push(`COUNT(DISTINCT e.id) + COUNT(DISTINCT l.id) <= ${filters.maxDevices}`);

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const havingClause = having.length ? `HAVING ${having.join(" AND ")}` : "";

    const { rows: scenarioIds } = await client.query(
      `
      SELECT s.id
      FROM scenarios s
      LEFT JOIN emitters e ON e.scenario_id = s.id
      LEFT JOIN listeners l ON l.scenario_id = s.id
      ${whereClause}
      GROUP BY s.id
      ${havingClause}
      ORDER BY s.id
      `,
      values
    );

    if (scenarioIds.length === 0) return [];

    const ids = scenarioIds.map((r) => r.id);

    const { rows: scenarios } = await client.query(
      `SELECT * FROM scenarios WHERE id = ANY($1) ORDER BY id`,
      [ids]
    );

    const { rows: emitters } = await client.query(
      `SELECT * FROM emitters WHERE scenario_id = ANY($1)`,
      [ids]
    );

    const { rows: listeners } = await client.query(
      `SELECT * FROM listeners WHERE scenario_id = ANY($1)`,
      [ids]
    );

    const emittersByScenario = new Map<number, any[]>();
    emitters.forEach((e) => {
      const arr = emittersByScenario.get(e.scenario_id) ?? [];
      arr.push(e);
      emittersByScenario.set(e.scenario_id, arr);
    });

    const listenersByScenario = new Map<number, any[]>();
    listeners.forEach((l) => {
      const arr = listenersByScenario.get(l.scenario_id) ?? [];
      arr.push(l);
      listenersByScenario.set(l.scenario_id, arr);
    });

    return scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.created_at?.toISOString?.() ?? s.created_at,
      updatedAt: s.updated_at?.toISOString?.() ?? s.updated_at,
      emitters: (emittersByScenario.get(s.id) ?? []).map((e) => ({
        id: e.id,
        position: { x: e.x, y: e.y, z: e.z },
        audioFileUri: e.audio_file_uri,
      })),
      listeners: (listenersByScenario.get(s.id) ?? []).map((l) => ({
        id: l.id,
        position: { x: l.x, y: l.y, z: l.z },
      })),
    }));
  } finally {
    client.release();
  }
}


export async function loadScenarioFromDB(scenarioId: number) {
  const client = await pool.connect();
  try {
    const { rows: scenarioRows } = await client.query(
      `SELECT * FROM scenarios WHERE id=$1`,
      [scenarioId]
    );
    if (!scenarioRows.length) throw new Error("Scenario not found");
    const s = scenarioRows[0];

    const { rows: emitters } = await client.query(
      `SELECT * FROM emitters WHERE scenario_id=$1`,
      [s.id]
    );
    const { rows: listeners } = await client.query(
      `SELECT * FROM listeners WHERE scenario_id=$1`,
      [s.id]
    );

    return {
      id: s.id,
      name: s.name,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      emitters: emitters.map((e) => ({
        id: e.id,
        position: { x: e.x, y: e.y, z: e.z },
        audioFileUri: e.audio_file_uri,
      })),
      listeners: listeners.map((l) => ({
        id: l.id,
        position: { x: l.x, y: l.y, z: l.z },
      })),
    } as ScenarioData;
  } finally {
    client.release();
  }
}

export async function updateScenario(
  scenarioId: number,
  data: { name: string; emitters: any[]; listeners: any[] }
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `UPDATE scenarios SET name=$1, updated_at=$2 WHERE id=$3`,
      [data.name, new Date().toISOString(), scenarioId]
    );
    if (!rowCount) throw new Error("Scenario not found");

    await client.query(`DELETE FROM emitters WHERE scenario_id=$1`, [scenarioId]);
    await client.query(`DELETE FROM listeners WHERE scenario_id=$1`, [scenarioId]);

    for (const e of data.emitters) {
      await client.query(
        `INSERT INTO emitters(scenario_id, x, y, z, audio_file_uri) VALUES ($1,$2,$3,$4,$5)`,
        [scenarioId, e.position.x, e.position.y, e.position.z, e.audioFileUri]
      );
    }
    for (const l of data.listeners) {
      await client.query(
        `INSERT INTO listeners(scenario_id, x, y, z) VALUES ($1,$2,$3,$4)`,
        [scenarioId, l.position.x, l.position.y, l.position.z]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteScenario(scenarioId: number) {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`DELETE FROM scenarios WHERE id=$1`, [scenarioId]);
    if (!rowCount) throw new Error("Scenario not found");
  } finally {
    client.release();
  }
}

