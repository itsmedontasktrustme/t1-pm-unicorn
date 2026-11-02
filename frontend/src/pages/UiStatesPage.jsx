import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import tasksIcon from "../assets/tasks-green.svg";
import { AccessDeniedState, EmptyState, ErrorState, LoadingState } from "../components/states";
import { FormBanner, FormField, Toast } from "../components/forms";

/*
 * Development-only showcase of shared UI states (route /ui-states).
 * Lets designers, developers and QA check every state without a backend
 * or a signed-in user. Not registered in production builds.
 * Use ?state=<key> to show a single state; ?state=form&invalid=1 opens the form with errors.
 */

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function validateTask(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = "Enter a task name.";
  }

  if (!values.due) {
    errors.due = "Choose a due date.";
  } else if (values.due < todayIso()) {
    errors.due = "Due date can’t be in the past.";
  }

  if (!/^\d+$/.test(values.cookies) || Number(values.cookies) < 1) {
    errors.cookies = "Use a whole number, 1 or more.";
  }

  return errors;
}

const initialTask = { name: "", description: "", due: "2026-10-28", cookies: "3" };

function TaskFormDemo({ startInvalid = false }) {
  const [values, setValues] = useState(initialTask);
  const [errors, setErrors] = useState(() => (startInvalid ? validateTask(initialTask) : {}));
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const errorCount = Object.keys(errors).length;

  const update = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateTask(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setToast("Task saved");
    }
  };

  return (
    <form className="hk-form hk-form--card" noValidate onSubmit={handleSubmit}>
      {errorCount > 0 && (
        <FormBanner title={`Please fix ${errorCount} ${errorCount === 1 ? "field" : "fields"}`}>
          The task wasn’t saved yet.
        </FormBanner>
      )}

      <FormField id="demo-name" label="Task name" required error={errors.name}>
        <input type="text" value={values.name} onChange={update("name")} placeholder="e.g. Vacuum the living room" />
      </FormField>

      <FormField id="demo-description" label="Description">
        <textarea value={values.description} onChange={update("description")} />
      </FormField>

      <div className="hk-form__row">
        <FormField id="demo-due" label="Due date" required error={errors.due}>
          <input type="date" value={values.due} onChange={update("due")} />
        </FormField>
        <FormField id="demo-cookies" label="Cookies" required hint="Whole number, 1 or more." error={errors.cookies}>
          <input type="text" inputMode="numeric" value={values.cookies} onChange={update("cookies")} />
        </FormField>
      </div>

      <div className="hk-form__actions">
        <button type="submit" className="hk-btn hk-btn--primary">
          Create task
        </button>
        <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setErrors({})}>
          Cancel
        </button>
      </div>

      <Toast message={toast} onClose={closeToast} />
    </form>
  );
}

function ExpiredInvitationDemo() {
  return (
    <form className="hk-form hk-form--card" noValidate onSubmit={(event) => event.preventDefault()}>
      <FormBanner title="This invitation has expired">
        Invitations are valid for 7 days. Ask the owner to send you a new one.
      </FormBanner>
      <FormField id="demo-code" label="Invitation code" error="Expired on 30/10/2026.">
        <input type="text" defaultValue="HK-4F9Q-2B" />
      </FormField>
      <div className="hk-form__actions">
        <button type="submit" className="hk-btn hk-btn--primary">
          Join household
        </button>
        <button type="button" className="hk-btn hk-btn--secondary">
          Create my own household
        </button>
      </div>
    </form>
  );
}

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
  error: () => <ErrorState text="We couldn’t load your tasks. Check your connection and try again." onRetry={() => {}} code={503} />,
  form: (params) => <TaskFormDemo startInvalid={params.get("invalid") === "1"} />,
  denied: () => (
    <AccessDeniedState
      title="This part is for the owner"
      text="Only the household owner can grant or remove the manager role. You can still see who is in the household."
      role="Housemate"
      backLabel="Back to household"
      contactHint="Need access? Ask the owner, Vernon D."
    />
  ),
  invite: () => <ExpiredInvitationDemo />
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
          {sections[key](searchParams)}
        </div>
      ))}
    </div>
  );
}

export default UiStatesPage;
