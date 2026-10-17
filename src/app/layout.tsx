import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Knowledge Vault", template: "%s · Knowledge Vault" },
  description: "Save and organize your notes and links in one place.",
};

// F11 FR-9: device-width viewport; pinch-zoom stays enabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
