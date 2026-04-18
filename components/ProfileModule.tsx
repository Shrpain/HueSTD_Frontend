
import React, { useState, useEffect, useRef } from 'react';
import { User, Document, MarketItem } from '../types';
import {
  Award,
  BookOpen,
  Download,
  Edit2,
  Eye,
  FileText,
  Package,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  Settings,
  Mail,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import EditProfileModal from './EditProfileModal';
import api from '../services/api';
import { supabase } from '../services/supabase';

interface ProfileModuleProps {
  user: User;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'market' | 'stats'>('docs');
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination states
  const [docs, setDocs] = useState<Document[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [docPage, setDocPage] = useState(1);
  const [marketPage, setMarketPage] = useState(1);
  const [totalDocPages, setTotalDocPages] = useState(1);
  const [totalMarketPages, setTotalMarketPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleProfileUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Define fetch functions BEFORE useEffect to avoid closure issues
  const fetchDocuments = async (page: number) => {
    console.log('[ProfileModule] Fetching documents...');
    setLoading(true);
    try {
      const response = await api.get(`/Profile/my-documents?page=${page}&pageSize=3`);
      console.log('[ProfileModule] Documents fetched:', response.data.items);
      setDocs(response.data.items);
      setTotalDocPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketItems = async (page: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/Profile/my-market-items?page=${page}&pageSize=4`);
      setMarketItems(response.data.items);
      setTotalMarketPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching market items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for global refresh events - triggered by DocumentModule's Realtime subscription
  // This is more reliable than having duplicate Supabase subscriptions
  useEffect(() => {
    console.log('[ProfileModule] Setting up global event listeners...');

    const handleDocumentRefresh = () => {
      console.log('🔥 [ProfileModule] Received REFRESH_DOCUMENTS event, refreshing...');
      if (activeTab === 'docs') {
        fetchDocuments(docPage);
      }
    };

    const handleMarketRefresh = () => {
      console.log('🔥 [ProfileModule] Received REFRESH_MARKET event, refreshing...');
      if (activeTab === 'market') {
        fetchMarketItems(marketPage);
      }
    };

    window.addEventListener('REFRESH_DOCUMENTS', handleDocumentRefresh);
    window.addEventListener('REFRESH_MARKET', handleMarketRefresh);

    console.log('✅ Profile Global Event Listeners Ready');

    return () => {
      window.removeEventListener('REFRESH_DOCUMENTS', handleDocumentRefresh);
      window.removeEventListener('REFRESH_MARKET', handleMarketRefresh);
    };
  }, [activeTab, docPage, marketPage]);

  // Direct Supabase Realtime subscription for profile data
  useEffect(() => {
    console.log('[ProfileModule] Setting up direct Supabase realtime subscription...');

    // Debounce ref for realtime updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = (type: 'docs' | 'market') => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (type === 'docs') {
          fetchDocuments(docPage);
        } else if (type === 'market') {
          fetchMarketItems(marketPage);
        }
      }, 500);
    };

    // Fallback polling every 30 seconds
    let pollingInterval: NodeJS.Timeout | null = null;
    const startPolling = () => {
      if (!pollingInterval) {
        console.log('[ProfileModule] Starting polling fallback...');
        pollingInterval = setInterval(() => {
          console.log('[ProfileModule] Polling for updates...');
          if (activeTab === 'docs') {
            fetchDocuments(docPage);
          } else if (activeTab === 'market') {
            fetchMarketItems(marketPage);
          }
        }, 30000);
      }
    };

    const channel = supabase
      .channel('profile_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, (payload) => {
        console.log('[ProfileModule] New document inserted:', payload);
        debouncedFetch('docs');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents' }, (payload) => {
        console.log('[ProfileModule] Document updated:', payload);
        debouncedFetch('docs');
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'documents' }, (payload) => {
        console.log('[ProfileModule] Document deleted:', payload);
        debouncedFetch('docs');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_items' }, (payload) => {
        console.log('[ProfileModule] New market item inserted:', payload);
        debouncedFetch('market');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_items' }, (payload) => {
        console.log('[ProfileModule] Market item updated:', payload);
        debouncedFetch('market');
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'market_items' }, (payload) => {
        console.log('[ProfileModule] Market item deleted:', payload);
        debouncedFetch('market');
      })
      .subscribe((status) => {
        console.log('[ProfileModule] Realtime Status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Profile Realtime Connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ Profile Realtime Error. Starting polling fallback...');
          startPolling();
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [activeTab, docPage, marketPage]);

  // Fetch data when tab changes or refreshKey updates
  useEffect(() => {
    if (activeTab === 'docs') {
      fetchDocuments(docPage);
    } else if (activeTab === 'market') {
      fetchMarketItems(marketPage);
    }
  }, [activeTab, docPage, marketPage, refreshKey]);

  return (
    <>
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentUser={{
          name: user.name,
          school: user.school,
          major: user.major,
          avatar: user.avatar,
        }}
        onProfileUpdated={handleProfileUpdated}
      />

      <div className="space-y-5 md:space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto pb-6 md:pb-12">
        {/* Header Section - Modern Overlapping Design */}
        <div className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
          {/* Banner with Gradient */}
          <div className="h-28 md:h-44 bg-gradient-to-r from-teal-500 to-emerald-500 relative">
            <button
              onClick={() => setShowEditModal(true)}
              aria-label="Cài đặt"
              className="absolute top-4 md:top-6 right-4 md:right-6 p-2 md:p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40 transition-all border border-white/20 active:scale-95"
            >
              <Settings size={18} className="md:hidden" />
              <Settings size={20} className="hidden md:block" />
            </button>
          </div>

          {/* Profile Info Overlay */}
          <div className="px-4 md:px-8 pb-6 md:pb-8 flex flex-col md:flex-row items-center md:items-end -mt-12 md:-mt-16 gap-4 md:gap-6 relative">
            <div className="relative group shrink-0">
              <div className="p-1 bg-white rounded-3xl md:rounded-[2.2rem] shadow-2xl">
                <img
                  src={user.avatar}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-[1.25rem] md:rounded-[2rem] object-cover bg-slate-100"
                  alt={user.name}
                />
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                aria-label="Chỉnh sửa hồ sơ"
                className="absolute bottom-1 right-1 p-2 md:p-2.5 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all border-2 border-white active:scale-95"
              >
                <Edit2 size={14} />
              </button>
            </div>

            <div className="flex-1 pb-1 text-center md:text-left space-y-1.5 min-w-0 w-full md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight truncate">{user.name}</h1>
                <span className="inline-flex items-center justify-center md:justify-start gap-1.5 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-teal-100/50 w-fit mx-auto md:mx-0">
                  <Shield size={12} /> {user.badge}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-slate-400 text-xs md:text-[13px] font-bold">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-teal-500" /> <span className="line-clamp-1">{user.school}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-teal-500" /> <span className="line-clamp-1">{user.major}</span>
                </span>
                <span className="flex items-center gap-1.5 max-w-full">
                  <Mail size={14} className="text-teal-500 shrink-0" /> <span className="truncate">{user.email}</span>
                </span>
              </div>
            </div>

            {/* Points & Rank Stats Cards */}
            <div className="flex gap-3 md:gap-4 md:pb-1 shrink-0 w-full md:w-auto">
              <div className="flex-1 md:flex-none text-center bg-teal-50/50 px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-teal-100 md:min-w-[100px] shadow-sm">
                <p className="text-[10px] text-teal-600/70 font-black uppercase tracking-widest mb-1">Điểm</p>
                <p className="text-xl md:text-2xl font-black text-teal-700 leading-none">{user.points}</p>
              </div>
              <div className="flex-1 md:flex-none text-center bg-orange-50/50 px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-orange-100 md:min-w-[100px] shadow-sm">
                <p className="text-[10px] text-orange-600/70 font-black uppercase tracking-widest mb-1">Hạng</p>
                <p className="text-xl md:text-2xl font-black text-orange-700 leading-none">#{user.rank || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
          {/* Left Stats Sidebar (3/12) */}
          <div className="lg:col-span-3 space-y-5 md:space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 px-1">
                <TrendingUp size={14} className="text-teal-600" /> Thành tích
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                      <FileText size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Tài liệu đã đăng</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{user.totalDocuments || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Download size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Lượt tải</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">
                    {user.totalDownloads && user.totalDownloads >= 1000
                      ? `${(user.totalDownloads / 1000).toFixed(1)}k`
                      : user.totalDownloads || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                      <Star size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-600">Đánh giá</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{user.averageRating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
              <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] px-1">Huy hiệu</h3>
              <div className="flex flex-wrap gap-3 px-1">
                <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner border border-amber-200/50" title="Người đóng góp tích cực">
                  <Award size={22} />
                </div>
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner border border-blue-200/50" title="Thành viên cũ">
                  <Star size={22} />
                </div>
                <div className="w-11 h-11 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center border-2 border-dashed border-slate-200 opacity-40">
                  <Shield size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Tabs & List Content (9/12) */}
          <div className="lg:col-span-9 space-y-5 md:space-y-6">
            <div className="bg-white p-1.5 md:p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 rounded-xl text-xs md:text-[13px] font-black transition-all active:scale-95 ${activeTab === 'docs'
                  ? 'bg-teal-600 text-white shadow-xl shadow-teal-100'
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <FileText size={15} />
                <span className="hidden sm:inline">Tài liệu của tôi</span>
                <span className="sm:hidden">Tài liệu</span>
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 rounded-xl text-xs md:text-[13px] font-black transition-all active:scale-95 ${activeTab === 'market'
                  ? 'bg-teal-600 text-white shadow-xl shadow-teal-100'
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <Package size={15} />
                <span className="hidden sm:inline">Tin rao bán</span>
                <span className="sm:hidden">Rao bán</span>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3 rounded-xl text-xs md:text-[13px] font-black transition-all active:scale-95 ${activeTab === 'stats'
                  ? 'bg-teal-600 text-white shadow-xl shadow-teal-100'
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <TrendingUp size={15} />
                <span className="hidden sm:inline">Thống kê chi tiết</span>
                <span className="sm:hidden">Thống kê</span>
              </button>
            </div>

            <div className="min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-3">
                  <Loader2 size={40} className="animate-spin text-teal-600" />
                  <p className="font-bold text-sm">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'docs' && (
                    <div className="space-y-4">
                      {docs.length > 0 ? (
                        <>
                          <div className="space-y-4">
                            {docs.map(doc => (
                              <div key={doc.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 hover:border-teal-200 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-3 md:gap-5 min-w-0">
                                  <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors border border-transparent group-hover:border-teal-100 shrink-0">
                                    <FileText size={24} className="md:hidden" />
                                    <FileText size={28} className="hidden md:block" />
                                  </div>
                                  <div className="space-y-1.5 min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight line-clamp-2">{doc.title}</h4>
                                    <div className="flex items-center gap-1.5 md:gap-4 text-[10px] text-slate-400 font-black uppercase tracking-widest flex-wrap">
                                      <span className="flex items-center gap-1 md:gap-1.5 bg-slate-50 px-1.5 md:px-2 py-0.5 rounded-md"><Eye size={12} className="text-teal-500" /> {doc.views}</span>
                                      <span className="flex items-center gap-1 md:gap-1.5 bg-slate-50 px-1.5 md:px-2 py-0.5 rounded-md"><Download size={12} className="text-teal-500" /> {doc.downloads}</span>
                                      <span className="flex items-center gap-1 md:gap-1.5 bg-slate-50 px-1.5 md:px-2 py-0.5 rounded-md"><Calendar size={12} className="text-teal-500" /> {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 shrink-0 self-end sm:self-auto">
                                  <span className={`px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm ${doc.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    {doc.status === 'active' ? 'Đã duyệt' : 'Chờ duyệt'}
                                  </span>
                                  <button aria-label="Chỉnh sửa" className="p-2 md:p-2.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-transparent hover:border-teal-100 active:scale-95">
                                    <Edit2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Pagination */}
                          {totalDocPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
                              <button
                                disabled={docPage === 1}
                                onClick={() => setDocPage(p => p - 1)}
                                className="p-3 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <span className="text-sm font-black text-slate-600 bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                Trang {docPage} / {totalDocPages}
                              </span>
                              <button
                                disabled={docPage === totalDocPages}
                                onClick={() => setDocPage(p => p + 1)}
                                className="p-3 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] bg-white rounded-[2.5rem] border border-slate-100 border-dashed text-slate-400 gap-4">
                          <FileText size={48} className="opacity-20" />
                          <p className="font-bold text-sm italic">Bạn chưa đăng tài liệu nào</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'market' && (
                    <div className="space-y-6">
                      {marketItems.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {marketItems.map(item => (
                              <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex gap-5 shadow-sm hover:shadow-md transition-all animate-in zoom-in-95">
                                <img
                                  src={item.images?.[0] || 'https://via.placeholder.com/200'}
                                  className="w-28 h-28 rounded-2xl object-cover shrink-0 shadow-sm border border-slate-50"
                                  alt={item.title}
                                />
                                <div className="flex-1 flex flex-col justify-between py-1">
                                  <div>
                                    <h4 className="text-base font-black text-slate-800 line-clamp-2 leading-tight">{item.title}</h4>
                                    <p className="text-orange-600 font-black text-xl mt-1 tracking-tight">
                                      {item.price.toLocaleString('vi-VN')}đ
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg">{item.category}</span>
                                    <button className="text-xs font-black text-teal-600 hover:text-teal-700 underline underline-offset-4 decoration-teal-200">Quản lý tin</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Pagination */}
                          {totalMarketPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
                              <button
                                disabled={marketPage === 1}
                                onClick={() => setMarketPage(p => p - 1)}
                                className="p-3 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <span className="text-sm font-black text-slate-600 bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                Trang {marketPage} / {totalMarketPages}
                              </span>
                              <button
                                disabled={marketPage === totalMarketPages}
                                onClick={() => setMarketPage(p => p + 1)}
                                className="p-3 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-teal-600 disabled:opacity-30 transition-all shadow-sm"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] bg-white rounded-[2.5rem] border border-slate-100 border-dashed text-slate-400 gap-4">
                          <Package size={48} className="opacity-20" />
                          <p className="font-bold text-sm italic">Bạn chưa có tin đăng bán nào</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'stats' && (
                    <div className="bg-white p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center space-y-5 md:space-y-6 shadow-sm min-h-[350px] md:min-h-[400px]">
                      <div className="w-24 h-24 md:w-28 md:h-28 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-inner relative">
                        <TrendingUp size={40} className="md:hidden animate-pulse" />
                        <TrendingUp size={48} className="hidden md:block animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-7 h-7 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center border-2 border-teal-100 text-teal-600 shadow-sm">
                          <Star size={14} />
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Biểu đồ đang cập nhật</h4>
                        <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed font-bold">HueSTD đang tổng hợp dữ liệu học tập và giao dịch của bạn để hiển thị những thông số chính xác nhất.</p>
                      </div>
                      <button
                        onClick={() => handleProfileUpdated()}
                        className="bg-teal-600 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-2xl text-xs md:text-[13px] font-black hover:bg-teal-700 transition-all shadow-xl shadow-teal-100 active:scale-95"
                      >
                        Làm mới ngay
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileModule;
