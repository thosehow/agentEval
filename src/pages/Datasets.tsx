import { useEffect, useMemo, useState } from "react";
import { Filter, Upload, Plus, Search, MoreVertical, X, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import type { DatasetDetail, DatasetSummary } from "@/types/api";


const taskTypeClassMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary-fixed/30", text: "text-primary" },
  secondary: { bg: "bg-secondary-fixed/30", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-fixed/30", text: "text-tertiary" },
};

export function Datasets() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState("");
  const [activeDataset, setActiveDataset] = useState<DatasetDetail | null>(null);
  const [caseQuery, setCaseQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [criterionType, setCriterionType] = useState<"accuracy_threshold" | "strict_json_match" | "retry_protocol_check">("accuracy_threshold");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [tags, setTags] = useState("逻辑推理");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const data = await apiFetch<DatasetSummary[]>("/api/datasets");
        setDatasets(data);
        setActiveDatasetId((current) => current || data[0]?.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载评测集失败。");
      }
    };
    void loadDatasets();
  }, []);

  useEffect(() => {
    if (!activeDatasetId) {
      return;
    }

    const loadDatasetDetail = async () => {
      try {
        const detail = await apiFetch<DatasetDetail>(`/api/datasets/${activeDatasetId}`);
        setActiveDataset(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载评测集详情失败。");
      }
    };

    void loadDatasetDetail();
  }, [activeDatasetId]);

  const filteredCases = useMemo(() => {
    const cases = activeDataset?.cases ?? [];
    if (!caseQuery) {
      return cases;
    }
    const query = caseQuery.toLowerCase();
    return cases.filter((item) => {
      return (
        item.display_id.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query) ||
        item.expected_behavior.toLowerCase().includes(query)
      );
    });
  }, [activeDataset?.cases, caseQuery]);

  const handleExport = async () => {
    if (!activeDatasetId) {
      return;
    }
    setIsExporting(true);
    try {
      const dataset = await apiFetch<DatasetDetail>(`/api/datasets/${activeDatasetId}/export`);
      const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeDatasetId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShowExportSuccess(true);
      window.setTimeout(() => setShowExportSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateCase = async () => {
    if (!activeDatasetId) {
      return;
    }
    try {
      await apiFetch(`/api/datasets/${activeDatasetId}/cases`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          expected_behavior: expectedBehavior,
          criterion_type: criterionType,
          difficulty,
          tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const detail = await apiFetch<DatasetDetail>(`/api/datasets/${activeDatasetId}`);
      setActiveDataset(detail);
      setIsAddModalOpen(false);
      setPrompt("");
      setExpectedBehavior("");
      setTags("逻辑推理");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存用例失败。");
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] relative">
      <aside className="w-80 bg-surface-container-low flex flex-col border-r border-outline-variant/15">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">评测集管理</h2>
          <Filter className="text-on-surface-variant cursor-pointer" size={18} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {datasets.map((dataset) => {
            const isActive = dataset.id === activeDatasetId;
            return (
              <div
                key={dataset.id}
                onClick={() => setActiveDatasetId(dataset.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-surface-container-lowest border-l-4 border-primary shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container-high border border-transparent hover:border-outline-variant/20"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-on-surface text-sm">{dataset.name}</span>
                  {isActive && (
                    <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed-variant px-1.5 py-0.5 rounded font-bold uppercase">激活</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mb-3">{dataset.count} 个用例</p>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-surface-container-highest text-on-surface px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto bg-surface flex flex-col">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">{activeDataset?.name ?? "加载中..."}</h2>
            </div>
            <p className="text-on-surface-variant text-sm max-w-2xl">{activeDataset?.description ?? "正在加载评测集详情..."}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void handleExport()}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary border border-primary/20 hover:bg-primary-fixed/50 hover:shadow-sm active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isExporting ? "导出中..." : "导出 JSON"}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-primary to-primary-container text-white shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> 添加用例
            </button>
          </div>
        </div>

        {error && <div className="px-8 pt-4 text-sm text-error">{error}</div>}

        <div className="p-8 grid grid-cols-12 gap-6">
          <div className="col-span-7 p-6 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">难度分布</h3>
              <span className="text-xs text-on-surface-variant font-mono">共 {activeDataset?.count ?? 0} 个</span>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1.5 items-end">
                  <span className="text-sm font-medium text-on-surface">易</span>
                  <span className="text-xs font-mono text-on-surface-variant">{activeDataset?.difficulty.easy ?? 0}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-container transition-all duration-500" style={{ width: `${activeDataset?.difficulty.easy ?? 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5 items-end">
                  <span className="text-sm font-medium text-on-surface">中</span>
                  <span className="text-xs font-mono text-on-surface-variant">{activeDataset?.difficulty.medium ?? 0}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${activeDataset?.difficulty.medium ?? 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5 items-end">
                  <span className="text-sm font-medium text-on-surface">难</span>
                  <span className="text-xs font-mono text-on-surface-variant">{activeDataset?.difficulty.hard ?? 0}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary transition-all duration-500" style={{ width: `${activeDataset?.difficulty.hard ?? 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-5 p-6 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">任务类型占比</h3>
            <div className="space-y-4">
              {(activeDataset?.task_types ?? []).map((type) => {
                const classNames = taskTypeClassMap[type.color] ?? taskTypeClassMap.primary;
                return (
                  <div key={type.name} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${classNames.bg} flex items-center justify-center ${classNames.text}`}>
                      <span className="font-bold text-xs">{type.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">{type.name}</p>
                      <p className="text-xs text-on-surface-variant">{type.count} 个用例</p>
                    </div>
                    <div className={`text-sm font-mono font-bold ${classNames.text}`}>{type.percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-8 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">测试用例</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input
                type="text"
                value={caseQuery}
                onChange={(event) => setCaseQuery(event.target.value)}
                placeholder="过滤用例..."
                className="pl-8 pr-4 py-1.5 bg-surface-container-low border-none rounded-lg text-xs w-48 focus:ring-1 focus:ring-primary/40 outline-none"
              />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant">ID 与 输入提示词</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant">预期行为</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant">评分准则与标签</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredCases.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-mono text-[10px] text-primary mb-1">{item.display_id}</div>
                      <p className="text-xs text-on-surface line-clamp-2 leading-relaxed">"{item.prompt}"</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-on-surface leading-relaxed italic">"{item.expected_behavior}"</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-secondary"></div>
                          <span className="text-[10px] text-on-surface-variant">{item.criterion_type}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {item.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-surface-container rounded text-[9px] font-bold">{tag}</span>
                          ))}
                          <span className="px-1.5 py-0.5 bg-surface-container rounded text-[9px] font-bold">{item.difficulty}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-on-surface-variant hover:text-primary transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-sm text-center text-on-surface-variant">
                      没有匹配的测试用例
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showExportSuccess && (
        <div className="absolute top-6 right-1/2 translate-x-1/2 bg-surface-container-lowest border border-outline-variant/20 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 z-50">
          <CheckCircle2 className="text-secondary" size={20} />
          <span className="text-sm font-medium text-on-surface">JSON 导出成功</span>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface">添加新用例</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">输入提示词</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="输入测试 Agent 的提示词..."
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">预期行为</label>
                <textarea
                  rows={2}
                  value={expectedBehavior}
                  onChange={(event) => setExpectedBehavior(event.target.value)}
                  placeholder="描述 Agent 应该如何响应..."
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">评分准则</label>
                  <select
                    value={criterionType}
                    onChange={(event) => setCriterionType(event.target.value as typeof criterionType)}
                    className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="accuracy_threshold">accuracy_threshold</option>
                    <option value="strict_json_match">strict_json_match</option>
                    <option value="retry_protocol_check">retry_protocol_check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">难度</label>
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
                    className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="easy">易</option>
                    <option value="medium">中</option>
                    <option value="hard">难</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">标签</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="多个标签请用逗号分隔"
                  className="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreateCase()}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                保存用例
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
