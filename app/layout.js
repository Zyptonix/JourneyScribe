import { AuthProvider } from '@/context/authContext';
import './globals.css'

export const metadata = {
  title: 'JourneyScribe',
  description: 'Your personal travel planner.',
}
// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
