
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { supabase } from '../services/supabase';

export interface User {
    id: string;
    // ... rest of User interface constant ...
    email: string;
    fullName?: string;
    school?: string;
    major?: string;
    avatarUrl?: string;
    points?: number;
    rank?: number;
    badge?: string;
    publicId?: string;
    role?: string;
    totalDocuments?: number;
    totalDownloads?: number;
    averageRating?: number;
}

export interface UpdateProfileData {
    fullName?: string;
    school?: string;
    major?: string;
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    updateUser: (data: UpdateProfileData) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get('/Profile/me');
            if (response.data) {
                localStorage.setItem('user', JSON.stringify(response.data));
                setUser(response.data);
            }
        } catch (error) {
            console.error('Refresh user failed:', error);
        }
    }, []);

    useEffect(() => {
        // Check for existing token on load
        const token = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                // Refresh user data from API to get latest stats (totalDocuments, totalDownloads)
                refreshUser();
            } catch (e) {
                console.error("Failed to parse user", e);
                logout();
            }
        }
    }, []);

    // Realtime subscription for profile changes (points, etc.)
    useEffect(() => {
        if (!user || !user.id) return;

        const channel = supabase
            .channel(`profile_realtime_${user.id}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Profile updated via Realtime:', payload);
                    // Update user state with new data from payload
                    const updatedData = payload.new as any;
                    setUser(prev => prev ? {
                        ...prev,
                        fullName: updatedData.full_name,
                        avatarUrl: updatedData.avatar_url,
                        points: updatedData.points,
                        badge: updatedData.badge,
                        school: updatedData.school,
                        major: updatedData.major
                    } : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const login = (token: string, refreshToken: string, newUser: User) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = async (data: UpdateProfileData): Promise<boolean> => {
        try {
            const response = await api.put('/Profile/update', data);
            if (response.data.user) {
                const updatedUser = response.data.user;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
            return true;
        } catch (error) {
            console.error('Update profile failed:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
