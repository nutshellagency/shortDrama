'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { guestLogin } from './api';

interface AuthContextValue {
    token: string | null;
    coins: number;
    setCoins: (coins: number) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    token: null,
    coins: 0,
    setCoins: () => { },
    isLoading: true,
});

export function useAuth() {
    return useContext(AuthContext);
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [token, setToken] = useState<string | null>(null);
    const [coins, setCoins] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function initAuth() {
            // Check for existing token
            let storedToken = localStorage.getItem('userToken');

            if (!storedToken) {
                // Create guest account
                const res = await guestLogin();
                if (res.ok && res.data.token) {
                    storedToken = res.data.token;
                    localStorage.setItem('userToken', storedToken);
                    setCoins(res.data.user?.coins || 50);
                }
            }

            setToken(storedToken);
            setIsLoading(false);
        }

        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ token, coins, setCoins, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
