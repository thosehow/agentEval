import { ArrowRight, ShieldCheck, Info } from "lucide-react";
import { Link } from "react-router-dom";

export function Register() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 lg:p-12 bg-surface-container-low">
      <div className="w-full max-w-[1100px] grid md:grid-cols-12 bg-white rounded-xl overflow-hidden min-h-[700px] shadow-2xl">
        {/* Left Branding Side */}
        <div className="hidden md:flex md:col-span-5 bg-[#151b2d] p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br from-primary to-transparent"></div>
          <div className="z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">The Cognitive Architect</span>
            </div>
            <h2 className="text-3xl font-light text-white leading-tight mb-6 tracking-tight">
              精确评估 <br/>
              <span className="font-bold text-primary-fixed-dim">重塑智能基准</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-[280px]">
              Precision Architect 为全球顶尖工程团队提供自动化的 AI Agent 评估与实战演练环境。
            </p>
          </div>
          
          <div className="z-10 space-y-6">
            <div className="p-4 rounded bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="text-secondary-fixed-dim" size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">企业级安全</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-full h-full bg-secondary-fixed-dim rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Registration Form */}
        <div className="md:col-span-7 bg-white p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-[420px] mx-auto w-full">
            <header className="mb-10">
              <h1 className="text-2xl font-bold text-on-background mb-2 tracking-tight">开启您的评测之旅</h1>
              <p className="text-on-surface-variant text-sm">加入全球领先的 Harness 工程实战平台</p>
            </header>

            <form className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">企业邮箱</label>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-background placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">设置密码</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-background placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">确认密码</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-background placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                  团队邀请码 <span className="text-outline font-normal lowercase">(Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="INV-XXXX-XXXX"
                    className="flex-grow px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-background placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                  <div className="bg-surface-container text-on-surface-variant px-3 py-3 rounded-lg flex items-center justify-center">
                    <Info size={20} />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 py-2">
                <input type="checkbox" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary mt-0.5" />
                <label className="text-xs text-on-surface-variant leading-relaxed">
                  我已阅读并同意 <a href="#" className="text-primary hover:underline transition-colors">服务条款</a> 与 <a href="#" className="text-primary hover:underline transition-colors">隐私政策</a>
                </label>
              </div>

              <Link to="/" className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-lg font-bold text-sm tracking-wide shadow-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                创建账户
                <ArrowRight size={18} />
              </Link>
            </form>

            <footer className="mt-10 pt-6 border-t border-outline-variant/15 text-center">
              <p className="text-sm text-on-surface-variant">
                已有账户？ <Link to="/login" className="text-primary font-bold hover:text-primary-container transition-colors">立即登录</Link>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
