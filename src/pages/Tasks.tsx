import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, RefreshCw, MoreVertical, Square, ChevronDown, X } from "lucide-react";
import { apiFetch } from "@/api/client";
import type { AgentProfile, DatasetSummary, EvaluationRunSummary } from "@/types/api";


function formatCurrency(value: number) {
  return `$${value.toFixed(value < 1 ? 3 : 2)}`;
}


function formatLatency(value: number | null) {
  if (!value) {
    return "-";
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
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


export function Tasks() {
  const [runs, setRuns] = useState<EvaluationRunSummary[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("所有数据集");
  const [modelFilter, setModelFilter] = useState("所有模型");
  const [statusFilter, setStatusFilter] = useState("所有状态");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [runsData, datasetsData, profileData] = await Promise.all([
          apiFetch<EvaluationRunSummary[]>("/api/runs"),
          apiFetch<DatasetSummary[]>("/api/datasets"),
          apiFetch<AgentProfile>("/api/agent/profile/active"),
        ]);
        setRuns(runsData);
        setDatasets(datasetsData);
        setAgentProfile(profileData);
        setSelectedDatasetId((current) => current || datasetsData[0]?.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载任务失败。");
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void apiFetch<EvaluationRunSummary[]>("/api/runs").then(setRuns).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    return runs.filter((task) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.name.toLowerCase().includes(query) ||
        task.display_id.toLowerCase().includes(query) ||
        task.model_name.toLowerCase().includes(query);
      const matchesDataset = datasetFilter === "所有数据集" || task.dataset_name === datasetFilter;
      const matchesModel = modelFilter === "所有模型" || task.model_name === modelFilter;
      const matchesStatus = statusFilter === "所有状态" || statusLabel(task.status) === statusFilter;
      return matchesSearch && matchesDataset && matchesModel && matchesStatus;
    });
  }, [datasetFilter, modelFilter, runs, searchQuery, statusFilter]);

  const uniqueDatasets = ["所有数据集", ...Array.from(new Set(runs.map((item) => item.dataset_name).filter(Boolean)))];
  const uniqueModels = ["所有模型", ...Array.from(new Set(runs.map((item) => item.model_name)))];
  const uniqueStatuses = ["所有状态", "已完成", "运行中", "排队中", "失败", "已取消"];

  const handleCreateRun = async () => {
    if (!taskName || !selectedDatasetId) {
      setError("请填写任务名称并选择数据集。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const run = await apiFetch<EvaluationRunSummary>("/api/runs", {
        method: "POST",
        body: JSON.stringify({
          name: taskName,
          dataset_id: selectedDatasetId,
        }),
      });
      setRuns((current) => [run, ...current]);
      setTaskName("");
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建任务失败。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRerun = async (runId: string) => {
    const rerun = await apiFetch<EvaluationRunSummary>(`/api/runs/${runId}/rerun`, {
      method: "POST",
    });
    setRuns((current) => [rerun, ...current]);
  };

  const handleCancel = async (runId: string) => {
    await apiFetch(`/api/runs/${runId}/cancel`, { method: "POST" });
    const refreshed = await apiFetch<EvaluationRunSummary[]>("/api/runs");
    setRuns(refreshed);
  };

  return (
    <div className="p-8 min-h-screen relative">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">评测任务管理</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono text-sm font-medium">{filteredTasks.length}</span>
          </div>
          <p className="text-on-surface-variant text-sm">监控和基准测试自主 Agent 在验证集上的表现。</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="按运行ID、任务名称或模型搜索..."
            className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">数据集</span>
            <select
              value={datasetFilter}
              onChange={(e) => setDatasetFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueDatasets.map((datasetName) => <option key={datasetName} value={datasetName}>{datasetName}</option>)}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>
          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">模型</span>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>
          <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2 relative shadow-sm hover:bg-surface-container-lowest/80 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mr-2">状态</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold p-0 pr-5 focus:ring-0 cursor-pointer outline-none appearance-none"
            >
              {uniqueStatuses.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
            </select>
            <ChevronDown size={14} className="text-on-surface-variant absolute right-2 pointer-events-none" />
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setDatasetFilter("所有数据集");
              setModelFilter("所有模型");
              setStatusFilter("所有状态");
            }}
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
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
              <span className="text-xs font-semibold text-on-surface-variant">全选</span>
            </div>
            <div className="h-4 w-[1px] bg-outline-variant/30"></div>
            <button className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1.5 rounded bg-primary-fixed/20 hover:bg-primary-fixed/40 transition-colors">
              对比运行
            </button>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant text-xs font-medium">
            显示 <span className="text-on-surface">1-{filteredTasks.length}</span> / {runs.length}
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
                <th className="pr-6 py-4 text-right uppercase tracking-widest text-[10px] text-on-surface-variant font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="pl-6 py-4"><input type="checkbox" className="rounded border-outline-variant" /></td>
                  <td className="px-4 py-4"><span className="font-mono text-xs font-medium text-primary">{task.display_id}</span></td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-on-surface">{task.name}</div>
                    <div className="text-[10px] text-on-surface-variant">数据集: {task.dataset_name ?? "实验室运行"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface-container text-on-surface">{task.model_name}</span>
                      <span className="text-[10px] font-mono text-on-surface-variant">{task.run_kind === "benchmark" ? "benchmark" : "lab"}</span>
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
                      <span className="text-xs font-bold text-on-surface">{(task.success_rate ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-lg font-semibold ${(task.total_score ?? 0) < 50 ? "text-error" : "text-secondary"}`}>{Math.round(task.total_score ?? 0)}</span>
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">{formatCurrency(task.total_cost_usd)}</td>
                  <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">{formatLatency(task.avg_latency_ms)}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      task.status === "completed"
                        ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                        : task.status === "running" || task.status === "queued"
                          ? "bg-primary-fixed/50 text-on-primary-fixed-variant"
                          : "bg-error-container text-on-error-container"
                    }`}>
                      {statusLabel(task.status)}
                    </span>
                  </td>
                  <td className="pr-6 py-4 text-right">
                    {task.status === "running" || task.status === "queued" ? (
                      <button
                        onClick={() => void handleCancel(task.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                      >
                        <Square size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleRerun(task.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"><MoreVertical size={14} /></button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-on-surface-variant">
                    没有找到匹配的评测任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface">新建评测任务</h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  placeholder="例如：Q4 财务报告生成评测"
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
                  {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">当前模型</label>
                <select
                  value={agentProfile?.model_name ?? ""}
                  disabled
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option>{agentProfile?.model_name ?? "未加载"}</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreateRun()}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-70"
              >
                {submitting ? "创建中..." : "创建任务"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
