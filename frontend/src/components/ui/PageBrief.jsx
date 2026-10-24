/**
 * PageBrief — a subtle top-of-page contextual prompt
 * shown on each feature section so users know what they can do.
 */
export function PageBrief({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 mb-5">
      <span className="text-2xl select-none mt-0.5" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-primary-800">{title}</p>
        <p className="text-xs text-primary-600 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
