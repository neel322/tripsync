import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { SectionLoader } from '../../components/ui/Loader';
import { formatCurrency, cn } from '../../lib/utils';
import { getErrorMessage } from '../../lib/errors';

const CAT_ICONS = {
  food: 'restaurant', transport: 'directions_car', accommodation: 'hotel',
  activity: 'attractions', shopping: 'shopping_bag', other: 'receipt',
};
const CAT_COLORS = {
  food: 'bg-amber/10 text-amber', transport: 'bg-secondary-fixed/30 text-secondary',
  accommodation: 'bg-emerald/10 text-emerald', activity: 'bg-secondary-fixed/30 text-secondary',
  shopping: 'bg-tertiary-fixed/30 text-on-tertiary-fixed', other: 'bg-surface-container text-on-surface-variant',
};

export default function Budget() {
  const { id: tripId } = useParams();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/trips/${tripId}/budget`)
      .then(({ data }) => setBudget(data))
      .catch((err) => toast.error(getErrorMessage(err, 'Failed to load budget')))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <SectionLoader />;
  if (!budget) return null;

  const { totalBudget, totalSpent, estimatedCost, remaining, byCategory } = budget;
  const spentPct  = totalBudget > 0 ? Math.min(100, (totalSpent   / totalBudget) * 100) : 0;
  const estPct    = totalBudget > 0 ? Math.min(100, (estimatedCost / totalBudget) * 100) : 0;
  const isOver    = totalSpent > totalBudget && totalBudget > 0;
  const cats      = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Header ── */}
      <div>
        <h2 className="font-newsreader text-headline-md text-on-surface">Budget</h2>
        <p className="font-manrope text-body-sm text-on-surface-variant mt-0.5">
          Financial overview for this trip
        </p>
      </div>

      {/* ── Bento KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <KpiTile icon="target" label="Total Budget"  value={formatCurrency(totalBudget)} color="blue" />
        <KpiTile icon="payments" label="Total Spent" value={formatCurrency(totalSpent)} color={isOver ? 'red' : 'slate'} />
        <KpiTile icon="trending_up" label="Estimated" value={formatCurrency(estimatedCost)} color="amber" />
        <KpiTile icon="savings" label="Remaining"   value={formatCurrency(Math.max(0, remaining))} color={remaining < 0 ? 'red' : 'green'} />
      </div>

      {/* ── Progress bars ── */}
      <div className="card flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">Budget Tracker</p>
          {isOver && (
            <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-error-container font-manrope text-label-caps text-on-error-container">
              <span className="material-symbols-outlined text-sm">warning</span> OVER BUDGET
            </span>
          )}
        </div>

        {totalBudget === 0 ? (
          <p className="font-manrope text-body-md text-on-surface-variant text-center py-4">
            No budget set. Edit the trip to add one.
          </p>
        ) : (
          <div className="flex flex-col gap-space-md">
            {/* Spent bar */}
            <div>
              <div className="flex justify-between font-manrope text-label-md text-on-surface-variant mb-1.5">
                <span>Actual Spent</span>
                <span className="text-on-surface font-semibold">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
                </span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', isOver ? 'bg-error' : 'bg-secondary')}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <p className="font-manrope text-label-caps text-on-surface-variant mt-1">{spentPct.toFixed(1)}% used</p>
            </div>

            {/* Estimated bar */}
            {estimatedCost > 0 && (
              <div>
                <div className="flex justify-between font-manrope text-label-md text-on-surface-variant mb-1.5">
                  <span>Itinerary Estimate</span>
                  <span className="text-on-surface font-semibold">{formatCurrency(estimatedCost)}</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber transition-all duration-700"
                    style={{ width: `${estPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Category breakdown ── */}
      {cats.length > 0 && (
        <div className="card flex flex-col gap-space-md">
          <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">Spending by Category</p>
          <div className="flex flex-col gap-space-sm">
            {cats.map(([cat, amount]) => {
              const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-space-sm">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', CAT_COLORS[cat] || CAT_COLORS.other)}>
                        <span className="material-symbols-outlined text-base">{CAT_ICONS[cat] || 'receipt'}</span>
                      </div>
                      <span className="font-manrope text-label-lg text-on-surface capitalize">{cat}</span>
                    </div>
                    <div className="flex items-center gap-space-md text-right">
                      <span className="font-manrope text-label-caps text-on-surface-variant">{pct.toFixed(1)}%</span>
                      <span className="font-manrope text-label-lg text-on-surface font-semibold w-24 text-right">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value, color }) {
  const colors = {
    blue:  'border-secondary-fixed bg-secondary-fixed/20 text-secondary',
    slate: 'border-outline-variant bg-surface-container-lowest text-on-surface',
    green: 'border-emerald/30 bg-emerald/10 text-emerald',
    amber: 'border-amber/30 bg-amber/10 text-amber',
    red:   'border-error-container bg-error-container/50 text-error',
  };
  return (
    <div className={cn('rounded-xl border p-space-md shadow-card flex flex-col gap-1', colors[color])}>
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-lg opacity-70">{icon}</span>
        <p className="font-manrope text-label-caps text-on-surface-variant uppercase tracking-widest">{label}</p>
      </div>
      <p className="font-manrope text-headline-sm font-bold">{value}</p>
    </div>
  );
}
