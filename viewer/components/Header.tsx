'use client';

import { useAuth } from '@/lib/auth';

export default function Header() {
    const { coins } = useAuth();

    return (
        <header className="app-header">
            <div className="app-logo">ShortDrama</div>
            <div className="coin-widget">
                <div className="coin-icon"></div>
                <span>{coins}</span>
            </div>
        </header>
    );
}
