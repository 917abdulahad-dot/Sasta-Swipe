import type { Metadata } from "next";
import HeaderAuth from "@/components/HeaderAuth";
import Chatbot from "@/components/Chatbot";
import CursorGlow from "@/components/CursorGlow";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sasta Swipe — Find Bank Dining Deals in Pakistan",
  description:
    "Instantly discover dining and restaurant discounts available on your Pakistani bank card. Search HBL, Meezan, UBL, MCB and more — all in one place.",
  keywords: ["bank discounts", "HBL offers", "dining deals Pakistan", "credit card discounts", "restaurant discounts"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container">
            <div className="header-inner">
              <a href="/" className="logo">
                <img src="/logo.png" alt="Sasta Swipe Logo" width={36} height={36} className="logo-img" />
                <span className="logo-text">
                  Sasta<span>Swipe</span>
                </span>
              </a>
              <div className="header-right">
                <span className="header-badge">🇵🇰 Pakistan</span>
                <HeaderAuth />
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="footer">
          <div className="container">
            <p>
              Sasta Swipe — Dining discounts sourced directly from bank websites.
              Always verify offers at the bank&apos;s official site before visiting.
            </p>
          </div>
        </footer>
        <Chatbot />
        <CursorGlow />
      </body>
    </html>
  );
}
