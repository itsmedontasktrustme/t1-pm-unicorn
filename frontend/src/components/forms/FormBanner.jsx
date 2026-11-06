/**
 * Message at the top of a form or page.
 * tone "danger" — something is wrong and the user can fix it (announced as alert);
 * tone "info"   — neutral notice, e.g. a cancelled action (announced politely).
 */
function FormBanner({ title, children, tone = "danger" }) {
  const isDanger = tone === "danger";

  return (
    <div className={`hk-banner hk-banner--${tone}`} role={isDanger ? "alert" : "status"}>
      <span className={isDanger ? "hk-error-dot" : "hk-info-dot"} aria-hidden="true">
        {isDanger ? "!" : "i"}
      </span>
      <div>
        <strong className="hk-banner__title">{title}</strong>
        {children && <p className="hk-banner__body">{children}</p>}
      </div>
    </div>
  );
}

export default FormBanner;
