import { useEffect, useRef } from "react";

/**
 * Bottom sheet on phones, centred dialog from 768px (HK-47/HK-50 design).
 * Closes on Esc and on a click on the backdrop; moves focus inside when opened
 * and gives it back to the opener when closed.
 */
function Sheet({ open, onClose, labelledBy, role = "dialog", children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const opener = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelector("button:not([disabled]), [href], input, [tabindex]:not([tabindex='-1'])");
    (focusable || panel)?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
      if (opener && typeof opener.focus === "function") {
        opener.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="hk-sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="hk-sheet" role={role} aria-modal="true" aria-labelledby={labelledBy} ref={panelRef} tabIndex={-1}>
        <div className="hk-sheet__grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export default Sheet;
