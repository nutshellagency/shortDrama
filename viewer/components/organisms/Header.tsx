'use client';

import { useAuth } from '@/lib/auth';
import { CoinsIcon } from '@/components/atoms/Icons';

export default function Header() {
    const { coins } = useAuth();

    return (
        <header className="app-header">
            <div className="brand-text">
                ShortDrama
            </div>

            <div className="coin-badge">
                <CoinsIcon size={14} className="text-[var(--coin-gold)]" />
                <span className="coin-text">{coins}</span>
            </div>
        </header>
    );
}
