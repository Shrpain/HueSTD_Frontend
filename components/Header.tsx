
import React, { useState } from 'react';
import { Search, Menu, LogIn, X } from 'lucide-react';
import { User } from '../types';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  user: User | null;
  isLoggedIn: boolean;
  onMenuClick: () => void;
  onProfileClick: () => void;
  onShowAuth: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, isLoggedIn, onMenuClick, onProfileClick, onShowAuth }) => {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="h-14 md:h-16 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-3 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Menu + Logo (mobile) / Search (desktop) */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all duration-200 active:scale-95 shrink-0"
        >
          <Menu size={22} />
        </button>

        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-black shadow-md shadow-teal-100 shrink-0">
            H
          </div>
          <span className="text-lg font-black text-teal-700 tracking-tight truncate">HueSTD</span>
        </div>

        {/* Desktop search */}
        <div className="relative max-w-sm w-full hidden md:block group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-500 transition-colors duration-300" size={16} />
          <input
            type="text"
            placeholder="Tìm tài liệu, bài viết..."
            className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 pl-10 pr-4 text-[13px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none placeholder:text-slate-400 hover:bg-slate-100 hover:border-slate-200"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-4 shrink-0">
        {/* Mobile search toggle */}
        <button
          onClick={() => setShowMobileSearch(true)}
          aria-label="Tìm kiếm"
          className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
        >
          <Search size={20} />
        </button>

        {isLoggedIn && user ? (
          <>
            <div className="hidden lg:flex flex-col items-end shrink-0 cursor-default">
              <span className="text-[13px] font-black text-teal-600">
                {user.points} điểm
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user.badge}</span>
            </div>

            <NotificationBell />

            <button
              onClick={onProfileClick}
              aria-label="Hồ sơ"
              className="flex items-center gap-2 md:gap-3 md:pl-4 md:border-l border-slate-100 hover:opacity-80 transition-all duration-300 active:scale-95 hover:bg-slate-50 rounded-xl p-1.5 md:p-2"
            >
              <img src={user.avatar} className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-slate-50 shadow-sm object-cover" alt="Profile" />
              <span className="hidden md:inline text-[13px] font-bold text-slate-700 hover:text-teal-600 transition-colors duration-300">Hồ sơ</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={onShowAuth}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-300 active:scale-95"
            >
              Đăng ký
            </button>
            <button
              onClick={onShowAuth}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 bg-teal-600 text-white text-xs md:text-[13px] font-black rounded-xl hover:bg-teal-700 shadow-md md:shadow-lg shadow-teal-100 transition-all duration-300 active:scale-95"
            >
              <LogIn size={16} />
              <span className="hidden xs:inline">Đăng nhập</span>
              <span className="xs:hidden">Vào</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile search overlay */}
      {showMobileSearch && (
        <div className="md:hidden absolute inset-0 bg-white flex items-center gap-2 px-3 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              autoFocus
              type="text"
              placeholder="Tìm tài liệu, bài viết..."
              className="w-full bg-slate-50 border border-slate-100 rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            aria-label="Đóng tìm kiếm"
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl active:scale-95"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
