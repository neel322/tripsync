import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

const BASE_NAV = [
  { label: 'Overview',  icon: 'home',          path: '' },
  { label: 'Itinerary', icon: 'calendar_month', path: '/itinerary' },
  { label: 'Polls',     icon: 'how_to_vote',    path: '/polls' },
  { label: 'Expenses',  icon: 'receipt_long',   path: '/expenses' },
  { label: 'Budget',    icon: 'account_balance_wallet', path: '/budget' },
];

export function TripSidebar({ trip }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Organizers get a "Trip Settings" entry (manage members / status / delete);
  // regular members just see "Members".
  const isOrganizer = trip?.my_role === 'organizer';
  const lastNavItem = isOrganizer
    ? { label: 'Trip Settings', icon: 'settings', path: '/members' }
    : { label: 'Member',        icon: 'group',    path: '/members' };
  const NAV = [...BASE_NAV, lastNavItem];

  return (
    <>
      {/* Mobile / tablet: horizontal scrollable tab strip (below lg) */}
      <div className="lg:hidden -mx-margin-mobile md:-mx-margin px-margin-mobile md:px-margin bg-background pb-space-sm pt-space-sm mb-space-sm border-b border-outline-variant/60">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-manrope text-label-md text-on-surface-variant hover:text-on-surface transition-colors mb-space-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          All Trips
        </button>
        <nav
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          aria-label="Trip sections"
        >
          {NAV.map(({ label, icon, path }) => (
            <NavLink
              key={label}
              to={`/trips/${id}${path}`}
              end={path === ''}
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-space-md py-2 rounded-xl font-manrope text-label-md whitespace-nowrap shrink-0 transition-all duration-150 border',
                isActive
                  ? 'bg-surface-container text-on-surface border-outline-variant shadow-sm'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-low'
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn('material-symbols-outlined text-lg', isActive ? 'text-secondary' : '')}>{icon}</span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop: vertical sidebar (lg and up) */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-space-md">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-manrope text-label-lg text-on-surface-variant hover:text-on-surface transition-colors group"
        >
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          All Trips
        </button>

        {/* Trip chip */}
        {trip && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-space-md shadow-card">
            <p className="font-newsreader text-headline-sm text-on-surface leading-snug line-clamp-2">{trip.title}</p>
            <p className="flex items-center gap-1 font-manrope text-body-sm text-on-surface-variant mt-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="truncate">{trip.destination}</span>
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5" aria-label="Trip sections">
          {NAV.map(({ label, icon, path }) => (
            <NavLink
              key={label}
              to={`/trips/${id}${path}`}
              end={path === ''}
              className={({ isActive }) => cn(
                'flex items-center gap-space-sm px-space-sm py-2.5 rounded-xl font-manrope text-label-lg transition-all duration-150',
                isActive
                  ? 'bg-surface-container text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    'material-symbols-outlined text-lg',
                    isActive ? 'text-secondary' : ''
                  )}>{icon}</span>
                  {label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}