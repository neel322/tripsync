import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { SectionLoader } from '../../components/ui/Loader';
import { formatCurrency, cn } from '../../lib/utils';
import { useSocketEvent } from '../../hooks/useSocket';
import { getErrorMessage } from '../../lib/errors';

const TYPE_OPTIONS = ['activity', 'travel', 'food', 'accommodation', 'other'];

const TYPE_META = {
  activity:      { icon: 'attractions',       color: 'text-secondary',  bg: 'bg-secondary-fixed/30' },
  travel:        { icon: 'flight',             color: 'text-on-surface', bg: 'bg-surface-container' },
  food:          { icon: 'restaurant',         color: 'text-amber',      bg: 'bg-amber/10' },
  accommodation: { icon: 'hotel',              color: 'text-emerald',    bg: 'bg-emerald/10' },
  other:         { icon: 'push_pin',           color: 'text-on-surface-variant', bg: 'bg-surface-container-low' },
};

export default function Itinerary() {
  const { id: tripId } = useParams();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState('member');
  const [activeDay, setActiveDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchItinerary = () => {
    api.get(`/trips/${tripId}/itinerary`)
      .then(({ data }) => {
        setItems(data.items);
        setGrouped(data.itinerary);
        const days = Object.keys(data.itinerary).map(Number).sort((a, b) => a - b);
        if (days.length && activeDay === null) setActiveDay(days[0]);
      })
      .catch((err) => toast.error(getErrorMessage(err, 'Failed to load itinerary')))
      .finally(() => setLoading(false));

    api.get(`/trips/${tripId}`).then(({ data }) => setMyRole(data.trip.my_role)).catch(() => {});
  };

  useEffect(fetchItinerary, [tripId]);
  useSocketEvent('itinerary_update', fetchItinerary);

  const openAdd  = () => { setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setModalOpen(true); };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Remove this activity?')) return;
    try {
      await api.delete(`/trips/${tripId}/itinerary/${itemId}`);
      toast.success('Activity removed');
      fetchItinerary();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the activity'));
    }
  };

  if (loading) return <SectionLoader />;

  const days = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const visibleItems = activeDay !== null ? (grouped[activeDay] || []) : [];

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-newsreader text-headline-md text-on-surface">Itinerary</h2>
          <p className="font-manrope text-body-sm text-on-surface-variant mt-0.5">
            {items.length} activities across {days.length} day{days.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openAdd} className="btn-secondary">
          <span className="material-symbols-outlined text-xl">add</span>
          Add Activity
        </button>
      </div>

      {days.length === 0 ? (
        <EmptyItinerary onAdd={openAdd} />
      ) : (
        <>
          {/* ── Day tab bar ── */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 no-scrollbar">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={cn(
                  'flex flex-col items-center px-space-md py-2 rounded-xl font-manrope text-label-lg whitespace-nowrap transition-all duration-200 border shrink-0',
                  activeDay === day
                    ? 'bg-primary text-on-primary border-primary shadow-card'
                    : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                )}
              >
                <span className="text-label-caps uppercase tracking-widest opacity-70">Day</span>
                <span className="text-xl font-bold leading-none">{day}</span>
                <span className="text-label-caps opacity-60 mt-0.5">
                  {grouped[day]?.length || 0} stops
                </span>
              </button>
            ))}
          </div>

          {/* ── Timeline ── */}
          <div className="relative">
            {/* Vertical track */}
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-outline-variant" />

            <div className="flex flex-col gap-space-md pl-14">
              {visibleItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-manrope text-body-md text-on-surface-variant">No activities for Day {activeDay} yet.</p>
                  <button onClick={openAdd} className="btn-outline mt-3">
                    <span className="material-symbols-outlined text-lg">add</span> Add to this day
                  </button>
                </div>
              ) : (
                visibleItems.map((item, idx) => {
                  const meta = TYPE_META[item.type] || TYPE_META.other;
                  const canEdit = myRole === 'organizer' || item.created_by === user?.id;
                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute -left-14 top-4 w-11 h-11 rounded-full flex items-center justify-center shadow-card border-2 border-surface-container-lowest',
                        meta.bg
                      )}>
                        <span className={cn('material-symbols-outlined text-xl', meta.color)}>{meta.icon}</span>
                      </div>

                      {/* Card */}
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md shadow-card hover:shadow-card-lg transition-all duration-200">
                        <div className="flex items-start justify-between gap-space-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-space-sm flex-wrap">
                              <h3 className="font-newsreader text-headline-sm text-on-surface">{item.title}</h3>
                              {item.time && (
                                <span className="inline-flex items-center gap-1 font-manrope text-label-caps text-on-surface-variant">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  {item.time}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="font-manrope text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-space-md mt-2">
                              {item.location && (
                                <span className="flex items-center gap-1 font-manrope text-label-md text-on-surface-variant">
                                  <span className="material-symbols-outlined text-sm">location_on</span>
                                  {item.location}
                                </span>
                              )}
                              {item.estimated_cost > 0 && (
                                <span className="flex items-center gap-1 font-manrope text-label-md text-emerald font-semibold">
                                  <span className="material-symbols-outlined text-sm">currency_rupee</span>
                                  ~{formatCurrency(item.estimated_cost)}
                                </span>
                              )}
                              <span className="font-manrope text-label-caps text-on-surface-variant/60">
                                Added by {item.users?.name}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions (hover) */}
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => openEdit(item)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-secondary-fixed text-on-surface-variant hover:text-secondary transition-all"
                                aria-label="Edit"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
                                aria-label="Delete"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connector line gap at last item */}
                      {idx === visibleItems.length - 1 && (
                        <div className="absolute -left-[52px] top-[52px] bottom-0 w-px bg-background" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <ItineraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tripId={tripId}
        editItem={editItem}
        defaultDay={activeDay}
        onSaved={fetchItinerary}
      />
    </div>
  );
}

function EmptyItinerary({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-space-lg text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center text-4xl">🗓️</div>
      <div>
        <h3 className="font-newsreader text-headline-sm text-on-surface mb-1">No activities yet</h3>
        <p className="font-manrope text-body-md text-on-surface-variant max-w-xs">
          Start building your day-by-day plan. Add flights, hotels, meals, and activities.
        </p>
      </div>
      <button onClick={onAdd} className="btn-secondary">
        <span className="material-symbols-outlined text-xl">add</span> Add First Activity
      </button>
    </div>
  );
}

function ItineraryModal({ open, onClose, tripId, editItem, defaultDay, onSaved }) {
  const [form, setForm] = useState({
    title: '', description: '', day_number: 1, time: '',
    location: '', type: 'activity', estimated_cost: '', order_index: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editItem ? {
        title: editItem.title || '', description: editItem.description || '',
        day_number: editItem.day_number || defaultDay || 1, time: editItem.time || '',
        location: editItem.location || '', type: editItem.type || 'activity',
        estimated_cost: editItem.estimated_cost || '', order_index: editItem.order_index || 0,
      } : {
        title: '', description: '', day_number: defaultDay || 1, time: '',
        location: '', type: 'activity', estimated_cost: '', order_index: 0,
      });
    }
  }, [open, editItem, defaultDay]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Please give this activity a title.'); return; }
    const day = Number(form.day_number);
    if (!Number.isInteger(day) || day < 1) { toast.error('Day number must be a whole number, 1 or higher.'); return; }
    if (form.estimated_cost !== '' && (isNaN(Number(form.estimated_cost)) || Number(form.estimated_cost) < 0)) {
      toast.error('Estimated cost must be a number that is 0 or more.');
      return;
    }
    setLoading(true);
    try {
      if (editItem) {
        await api.patch(`/trips/${tripId}/itinerary/${editItem.id}`, form);
        toast.success('Activity updated');
      } else {
        await api.post(`/trips/${tripId}/itinerary`, form);
        toast.success('Activity added');
      }
      onSaved(); onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, editItem ? 'Could not update the activity' : 'Could not add the activity'));
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? 'Edit Activity' : 'Add Activity'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label">Title <span className="text-error">*</span></label>
          <input required value={form.title} onChange={e => set('title', e.target.value)} className="input" placeholder="e.g. Visit Baga Beach" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Day <span className="text-error">*</span></label>
            <input type="number" min="1" required value={form.day_number} onChange={e => set('day_number', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" value={form.time} onChange={e => set('time', e.target.value)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="input">
              {TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Est. Cost (₹)</label>
            <input type="number" min="0" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} className="input" placeholder="0" />
          </div>
        </div>
        <div>
          <label className="label">Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} className="input" placeholder="e.g. North Goa" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} className="input input-textarea resize-none" placeholder="Optional notes…" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-secondary flex-1 justify-center">
            {loading ? 'Saving…' : editItem ? 'Update' : 'Add Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
