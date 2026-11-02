import { useSearchParams } from "react-router-dom";
import tasksIcon from "../assets/tasks-green.svg";
import { EmptyState, ErrorState, LoadingState } from "../components/states";

/*
 * Development-only showcase of shared UI states (route /ui-states).
 * Lets designers, developers and QA check every state without a backend
 * or a signed-in user. Not registered in production builds.
 * Use ?state=loading|empty|error to show a single state.
 */

const sections = {
  loading: () => <LoadingState label="Loading tasks…" count={4} />,
  empty: () => (
    <EmptyState
      iconSrc={tasksIcon}
      title="All clear — no tasks yet!"
      text="When a manager creates a task in this household, it will show up here."
      actions={
        <button type="button" className="hk-btn hk-btn--primary">
          Create task
        </button>
      }
      note="“Create task” is shown only to managers."
    />
  ),
  error: () => <ErrorState text="We couldn’t load your tasks. Check your connection and try again." onRetry={() => {}} code={503} />
};

function UiStatesPage() {
  const [searchParams] = useSearchParams();
  const only = searchParams.get("state");
  const keys = only && sections[only] ? [only] : Object.keys(sections);

  return (
    <div className="placeholder-page ui-states-page">
      <h2>UI states</h2>
      {keys.map((key) => (
        <div key={key} className="ui-states-page__block" data-state={key}>
          {!only && <h3>{key}</h3>}
          {sections[key]()}
        </div>
      ))}
    </div>
  );
}

export default UiStatesPage;
