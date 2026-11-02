/**
 * Message at the top of a form, e.g. "Please fix 2 fields" or
 * "This invitation has expired". Announced to screen readers.
 */
function FormBanner({ title, children, tone = "danger" }) {
  return (
    <div className={`hk-banner hk-banner--${tone}`} role="alert">
      <span className="hk-error-dot" aria-hidden="true">!</span>
      <div>
        <strong className="hk-banner__title">{title}</strong>
        {children && <p className="hk-banner__body">{children}</p>}
      </div>
    </div>
  );
}

export default FormBanner;
