import { z } from "zod";

// One schema is the single source of truth: zod validates the LLM's JSON at
// runtime, and z.infer derives the TypeScript type from it, so the two can
// never drift apart.

export const SEVERITIES = ["error", "warning", "suggestion"] as const;

export const SeveritySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive().optional(),
  severity: SeveritySchema,
  message: z.string().min(1),
});
export type Finding = z.infer<typeof FindingSchema>;

export const FindingsSchema = z.array(FindingSchema);
