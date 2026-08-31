export type AgentAction =
    | "ALLOW"
    | "REVIEW"
    | "PAUSE";

export interface AgentDecision {
    summary: string;
    reasons: string[];
    action: AgentAction;
    confidence: number;
}