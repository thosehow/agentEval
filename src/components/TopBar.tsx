import { Search, Bell, History, X, CheckCircle2, LogOut, Settings, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleAction = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <header className="h-16 flex justify-between items-center px-8 bg-[#faf8ff] sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-8">
          <div className="relative group flex items-center">
            <Search className="absolute left-3 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  handleAction(`搜索: ${searchQuery}`);
                }
              }}
              placeholder="搜索全局评测数据..."
              className="pl-10 pr-10 py-1.5 bg-surface-container-low border-none rounded-full text-sm w-80 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 outline-none shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-0.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <nav className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => handleAction("打开模型管理")}
              className="text-[11px] font-bold uppercase tracking-widest text-[#464554] hover:text-primary transition-colors active:scale-95"
            >
              模型
            </button>
            <button 
              onClick={() => handleAction("打开评委设置")}
              className="text-[11px] font-bold uppercase tracking-widest text-[#464554] hover:text-primary transition-colors active:scale-95"
            >
              评委
            </button>
            <button 
              onClick={() => handleAction("查看部署记录")}
              className="text-[11px] font-bold uppercase tracking-widest text-[#464554] hover:text-primary transition-colors active:scale-95"
            >
              部署记录
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <button 
              onClick={() => handleAction("查看通知")}
              className="p-2 text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-full transition-colors relative active:scale-95"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-white"></span>
            </button>
            <button 
              onClick={() => handleAction("查看历史记录")}
              className="p-2 text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-full transition-colors active:scale-95"
            >
              <History size={18} />
            </button>
          </div>
          <button 
            onClick={() => navigate('/lab')}
            className="px-4 py-2 bg-surface-container-highest text-primary font-bold text-xs rounded uppercase tracking-wider hover:bg-primary hover:text-white transition-all duration-300 active:scale-95 shadow-sm"
          >
            进入实验室
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="ml-2 rounded-full hover:ring-2 hover:ring-primary/30 transition-all active:scale-95"
            >
              <img
                alt="User Avatar"
                className="w-8 h-8 rounded-full bg-primary-fixed"
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
              />
            </button>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-outline-variant/20 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-outline-variant/10 mb-1">
                    <p className="text-sm font-bold text-on-surface">Alex Chen</p>
                    <p className="text-xs text-on-surface-variant">alex@example.com</p>
                  </div>
                  <button onClick={() => { handleAction("打开个人资料"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2">
                    <User size={14} /> 个人资料
                  </button>
                  <button onClick={() => { handleAction("打开账户设置"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2">
                    <Settings size={14} /> 账户设置
                  </button>
                  <div className="h-px bg-outline-variant/10 my-1"></div>
                  <button onClick={() => { handleAction("退出登录"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2">
                    <LogOut size={14} /> 退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-surface-container-lowest border border-outline-variant/20 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 z-50">
          <CheckCircle2 className="text-primary" size={20} />
          <span className="text-sm font-medium text-on-surface">{toastMessage}</span>
        </div>
      )}
    </>
  );
}
