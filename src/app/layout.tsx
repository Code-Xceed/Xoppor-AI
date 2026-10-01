import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xoppor AI — AI Opportunity Radar",
  description: "Scouts 15 sources for jobs, gigs, internships, hackathons, conferences & bounties — AI-scored, delivered to Telegram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
