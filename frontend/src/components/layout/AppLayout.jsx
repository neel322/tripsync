import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin lg:px-margin-desktop py-space-lg md:py-space-xl">
        <Outlet />
      </main>
    </div>
  );
}
