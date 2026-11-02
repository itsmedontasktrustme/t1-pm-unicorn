import StatePanel from "./StatePanel";

/**
 * Shown when a list or page has no data yet.
 * `iconSrc` — one of the brand icons from src/assets.
 */
function EmptyState({ iconSrc, title, text, actions, note }) {
  return (
    <StatePanel
      icon={iconSrc ? <img src={iconSrc} alt="" /> : null}
      title={title}
      text={text}
      actions={actions}
      note={note}
    />
  );
}

export default EmptyState;
