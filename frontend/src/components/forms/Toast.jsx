import { useEffect } from "react";

/**
 * Short confirmation after a successful action ("Saved").
 * Render it when `message` is set; it calls onClose after `duration` ms.
 */
function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message || !onClose) {
      return undefined;
    }

    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) {
    return null;
  }

  return (
    <div className="hk-toast" role="status" aria-live="polite">
      <span className="hk-toast__icon" aria-hidden="true">✓</span>
      {message}
    </div>
  );
}

export default Toast;
