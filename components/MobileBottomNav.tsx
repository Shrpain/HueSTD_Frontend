import React from 'react';
import { Home, FileText, ShieldCheck, User as UserIcon, LogIn } from 'lucide-react';
import { AppTab } from '../types';

interface MobileBottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isLoggedIn: boolean;
  onShowAuth: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  isLoggedIn,
  onShowAuth,
}) => {
  const items = [
    { id: AppTab.DASHBOARD, label: 'Tổng quan', icon: Home },
    { id: AppTab.DOCUMENTS, label: 'Tài liệu', icon: FileText },
    { id: AppTab.ADMIN, label: 'Hỗ trợ', icon: ShieldCheck },
  ];

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setActiveTab(AppTab.PROFILE);
    } else {
      onShowAuth();
    }
  };

  const profileActive = activeTab === AppTab.PROFILE;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Điều hướng chính"
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`relative flex items-center justify-center transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-teal-600" />
                )}
              </div>
              <span
                className={`text-[10px] leading-tight mt-0.5 ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={handleProfileClick}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
            profileActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label={isLoggedIn ? 'Hồ sơ cá nhân' : 'Đăng nhập'}
          aria-current={profileActive ? 'page' : undefined}
        >
          <div
            className={`relative flex items-center justify-center transition-transform duration-200 ${
              profileActive ? 'scale-110' : ''
            }`}
          >
            {isLoggedIn ? (
              <UserIcon size={22} strokeWidth={profileActive ? 2.5 : 2} />
            ) : (
              <LogIn size={22} strokeWidth={2} />
            )}
            {profileActive && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-teal-600" />
            )}
          </div>
          <span
            className={`text-[10px] leading-tight mt-0.5 ${
              profileActive ? 'font-bold' : 'font-medium'
            }`}
          >
            {isLoggedIn ? 'Hồ sơ' : 'Đăng nhập'}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
