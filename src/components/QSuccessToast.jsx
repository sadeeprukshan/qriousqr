import React, { useEffect } from 'react';

/**
 * QSuccessToast — floating animated-tick success confirmation.
 * Auto-dismisses after `durationMs` (default 2500ms).
 *
 * Usage:
 *   <QSuccessToast
 *     message="Category deleted."
 *     visible={successMsg !== ''}
 *     onDismiss={() => setSuccessMsg('')}
 *   />
 */
export default function QSuccessToast({ message, visible, onDismiss, durationMs = 2500 }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onDismiss?.(), durationMs);
    return () => clearTimeout(t);
  }, [visible, message, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <div className="q-success-toast" role="status" aria-live="polite">
      <svg
        className="q-tick-svg q-tick-svg--sm"
        viewBox="0 0 52 52"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle className="q-tick-circle" cx="26" cy="26" r="25" fill="none" />
        <path
          className="q-tick-check"
          fill="none"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
        />
      </svg>
      <span className="q-success-toast__message">{message}</span>
    </div>
  );
}
