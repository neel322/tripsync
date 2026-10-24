import { useState, useEffect } from 'react';
import { useParams, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { TripSidebar } from '../../components/layout/TripSidebar';
import { SectionLoader } from '../../components/ui/Loader';
import { formatDate, tripDuration, formatCurrency, getInitials, avatarColor, cn } from '../../lib/utils';
import { useSocket } from '../../hooks/useSocket';
import { getErrorMessage } from '../../lib/errors';

export default function TripOverview() {
  const { id } = useParams();
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useSocket(id);

  useEffect(() => {
    api.get(`/trips/${id}`)
      .then(({ data }) => setTrip(data.trip))
      .catch((err) => {
        const msg = getErrorMessage(err, 'Could not load this trip');
        setLoadError(msg);
        toast.error(msg, { id: 'trip-load' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const copyCode = () => {
    navigator.clipboard.writeText(trip.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <SectionLoader />;
  if (!trip) {
    return (
      <div className="text-center py-24 font-manrope text-on-surface-variant flex flex-col items-center gap-space-md">
        <span className="material-symbols-outlined text-5xl text-outline">travel_explore</span>
        <p className="text-label-lg text-on-surface">We couldn't open this trip</p>
        <p className="text-body-sm max-w-sm">{loadError || 'It may have been deleted, or you may no longer be a member.'}</p>
        <a href="/dashboard" className="btn-secondary mt-space-sm">Back to my trips</a>
      </div>
    );
  }

  const isIndex = location.pathname === `/trips/${id}` || location.pathname === `/trips/${id}/`;

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-space-xl">
      <TripSidebar trip={trip} />
      <div className="flex-1 min-w-0">
        {isIndex ? <TripHome trip={trip} onCopy={copyCode} copied={copied} /> : <Outlet />}
      </div>
    </div>
  );
}

/* ── Trip Home ─────────────────────────────────────────────────── */
function TripHome({ trip, onCopy, copied }) {
  const members = trip.trip_members || [];
  const isOrganizer = trip.my_role === 'organizer';
  const duration = tripDuration(trip.start_date, trip.end_date);

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Hero banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-tr from-primary-container via-inverse-surface to-[#1d3461] min-h-[220px]">
        {/* Decorative blobs */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 rounded-full bg-tertiary-fixed/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-space-xl flex flex-col sm:flex-row sm:items-start justify-between gap-space-lg">
          <div className="flex flex-col gap-space-sm">
            {/* Role pill */}
            <span className={cn(
              'self-start inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-manrope text-label-caps backdrop-blur-sm',
              isOrganizer
                ? 'bg-tertiary-fixed/80 text-on-tertiary-fixed'
                : 'bg-surface-container-highest/60 text-inverse-on-surface'
            )}>
              <span className="material-symbols-outlined text-[13px]">
                {isOrganizer ? 'military_tech' : 'group'}
              </span>
              {isOrganizer ? 'ORGANIZER' : 'MEMBER'}
            </span>

            <h1 className="font-newsreader text-headline-xl-mobile md:text-headline-xl text-inverse-on-surface leading-tight">
              {trip.title}
            </h1>

            <div className="flex items-center gap-1.5 font-manrope text-label-lg text-inverse-on-surface/80">
              <span className="material-symbols-outlined text-base">location_on</span>
              {trip.destination}
            </div>
          </div>

          {/* Invite code */}
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="font-manrope text-label-caps text-inverse-on-surface/60 uppercase tracking-widest">Invite Code</p>
            <div className="flex items-center gap-2">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2">
                <span className="font-manrope font-bold tracking-[0.3em] text-inverse-on-surface text-lg">
                  {trip.invite_code}
                </span>
              </div>
              <button
                onClick={onCopy}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-inverse-on-surface transition-all"
                aria-label="Copy invite code"
              >
                <span className="material-symbols-outlined text-lg">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bento stat grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <StatTile icon="calendar_today" label="Start Date" value={formatDate(trip.start_date)} />
        <StatTile icon="event" label="End Date" value={formatDate(trip.end_date)} />
        <StatTile icon="schedule" label="Duration" value={duration} />
        <StatTile
          icon="account_balance_wallet"
          label="Budget"
          value={trip.budget > 0 ? formatCurrency(trip.budget) : '—'}
          accent={trip.budget > 0}
        />
      </div>

      {/* ── Description ── */}
      {trip.description && (
        <div className="card">
          <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest mb-2">About this trip</p>
          <p className="font-manrope text-body-md text-on-surface leading-relaxed">{trip.description}</p>
        </div>
      )}

      {/* ── Members ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-space-md">
          <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">
            Crew · {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center -space-x-2">
            {members.slice(0, 5).map((m, i) => (
              <div
                key={m.users?.id ?? i}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white font-manrope text-label-md font-bold ring-2 ring-surface-container-lowest shadow-sm',
                  avatarColor(m.users?.name)
                )}
                title={m.users?.name}
              >
                {getInitials(m.users?.name)}
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-manrope text-label-md font-bold ring-2 ring-surface-container-lowest">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-outline-variant">
          {members.map((m, i) => (
            <div key={m.users?.id ?? i} className="flex items-center gap-space-md py-3 first:pt-0 last:pb-0">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white font-manrope text-label-lg font-bold shrink-0',
                avatarColor(m.users?.name)
              )}>
                {getInitials(m.users?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-manrope text-label-lg text-on-surface truncate">{m.users?.name}</p>
                <p className="font-manrope text-body-sm text-on-surface-variant truncate">{m.users?.email}</p>
              </div>
              <span className={cn(
                'inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full font-manrope text-label-caps',
                m.role === 'organizer'
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-surface-container text-on-surface-variant'
              )}>
                {m.role === 'organizer' && <span className="material-symbols-outlined text-[11px]">military_tech</span>}
                {m.role === 'organizer' ? 'ORGANIZER' : 'MEMBER'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, accent }) {
  return (
    <div className={cn(
      'rounded-xl border p-space-md flex flex-col gap-1 shadow-card',
      accent
        ? 'bg-secondary-fixed/30 border-secondary-fixed'
        : 'bg-surface-container-lowest border-outline-variant'
    )}>
      <div className="flex items-center gap-1.5">
        <span className={cn('material-symbols-outlined text-lg', accent ? 'text-secondary' : 'text-on-surface-variant')}>
          {icon}
        </span>
        <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn('font-manrope text-label-lg', accent ? 'text-secondary font-bold' : 'text-on-surface')}>
        {value}
      </p>
    </div>
  );
}
