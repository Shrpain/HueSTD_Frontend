import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const AdminSettings: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchApiKey();
    }, []);

    const fetchApiKey = async () => {
        try {
            setLoading(true);
            const response = await api.get('/Admin/settings/AI_API_KEY');
            setApiKey(response.data.keyValue || '');
        } catch (error: any) {
            // If not found, it's ok - will be created on first save
            if (error.response?.status !== 404) {
                console.error('Failed to fetch API key:', error);
                setMessage({ type: 'error', text: 'Không thể tải thông tin API key' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setMessage({ type: 'error', text: 'Vui lòng nhập API key' });
            return;
        }

        try {
            setSaving(true);
            await api.put('/Admin/settings/AI_API_KEY', { keyValue: apiKey });
            setMessage({ type: 'success', text: 'Đã lưu API key thành công' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Failed to save API key:', error);
            setMessage({ type: 'error', text: 'Không thể lưu API key' });
        } finally {
            setSaving(false);
        }
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return '*'.repeat(key.length);
        return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Cài đặt Hệ thống</h2>
                <p className="text-gray-600 mt-1">Quản lý cấu hình và API keys</p>
            </div>

            {/* API Key Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Key className="text-blue-600" size={24} />
                    <h3 className="text-lg font-semibold text-gray-800">API Key cho AI Chat</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Gemini API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Nhập API key của bạn..."
                                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                type="button"
                            >
                                {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {!showKey && apiKey && (
                            <p className="mt-1 text-sm text-gray-500">
                                Hiện tại: {maskKey(apiKey)}
                            </p>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Hướng dẫn lấy API Key:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Truy cập <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google AI Studio</a></li>
                                    <li>Đăng nhập bằng tài khoản Google</li>
                                    <li>Click "Create API Key" hoặc "Get API Key"</li>
                                    <li>Copy API key và dán vào ô trên</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div
                    className={`fixed bottom-4 right-4 flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg ${message.type === 'success'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Additional Settings Section (Placeholder) */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Cài đặt khác</h3>
                <p className="text-gray-500">Các tùy chọn cài đặt khác sẽ được thêm vào sau...</p>
            </div>
        </div>
    );
};

export default AdminSettings;
