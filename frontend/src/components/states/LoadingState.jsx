import Spinner from "./Spinner";

function SkeletonCard() {
  return (
    <div className="hk-skeleton-card">
      <div className="hk-sk-row">
        <div className="hk-sk hk-sk--title" />
        <div className="hk-sk hk-sk--badge" />
      </div>
      <div className="hk-sk" />
      <div className="hk-sk hk-sk--short" />
      <div className="hk-sk hk-sk--button" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="hk-skeleton-card hk-skeleton-card--row">
      <div className="hk-sk hk-sk--dot" />
      <div className="hk-sk" />
    </div>
  );
}

/**
 * Placeholder shown while data is loading.
 * variant "cards" mimics task cards, "rows" mimics simple list rows (history).
 */
function LoadingState({ label = "Loading…", count = 3, variant = "cards" }) {
  const Item = variant === "rows" ? SkeletonRow : SkeletonCard;

  return (
    <div className="hk-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="hk-loading__hint">
        <Spinner />
        <span>{label}</span>
      </div>
      <div className={`hk-loading__list hk-loading__list--${variant}`} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <Item key={index} />
        ))}
      </div>
    </div>
  );
}

export default LoadingState;
