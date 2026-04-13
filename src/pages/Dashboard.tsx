import { useEffect, useState } from "react";
import { Calendar, Download, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { apiFetch } from "@/api/client";
import type { DashboardOverview as DashboardOverviewData } from "@/types/api";

const failureColorMap: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  error: "bg-error",
};


function formatLatency(value: number) {
  if (!value) {
    return "0ms";
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}


function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: value < 1 ? 3 : 2,
  })}`;
}


function formatDelta(value: number, suffix = "%") {
  const absValue = Math.abs(value);
  return `${absValue.toFixed(absValue >= 10 ? 0 : 1)}${suffix}`;
}


export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch<DashboardOverviewData>("/api/dashboard/overview");
        setOverview(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载仪表盘失败。");
      }
    };

    void load();
  }, []);

  const handleExport = async () => {
    const report = await apiFetch<{ generated_at: string; overview: DashboardOverviewData }>("/api/dashboard/report");
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dashboard-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const trendData = overview?.trend ?? [];
  const recentRuns = overview?.recent_runs ?? [];
  const failureReasons = overview?.failure_reasons ?? [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">智能体评测全景图</h2>
          <p className="text-on-surface-variant text-sm mt-1">聚合展示当前账号的运行趋势、失败原因与最近记录。</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/15">
            <Calendar size={14} />
            最近 7 天
          </div>
          <button
            onClick={() => void handleExport()}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest text-primary rounded-lg text-xs font-bold border border-primary/10 hover:bg-primary-fixed/30 transition-colors"
          >
            <Download size={14} />
            导出报告
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">总运行次数</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">{overview?.total_runs ?? 0}</h3>
            <span className="text-xs font-bold text-secondary flex items-center gap-0.5">
              <TrendingUp size={12} /> {formatDelta(overview?.total_runs_delta ?? 0)}
            </span>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.min((overview?.total_runs ?? 0) * 5, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均成功率</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">{(overview?.average_success_rate ?? 0).toFixed(1)}%</h3>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${(overview?.success_rate_delta ?? 0) >= 0 ? "text-secondary" : "text-error"}`}>
              {(overview?.success_rate_delta ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatDelta(overview?.success_rate_delta ?? 0)}
            </span>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary-container" style={{ width: `${overview?.average_success_rate ?? 0}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均延迟</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">{formatLatency(overview?.average_latency_ms ?? 0)}</h3>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${(overview?.latency_delta_ms ?? 0) <= 0 ? "text-secondary" : "text-error"}`}>
              {(overview?.latency_delta_ms ?? 0) <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {formatLatency(Math.abs(overview?.latency_delta_ms ?? 0))}
            </span>
          </div>
          <div className="mt-4 flex gap-1 items-end h-6">
            {trendData.map((item) => (
              <div
                key={item.name}
                className="w-2 bg-secondary rounded-t"
                style={{ height: `${Math.max(20, Math.min((item.latency / 50), 100))}%`, opacity: 0.25 + item.latency / 2000 }}
              ></div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">累计消耗</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">{formatCurrency(overview?.total_cost_usd ?? 0)}</h3>
            <span className="text-xs font-bold text-on-surface-variant flex items-center gap-0.5">
              <Minus size={12} /> {overview?.cost_trend_label ?? "平稳"}
            </span>
          </div>
          <div className="mt-4 text-[10px] text-on-surface-variant font-medium flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-surface-container-high rounded font-bold">Gemini</span>
            <span>按当前账号所有运行累计</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-sm font-bold text-on-surface tracking-tight">成功率与延迟趋势</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">关联执行速度与输出质量。</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">成功率</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">延迟</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4648d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4648d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#464554" }} dy={10} />
                <Tooltip />
                <Area type="monotone" dataKey="success" stroke="#4648d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSuccess)" />
                <Area type="monotone" dataKey="latency" stroke="#57dffe" strokeWidth={2} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-on-surface tracking-tight mb-6">失败原因分布</h4>
          <div className="relative flex justify-center py-4">
            <div className="w-40 h-40 rounded-full border-[12px] border-surface-container-highest relative flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold tracking-tighter text-on-surface">
                  {failureReasons.reduce((sum, item) => sum + item.percent, 0)}%
                </p>
                <p className="text-[9px] uppercase font-bold text-on-surface-variant">错误率视图</p>
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {failureReasons.map((reason) => (
              <div key={reason.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${failureColorMap[reason.color] ?? "bg-primary"}`}></span>
                  <span className="text-xs text-on-surface-variant">{reason.label}</span>
                </div>
                <span className="text-xs font-bold text-on-surface">{reason.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 flex justify-between items-center">
          <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">最近运行记录</h4>
          <button className="text-xs text-primary font-bold hover:underline">查看全部</button>
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">运行名称</th>
                <th className="px-4 py-3">评测集</th>
                <th className="px-4 py-3">模型</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">得分</th>
                <th className="px-4 py-3">创建时间</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {recentRuns.map((run) => (
                <tr key={run.id} className="bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
                  <td className="px-4 py-4 rounded-l-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${run.status === "failed" ? "bg-error" : run.status === "running" ? "bg-secondary" : "bg-primary"}`}></div>
                      <span className="font-bold text-xs text-on-surface">{run.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-on-surface-variant font-medium">{run.dataset_name ?? "实验室运行"}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded font-bold uppercase">{run.model_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${run.status === "completed" ? "bg-secondary-fixed text-on-secondary-fixed-variant" : run.status === "running" ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-error-container text-on-error-container"}`}>
                      {run.status === "completed" ? "已完成" : run.status === "running" ? "运行中" : run.status === "queued" ? "排队中" : run.status === "cancelled" ? "已取消" : "失败"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className={`h-full ${run.total_score !== null && run.total_score < 50 ? "bg-error" : "bg-gradient-to-r from-primary to-secondary-container"}`} style={{ width: `${Math.max(run.total_score ?? 0, 5)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface">{Math.round(run.total_score ?? 0)}/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant rounded-r-xl">{new Date(run.created_at).toLocaleString("zh-CN")}</td>
                </tr>
              ))}
              {recentRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-center text-on-surface-variant">
                    暂无运行记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
