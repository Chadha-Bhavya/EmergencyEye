import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signalingConfig } from '@/lib/signalingConfig';

interface User {
    email: string;
    name: string;
    picture?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    handleOAuthCallback: (code: string) => Promise<boolean>;
    logout: () => void;
    // Keep legacy login for backwards compatibility during transition
    login: (email: string, password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials for MVP fallback
const POLICE_CREDENTIALS = {
    email: 'officer@police.gov',
    password: 'SafeStream2024!'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('authToken');
            const savedUser = localStorage.getItem('authUser');

            if (token && savedUser) {
                try {
                    // Verify token is still valid
                    const response = await fetch(`${signalingConfig.httpBase}/auth/verify`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        setUser(JSON.parse(savedUser));
                        setIsAuthenticated(true);
                    } else {
                        // Token expired, clear storage
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('authUser');
                    }
                } catch (error) {
                    // Server unreachable, check legacy auth
                    const legacyAuth = localStorage.getItem('policeAuth');
                    if (legacyAuth === 'true') {
                        setIsAuthenticated(true);
                    }
                }
            } else {
                // Check legacy auth
                const legacyAuth = localStorage.getItem('policeAuth');
                if (legacyAuth === 'true') {
                    setIsAuthenticated(true);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const loginWithGoogle = useCallback(async () => {
        try {
            const response = await fetch(`${signalingConfig.httpBase}/auth/google`);
            const data = await response.json();

            if (data.auth_url) {
                // Redirect to Google OAuth
                window.location.href = data.auth_url;
            } else {
                throw new Error('Failed to get OAuth URL');
            }
        } catch (error) {
            console.error('OAuth error:', error);
            throw error;
        }
    }, []);

    const handleOAuthCallback = useCallback(async (code: string): Promise<boolean> => {
        try {
            const formData = new FormData();
            formData.append('code', code);

            const response = await fetch(`${signalingConfig.httpBase}/auth/google/callback`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to authenticate');
            }

            const data = await response.json();

            // Store token and user
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authUser', JSON.stringify(data.user));

            setUser(data.user);
            setIsAuthenticated(true);

            return true;
        } catch (error) {
            console.error('OAuth callback error:', error);
            return false;
        }
    }, []);

    // Legacy login for backwards compatibility
    const login = (email: string, password: string): boolean => {
        if (email === POLICE_CREDENTIALS.email && password === POLICE_CREDENTIALS.password) {
            setIsAuthenticated(true);
            localStorage.setItem('policeAuth', 'true');
            return true;
        }
        return false;
    };

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('policeAuth');

        // Optionally notify backend
        fetch(`${signalingConfig.httpBase}/auth/logout`, { method: 'POST' }).catch(() => { });
    }, []);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            loading,
            loginWithGoogle,
            handleOAuthCallback,
            logout,
            login
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
