import { z } from 'zod';

export const SeveritySchema = z.enum(['error', 'warning', 'suggestion']);

export const FindingSchema = z.object({
    file: z.string().min(1),
    line: z.number().int().positive().optional(),
    severity: SeveritySchema,
    message: z.string().min(1),
});

export const FindingsSchema = z.array(FindingSchema);

export type Severity = z.infer<typeof SeveritySchema>;
export type Finding = z.infer<typeof FindingSchema>;