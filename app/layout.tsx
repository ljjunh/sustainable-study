import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plain Planner",
  description: "A plain Next.js planner for calendar, tasks, schedules, and notifications."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
