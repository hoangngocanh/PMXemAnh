import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ảnh Cưới — Photo Review',
  description: 'Xem và chọn những khoảnh khắc cưới bạn yêu thích.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
