import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { AppTab, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DocumentModule from './components/DocumentModule';
import AdminModule from './components/AdminModule';
import AdminLayout from './components/admin/AdminLayout';
import ProfileModule from './components/ProfileModule';
import AuthModule from './components/AuthModule';
import MobileBottomNav from './components/MobileBottomNav';

// Lắng nghe sự kiện auth-toast (sau đăng nhập Google) và xử lý lỗi OAuth từ URL
const AuthToastListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  useEffect(() => {
    const handler = (e: CustomEvent<{ type: 'success' | 'error'; title: string; message: string }>) => {
      const { type, title, message } = e.detail || {};
      if (type && title && message) {
        showToast({ type, title, message, duration: 5000 });
      }
    };
    window.addEventListener('auth-toast', handler as EventListener);
    return () => window.removeEventListener('auth-toast', handler as EventListener);
  }, [showToast]);

  // Khi redirect về với ?error=... (OAuth thất bại) → hiện toast và xóa query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description') || '';
    if (error) {
      const msg =
        error === 'server_error' && errorDescription.includes('exchange')
          ? 'Supabase không trao đổi mã với Google. Kiểm tra:\n• Google Cloud: Redirect URI = https://oubkbvypiabgfulnhsnd.supabase.co/auth/v1/callback\n• Supabase: Client ID và Client Secret đúng chưa.'
          : decodeURIComponent(errorDescription || 'Đăng nhập thất bại.');
      showToast({ type: 'error', title: 'Lỗi đăng nhập', message: msg, duration: 8000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  return <>{children}</>;
};

// Helper function to convert AuthContext user to types.ts User format
const mapAuthUserToUser = (authUser: any): User | null => {
  if (!authUser) return null;
  return {
    id: authUser.id,
    name: authUser.fullName || authUser.email?.split('@')[0] || 'Người dùng',
    email: authUser.email || '',
    school: authUser.school || 'Chưa cập nhật',
    major: authUser.major || 'Chưa cập nhật',
    avatar: authUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName || 'User')}&background=0d9488&color=fff&size=200`,
    points: authUser.points || 0,
    rank: authUser.rank || 0,
    role: authUser.role || 'user',
    badge: authUser.badge || 'Thành viên mới',
    totalDocuments: authUser.totalDocuments || 0,
    totalDownloads: authUser.totalDownloads || 0,
    averageRating: authUser.averageRating || 0.0
  };
};

// Inner App component that uses AuthContext
const AppContent: React.FC = () => {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Convert auth user to User type for components
  const user = mapAuthUserToUser(authUser);

  const handleLogin = () => {
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    logout();
    setActiveTab(AppTab.DASHBOARD);
  };

  const renderContent = () => {
    const isProtected = [AppTab.PROFILE].includes(activeTab);

    if (isProtected && !isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">Tính năng giới hạn</h2>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">Vui lòng đăng nhập để sử dụng tính năng quản lý hồ sơ cá nhân.</p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-teal-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95"
          >
            Đăng nhập ngay
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case AppTab.DASHBOARD: return <Dashboard setActiveTab={setActiveTab} />;
      case AppTab.DOCUMENTS: return <DocumentModule onRequireLogin={() => setShowAuthModal(true)} />;
      case AppTab.ADMIN: return <AdminModule initialTab="support" />;
      case AppTab.PROFILE: return user ? <ProfileModule user={user} /> : null;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // --- ADMIN REDIRECT LOGIC ---
  // If user is admin, render the dedicated Admin Layout
  if (user && user.role === 'admin') {
    return (
      <>
        {showAuthModal && (
          <AuthModule
            onClose={() => setShowAuthModal(false)}
            onLoginSuccess={handleLogin}
          />
        )}
        <AdminLayout />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModule
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLogin}
        />
      )}

      {/* Main UI */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        isLoggedIn={isAuthenticated}
        onShowAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header
          user={user}
          isLoggedIn={isAuthenticated}
          onMenuClick={() => setIsSidebarOpen(true)}
          onProfileClick={() => isAuthenticated ? handleTabChange(AppTab.PROFILE) : setShowAuthModal(true)}
          onShowAuth={() => setShowAuthModal(true)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full pb-24 md:pb-6">
          {renderContent()}
        </main>

        <footer className="hidden md:block p-4 text-center text-slate-400 text-sm border-t bg-white">
          &copy; 2024 HueSTD - Nền tảng sinh viên Thừa Thiên Huế
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isLoggedIn={isAuthenticated}
        onShowAuth={() => setShowAuthModal(true)}
      />
    </div>
  );
};

// Main App wrapper with ToastProvider + AuthProvider + AuthToastListener
const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthToastListener>
          <AppContent />
        </AuthToastListener>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
