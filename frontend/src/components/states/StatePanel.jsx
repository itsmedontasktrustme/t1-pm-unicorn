/**
 * Centered message panel used by empty, error and access-denied states.
 * Pass buttons/links as `actions`.
 */
function StatePanel({ icon, title, text, badge, actions, note, tone = "default", role }) {
  const className = tone === "danger" ? "hk-state hk-state--danger" : "hk-state";

  return (
    <section className={className} role={role}>
      {icon && (
        <div className="hk-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="hk-state__title">{title}</h2>
      {text && <p className="hk-state__text">{text}</p>}
      {badge && <span className="hk-badge">{badge}</span>}
      {actions && <div className="hk-state__actions">{actions}</div>}
      {note && <p className="hk-hint">{note}</p>}
    </section>
  );
}

export default StatePanel;
