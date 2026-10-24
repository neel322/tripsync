import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { SectionLoader } from '../../components/ui/Loader';
import { formatCurrency, formatDate, getInitials, avatarColor, cn } from '../../lib/utils';
import { useSocketEvent } from '../../hooks/useSocket';
import { getErrorMessage } from '../../lib/errors';

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'other'];
const CAT_META = {
  food:          { icon: 'restaurant',   color: 'text-amber',    bg: 'bg-amber/10' },
  transport:     { icon: 'directions_car', color: 'text-secondary', bg: 'bg-secondary-fixed/30' },
  accommodation: { icon: 'hotel',        color: 'text-emerald',  bg: 'bg-emerald/10' },
  activity:      { icon: 'attractions',  color: 'text-secondary', bg: 'bg-secondary-fixed/30' },
  shopping:      { icon: 'shopping_bag', color: 'text-on-tertiary-container', bg: 'bg-tertiary-fixed/30' },
  other:         { icon: 'receipt',      color: 'text-on-surface-variant', bg: 'bg-surface-container' },
};

const TABS = ['Expenses', 'Balances', 'Settlements'];

export default function Expenses() {
  const { id: tripId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Expenses');
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const fetchAll = () => {
    Promise.all([
      api.get(`/trips/${tripId}/expenses`),
      api.get(`/trips/${tripId}/members`),
      api.get(`/trips/${tripId}`),
    ]).then(([expRes, memRes, tripRes]) => {
      setData(expRes.data);
      setMembers(memRes.data.members.map(m => m.users));
      setMyRole(tripRes.data.trip.my_role);
    }).catch((err) => toast.error(getErrorMessage(err, 'Failed to load expenses')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [tripId]);
  useSocketEvent('expense_update', fetchAll);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/trips/${tripId}/expenses/${id}`);
      toast.success('Expense deleted');
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err, 'Could not delete the expense')); }
  };

  if (loading) return <SectionLoader />;

  const { expenses = [], totalSpent = 0, perPersonShare = 0, balances = [], settlements = [] } = data || {};

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-newsreader text-headline-md text-on-surface">Expenses</h2>
          <p className="font-manrope text-body-sm text-on-surface-variant mt-0.5">
            {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button onClick={() => { setEditExpense(null); setModalOpen(true); }} className="btn-secondary">
          <span className="material-symbols-outlined text-xl">add</span> Add Expense
        </button>
      </div>

      {/* ── Bento summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md">
        <BentoTile icon="payments" label="Total Spent" value={formatCurrency(totalSpent)} accent="blue" />
        <BentoTile icon="group" label="Per Person" value={formatCurrency(perPersonShare)} accent="slate" />
        <BentoTile icon="receipt_long" label="Transactions" value={String(expenses.length)} accent="slate" className="col-span-2 md:col-span-1" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-space-xs p-1 bg-surface-container-low rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-space-md py-2 rounded-lg font-manrope text-label-md transition-all',
              tab === t
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Expenses tab ── */}
      {tab === 'Expenses' && (
        expenses.length === 0 ? (
          <EmptyExpenses onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-card divide-y divide-outline-variant">
            {expenses.map(exp => {
              const meta = CAT_META[exp.category] || CAT_META.other;
              const canEdit = myRole === 'organizer' || exp.added_by === user?.id;
              return (
                <div key={exp.id} className="flex items-center gap-space-md p-space-md group hover:bg-surface-container-low transition-colors">
                  {/* Category icon */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
                    <span className={cn('material-symbols-outlined text-xl', meta.color)}>{meta.icon}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-manrope text-label-lg text-on-surface truncate">{exp.title}</p>
                    <div className="flex flex-wrap items-center gap-x-space-sm gap-y-0.5 mt-0.5">
                      <span className="flex items-center gap-1 font-manrope text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {exp.payer?.name}
                      </span>
                      <span className="font-manrope text-body-sm text-on-surface-variant">·</span>
                      <span className="font-manrope text-body-sm text-on-surface-variant">{formatDate(exp.date)}</span>
                      <span className={cn(
                        'inline-flex items-center px-space-sm py-0.5 rounded-full font-manrope text-label-caps capitalize',
                        meta.bg, meta.color
                      )}>
                        {exp.category}
                      </span>
                      {exp.expense_splits?.length > 0 && (
                        <span className="flex items-center gap-1 font-manrope text-body-sm text-on-surface-variant" title={exp.expense_splits.map(s => s.users?.name).filter(Boolean).join(', ')}>
                          <span className="material-symbols-outlined text-sm">groups</span>
                          Split with {exp.expense_splits.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + actions */}
                  <div className="flex items-center gap-space-sm shrink-0">
                    <span className="font-manrope text-label-lg text-on-surface font-bold">
                      {formatCurrency(exp.amount)}
                    </span>
                    {canEdit && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditExpense(exp); setModalOpen(true); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-secondary-fixed text-on-surface-variant hover:text-secondary transition-all"
                          aria-label="Edit"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
                          aria-label="Delete"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Balances tab ── */}
      {tab === 'Balances' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-card divide-y divide-outline-variant">
          {balances.length === 0 ? (
            <p className="p-space-xl text-center font-manrope text-body-md text-on-surface-variant">Add expenses to see balances.</p>
          ) : balances.map((b, i) => (
            <div key={i} className="flex items-center gap-space-md p-space-md">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-manrope text-label-lg font-bold shrink-0', avatarColor(b.user?.name))}>
                {getInitials(b.user?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-manrope text-label-lg text-on-surface">{b.user?.name}</p>
                <p className="font-manrope text-body-sm text-on-surface-variant">
                  Paid {formatCurrency(b.paid)} · Share {formatCurrency(perPersonShare)}
                </p>
              </div>
              <div className="text-right shrink-0">
                {Math.abs(b.net) < 0.01 ? (
                  <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-emerald/10 text-emerald font-manrope text-label-caps">
                    <span className="material-symbols-outlined text-sm">check_circle</span> SETTLED
                  </span>
                ) : b.net > 0 ? (
                  <div>
                    <p className="font-manrope text-label-lg text-emerald font-bold">+{formatCurrency(b.net)}</p>
                    <p className="font-manrope text-label-caps text-on-surface-variant">gets back</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-manrope text-label-lg text-error font-bold">-{formatCurrency(Math.abs(b.net))}</p>
                    <p className="font-manrope text-label-caps text-on-surface-variant">owes</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settlements tab ── */}
      {tab === 'Settlements' && (
        settlements.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-space-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-emerald">check_circle</span>
            </div>
            <div className="text-center">
              <h3 className="font-newsreader text-headline-sm text-on-surface">All settled!</h3>
              <p className="font-manrope text-body-md text-on-surface-variant">Everyone is even — no payments needed.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-space-md">
            <p className="font-manrope text-body-sm text-on-surface-variant">
              Minimum transactions to settle all debts:
            </p>
            {settlements.map((s, i) => (
              <div key={i} className="flex items-center gap-space-md p-space-md bg-surface-container-lowest border border-amber/30 rounded-xl shadow-card">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-manrope text-label-md font-bold shrink-0', avatarColor(s.from?.name))}>
                  {getInitials(s.from?.name)}
                </div>
                <div className="flex-1 flex items-center gap-2 flex-wrap font-manrope text-label-lg text-on-surface">
                  <span className="font-semibold">{s.from?.name}</span>
                  <span className="material-symbols-outlined text-base text-on-surface-variant">arrow_forward</span>
                  <span className="font-semibold">{s.to?.name}</span>
                </div>
                <span className="font-manrope text-label-lg text-amber font-bold shrink-0">
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      <ExpenseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditExpense(null); }}
        tripId={tripId}
        editExpense={editExpense}
        members={members}
        onSaved={fetchAll}
      />
    </div>
  );
}

function BentoTile({ icon, label, value, accent, className }) {
  const accents = {
    blue:  'bg-secondary-fixed/30 border-secondary-fixed text-secondary',
    slate: 'bg-surface-container-lowest border-outline-variant text-on-surface',
  };
  return (
    <div className={cn('rounded-xl border p-space-md shadow-card flex flex-col gap-1', accents[accent], className)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('material-symbols-outlined text-lg', accent === 'blue' ? 'text-secondary' : 'text-on-surface-variant')}>
          {icon}
        </span>
        <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">{label}</p>
      </div>
      <p className="font-manrope text-headline-sm font-bold">{value}</p>
    </div>
  );
}

function EmptyExpenses({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-space-lg text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center text-4xl">💸</div>
      <div>
        <h3 className="font-newsreader text-headline-sm text-on-surface mb-1">No expenses yet</h3>
        <p className="font-manrope text-body-md text-on-surface-variant max-w-xs">
          Record who paid what and we'll calculate exactly who owes whom.
        </p>
      </div>
      <button onClick={onAdd} className="btn-secondary">
        <span className="material-symbols-outlined text-xl">add</span> Add First Expense
      </button>
    </div>
  );
}

function ExpenseModal({ open, onClose, tripId, editExpense, members, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', amount: '', category: 'other', paid_by: '', notes: '', date: '' });
  const [splitWith, setSplitWith] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editExpense ? {
      title: editExpense.title || '', amount: editExpense.amount || '',
      category: editExpense.category || 'other', paid_by: editExpense.paid_by || '',
      notes: editExpense.notes || '', date: editExpense.date || '',
    } : {
      title: '', amount: '', category: 'other', paid_by: user?.id || '',
      notes: '', date: new Date().toISOString().split('T')[0],
    });

    // Who's sharing this expense: default to everyone in the trip.
    // When editing an expense that already has specific splits recorded,
    // preselect exactly those members (the people who were present).
    if (editExpense?.expense_splits?.length > 0) {
      setSplitWith(editExpense.expense_splits.map(s => s.user_id));
    } else {
      setSplitWith(members.map(m => m?.id).filter(Boolean));
    }
  }, [open, editExpense, user, members]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleMember = (id) => {
    setSplitWith(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!form.title.trim()) { toast.error('Please enter a title for the expense.'); return; }
    if (form.amount === '' || isNaN(amt)) { toast.error('Please enter the amount.'); return; }
    if (amt <= 0) { toast.error('The amount must be greater than 0.'); return; }
    if (!form.paid_by) { toast.error('Please choose who paid for this expense.'); return; }
    if (splitWith.length === 0) {
      toast.error('Select at least one person to split this expense with.');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, split_with: splitWith };
      if (editExpense) {
        await api.patch(`/trips/${tripId}/expenses/${editExpense.id}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post(`/trips/${tripId}/expenses`, payload);
        toast.success('Expense added');
      }
      onSaved(); onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, editExpense ? 'Could not update the expense' : 'Could not add the expense'));
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editExpense ? 'Edit Expense' : 'Add Expense'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label">Title <span className="text-error">*</span></label>
          <input required value={form.title} onChange={e => set('title', e.target.value)} className="input" placeholder="e.g. Hotel Booking" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹) <span className="text-error">*</span></label>
            <input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} className="input" placeholder="0.00" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Paid by <span className="text-error">*</span></label>
            <select required value={form.paid_by} onChange={e => set('paid_by', e.target.value)} className="input">
              <option value="">Select member</option>
              {members.map(m => <option key={m?.id} value={m?.id}>{m?.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} className="input" placeholder="Optional notes" />
        </div>

        {/* ── Who's splitting this expense ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">
              Split with <span className="text-error">*</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSplitWith(members.map(m => m?.id).filter(Boolean))}
                className="font-manrope text-label-caps text-secondary hover:underline">
                Select all
              </button>
              <button type="button" onClick={() => setSplitWith([])}
                className="font-manrope text-label-caps text-on-surface-variant hover:underline">
                Clear
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Only people who were present for this expense need to be checked — everyone else won't be charged a share.
          </p>
          <div className="border border-outline-variant rounded-lg divide-y divide-outline-variant max-h-48 overflow-y-auto">
            {members.map(m => {
              if (!m) return null;
              const checked = splitWith.includes(m.id);
              return (
                <label key={m.id} className="flex items-center gap-space-sm px-space-md py-2.5 cursor-pointer hover:bg-surface-container-low transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4 rounded accent-secondary shrink-0"
                  />
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-white font-manrope text-label-caps font-bold shrink-0',
                    avatarColor(m.name)
                  )}>
                    {getInitials(m.name)}
                  </div>
                  <span className="font-manrope text-body-sm text-on-surface truncate">{m.name}</span>
                </label>
              );
            })}
          </div>
          {splitWith.length > 0 && (
            <p className="text-xs text-slate-400 mt-1.5">
              Split {splitWith.length} way{splitWith.length !== 1 ? 's' : ''}{form.amount ? ` · ${formatCurrency(parseFloat(form.amount || 0) / splitWith.length)} each` : ''}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-secondary flex-1 justify-center">
            {loading ? 'Saving…' : editExpense ? 'Update' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
