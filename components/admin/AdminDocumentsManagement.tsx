import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Check, X, Edit2, Trash2, Search, Filter, Loader2, RefreshCw, Bell } from 'lucide-react';
import api from '../../services/api';
import { supabase } from '../../services/supabase';

interface Document {
    id: string;
    title: string;
    description?: string;
    uploaderName?: string;
    school?: string;
    subject?: string;
    isApproved: boolean;
    views: number;
    downloads: number;
    createdAt: string;
}

interface DocumentDetail extends Document {
    fileUrl?: string;
    uploaderId: string;
    type?: string;
    year?: string;
}

const AdminDocumentsManagement: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
    const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [newDocuments, setNewDocuments] = useState<Document[]>([]);
    const [showNewDocToast, setShowNewDocToast] = useState(false);
    const prevPendingCount = useRef<number>(0);

    const pendingDocuments = documents.filter(d => !d.isApproved);
    const pendingCount = pendingDocuments.length;
    const isFetchingRef = useRef(false);

    const fetchDocuments = useCallback(async (showLoading = true, isRealtimeUpdate = false) => {
        // Prevent concurrent fetches
        if (isFetchingRef.current && !isRealtimeUpdate) return;
        isFetchingRef.current = true;

        try {
            if (showLoading) setLoading(true);
            else if (!isRealtimeUpdate) setRefreshing(true);

            const response = await api.get('/Admin/documents');
            const newDocs = response.data as Document[];

            // Check for new pending documents (only on realtime updates)
            if (isRealtimeUpdate) {
                // Use functional update to get current state without adding as dependency
                setDocuments(currentDocs => {
                    const currentPendingIds = new Set(currentDocs.filter(d => !d.isApproved).map(d => d.id));
                    const newPending = newDocs.filter(d => !d.isApproved && !currentPendingIds.has(d.id));
                    if (newPending.length > 0) {
                        // Use setTimeout to avoid setState during render
                        setTimeout(() => {
                            setNewDocuments(prev => [...newPending, ...prev]);
                            setShowNewDocToast(true);
                            setTimeout(() => setShowNewDocToast(false), 5000);
                        }, 0);
                    }
                    return newDocs;
                });
            } else {
                setDocuments(newDocs);
            }

            prevPendingCount.current = newDocs.filter(d => !d.isApproved).length;
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/Admin/documents');
                setDocuments(response.data as Document[]);
            } catch (error) {
                console.error('Failed to fetch documents:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();

        // Debounce ref for realtime updates
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedFetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchDocuments(false, true);
            }, 500);
        };

        // Realtime subscription for documents
        const channel = supabase
            .channel('admin_documents_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'documents' },
                (payload) => {
                    console.log('[AdminDocumentsManagement] New document inserted:', payload);
                    const newDoc = payload.new as Document;
                    if (!newDoc.isApproved) {
                        setNewDocuments(prev => [newDoc, ...prev]);
                        setShowNewDocToast(true);
                        setTimeout(() => setShowNewDocToast(false), 5000);
                    }
                    debouncedFetch();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'documents' },
                (payload) => {
                    console.log('[AdminDocumentsManagement] Document updated:', payload);
                    debouncedFetch();
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'documents' },
                (payload) => {
                    console.log('[AdminDocumentsManagement] Document deleted:', payload);
                    debouncedFetch();
                }
            )
            .subscribe((status) => {
                console.log('[AdminDocumentsManagement] Realtime Status:', status);
            });

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, []); // Empty deps - only run once on mount

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await api.put(`/Admin/documents/${id}/approve`);
            setDocuments(prev => prev.map(d => d.id === id ? { ...d, isApproved: true } : d));
        } catch (error) {
            console.error('Failed to approve document:', error);
            alert('Không thể duyệt tài liệu');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        try {
            setProcessingId(id);
            await api.put(`/Admin/documents/${id}/reject`);
            setDocuments(prev => prev.map(d => d.id === id ? { ...d, isApproved: false } : d));
        } catch (error) {
            console.error('Failed to reject document:', error);
            alert('Không thể từ chối tài liệu');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async () => {
        if (!documentToDelete) return;
        try {
            setProcessingId(documentToDelete);
            await api.delete(`/Admin/documents/${documentToDelete}`);
            setDocuments(prev => prev.filter(d => d.id !== documentToDelete));
            setShowDeleteConfirm(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error('Failed to delete document:', error);
            alert('Không thể xóa tài liệu');
        } finally {
            setProcessingId(null);
        }
    };

    const viewDocumentDetail = async (id: string) => {
        try {
            const response = await api.get(`/Admin/documents/${id}`);
            setSelectedDocument(response.data);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Failed to fetch document detail:', error);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'approved' && doc.isApproved) ||
            (filterStatus === 'pending' && !doc.isApproved);
        return matchesSearch && matchesFilter;
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Đang tải...</div>
        </div>;
    }

    return (
        <div className="space-y-6">
            {/* Toast notification for new documents */}
            {showNewDocToast && newDocuments.length > 0 && (
                <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 max-w-md">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Bell size={24} className="animate-bounce" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">Tài liệu mới cần duyệt!</p>
                            <p className="text-sm text-white/80">Có {newDocuments.length} tài liệu mới chờ xét duyệt</p>
                        </div>
                        <button
                            onClick={() => {
                                setShowNewDocToast(false);
                                setFilterStatus('pending');
                            }}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            Xem ngay
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý Tài liệu</h2>
                    <p className="text-gray-600 mt-1">Duyệt và quản lý tài liệu trên hệ thống</p>
                </div>
                <button
                    onClick={() => fetchDocuments(false, false)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`bg-blue-50 p-4 rounded-lg transition-all ${pendingCount > 0 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="blue-600 text-sm font-medium">Tổng tài liệu</p>
                            <p className="text-2xl font-bold text-blue-700">{documents.length}</p>
                        </div>
                        <FileText className="text-blue-600" size={32} />
                    </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="green-600 text-sm font-medium">Đã duyệt</p>
                            <p className="text-2xl font-bold text-green-700">
                                {documents.filter(d => d.isApproved).length}
                            </p>
                        </div>
                        <Check className="text-green-600" size={32} />
                    </div>
                </div>
                <div 
                    className={`bg-yellow-50 p-4 rounded-lg cursor-pointer transition-all hover:scale-105 ${pendingCount > 0 ? 'ring-2 ring-yellow-400' : ''}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="yellow-600 text-sm font-medium">Chờ duyệt</p>
                            <p className="text-2xl font-bold text-yellow-700 flex items-center gap-2">
                                {pendingCount}
                                {pendingCount > 0 && (
                                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                        MỚI
                                    </span>
                                )}
                            </p>
                        </div>
                        <Filter className="text-yellow-600" size={32} />
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tài liệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">Tất cả</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="pending">Chờ duyệt</option>
                </select>
            </div>

            {/* Documents Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tài liệu
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Người đăng
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thống kê
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDocuments.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                            <div className="text-sm text-gray-500 line-clamp-1">{doc.description}</div>
                                            {doc.subject && (
                                                <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                                    {doc.subject}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{doc.uploaderName || 'N/A'}</div>
                                        {doc.school && <div className="text-xs text-gray-500">{doc.school}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {doc.isApproved ? (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                <Check size={14} className="mr-1" />
                                                Đã duyệt
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                <Filter size={14} className="mr-1" />
                                                Chờ duyệt
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{doc.views} lượt xem</div>
                                        <div>{doc.downloads} lượt tải</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(doc.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => viewDocumentDetail(doc.id)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Xem chi tiết"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {!doc.isApproved ? (
                                                <button
                                                    onClick={() => handleApprove(doc.id)}
                                                    disabled={processingId === doc.id}
                                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                                    title="Duyệt"
                                                >
                                                    {processingId === doc.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Check size={18} />
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReject(doc.id)}
                                                    disabled={processingId === doc.id}
                                                    className="text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                                                    title="Bỏ duyệt"
                                                >
                                                    {processingId === doc.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <X size={18} />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setDocumentToDelete(doc.id);
                                                    setShowDeleteConfirm(true);
                                                }}
                                                disabled={processingId === doc.id}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                title="Xóa"
                                            >
                                                {processingId === doc.id ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Detail Modal */}
            {showDetailModal && selectedDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4">Chi tiết Tài liệu</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                                    <div className="text-gray-900">{selectedDocument.title}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                    <div className="text-gray-900">{selectedDocument.description || 'Không có'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trường</label>
                                        <div className="text-gray-900">{selectedDocument.school || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                                        <div className="text-gray-900">{selectedDocument.subject || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                                        <div className="text-gray-900">{selectedDocument.type || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                                        <div className="text-gray-900">{selectedDocument.year || 'N/A'}</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Người đăng</label>
                                    <div className="text-gray-900">{selectedDocument.uploaderName || 'N/A'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái duyệt</label>
                                    <div>
                                        {selectedDocument.isApproved ? (
                                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Đã duyệt
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Chờ duyệt
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lượt xem</label>
                                        <div className="text-gray-900">{selectedDocument.views}</div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lượt tải</label>
                                        <div className="text-gray-900">{selectedDocument.downloads}</div>
                                    </div>
                                </div>
                                {selectedDocument.fileUrl && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                                        <a
                                            href={selectedDocument.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            Xem file
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex gap-3 justify-end">
                                {!selectedDocument.isApproved ? (
                                    <button
                                        onClick={() => {
                                            handleApprove(selectedDocument.id);
                                            setShowDetailModal(false);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Check size={18} />
                                        Duyệt
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            handleReject(selectedDocument.id);
                                            setShowDetailModal(false);
                                        }}
                                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                                    >
                                        <X size={18} />
                                        Bỏ duyệt
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Xác nhận xóa</h3>
                        <p className="text-gray-600 mb-6">
                            Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDocumentToDelete(null);
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDocumentsManagement;
