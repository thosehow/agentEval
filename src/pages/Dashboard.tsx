import { Calendar, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "周一", success: 80, latency: 40 },
  { name: "周二", success: 90, latency: 50 },
  { name: "周三", success: 85, latency: 60 },
  { name: "周四", success: 75, latency: 45 },
  { name: "周五", success: 95, latency: 70 },
  { name: "周六", success: 80, latency: 55 },
  { name: "周日", success: 85, latency: 40 },
];

export function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">智能体评测全景图</h2>
          <p className="text-on-surface-variant text-sm mt-1">12个活跃智能体集群的实时性能监控。</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/15">
            <Calendar size={14} />
            最近 30 天
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest text-primary rounded-lg text-xs font-bold border border-primary/10 hover:bg-primary-fixed/30 transition-colors">
            <Download size={14} />
            导出报告
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">总运行次数</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">2,842</h3>
            <span className="text-xs font-bold text-secondary flex items-center gap-0.5">
              <TrendingUp size={12} /> 12%
            </span>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3"></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均成功率</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">94.2%</h3>
            <span className="text-xs font-bold text-error flex items-center gap-0.5">
              <TrendingDown size={12} /> 1.4%
            </span>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary-container w-[94.2%]"></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">平均延迟</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">1.2s</h3>
            <span className="text-xs font-bold text-secondary flex items-center gap-0.5">
              <TrendingDown size={12} /> 240ms
            </span>
          </div>
          <div className="mt-4 flex gap-1 items-end h-6">
            <div className="w-2 h-2 bg-secondary/20 rounded-t"></div>
            <div className="w-2 h-4 bg-secondary/40 rounded-t"></div>
            <div className="w-2 h-3 bg-secondary/30 rounded-t"></div>
            <div className="w-2 h-5 bg-secondary/60 rounded-t"></div>
            <div className="w-2 h-6 bg-secondary rounded-t"></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">累计消耗</p>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-semibold tracking-tight text-on-surface">$14,208</h3>
            <span className="text-xs font-bold text-on-surface-variant flex items-center gap-0.5">
              <Minus size={12} /> 平稳
            </span>
          </div>
          <div className="mt-4 text-[10px] text-on-surface-variant font-medium flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-surface-container-high rounded font-bold">GPT-4-Turbo</span>
            <span>$4.20/千次运行</span>
          </div>
        </div>
      </div>

      {/* Charts */}
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
              <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4648d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4648d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#464554' }} dy={10} />
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
              <div className="absolute inset-0 rounded-full border-[12px] border-primary" style={{ clipPath: "polygon(50% 50%, 50% 0, 100% 0, 100% 60%, 50% 50%)" }}></div>
              <div className="absolute inset-0 rounded-full border-[12px] border-secondary" style={{ clipPath: "polygon(50% 50%, 0 100%, 0 60%, 50% 50%)" }}></div>
              <div className="text-center">
                <p className="text-2xl font-bold tracking-tighter text-on-surface">5.8%</p>
                <p className="text-[9px] uppercase font-bold text-on-surface-variant">错误率</p>
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-xs text-on-surface-variant">工具调用错误</span>
              </div>
              <span className="text-xs font-bold text-on-surface">42%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="text-xs text-on-surface-variant">幻觉问题</span>
              </div>
              <span className="text-xs font-bold text-on-surface">28%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="text-xs text-on-surface-variant">格式错误</span>
              </div>
              <span className="text-xs font-bold text-on-surface">15%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error"></span>
                <span className="text-xs text-on-surface-variant">请求超时</span>
              </div>
              <span className="text-xs font-bold text-on-surface">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
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
              <tr className="bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
                <td className="px-4 py-4 rounded-l-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#4648d4]"></div>
                    <span className="font-bold text-xs text-on-surface">Eval_Alpha_01</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-on-surface-variant font-medium">Customer_Care_V2</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded font-bold uppercase">Claude-3.5-Sonnet</span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold rounded-full">已完成</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-secondary-container w-[92%]"></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface">92/100</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant rounded-r-xl">2023-11-24 14:22</td>
              </tr>
              <tr className="bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
                <td className="px-4 py-4 rounded-l-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#00687a]"></div>
                    <span className="font-bold text-xs text-on-surface">Stress_Test_88</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-on-surface-variant font-medium">Edge_Cases_Hard</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded font-bold uppercase">GPT-4-Turbo</span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold rounded-full">运行中</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[45%]"></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface">45/100</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant rounded-r-xl">2023-11-24 13:58</td>
              </tr>
              <tr className="bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
                <td className="px-4 py-4 rounded-l-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_#ba1a1a]"></div>
                    <span className="font-bold text-xs text-on-surface">Validation_Logistics</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-on-surface-variant font-medium">Global_Supply_QA</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded font-bold uppercase">Mistral-Large</span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full">失败</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-error w-[12%]"></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface">12/100</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant rounded-r-xl">2023-11-24 12:15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
