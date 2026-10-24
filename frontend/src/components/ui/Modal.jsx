import { useEffect, useRef } from 'react';

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary-container/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog" aria-modal="true" aria-labelledby="modal-title"
    >
      <div className={`w-full bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-card-lg border border-outline-variant flex flex-col max-h-[92vh] sm:max-h-[85vh] ${sizes[size]}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant shrink-0">
          <h2 id="modal-title" className="font-newsreader text-headline-sm text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        {/* Body */}
        <div className="px-space-lg py-space-md overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
