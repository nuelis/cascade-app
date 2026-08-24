export const metadata = {
  title: "Cascade — Vendor Insurance Tracker",
  description: "Never let a vendor's insurance lapse without knowing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fafafa" }}>{children}</body>
    </html>
  );
}
