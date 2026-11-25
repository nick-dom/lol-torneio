import './globals.css';
import { SITE } from '@/lib/site';
const title = 'Copa Nexus — Torneio de League of Legends';
const description = 'Tabela, resultados, regras, chaveamento e transmissão ao vivo do torneio.';
export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: title, template: '%s' },
  description,
  applicationName: 'Copa Nexus',
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: 'Copa Nexus', statusBarStyle: 'black' },
  icons: { apple: '/apple-touch-icon.png' },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Copa Nexus', title, description, images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Copa Nexus' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#010a13', colorScheme: 'dark' };
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://ddragon.leagueoflegends.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body><a className="skip" href="#main">Ir para o conteúdo</a>{children}</body>
    </html>
  );
}
