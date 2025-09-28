import * as v from 'valibot';

export const ScenarioFilterSchema = v.object({
  name: v.optional(v.string()),

  createdAfter: v.optional(v.pipe(v.string(), v.isoDateTime())),
  createdBefore: v.optional(v.pipe(v.string(), v.isoDateTime())),

  updatedAfter: v.optional(v.pipe(v.string(), v.isoDateTime())),
  updatedBefore: v.optional(v.pipe(v.string(), v.isoDateTime())),

  minDevices: v.optional(v.number()),
  maxDevices: v.optional(v.number()),
});

export type ScenarioFilter = v.InferOutput<typeof ScenarioFilterSchema>;
