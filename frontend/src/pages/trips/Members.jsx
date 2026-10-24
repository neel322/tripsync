import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { SectionLoader } from '../../components/ui/Loader';
import { formatDate, getInitials, avatarColor, cn } from '../../lib/utils';
import { getErrorMessage } from '../../lib/errors';

const STATUS_OPTIONS = [
  { value: 'upcoming',  label: 'Pending (upcoming)', icon: 'schedule' },
  { value: 'completed', label: 'Completed',          icon: 'check_circle' },
  { value: 'cancelled', label: 'Cancelled',           icon: 'cancel' },
];

export default function Members() {
  const { id: tripId } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchAll = () => {
    Promise.all([
      api.get(`/trips/${tripId}/members`),
      api.get(`/trips/${tripId}`),
    ]).then(([memRes, tripRes]) => {
      setMembers(memRes.data.members);
      setTrip(tripRes.data.trip);
    }).catch((err) => toast.error(getErrorMessage(err, 'Failed to load members')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [tripId]);

  if (loading) return <SectionLoader />;

  const organizers = members.filter(m => m.role === 'organizer');
  const crew       = members.filter(m => m.role !== 'organizer');
  const isOrganizer = trip?.my_role === 'organizer';

  const handleRemove = async (member) => {
    const name = member.users?.name || 'this member';
    if (!window.confirm(`Remove ${name} from the trip? They will lose access immediately.`)) return;
    setRemovingId(member.users?.id);
    try {
      await api.delete(`/trips/${tripId}/members/${member.users?.id}`);
      toast.success(`${name} removed from the trip`);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove member'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === trip?.status) return;
    const label = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
    if (!window.confirm(`Mark this trip as "${label}"?`)) return;
    setSavingStatus(true);
    try {
      const { data } = await api.patch(`/trips/${tripId}`, { status: newStatus });
      setTrip(t => ({ ...t, status: data.trip.status }));
      toast.success(`Trip marked as ${label.toLowerCase()}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update trip status'));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm('Delete this trip permanently? This cannot be undone and will remove all itinerary items, expenses, and polls.')) return;
    setDeleting(true);
    try {
      await api.delete(`/trips/${tripId}`);
      toast.success('Trip deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete trip'));
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-xl">
      <div>
        <h2 className="font-newsreader text-headline-md text-on-surface">Members</h2>
        <p className="font-manrope text-body-sm text-on-surface-variant mt-0.5">
          {members.length} member{members.length !== 1 ? 's' : ''} in this trip
        </p>
      </div>

      {/* Avatar cluster */}
      <div className="card flex items-center gap-space-md">
        <div className="flex items-center -space-x-3">
          {members.slice(0, 8).map((m, i) => (
            <div
              key={m.users?.id ?? i}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-manrope text-label-md font-bold ring-2 ring-surface-container-lowest shadow-sm',
                avatarColor(m.users?.name)
              )}
              title={m.users?.name}
            >
              {getInitials(m.users?.name)}
            </div>
          ))}
          {members.length > 8 && (
            <div className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-manrope text-label-md font-bold ring-2 ring-surface-container-lowest">
              +{members.length - 8}
            </div>
          )}
        </div>
        <div>
          <p className="font-manrope text-label-lg text-on-surface">{members.length} travellers</p>
          <p className="font-manrope text-body-sm text-on-surface-variant">
            {organizers.length} organizer · {crew.length} member{crew.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Organizers */}
      {organizers.length > 0 && (
        <MemberGroup title="Organizers" members={organizers} />
      )}

      {/* Crew — organizers get a remove action per member */}
      {crew.length > 0 && (
        <MemberGroup
          title="Members"
          members={crew}
          canManage={isOrganizer}
          onRemove={handleRemove}
          removingId={removingId}
        />
      )}

      {/* ── Edit Trip (organizer only) ── */}
      {isOrganizer && trip && (
        <div className="card flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-on-surface-variant">edit_note</span>
            <p className="font-newsreader text-headline-sm text-on-surface">Edit Trip</p>
          </div>
          <p className="font-manrope text-body-sm text-on-surface-variant -mt-space-sm">
            As the organizer, you can update the trip's status or delete it entirely.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
            <label htmlFor="trip-status" className="label mb-0 shrink-0">Trip status</label>
            <select
              id="trip-status"
              className="input sm:max-w-xs"
              value={trip.status || 'upcoming'}
              disabled={savingStatus}
              onChange={e => handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className={cn(
              'inline-flex items-center gap-1 px-space-sm py-1 rounded-full font-manrope text-label-caps uppercase w-fit',
              trip.status === 'completed' ? 'bg-emerald/10 text-emerald'
                : trip.status === 'cancelled' ? 'bg-error-container text-on-error-container'
                : 'bg-secondary-fixed/40 text-secondary'
            )}>
              Current: {trip.status || 'upcoming'}
            </span>
          </div>

          <div className="border-t border-outline-variant pt-space-md flex items-center justify-between gap-space-md flex-wrap">
            <div>
              <p className="font-manrope text-label-lg text-on-surface">Delete this trip</p>
              <p className="font-manrope text-body-sm text-on-surface-variant">Permanently removes the trip for everyone. This cannot be undone.</p>
            </div>
            <button onClick={handleDeleteTrip} disabled={deleting} className="btn-danger shrink-0">
              <span className="material-symbols-outlined text-lg">delete_forever</span>
              {deleting ? 'Deleting…' : 'Delete Trip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberGroup({ title, members, canManage = false, onRemove, removingId }) {
  return (
    <div>
      <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest mb-space-sm">{title}</p>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-card divide-y divide-outline-variant">
        {members.map((m, i) => (
          <div key={m.users?.id ?? i} className="flex items-center gap-space-md p-space-md">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-manrope text-label-lg font-bold shrink-0',
              avatarColor(m.users?.name)
            )}>
              {getInitials(m.users?.name)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-manrope text-label-lg text-on-surface truncate">{m.users?.name}</p>
              <p className="font-manrope text-body-sm text-on-surface-variant truncate">{m.users?.email}</p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={cn(
                'inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full font-manrope text-label-caps',
                m.role === 'organizer'
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-surface-container text-on-surface-variant'
              )}>
                {m.role === 'organizer' && (
                  <span className="material-symbols-outlined text-[11px]">military_tech</span>
                )}
                {m.role === 'organizer' ? 'ORGANIZER' : 'MEMBER'}
              </span>
              <span className="font-manrope text-label-caps text-on-surface-variant">
                Joined {formatDate(m.joined_at)}
              </span>
            </div>

            {canManage && (
              <button
                onClick={() => onRemove(m)}
                disabled={removingId === m.users?.id}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error transition-all shrink-0"
                aria-label={`Remove ${m.users?.name}`}
                title={`Remove ${m.users?.name}`}
              >
                <span className="material-symbols-outlined text-lg">
                  {removingId === m.users?.id ? 'hourglass_empty' : 'person_remove'}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
