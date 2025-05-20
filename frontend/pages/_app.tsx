import "@/styles/globals.css";  // アプリ全体にCSSを読み込む
import type { AppProps } from "next/app";

// 全ページの共通ラッパー
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
