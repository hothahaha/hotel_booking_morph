"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { morphHolesky } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "./globals.css";

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ??
  "c6c2b66315107469c40bd4497f2a69ea";

const walletConfig = getDefaultConfig({
  appName: "Hotel Booking DApp",
  projectId: projectId,
  chains: [morphHolesky],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body>
        <WagmiProvider config={walletConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
