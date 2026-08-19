import "@/styles/globals.css";

/** Separate root layout for the dev-only simulated checkout (no locale prefix). */
export const metadata = { title: "Mock checkout" };

export default function MockCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
