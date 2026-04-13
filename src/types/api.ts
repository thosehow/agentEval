export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  team_name: string | null;
  created_at: string;
}

export interface AgentProfile {
  id: number;
  name: string;
  version: string;
  model_name: string;
  temperature: number;
  system_prompt: string;
  enabled_tools: Record<string, boolean>;
  active: boolean;
  updated_at: string;
}

export interface TaskTypeBreakdown {
  name: string;
  count: number;
  percent: number;
  icon: string;
  color: string;
}

export interface DifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export interface DatasetCase {
  id: number;
  display_id: string;
  prompt: string;
  expected_behavior: string;
  criterion_type: "accuracy_threshold" | "strict_json_match" | "retry_protocol_check";
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  created_at: string;
}

export interface DatasetSummary {
  id: string;
  name: string;
  count: number;
  tags: string[];
  description: string;
  difficulty: DifficultyBreakdown;
  task_types: TaskTypeBreakdown[];
}

export interface DatasetDetail extends DatasetSummary {
  cases: DatasetCase[];
}

export interface EvaluationRunSummary {
  id: string;
  display_id: string;
  name: string;
  dataset_id: string | null;
  dataset_name: string | null;
  model_name: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  total_score: number | null;
  success_rate: number | null;
  total_cost_usd: number;
  avg_latency_ms: number | null;
  created_at: string;
  run_kind: "lab" | "benchmark";
}

export interface RunStep {
  id: number;
  step_index: number;
  step_type: "thought" | "action" | "tool_result" | "final" | "judge" | "error";
  title: string | null;
  content: string;
  tool_name: string | null;
  tool_input: Record<string, unknown> | null;
  tool_output: Record<string, unknown> | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CaseResult {
  id: number;
  dataset_case_id: number | null;
  criterion_type: DatasetCase["criterion_type"];
  output_text: string | null;
  score: number | null;
  passed: boolean;
  failure_reason: string | null;
  latency_ms: number | null;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model_name: string;
  prompt_snapshot: string;
  expected_behavior_snapshot: string;
}

export interface EvaluationRunDetail extends EvaluationRunSummary {
  temperature: number;
  system_prompt_snapshot: string;
  user_prompt: string | null;
  enabled_tools: Record<string, boolean>;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cases: number;
  succeeded_cases: number;
  failed_cases: number;
  final_output: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: RunStep[];
  case_results: CaseResult[];
}

export interface TrendPoint {
  name: string;
  success: number;
  latency: number;
}

export interface FailureReasonSlice {
  label: string;
  percent: number;
  color: string;
}

export interface DashboardOverview {
  total_runs: number;
  total_runs_delta: number;
  average_success_rate: number;
  success_rate_delta: number;
  average_latency_ms: number;
  latency_delta_ms: number;
  total_cost_usd: number;
  cost_trend_label: string;
  trend: TrendPoint[];
  failure_reasons: FailureReasonSlice[];
  recent_runs: EvaluationRunSummary[];
}
