import * as v from 'valibot';

export const DeleteScenarioDataSchema = v.object({
  id: v.number(),
});
export type DeleteScenarioData = v.InferOutput<typeof DeleteScenarioDataSchema>;
