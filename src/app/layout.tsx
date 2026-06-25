import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Đăng ký ca làm CTV',
  description: 'Hệ thống đăng ký ca làm việc cho cộng tác viên',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
