'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/explore', icon: '🔍', label: 'Explore' },
    { href: '#', icon: '🔖', label: 'My List' },
    { href: '#', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
