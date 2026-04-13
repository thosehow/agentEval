import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Database,
  FlaskConical,
  Settings,
  Plus,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  X,
  Play,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, label: "控制面板", path: "/" },
  { icon: Activity, label: "运行记录", path: "/tasks" },
  { icon: Database, label: "数据集", path: "/datasets" },
  { icon: FlaskConical, label: "实验室", path: "/lab" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleAction = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleNewRun = () => {
    setIsNewRunModalOpen(false);
    navigate('/lab');
    handleAction("已创建新运行并进入实验室");
  };

  const handleLogout = async () => {
    await logout();
    setShowProfileMenu(false);
    navigate("/login");
  };

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen z-50 flex flex-col w-64 bg-sidebar shadow-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-secondary-container flex items-center justify-center text-white">
            <FlaskConical size={18} />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight leading-none text-lg">
              Precision Architect
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">
              企业级评估平台
            </p>
          </div>
        </div>

        <nav className="mt-4 flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95",
                  isActive
                    ? "bg-indigo-600/20 text-white border-r-2 border-[#57dffe]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => handleAction("打开设置面板")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-95"
          >
            <Settings size={20} />
            设置
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={() => setIsNewRunModalOpen(true)}
            className="w-full bg-primary-container text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary-container/20"
          >
            <Plus size={16} />
            新建运行
          </button>

          <div className="mt-6 space-y-1">
            <button 
              onClick={() => handleAction("打开文档中心")}
              className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white transition-colors text-sm rounded-lg hover:bg-slate-800/50 active:scale-95"
            >
              <BookOpen size={18} />
              文档
            </button>
            <button 
              onClick={() => handleAction("打开帮助与支持")}
              className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white transition-colors text-sm rounded-lg hover:bg-slate-800/50 active:scale-95"
            >
              <HelpCircle size={18} />
              帮助
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between px-2 relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-slate-800/50 p-2 -ml-2 rounded-lg transition-colors text-left w-full active:scale-95"
            >
              <img
                alt="User"
                className="w-8 h-8 rounded-full bg-slate-700"
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.full_name ?? "User")}`}
              />
              <div className="overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">{user?.full_name ?? "用户"}</p>
                <p className="text-slate-500 text-[10px] truncate">{user?.team_name ?? "评测平台成员"}</p>
              </div>
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                  <button onClick={() => { handleAction("打开个人资料"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                    <User size={14} /> 个人资料
                  </button>
                  <button onClick={() => { handleAction("打开账户设置"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                    <Settings size={14} /> 账户设置
                  </button>
                  <div className="h-px bg-slate-700 my-1"></div>
                  <button onClick={() => { void handleLogout(); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2">
                    <LogOut size={14} /> 退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Global Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-surface-container-lowest border border-outline-variant/20 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 z-[100]">
          <CheckCircle2 className="text-primary" size={20} />
          <span className="text-sm font-medium text-on-surface">{toastMessage}</span>
        </div>
      )}

      {/* New Run Modal */}
      {isNewRunModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/15 flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface">新建评估运行</h3>
              <button 
                onClick={() => setIsNewRunModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-2">运行名称</label>
                <input 
                  type="text" 
                  placeholder="例如: 财务审计模型对比 v2"
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface mb-2">选择数据集</label>
                <select className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
                  <option>财务异常检测集 (v1.2)</option>
                  <option>通用逻辑推理集 (v3.0)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-3">
              <button 
                onClick={() => setIsNewRunModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleNewRun}
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
              >
                <Play size={14} />
                开始运行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
