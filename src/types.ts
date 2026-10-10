export type Severity = 'error' | 'warning' | 'suggestion';

export interface Finding {
    file: string;
    line?: number;
    severity: Severity;
    message: string;
}