import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials, avatarColor } from '../../lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close the profile dropdown when clicking outside it, so it never
  // sits open on top of the page content.
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="top-0 left-0 right-0 z-50 bg-surface-bright/80 backdrop-blur-xl shadow-nav border-b border-outline-variant/40">
      <div className="h-16 w-full px-margin-mobile md:px-margin flex items-center justify-between gap-space-md max-w-[1440px] mx-auto">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-space-sm shrink-0">
          <span className="text-2xl select-none">✈️</span>
          <span className="font-newsreader text-headline-sm text-on-surface tracking-tight">TripSync</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-space-md">

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 pl-2 focus:outline-none"
              aria-label="Profile menu"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-manrope text-label-md font-bold ring-2 ring-surface-container-lowest shrink-0 ${avatarColor(user?.name)}`}>
                {getInitials(user?.name)}
              </div>
              <span className="hidden md:inline font-manrope text-label-lg text-on-surface whitespace-nowrap">{user?.name?.split(' ')[0]}</span>
              <span className="hidden md:inline material-symbols-outlined text-sm text-on-surface-variant">expand_more</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-surface-container-lowest rounded-xl shadow-card-lg border border-outline-variant overflow-hidden z-[60]">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <p className="font-manrope text-label-lg text-on-surface truncate">{user?.name}</p>
                  <p className="font-manrope text-body-sm text-on-surface-variant truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left font-manrope text-label-lg text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-bright px-margin-mobile py-space-md flex flex-col gap-2">
          <button onClick={() => { navigate('/trips/create'); setMenuOpen(false); }}
            className="btn-secondary w-full justify-center">
            <span className="material-symbols-outlined text-xl">add</span> New Trip
          </button>
          <button onClick={() => { navigate('/trips/join'); setMenuOpen(false); }}
            className="btn-outline w-full justify-center">
            <span className="material-symbols-outlined text-lg">confirmation_number</span> Join Trip
          </button>
          <button onClick={handleLogout} className="btn-ghost w-full justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-lg">logout</span> Sign out
          </button>
        </div>
      )}
    </header>
  );
}
