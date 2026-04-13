import { useEffect, useMemo, useState } from "react";
import { Database, Cloud, User, Zap, Activity, X, Plus, Globe, Shield, Code, BarChart3 } from "lucide-react";
import { apiFetch } from "@/api/client";
import type { AgentProfile, EvaluationRunDetail, EvaluationRunSummary } from "@/types/api";


const modelOptions = ["gemini-2.5-flash", "gemini-2.5-pro"];

const toolDefinitions = [
  { id: "postgres_hook", name: "Postgres Hook", icon: Database },
  { id: "aws_s3_bucket", name: "AWS S3 Bucket", icon: Cloud },
  { id: "auth_service", name: "Auth Service", icon: Shield },
  { id: "web_search_api", name: "Web Search API", icon: Globe },
] as const;


function formatLatency(value: number | null) {
  if (!value) {
    return "0ms";
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}


export function Lab() {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [temperature, setTemperature] = useState(0.72);
  const [modelName, setModelName] = useState("gemini-2.5-flash");
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [tempPromptText, setTempPromptText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"trace" | "json" | "metrics">("trace");
  const [environments, setEnvironments] = useState<Record<string, boolean>>({});
  const [currentRun, setCurrentRun] = useState<EvaluationRunDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const activeProfile = await apiFetch<AgentProfile>("/api/agent/profile/active");
        setProfile(activeProfile);
        setTemperature(activeProfile.temperature);
        setModelName(activeProfile.model_name);
        setPromptText(activeProfile.system_prompt);
        setTempPromptText(activeProfile.system_prompt);
        setEnvironments(activeProfile.enabled_tools);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载实验室配置失败。");
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!currentRun || (currentRun.status !== "running" && currentRun.status !== "queued")) {
      return;
    }
    const timer = window.setInterval(() => {
      void apiFetch<EvaluationRunDetail>(`/api/lab/runs/${currentRun.id}`)
        .then(setCurrentRun)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [currentRun]);

  const toolCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (currentRun?.steps ?? [])
      .filter((step) => step.step_type === "action" && step.tool_name)
      .forEach((step) => {
        const key = step.tool_name as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    return Array.from(counts.entries());
  }, [currentRun?.steps]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const nextProfile = await apiFetch<AgentProfile>("/api/agent/profile/active", {
        method: "PUT",
        body: JSON.stringify({
          model_name: modelName,
          temperature,
          system_prompt: promptText,
          enabled_tools: environments,
        }),
      });
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrompt = async () => {
    setPromptText(tempPromptText);
    setIsPromptModalOpen(false);
    try {
      await apiFetch<AgentProfile>("/api/agent/profile/active", {
        method: "PUT",
        body: JSON.stringify({
          model_name: modelName,
          temperature,
          system_prompt: tempPromptText,
          enabled_tools: environments,
        }),
      }).then(setProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存系统提示词失败。");
    }
  };

  const toggleEnv = (id: string) => {
    setEnvironments((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const handleExecute = async () => {
    if (!userPrompt.trim()) {
      setError("请输入要执行的实验请求。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await saveProfile();
      const createdRun = await apiFetch<EvaluationRunSummary>("/api/lab/runs", {
        method: "POST",
        body: JSON.stringify({
          name: `Lab_${new Date().toISOString().slice(0, 19)}`,
          user_prompt: userPrompt,
          model_name: modelName,
          temperature,
          system_prompt: promptText,
          enabled_tools: environments,
        }),
      });
      const run = await apiFetch<EvaluationRunDetail>(`/api/lab/runs/${createdRun.id}`);
      setCurrentRun(run);
      setActiveTab("trace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "执行评估失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative">
      <section className="w-80 bg-surface-container-low overflow-y-auto p-6 space-y-8 border-r border-outline-variant/15">
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-semibold mb-4">模型参数</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-on-surface mb-2">主模型</label>
              <select
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
                className="w-full bg-surface-container-lowest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer p-2 outline-none shadow-sm"
              >
                {modelOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-on-surface">温度</label>
                <span className="text-[10px] font-mono text-primary font-bold">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-semibold mb-4">系统提示词</h3>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-on-surface-variant">版本</span>
              <span className="text-[10px] font-mono bg-surface-container-high px-1.5 py-0.5 rounded">{profile?.version ?? "v0.0.0"}</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-4 italic">
              "{promptText || "尚未加载系统提示词"}"
            </p>
            <button
              onClick={() => {
                setTempPromptText(promptText);
                setIsPromptModalOpen(true);
              }}
              className="w-full mt-4 py-2 border border-outline-variant/30 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors active:scale-95"
            >
              编辑提示词
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-semibold">测试环境</h3>
          </div>
          <div className="space-y-3">
            {toolDefinitions.map((env) => {
              const Icon = env.icon;
              return (
                <div key={env.id} className="flex items-center justify-between p-3 bg-surface-container-highest/40 rounded-lg border border-outline-variant/5">
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-on-surface-variant" />
                    <span className="text-xs font-medium">{env.name}</span>
                  </div>
                  <button
                    onClick={() => toggleEnv(env.id)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${environments[env.id] ? "bg-primary/20" : "bg-outline-variant/30"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${environments[env.id] ? "right-0.5 bg-primary" : "left-0.5 bg-on-surface-variant/50"}`}></div>
                  </button>
                </div>
              );
            })}
            <button className="w-full py-2.5 border border-dashed border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 active:scale-95">
              <Plus size={14} />
              添加新集成
            </button>
          </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col bg-surface overflow-hidden p-8 gap-6">
        {error && <div className="text-sm text-error">{error}</div>}
        <div className="flex-1 flex flex-col bg-surface-container-low rounded-2xl p-6 relative border border-outline-variant/15 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
            <User size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">用户请求</span>
          </div>
          <textarea
            value={userPrompt}
            onChange={(event) => setUserPrompt(event.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-lg font-medium placeholder:text-on-surface-variant/30 leading-relaxed outline-none"
            placeholder="描述 Agent 需要完成的任务或问题..."
          ></textarea>
          <div className="absolute bottom-6 right-6">
            <button
              onClick={() => void handleExecute()}
              disabled={submitting || savingProfile}
              className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-xl flex items-center gap-3 shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
            >
              <span className="font-bold tracking-tight">{submitting ? "执行中..." : "执行评估"}</span>
              <Zap size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="w-[480px] bg-surface-container-highest/20 border-l border-outline-variant/10 flex flex-col overflow-hidden">
        <div className="flex border-b border-outline-variant/10 shrink-0">
          <button
            onClick={() => setActiveTab("trace")}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "trace" ? "border-b-2 border-primary text-on-surface" : "text-on-surface-variant/60 hover:text-on-surface"}`}
          >
            Agent 轨迹
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "json" ? "border-b-2 border-primary text-on-surface" : "text-on-surface-variant/60 hover:text-on-surface"}`}
          >
            原始 JSON
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "metrics" ? "border-b-2 border-primary text-on-surface" : "text-on-surface-variant/60 hover:text-on-surface"}`}
          >
            指标
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "trace" && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">最终输出</span>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-secondary/10 min-h-24">
                  <p className="text-sm leading-relaxed text-on-surface font-medium italic">
                    "{currentRun?.final_output || "尚未执行实验。"}"
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-on-surface-variant" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">思考路径</span>
                  </div>
                  <span className="text-[9px] font-mono text-on-surface-variant/50">最新步骤 {currentRun?.steps.length ?? 0}</span>
                </div>
                <div className="space-y-4 font-mono text-[11px]">
                  {(currentRun?.steps ?? []).map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        step.step_type === "action"
                          ? "bg-surface-container-high border-secondary/40"
                          : step.step_type === "tool_result"
                            ? "bg-surface-container-lowest border-tertiary/40"
                            : step.step_type === "error"
                              ? "bg-error-container border-error/40"
                              : "bg-surface-container-low border-primary/40"
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className={`font-bold ${
                          step.step_type === "action"
                            ? "text-secondary"
                            : step.step_type === "tool_result"
                              ? "text-tertiary"
                              : step.step_type === "error"
                                ? "text-error"
                                : "text-primary"
                        }`}>
                          {step.title ?? step.step_type.toUpperCase()}
                        </span>
                        <span className="text-on-surface-variant/40">{step.latency_ms ? `+${step.latency_ms}ms` : ""}</span>
                      </div>
                      <p className="text-on-surface-variant whitespace-pre-wrap break-words">{step.content}</p>
                    </div>
                  ))}
                  {!currentRun?.steps.length && (
                    <div className="text-sm text-on-surface-variant">执行一次实验后，这里会展示真实的 Agent 轨迹。</div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "json" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Code size={14} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">API 响应</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/10 overflow-x-auto">
                <pre className="text-[11px] font-mono text-on-surface-variant leading-relaxed">
                  {JSON.stringify(currentRun?.raw_response ?? { message: "暂无运行原始数据" }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "metrics" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">性能指标</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">总延迟</div>
                  <div className="text-xl font-mono font-bold text-on-surface">{formatLatency(currentRun?.avg_latency_ms ?? 0)}</div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">当前状态</div>
                  <div className="text-xl font-mono font-bold text-on-surface">{currentRun?.status ?? "idle"}</div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">总 Token 数</div>
                  <div className="text-xl font-mono font-bold text-on-surface">{currentRun?.total_tokens ?? 0}</div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">预估成本</div>
                  <div className="text-xl font-mono font-bold text-on-surface">${(currentRun?.total_cost_usd ?? 0).toFixed(4)}</div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">工具调用分布</div>
                <div className="space-y-3">
                  {toolCounts.map(([toolName, count]) => (
                    <div key={toolName}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-on-surface">{toolName}</span>
                        <span className="font-mono text-on-surface-variant">{count} 次</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(count * 25, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {toolCounts.length === 0 && <div className="text-sm text-on-surface-variant">暂无工具调用。</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface">编辑系统提示词</h3>
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                rows={10}
                value={tempPromptText}
                onChange={(e) => setTempPromptText(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none font-mono leading-relaxed"
              />
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-3">
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleSavePrompt()}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
