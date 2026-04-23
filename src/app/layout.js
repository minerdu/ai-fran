import "./globals.css";
import { ToastProvider } from "@/components/common/Toast";

export const metadata = {
  title: "AI 招商增长 OS — 智能招商管理系统",
  description: "基于AI的智能招商增长管理系统，聚合线索管理、自动触达、招商旅程、签审管理",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
