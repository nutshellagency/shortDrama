import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
    title: 'ShortDrama',
    description: 'Watch short-form drama series',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
