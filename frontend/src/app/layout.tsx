import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Zdrink - 在线点餐",
    description: "Zdrink点餐系统，提供便捷的在线点餐服务",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="zh-CN"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
        <head>
            {/* 移动端适配：动态根字体大小 */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              (function() {
                var UI_WIDTH = 375;
                var baseFontSize = 16;
                function setRootFontSize() {
                  var width = document.documentElement ? document.documentElement.clientWidth : window.innerWidth;
                  var fontSize = ((width / UI_WIDTH) * baseFontSize).toFixed(4);
                  document.documentElement.style.fontSize = fontSize + 'px';
                }
                setRootFontSize();
                window.addEventListener('resize', setRootFontSize);
              })();
            `,
                }}
            />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}
