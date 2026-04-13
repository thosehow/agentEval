import { ArrowRight, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login({
        email,
        password,
        remember_me: rememberMe,
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-background text-on-surface">
      {/* Left Side: Deep Space Visual */}
      <section className="hidden lg:flex lg:w-1/2 relative bg-[#151b2d] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 bg-gradient-to-tr from-[#151b2d] via-transparent to-primary/20"></div>
        
        <div className="relative z-10 px-16 max-w-2xl">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">The Cognitive Architect</span>
            </div>
            <h1 className="text-5xl font-light leading-tight text-white mb-6 tracking-tight">
              极致精准，<br/>
              <span className="font-bold text-primary-fixed-dim">智联未来</span>
            </h1>
            <p className="text-surface-variant text-lg font-light max-w-md leading-relaxed">
              构建、评估并优化您的 AI Agent 性能。专为追求极致精度的架构师打造的评估平台。
            </p>
          </div>

          <div className="bg-[#2a3043]/80 backdrop-blur-xl p-6 rounded-xl border border-outline-variant/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="text-xs font-bold">AI</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Agent Status</p>
                  <p className="text-xs text-surface-variant">Precision_Architect_v4.2</p>
                </div>
              </div>
              <span className="text-[10px] bg-secondary/20 text-secondary-fixed-dim px-2 py-0.5 rounded-full border border-secondary/30">Active</span>
            </div>
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-inverse-surface rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary-container w-[94%]"></div>
              </div>
              <div className="flex justify-between text-[10px] text-surface-variant">
                <span>Confidence Level</span>
                <span className="font-mono text-secondary-fixed-dim">94.82%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 md:px-12 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-on-background mb-2">欢迎回来</h2>
            <p className="text-on-surface-variant font-normal">登录您的账户以继续</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">电子邮箱</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 bg-surface-container-lowest border-none rounded-xl ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none"
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">密码</label>
                <a href="#" className="text-xs font-medium text-primary hover:text-primary-container transition-colors">忘记密码?</a>
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-surface-container-lowest border-none rounded-xl ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-background transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary transition-all"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-on-surface-variant">记住我</label>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-bold py-3.5 rounded-xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span>{submitting ? "登录中..." : "立即登录"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-on-surface-variant">
            还没有账户? 
            <Link to="/register" className="font-bold text-primary hover:underline underline-offset-4 ml-1">立即注册</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
