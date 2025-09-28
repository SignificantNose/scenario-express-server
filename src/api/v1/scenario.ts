import * as v from 'valibot';
import { ScenarioFilterSchema } from '@models/scenario/filter.model';
import { CreateScenarioDataSchema } from '@models/scenario/create-scenario-data.model';
import { ListScenarioDataResponse, ScenarioData } from '@models/scenario/list-scenario-data.model';
import { UpdateScenarioDataSchema } from '@models/scenario/update-scenario-data.model';
import { validateBody } from 'api/middleware/validation';
import { Router } from 'express';

const api = Router();
let scenarios: ListScenarioDataResponse = [
  {
    id: 1,
    name: 'abc',
    createdAt: '2025-09-10T10:15:30',
    updatedAt: '2025-09-11T10:15:30',
    emitters: [{ id: 1, position: { x: 1, y: 1, z: 2 }, audioFileUri: null }],
    listeners: [{ id: 1, position: { x: 1, y: 1, z: 1 } }],
  },
  {
    id: 2,
    name: 'abcd',
    createdAt: '2025-09-12T10:15:30',
    updatedAt: '2025-09-13T10:15:30',
    emitters: [{ id: 1, position: { x: 1, y: 1, z: 2 }, audioFileUri: null }],
    listeners: [{ id: 1, position: { x: 1, y: 1, z: 1 } }],
  },
  {
    id: 3,
    name: 'abcde',
    createdAt: '2025-09-14T10:15:30',
    updatedAt: '2025-09-15T10:15:30',
    emitters: [{ id: 1, position: { x: 1, y: 1, z: 2 }, audioFileUri: null }],
    listeners: [{ id: 1, position: { x: 1, y: 1, z: 1 } }],
  },
  {
    id: 4,
    name: 'abcdef',
    createdAt: '2025-09-16T10:15:30',
    updatedAt: '2025-09-17T10:15:30',
    emitters: [{ id: 1, position: { x: 1, y: 1, z: 2 }, audioFileUri: null }],
    listeners: [{ id: 1, position: { x: 1, y: 1, z: 1 } }],
  },
];

let nextScenarioId = Math.max(...scenarios.map((s) => s.id)) + 1;

api.post('/', validateBody(CreateScenarioDataSchema), async (req, res) => {
  const now = new Date().toISOString();
  const scenario: ScenarioData = {
    ...req.body,
    id: nextScenarioId++,
    createdAt: now,
    updatedAt: now,
  };
  scenarios.push(scenario);
  res.status(201).json({ message: 'Scenario saved', scenario });
});

api.get('/', async (req, res) => {
  const query = req.query;

  const cleanStringValue = (value: any) => {
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  };

  const rawFilter = {
    name: cleanStringValue(query['name']),
    createdAfter: cleanStringValue(query['createdAfter']),
    createdBefore: cleanStringValue(query['createdBefore']),
    updatedAfter: cleanStringValue(query['updatedAfter']),
    updatedBefore: cleanStringValue(query['updatedBefore']),
    minDevices: query['minDevices'] ? Number(query['minDevices']) : undefined,
    maxDevices: query['maxDevices'] ? Number(query['maxDevices']) : undefined,
  };

  const result = v.safeParse(ScenarioFilterSchema, rawFilter);

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid filter', details: result.issues });
  }

  const filter = result.output;

  let filtered = scenarios;

  if (filter.name) {
    filtered = filtered.filter((s) => s.name.toLowerCase().includes(filter.name!.toLowerCase()));
  }

  if (filter.createdAfter) {
    filtered = filtered.filter((s) => new Date(s.createdAt) >= new Date(filter.createdAfter!));
  }
  if (filter.createdBefore) {
    filtered = filtered.filter((s) => new Date(s.createdAt) <= new Date(filter.createdBefore!));
  }

  if (filter.updatedAfter) {
    filtered = filtered.filter((s) => new Date(s.updatedAt) >= new Date(filter.updatedAfter!));
  }
  if (filter.updatedBefore) {
    filtered = filtered.filter((s) => new Date(s.updatedAt) <= new Date(filter.updatedBefore!));
  }

  if (filter.minDevices !== undefined) {
    filtered = filtered.filter((s) => s.listeners.length + s.emitters.length >= filter.minDevices!);
  }
  if (filter.maxDevices !== undefined) {
    filtered = filtered.filter((s) => s.listeners.length + s.emitters.length <= filter.maxDevices!);
  }

  return res.json(filtered);
});

api.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid scenario id' });
  }

  const scenario = scenarios.find((s) => s.id === id);

  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  return res.json(scenario);
});

api.put('/:id', validateBody(UpdateScenarioDataSchema), async (req, res) => {
  const id = Number(req.params['id']);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid scenario id' });
  }

  const updated = req.body;

  const index = scenarios.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  scenarios[index] = {
    ...scenarios[index],
    name: updated.name,
    emitters: updated.emitters,
    listeners: updated.listeners,
    updatedAt: new Date().toISOString(),
  };

  return res.status(200).json(scenarios[index]);
});

api.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid scenario id' });
  }

  const index = scenarios.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  const deletedScenario = scenarios.splice(index, 1)[0];

  return res.json({ success: true, deleted: deletedScenario });
});

export default api;
