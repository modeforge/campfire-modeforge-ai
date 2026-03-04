import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Campfire Waco',
    template: '%s | Campfire Waco',
  },
  description: 'A once-a-month, guys-only space. The only agenda is friendship.',
  metadataBase: new URL('https://campfire.modeforge.ai'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') document.documentElement.classList.add('dark');
                else if (theme === 'light') document.documentElement.classList.add('light');
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <nav
          className="w-full"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between px-6 md:px-12 py-6">
            <a
              href="/"
              className="text-lg font-light tracking-widest uppercase"
              style={{ color: 'var(--text-primary)', letterSpacing: '0.2em' }}
            >
              Campfire
            </a>
            <a
              href="https://modeforge.ai"
              className="text-sm font-light tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              modeforge.ai
            </a>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
