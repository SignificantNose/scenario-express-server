import * as v from 'valibot';
import { EmitterDataSchema, ListenerDataSchema } from "./list-scenario-data.model";

export const UpdateScenarioDataSchema = v.object({
  id: v.number(),
  name: v.string(),
  emitters: v.array(EmitterDataSchema),
  listeners: v.array(ListenerDataSchema),
});
export type UpdateScenarioData = v.InferOutput<typeof UpdateScenarioDataSchema>;

