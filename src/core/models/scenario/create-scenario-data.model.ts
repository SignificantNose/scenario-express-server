import * as v from 'valibot';
import { EmitterDataSchema, ListenerDataSchema } from "./list-scenario-data.model";

export const CreateScenarioDataSchema = v.object({
  name: v.string(),
  emitters: v.array(EmitterDataSchema),
  listeners: v.array(ListenerDataSchema),
});
export type CreateScenarioData = v.InferOutput<typeof CreateScenarioDataSchema>;

