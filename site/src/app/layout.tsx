import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "بندر الجلعود — الأرشيف الرسمي الملكي",
    description: "الأرشيف الرسمي للمصور بندر الجلعود، توثيق فوتوغرافي للمناسبات الملكية في المملكة العربية السعودية",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ar" dir="rtl">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body>{children}</body>
        </html>
    );
}
