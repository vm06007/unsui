import { DemoVideoProvider } from '@/components/demo-video';
import type { Metadata } from 'next';
import './globals.css';
import './presentation-theme.css';
import './demo-theme.css';
import './mobile-layout.css';
import './pitch.css';
export const metadata: Metadata = {
  title: 'UnSui (雲水) — Your journey goes on',
  description:
    'A new destination for your leftover transit balance. Try UnSui, a Japan transit-card refund experience built on Sui.',
  icons: { icon: '/favicon.svg?v=monk-5' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('unsui-theme')}catch(e){}document.documentElement.dataset.theme=t==='dark'||t==='light'?t:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`,
          }}
        />
      </head>
      <body><DemoVideoProvider>{children}</DemoVideoProvider></body>
    </html>
  );
}
