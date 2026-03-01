export const metadata = {
  title: "TradeFind",
  description: "Contractor research tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
