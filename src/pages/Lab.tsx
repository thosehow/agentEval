import { Search, Bell, History, Settings2, Play, Database, Cloud, User, Zap, Activity, X, Plus, Globe, Shield, Code, BarChart3 } from "lucide-react";
import { useState } from "react";

export function Lab() {
  const [temperature, setTemperature] = useState(0.72);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState("你是一个精确逻辑 Agent，旨在处理财务审计中的多步推理任务...");
  const [tempPromptText, setTempPromptText] = useState(promptText);
  const [activeTab, setActiveTab] = useState<"trace" | "json" | "metrics">("trace");

  const [environments, setEnvironments] = useState([
    { id: 1, name: "Postgres Hook", icon: <Database size={18} className="text-on-surface-variant" />, active: true },
    { id: 2, name: "AWS S3 Bucket", icon: <Cloud size={18} className="text-on-surface-variant" />, active: false },
    { id: 3, name: "Auth Service", icon: <Shield size={18} className="text-on-surface-variant" />, active: true },
    { id: 4, name: "Web Search API", icon: <Globe size={18} className="text-on-surface-variant" />, active: true },
  ]);

  const toggleEnv = (id: number) => {
    setEnvironments(envs => envs.map(env => env.id === id ? { ...env, active: !env.active } : env));
  };

  const handleSavePrompt = () => {
    setPromptText(tempPromptText);
    setIsPromptModalOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative">
      {/* Left: Config Sidebar */}
      <section className="w-80 bg-surface-container-low overflow-y-auto p-6 space-y-8 border-r border-outline-variant/15">
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-semibold mb-4">模型参数</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-on-surface mb-2">主模型</label>
              <select className="w-full bg-surface-container-lowest border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer p-2 outline-none shadow-sm">
                <option>Titan-70B-Instruct-v3</option>
                <option>Aero-8B-Pro</option>
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
              <span className="text-[10px] font-mono bg-surface-container-high px-1.5 py-0.5 rounded">v0.4.12</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-4 italic">
              "{promptText}"
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
            {environments.map(env => (
              <div key={env.id} className="flex items-center justify-between p-3 bg-surface-container-highest/40 rounded-lg border border-outline-variant/5">
                <div className="flex items-center gap-3">
                  {env.icon}
                  <span className="text-xs font-medium">{env.name}</span>
                </div>
                <button 
                  onClick={() => toggleEnv(env.id)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${env.active ? 'bg-primary/20' : 'bg-outline-variant/30'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${env.active ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`}></div>
                </button>
              </div>
            ))}
            <button className="w-full py-2.5 border border-dashed border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 active:scale-95">
              <Plus size={14} />
              添加新集成
            </button>
          </div>
        </div>
      </section>

      {/* Center: Interaction */}
      <section className="flex-1 flex flex-col bg-surface overflow-hidden p-8 gap-6">
        <div className="flex-1 flex flex-col bg-surface-container-low rounded-2xl p-6 relative border border-outline-variant/15 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
            <User size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">用户请求</span>
          </div>
          <textarea 
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-lg font-medium placeholder:text-on-surface-variant/30 leading-relaxed outline-none"
            placeholder="描述 Agent 需要完成的任务或问题..."
          ></textarea>
          <div className="absolute bottom-6 right-6">
            <button className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-xl flex items-center gap-3 shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 hover:opacity-90 transition-all active:scale-95">
              <span className="font-bold tracking-tight">执行评估</span>
              <Zap size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Right: Results & Logs */}
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
                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-secondary/10">
                  <p className="text-sm leading-relaxed text-on-surface font-medium italic">
                    "分析完成。根据 2023 年第 3 季度的账目，我在供应商采购日志中发现了 4 处不一致，总计 14,200 美元。"
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-on-surface-variant" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">思考路径</span>
                  </div>
                  <span className="text-[9px] font-mono text-on-surface-variant/50">最新步骤: 14</span>
                </div>
                <div className="space-y-4 font-mono text-[11px]">
                  <div className="bg-surface-container-low p-4 rounded-lg border-l-4 border-primary/40">
                    <div className="flex justify-between mb-2">
                      <span className="text-primary font-bold">思考 (THOUGHT)</span>
                      <span className="text-on-surface-variant/40">0ms</span>
                    </div>
                    <p className="text-on-surface-variant">正在初始化到 'procurement_db' 的数据库连接...</p>
                  </div>
                  <div className="bg-surface-container-high p-4 rounded-lg border-l-4 border-secondary/40">
                    <div className="flex justify-between mb-2">
                      <span className="text-secondary font-bold">操作 (ACTION)</span>
                      <span className="text-on-surface-variant/40">+142ms</span>
                    </div>
                    <p className="text-on-surface-variant">SQL查询: SELECT * FROM ledgers WHERE status='flagged'</p>
                  </div>
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
{`{
  "id": "run_8f9a2b1c",
  "object": "agent.run",
  "created": 1712948201,
  "model": "Titan-70B-Instruct-v3",
  "status": "completed",
  "usage": {
    "prompt_tokens": 452,
    "completion_tokens": 128,
    "total_tokens": 580
  },
  "steps": [
    {
      "type": "thought",
      "content": "正在初始化到 'procurement_db' 的数据库连接..."
    },
    {
      "type": "action",
      "tool": "sql_query",
      "input": "SELECT * FROM ledgers WHERE status='flagged'"
    }
  ],
  "output": "分析完成。根据 2023 年第 3 季度的账目，我在供应商采购日志中发现了 4 处不一致，总计 14,200 美元。"
}`}
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
                  <div className="text-xl font-mono font-bold text-on-surface">1,452<span className="text-sm text-on-surface-variant font-medium ml-1">ms</span></div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">首字延迟 (TTFT)</div>
                  <div className="text-xl font-mono font-bold text-on-surface">340<span className="text-sm text-on-surface-variant font-medium ml-1">ms</span></div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">总 Token 数</div>
                  <div className="text-xl font-mono font-bold text-on-surface">580</div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">预估成本</div>
                  <div className="text-xl font-mono font-bold text-on-surface">$0.014</div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">工具调用分布</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-on-surface">sql_query</span>
                      <span className="font-mono text-on-surface-variant">3 次</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[60%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-on-surface">web_search</span>
                      <span className="font-mono text-on-surface-variant">2 次</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary w-[40%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Prompt Edit Modal */}
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
                onClick={handleSavePrompt}
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
