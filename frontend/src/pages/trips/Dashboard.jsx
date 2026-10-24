import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { SectionLoader } from '../../components/ui/Loader';
import { formatDate, tripDuration, formatCurrency, cn } from '../../lib/utils';
import { getErrorMessage } from '../../lib/errors';

// Destination → gradient mapping for cover art
const DEST_GRADIENTS = [
  'from-[#0f4c81] via-[#1a6ea8] to-[#4a9edd]',
  'from-[#681822] via-[#a33238] to-[#e8956d]',
  'from-[#1a3a1a] via-[#2d6a2d] to-[#5ba85b]',
  'from-[#2a1700] via-[#7a4a00] to-[#c8820a]',
  'from-[#1a0a2e] via-[#3d1a6e] to-[#7b4bb8]',
  'from-[#0a2a2a] via-[#1a5a5a] to-[#2a9a9a]',
];

function getGradient(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return DEST_GRADIENTS[h % DEST_GRADIENTS.length];
}

const TABS = ['All', 'Pending', 'Completed'];

// A trip with no status yet (older records) is treated as upcoming/pending.
const tripStatus = (t) => t.status || 'upcoming';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/trips')
      .then(({ data }) => setTrips(data.trips))
      .catch((err) => toast.error(getErrorMessage(err, 'Failed to load trips')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = trips.filter(t => {
    const status = tripStatus(t);
    const matchTab = activeTab === 'All'
      || (activeTab === 'Pending' && status === 'upcoming')
      || (activeTab === 'Completed' && status === 'completed');
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const upcomingCount = trips.length;

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Hero header ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-manrope text-label-caps uppercase text-secondary tracking-widest bg-secondary-fixed/50 px-space-sm py-0.5 rounded-full">
              Explorer Workspace
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-manrope text-label-caps text-on-surface-variant uppercase">Real‑Time Sync Active</span>
          </div>
          <h1 className="font-newsreader text-headline-xl text-on-surface tracking-tight">
            Hey, {user?.name?.split(' ')[0]}{' '}
            <span className="inline-block hover:rotate-12 transition-transform duration-300 origin-bottom-right">👋</span>
          </h1>
          <p className="font-manrope text-body-lg text-on-surface-variant">
            You have{' '}
            <span className="text-on-surface font-semibold">{upcomingCount} {upcomingCount === 1 ? 'journey' : 'journeys'}</span>{' '}
            in your workspace.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={() => navigate('/trips/join')}
            className="group inline-flex items-center gap-space-sm px-space-md py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-manrope text-label-lg shadow-sm transition-all duration-200"
          >
            <span className="material-symbols-outlined text-lg text-secondary group-hover:scale-110 transition-transform">confirmation_number</span>
            Join Trip
          </button>
          <button
            onClick={() => navigate('/trips/create')}
            className="group inline-flex items-center gap-space-sm px-space-lg py-3 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary font-manrope text-label-lg shadow-md hover:shadow-card-lg transition-all duration-200"
          >
            <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform duration-300">add</span>
            New Trip
          </button>
        </div>
      </div>

      {/* ── Filter tabs + search ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
        {/* Tabs */}
        <div className="flex items-center gap-space-xs p-1 bg-surface-container-low rounded-xl overflow-x-auto" role="tablist">
          {TABS.map(tab => {
            const count = tab === 'All' ? trips.length
              : tab === 'Pending' ? trips.filter(t => tripStatus(t) === 'upcoming').length
              : trips.filter(t => tripStatus(t) === 'completed').length;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-space-md py-2 rounded-lg font-manrope text-label-md whitespace-nowrap transition-all',
                  activeTab === tab
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {tab}
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold',
                  activeTab === tab
                    ? 'bg-surface-container text-on-surface-variant'
                    : 'bg-surface-container-low text-on-surface-variant'
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg pointer-events-none">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter destination or title…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-manrope text-body-sm text-on-surface placeholder:text-outline shadow-sm focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <SectionLoader />
      ) : filtered.length === 0 ? (
        <EmptyTrips onNew={() => navigate('/trips/create')} onJoin={() => navigate('/trips/join')} hasTrips={trips.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {filtered.map(trip => <TripCard key={trip.id} trip={trip} />)}
        </div>
      )}
    </div>
  );
}

/* ── Trip Card ─────────────────────────────────────────────────── */
function TripCard({ trip }) {
  const isOrganizer = trip.role === 'organizer';
  const status = tripStatus(trip);
  const gradient = getGradient(trip.destination);

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-card hover:shadow-card-lg transition-all duration-300 cursor-pointer"
    >
      {/* Cover */}
      <div className={`relative h-44 w-full overflow-hidden bg-gradient-to-tr ${gradient}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container/80 via-transparent to-black/20" />

        {/* Badges */}
        <div className="absolute top-space-sm left-space-sm right-space-sm flex items-center justify-between">
          <span className={cn(
            'inline-flex items-center gap-1 px-space-sm py-1 rounded-full backdrop-blur-md font-manrope text-label-caps shadow-sm',
            isOrganizer
              ? 'bg-tertiary-fixed/90 text-on-tertiary-fixed'
              : 'bg-surface-container-highest/90 text-on-surface'
          )}>
            <span className="material-symbols-outlined text-[13px]">
              {isOrganizer ? 'military_tech' : 'group'}
            </span>
            {isOrganizer ? 'ORGANIZER' : 'MEMBER'}
          </span>

          {trip.budget > 0 && (
            <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md font-manrope text-label-caps text-on-surface shadow-sm">
              {formatCurrency(trip.budget)}
            </span>
          )}
        </div>

        {/* Bottom meta */}
        <div className="absolute bottom-space-sm left-space-md right-space-md flex items-end justify-between">
          <div className="flex items-center gap-1 text-on-primary font-manrope text-label-md">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{trip.destination}</span>
          </div>
          <span className="flex items-center gap-1">
            {status !== 'upcoming' && (
              <span className={cn(
                'font-manrope text-label-caps uppercase px-2 py-0.5 rounded backdrop-blur-sm',
                status === 'completed' ? 'bg-emerald/80 text-white' : 'bg-error/80 text-white'
              )}>
                {status}
              </span>
            )}
            <span className="font-manrope text-label-caps bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded text-on-primary">
              {tripDuration(trip.start_date, trip.end_date)}
            </span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-space-lg flex flex-col flex-1 justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <h2 className="font-newsreader text-headline-sm text-on-surface group-hover:text-secondary transition-colors line-clamp-1">
            {trip.title}
          </h2>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-manrope text-body-sm">
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>{formatDate(trip.start_date)} → {formatDate(trip.end_date)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-space-xs">
          <span className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">
            {isOrganizer ? 'Organizer' : 'Member'}
          </span>
          <span className="inline-flex items-center gap-1 font-manrope text-label-md text-secondary font-semibold group-hover:translate-x-1 transition-transform">
            Open <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Empty state ── */
function EmptyTrips({ onNew, onJoin, hasTrips }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-space-lg">
      <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center text-4xl">🗺️</div>
      <div>
        <h3 className="font-newsreader text-headline-sm text-on-surface mb-1">
          {hasTrips ? 'No trips match your filter' : 'No trips yet'}
        </h3>
        <p className="font-manrope text-body-md text-on-surface-variant max-w-xs">
          {hasTrips ? 'Try clearing your search or switching tabs.' : 'Create your first trip or join one with an invite code.'}
        </p>
      </div>
      {!hasTrips && (
        <div className="flex gap-space-sm flex-wrap justify-center">
          <button onClick={onNew} className="btn-secondary">
            <span className="material-symbols-outlined text-xl">add</span> Create Trip
          </button>
          <button onClick={onJoin} className="btn-outline">
            <span className="material-symbols-outlined text-lg">confirmation_number</span> Join Trip
          </button>
        </div>
      )}
    </div>
  );
}
