import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'bSafe — Women Safety & Emergency Assistance Platform',
  description:
    'Instant emergency assistance for women. One-click SOS alerts, real-time location sharing, verified volunteers, and nearby safe zones. Stay safe with bSafe.',
  keywords: 'women safety, emergency assistance, SOS alert, safety platform, volunteer responders, safe zones',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
