import { useEffect, useRef } from 'react';

export default function AppModal({ open, title, onClose, children, width = '520px' }) {
  const cardRef = useRef(null);
  const headingIdRef = useRef(`rf-modal-title-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    const card = cardRef.current;

    if (card) {
      const focusables = card.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusables[0];
      if (first && typeof first.focus === 'function') first.focus();
      else card.focus();
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key !== 'Tab' || !cardRef.current) return;

      const focusables = cardRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rf-modal-backdrop" onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingIdRef.current : undefined}
        tabIndex={-1}
        className="rf-modal-card"
        style={{ width: `min(${width}, 100%)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 id={headingIdRef.current} style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', marginTop: 0 }}>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
