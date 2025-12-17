'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, SearchIcon, BookmarkIcon, UserIcon } from '@/components/atoms/Icons';

const navItems = [
    { href: '/', icon: HomeIcon, label: 'Home' },
    { href: '/explore', icon: SearchIcon, label: 'Explore' },
    { href: '/mylist', icon: BookmarkIcon, label: 'My List' },
    { href: '/profile', icon: UserIcon, label: 'Profile' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={24} fill={isActive} />
                        <span className="nav-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
