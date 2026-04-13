import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Square,
  X,
} from "lucide-react";
import { apiFetch } from "@/api/client";
import type {
  AgentProfile,
  DatasetSummary,
  EvaluationRunDetail,
  EvaluationRunSummary,
} from "@/types/api";

const DEFAULT_MODEL_OPTIONS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const ALL_DATASETS = "All Datasets";
const ALL_MODELS = "All Models";
const ALL_STATUSES = "All Statuses";

function formatCurrency(value: number) {
  return `$${value.toFixed(value < 1 ? 3 : 2)}`;
}

function formatLatency(value: number | null) {
  if (!value) {
    return "-";
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: EvaluationRunSummary["status"]) {
  switch (status) {
    case "completed":
      return "已完成";
    case "running":
      return "运行中";
    case "queued":
      return "排队中";
    case "cancelled":
      return "已取消";
    default:
      return "失败";
  }
}

function statusBadgeClass(status: EvaluationRunSummary["status"]) {
  switch (status) {
    case "completed":
      return "bg-secondary-fixed text-on-secondary-fixed-variant";
    case "running":
    case "queued":
      return "bg-primary-fixed/50 text-on-primary-fixed-variant";
    case "cancelled":
      return "bg-surface-container-high text-on-surface";
    default:
      return "bg-error-container text-on-error-container";
  }
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

type CreateRunModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  datasets: DatasetSummary[];
  availableModels: string[];
  taskName: string;
  selectedDatasetId: string;
  selectedModelName: string;
  setTaskName: (value: string) => void;
  setSelectedDatasetId: (value: string) => void;
  setSelectedModelName: (value: string) => void;
  submitting: boolean;
  agentProfile: AgentProfile | null;
};

function CreateRunModal(_: CreateRunModalProps) {
  const {
    open,
    onClose,
    onSubmit,
    datasets,
    availableModels,
    taskName,
    selectedDatasetId,
    selectedModelName,
    setTaskName,
    setSelectedDatasetId,
    setSelectedModelName,
    submitting,
    agentProfile,
  } = _;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
          <h3 className="text-lg font-bold text-on-surface">新建评测任务</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">任务名称</label>
            <input
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="例如：Q4 财务报告评测"
              className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">选择数据集</label>
            <select
              value={selectedDatasetId}
              onChange={(event) => setSelectedDatasetId(event.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">当前模型</label>
            <select
              value={selectedModelName}
              onChange={(event) => setSelectedModelName(event.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {availableModels.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-on-surface-variant">
              当前激活 Agent Profile: {agentProfile?.name ?? "未加载"} / {agentProfile?.version ?? "-"}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-70"
          >
            {submitting ? "创建中..." : "创建任务"}
          </button>
        </div>
      </div>
    </div>
  );
}

type CompareRunsModalProps = {
  open: boolean;
  runs: EvaluationRunDetail[];
  onClose: () => void;
};

type RunDetailModalProps = {
  open: boolean;
  run: EvaluationRunDetail | null;
  loading: boolean;
  onClose: () => void;
};

function CompareRunsModal(_: CompareRunsModalProps) {
  const { open, runs, onClose } = _;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-on-surface">运行对比</h3>
            <p className="text-xs text-on-surface-variant mt-1">对比模型、成功率、分数、成本和失败样例摘要。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-88px)]">
          <div className={`grid gap-4 ${runs.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-xs font-mono text-primary mb-1">{run.display_id}</div>
                    <h4 className="text-lg font-semibold text-on-surface">{run.name}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {run.dataset_name ?? "实验室运行"} · {run.run_kind}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(run.status)}`}>
                    {statusLabel(run.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">模型</div>
                    <div className="text-sm font-semibold text-on-surface break-all">{run.model_name}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">成功率</div>
                    <div className="text-sm font-semibold text-on-surface">{formatPercent(run.success_rate)}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">评分</div>
                    <div className="text-sm font-semibold text-on-surface">
                      {run.total_score === null || run.total_score === undefined ? "-" : run.total_score.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">延迟</div>
                    <div className="text-sm font-semibold text-on-surface">{formatLatency(run.avg_latency_ms)}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">成本</div>
                    <div className="text-sm font-semibold text-on-surface">{formatCurrency(run.total_cost_usd)}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container p-3">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">样例通过</div>
                    <div className="text-sm font-semibold text-on-surface">
                      {run.succeeded_cases}/{run.total_cases}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">启用工具</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(run.enabled_tools)
                        .filter(([, enabled]) => enabled)
                        .map(([toolName]) => (
                          <span
                            key={toolName}
                            className="px-2 py-0.5 rounded-full bg-primary-fixed/20 text-primary text-[10px] font-semibold"
                          >
                            {toolName}
                          </span>
                        ))}
                      {!Object.values(run.enabled_tools).some(Boolean) && (
                        <span className="text-xs text-on-surface-variant">无</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">失败摘要</div>
                    <div className="space-y-2">
                      {run.case_results
                        .filter((item) => !item.passed)
                        .slice(0, 3)
                        .map((item) => (
                          <div key={item.id} className="rounded-lg bg-error-container/50 px-3 py-2 text-xs text-on-surface">
                            <div className="font-semibold mb-1">{item.criterion_type}</div>
                            <div className="text-on-surface-variant">{item.failure_reason ?? "未提供失败原因"}</div>
                          </div>
                        ))}
                      {run.case_results.filter((item) => !item.passed).length === 0 && (
                        <div className="text-xs text-on-surface-variant">当前运行没有失败样例。</div>
                      )}
                    </div>
                  </div>

                  {run.error_message && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">错误信息</div>
                      <div className="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">
                        {run.error_message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RunDetailModal(_: RunDetailModalProps) {
  const { open, run, loading, onClose } = _;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-on-surface">任务详情</h3>
            <p className="text-xs text-on-surface-variant mt-1">查看单次运行的模型、指标、失败原因和明细结果。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-88px)]">
          {loading && <div className="text-sm text-on-surface-variant">正在加载任务详情...</div>}

          {!loading && !run && <div className="text-sm text-on-surface-variant">暂无任务详情。</div>}

          {!loading && run && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-xs font-mono text-primary mb-1">{run.display_id}</div>
                      <h4 className="text-xl font-semibold text-on-surface">{run.name}</h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {run.dataset_name ?? "实验室运行"} · {run.run_kind}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(run.status)}`}>
                      {statusLabel(run.status)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">模型</div>
                      <div className="text-sm font-semibold text-on-surface break-all">{run.model_name}</div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">成功率</div>
                      <div className="text-sm font-semibold text-on-surface">{formatPercent(run.success_rate)}</div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">评分</div>
                      <div className="text-sm font-semibold text-on-surface">
                        {run.total_score === null || run.total_score === undefined ? "-" : run.total_score.toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">延迟</div>
                      <div className="text-sm font-semibold text-on-surface">{formatLatency(run.avg_latency_ms)}</div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">成本</div>
                      <div className="text-sm font-semibold text-on-surface">{formatCurrency(run.total_cost_usd)}</div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Token</div>
                      <div className="text-sm font-semibold text-on-surface">{run.total_tokens}</div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">样例通过</div>
                      <div className="text-sm font-semibold text-on-surface">
                        {run.succeeded_cases}/{run.total_cases}
                      </div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-3">
                      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">创建时间</div>
                      <div className="text-sm font-semibold text-on-surface">{formatDate(run.created_at)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">启用工具</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(run.enabled_tools)
                        .filter(([, enabled]) => enabled)
                        .map(([toolName]) => (
                          <span
                            key={toolName}
                            className="px-2 py-0.5 rounded-full bg-primary-fixed/20 text-primary text-[10px] font-semibold"
                          >
                            {toolName}
                          </span>
                        ))}
                      {!Object.values(run.enabled_tools).some(Boolean) && (
                        <span className="text-xs text-on-surface-variant">无</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                  <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">输出与错误</div>

                  {run.final_output && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-on-surface mb-2">最终输出</div>
                      <div className="rounded-xl bg-surface-container p-3 text-sm text-on-surface whitespace-pre-wrap break-words">
                        {run.final_output}
                      </div>
                    </div>
                  )}

                  {run.error_message && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-on-surface mb-2">错误信息</div>
                      <div className="rounded-xl bg-error-container p-3 text-sm text-on-error-container break-words">
                        {run.error_message}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-on-surface mb-2">系统提示词快照</div>
                    <div className="rounded-xl bg-surface-container p-3 text-xs text-on-surface-variant whitespace-pre-wrap break-words max-h-56 overflow-auto">
                      {run.system_prompt_snapshot}
                    </div>
                  </div>
                </div>
              </div>

              {run.case_results.length > 0 && (
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                  <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">样例结果</div>
                  <div className="space-y-3">
                    {run.case_results.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 ${item.passed ? "border-secondary/20 bg-secondary-fixed/10" : "border-error/20 bg-error-container/40"}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="text-xs font-semibold text-on-surface">{item.criterion_type}</div>
                            <div className="text-[11px] text-on-surface-variant">
                              score: {item.score ?? 0} · latency: {formatLatency(item.latency_ms)}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.passed ? "bg-secondary-fixed text-on-secondary-fixed-variant" : "bg-error-container text-on-error-container"}`}>
                            {item.passed ? "passed" : "failed"}
                          </span>
                        </div>

                        <div className="text-xs text-on-surface mb-2 whitespace-pre-wrap break-words">
                          <span className="font-semibold">Prompt: </span>
                          {item.prompt_snapshot}
                        </div>

                        <div className="text-xs text-on-surface mb-2 whitespace-pre-wrap break-words">
                          <span className="font-semibold">Expected: </span>
                          {item.expected_behavior_snapshot}
                        </div>

                        {item.output_text && (
                          <div className="text-xs text-on-surface mb-2 whitespace-pre-wrap break-words">
                            <span className="font-semibold">Output: </span>
                            {item.output_text}
                          </div>
                        )}

                        {item.failure_reason && (
                          <div className="text-xs text-on-surface-variant whitespace-pre-wrap break-words">
                            <span className="font-semibold text-on-surface">Reason: </span>
                            {item.failure_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {run.steps.length > 0 && (
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                  <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">步骤轨迹</div>
                  <div className="space-y-3">
                    {run.steps.map((step) => (
                      <div key={step.id} className="rounded-xl bg-surface-container p-4">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="text-sm font-semibold text-on-surface">{step.title ?? step.step_type}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            {step.step_type}
                            {step.latency_ms ? ` · ${step.latency_ms}ms` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-on-surface-variant whitespace-pre-wrap break-words">{step.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tasks() {
  const [runs, setRuns] = useState<EvaluationRunSummary[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datasetFilter, setDatasetFilter] = useState(ALL_DATASETS);
  const [modelFilter, setModelFilter] = useState(ALL_MODELS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isRunDetailModalOpen, setIsRunDetailModalOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [comparisonRuns, setComparisonRuns] = useState<EvaluationRunDetail[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState<EvaluationRunDetail | null>(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPageData = async () => {
    const [runsData, datasetsData, profileData] = await Promise.all([
      apiFetch<EvaluationRunSummary[]>("/api/runs"),
      apiFetch<DatasetSummary[]>("/api/datasets"),
      apiFetch<AgentProfile>("/api/agent/profile/active"),
    ]);
    setRuns(runsData);
    setDatasets(datasetsData);
    setAgentProfile(profileData);
    setSelectedDatasetId((current) => current || datasetsData[0]?.id || "");
    setSelectedModelName((current) => current || profileData.model_name);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadPageData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载评测任务失败。");
      }
    };

    void load();

    const timer = window.setInterval(() => {
      void apiFetch<EvaluationRunSummary[]>("/api/runs")
        .then(setRuns)
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    return runs.filter((task) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        task.name.toLowerCase().includes(query) ||
        task.display_id.toLowerCase().includes(query) ||
        task.model_name.toLowerCase().includes(query);
      const matchesDataset = datasetFilter === ALL_DATASETS || task.dataset_name === datasetFilter;
      const matchesModel = modelFilter === ALL_MODELS || task.model_name === modelFilter;
      const matchesStatus = statusFilter === ALL_STATUSES || statusLabel(task.status) === statusFilter;
      return matchesSearch && matchesDataset && matchesModel && matchesStatus;
    });
  }, [datasetFilter, modelFilter, runs, searchQuery, statusFilter]);

  const availableModelOptions = useMemo(() => {
    return uniqueValues([
      agentProfile?.model_name,
      ...DEFAULT_MODEL_OPTIONS,
      ...runs.map((item) => item.model_name),
    ]);
  }, [agentProfile?.model_name, runs]);

  const uniqueDatasets = useMemo(
    () => [ALL_DATASETS, ...uniqueValues(runs.map((item) => item.dataset_name))],
    [runs],
  );
  const uniqueModels = useMemo(
    () => [ALL_MODELS, ...uniqueValues(runs.map((item) => item.model_name))],
    [runs],
  );
  const uniqueStatuses = [ALL_STATUSES, "已完成", "运行中", "排队中", "失败", "已取消"];

  const filteredTaskIds = filteredTasks.map((task) => task.id);
  const selectedVisibleCount = filteredTaskIds.filter((id) => selectedRunIds.includes(id)).length;
  const allVisibleSelected = filteredTaskIds.length > 0 && selectedVisibleCount === filteredTaskIds.length;

  const toggleRunSelection = (runId: string) => {
    setSelectedRunIds((current) =>
      current.includes(runId) ? current.filter((item) => item !== runId) : [...current, runId],
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedRunIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !filteredTaskIds.includes(id));
      }
      const next = new Set(current);
      filteredTaskIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDatasetFilter(ALL_DATASETS);
    setModelFilter(ALL_MODELS);
    setStatusFilter(ALL_STATUSES);
  };

  const handleCreateRun = async () => {
    if (!taskName.trim() || !selectedDatasetId || !selectedModelName) {
      setError("请填写任务名称，并选择数据集与运行模型。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const run = await apiFetch<EvaluationRunSummary>("/api/runs", {
        method: "POST",
        body: JSON.stringify({
          name: taskName.trim(),
          dataset_id: selectedDatasetId,
          model_name: selectedModelName,
        }),
      });
      setRuns((current) => [run, ...current]);
      setTaskName("");
      setSelectedRunIds([]);
      setIsCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建任务失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRerun = async (runId: string) => {
    try {
      const rerun = await apiFetch<EvaluationRunSummary>(`/api/runs/${runId}/rerun`, {
        method: "POST",
      });
      setRuns((current) => [rerun, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重跑任务失败。");
    }
  };

  const handleCancel = async (runId: string) => {
    try {
      await apiFetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      const refreshed = await apiFetch<EvaluationRunSummary[]>("/api/runs");
      setRuns(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消任务失败。");
    }
  };

  const handleCompareRuns = async () => {
    if (selectedRunIds.length < 2) {
      setError("请至少勾选两个运行再进行对比。");
      return;
    }

    if (selectedRunIds.length > 3) {
      setError("一次最多对比 3 个运行，便于阅读结果。");
      return;
    }

    setLoadingComparison(true);
    setError("");

    try {
      const details = await Promise.all(
        selectedRunIds.map((runId) => apiFetch<EvaluationRunDetail>(`/api/runs/${runId}`)),
      );
      setComparisonRuns(details);
      setIsCompareModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载运行对比失败。");
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleOpenRunDetail = async (runId: string) => {
    setLoadingRunDetail(true);
    setError("");
    setIsRunDetailModalOpen(true);

    try {
      const detail = await apiFetch<EvaluationRunDetail>(`/api/runs/${runId}`);
      setSelectedRunDetail(detail);
    } catch (err) {
      setSelectedRunDetail(null);
      setError(err instanceof Error ? err.message : "加载任务详情失败。");
    } finally {
      setLoadingRunDetail(false);
    }
  };

  return (
    <div className="p-8 min-h-screen relative">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">评测任务管理</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono text-sm font-medium">
              {filteredTasks.length}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm">查看任务状态、重跑记录，并对不同运行结果做横向对比。</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary-container text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <Plus size={18} />
          新建评测任务
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-error">{error}</div>}

      <section className="mb-6 p-4 bg-surface-container-low rounded-xl flex flex-wrap items-center gap-4 border border-outline-variant/15">
        <div className="flex-1 relative min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="按运行 ID、任务名称或模型搜索..."
            className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">数据集</span>
            <select
              value={datasetFilter}
              onChange={(event) => setDatasetFilter(event.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueDatasets.map((datasetName) => (
                <option key={datasetName} value={datasetName}>
                  {datasetName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>

          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">模型</span>
            <select
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueModels.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>

          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">状态</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueStatuses.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="p-2.5 bg-surface-container-lowest rounded-lg text-on-surface-variant hover:text-primary transition-colors shadow-sm hover:bg-surface-container-lowest/80"
            title="重置过滤"
          >
            <Filter size={18} />
          </button>
        </div>
      </section>

      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low/30 border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-xs font-semibold text-on-surface-variant">全选当前结果</span>
            </label>

            <div className="h-4 w-[1px] bg-outline-variant/30"></div>

            <button
              type="button"
              onClick={() => void handleCompareRuns()}
              disabled={selectedRunIds.length < 2 || loadingComparison}
              className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1.5 rounded bg-primary-fixed/20 hover:bg-primary-fixed/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingComparison ? "加载中..." : "对比运行"}
            </button>
          </div>

          <div className="flex items-center gap-2 text-on-surface-variant text-xs font-medium">
            已选 <span className="text-on-surface">{selectedRunIds.length}</span> 条，显示{" "}
            <span className="text-on-surface">{filteredTasks.length}</span> / {runs.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/10">
                <th className="pl-6 py-4 w-10"></th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">运行 ID</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">任务名称</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">模型 / 类型</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">成功率</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">评分</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">成本</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">延迟</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">状态</th>
                <th className="px-4 py-4 uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">创建时间</th>
                <th className="pr-6 py-4 text-right uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredTasks.map((task) => {
                const selected = selectedRunIds.includes(task.id);

                return (
                  <tr
                    key={task.id}
                    className={`transition-colors ${selected ? "bg-primary-fixed/10" : "hover:bg-surface-container-high/30"}`}
                  >
                    <td className="pl-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleRunSelection(task.id)}
                        className="rounded border-outline-variant text-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => void handleOpenRunDetail(task.id)}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {task.display_id}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => void handleOpenRunDetail(task.id)}
                        className="text-sm font-semibold text-on-surface hover:text-primary text-left transition-colors"
                      >
                        {task.name}
                      </button>
                      <div className="text-[10px] text-on-surface-variant">数据集: {task.dataset_name ?? "实验室运行"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface-container text-on-surface">
                          {task.model_name}
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          {task.run_kind === "benchmark" ? "benchmark" : "lab"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
                          <div
                            className={`h-full ${(task.success_rate ?? 0) < 50 ? "bg-error" : "bg-gradient-to-r from-primary to-secondary-container"}`}
                            style={{ width: `${Math.max(task.success_rate ?? 0, 5)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-on-surface">{formatPercent(task.success_rate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-lg font-semibold ${(task.total_score ?? 0) < 50 ? "text-error" : "text-secondary"}`}>
                        {task.total_score === null || task.total_score === undefined ? "-" : Math.round(task.total_score)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">{formatCurrency(task.total_cost_usd)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">{formatLatency(task.avg_latency_ms)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(task.status)}`}>
                        {statusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-on-surface-variant">{formatDate(task.created_at)}</td>
                    <td className="pr-6 py-4 text-right">
                      {task.status === "running" || task.status === "queued" ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCancel(task.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                          title="取消任务"
                        >
                          <Square size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRerun(task.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                          title="重跑任务"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleOpenRunDetail(task.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                        title="查看详情"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-on-surface-variant">
                    没有找到匹配的评测任务。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateRunModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={() => void handleCreateRun()}
        datasets={datasets}
        availableModels={availableModelOptions}
        taskName={taskName}
        selectedDatasetId={selectedDatasetId}
        selectedModelName={selectedModelName}
        setTaskName={setTaskName}
        setSelectedDatasetId={setSelectedDatasetId}
        setSelectedModelName={setSelectedModelName}
        submitting={submitting}
        agentProfile={agentProfile}
      />
      <CompareRunsModal
        open={isCompareModalOpen}
        runs={comparisonRuns}
        onClose={() => {
          setIsCompareModalOpen(false);
          setComparisonRuns([]);
        }}
      />
      <RunDetailModal
        open={isRunDetailModalOpen}
        run={selectedRunDetail}
        loading={loadingRunDetail}
        onClose={() => {
          setIsRunDetailModalOpen(false);
          setSelectedRunDetail(null);
        }}
      />
    </div>
  );
}
