import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});
const latin = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Jumla", template: "%s · Jumla" },
  description: "تعلّم الإنجليزية بكتابة الجمل حرفاً بحرف",
};

export const viewport: Viewport = { themeColor: "#0c0d11" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: browser extensions (Grammarly and the like) add attributes
  // to <html>/<body> before React loads. It only affects these two tags, not the page inside.
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${latin.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
