import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Campeonato de Memes",
  description: "Torneio de memes em tempo real",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
