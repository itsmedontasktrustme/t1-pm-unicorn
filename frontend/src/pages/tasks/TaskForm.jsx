import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import { FormBanner, FormField } from "../../components/forms";
import { AccessDeniedState } from "../../components/states";
import { initials } from "../history/historyFormat";
import { createTask, TASK_DESCRIPTION_MAX, TASK_NAME_MAX, updateTask, validateTask } from "../../api/tasks";
import { joinDue, splitDue } from "./taskFormat";

/*
 * HK-75 Create task (design HK-74, US5) and HK-81 Edit task (design HK-80, US6).
 * Only the name is required (BR-TASK-02); the due date has a date and a time.
 * Editing has no assignee field: assigning is done with Assign (US7).
 */

function Stepper({ value, onChange, invalid, describedBy }) {
  const number = Number.isInteger(Number(value)) ? Number(value) : 0;
  return (
    <div className={invalid ? "hk-stepper hk-stepper--invalid" : "hk-stepper"}>
      <button type="button" aria-label="Fewer cookies" onClick={() => onChange(String(Math.max(0, number - 1)))}>
        −
      </button>
      <label className="hk-stepper__value">
        <img src={cookieIcon} alt="" />
        <input
          id="task-cookies"
          inputMode="numeric"
          aria-label="Cookies"
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button type="button" aria-label="More cookies" onClick={() => onChange(String(number + 1))}>
        +
      </button>
    </div>
  );
}

function TaskForm({ mode }) {
  const isEdit = mode === "edit";
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, user, householdId, householdName, reload, showToast } = useOutletContext();
  const query = searchParams.toString() ? `?${searchParams}` : "";
  const existing = isEdit ? data.tasks.find((item) => item.id === taskId) : null;
  const initialDue = splitDue(existing?.due);

  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [dueDate, setDueDate] = useState(initialDue.date);
  const [dueTime, setDueTime] = useState(initialDue.time || "20:00");
  const [cookies, setCookies] = useState(existing ? String(existing.cookies ?? 0) : "1");
  const [assigneeId, setAssigneeId] = useState("");
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const backTo = isEdit ? `/tasks/${taskId}${query}` : `/tasks${query}`;

  if (!data.isManager) {
    return (
      <div className="hk-card hk-tasks__panel">
        <AccessDeniedState title="Only a manager can create and edit tasks" text="Ask a manager of this household." backPath="/tasks" backLabel="Back to Tasks" />
      </div>
    );
  }

  if (isEdit && (!existing || existing.status === "done")) {
    return (
      <div className="hk-card hk-tasks__panel">
        <Link className="hk-back" to={backTo}>
          Task
        </Link>
        <FormBanner title={existing ? "A task with the status Done cannot be edited" : "This task no longer exists."} />
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const input = { title, description, due: joinDue(dueDate, dueTime), cookies, assigneeId: assigneeId || null };
    const { fields } = validateTask(input, { isNew: !isEdit, previousDue: existing?.due });

    setBanner(null);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      return;
    }
    setErrors({});
    setBusy(true);

    try {
      const saved = isEdit
        ? await updateTask(user, householdId, taskId, input)
        : await createTask(user, householdId, input);
      showToast("Saved");
      reload();
      navigate(`/tasks/${saved.id}${query}`);
    } catch (saveError) {
      if (saveError.fields) {
        setErrors(saveError.fields);
      } else {
        setBanner(saveError.message);
        if (saveError.code === "not-housemate") {
          setAssigneeId("");
          reload();
        }
      }
      setBusy(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="hk-card hk-tasks__panel">
      <Link className="hk-back" to={backTo}>
        {isEdit ? "Task" : "Tasks"}
      </Link>
      <form className="hk-form hk-tasks__form" noValidate onSubmit={submit}>
        <h2>{isEdit ? "Edit task" : "Create task"}</h2>

        {errorCount > 0 && (
          <FormBanner title={`Please fix ${errorCount} field${errorCount > 1 ? "s" : ""}`}>The task was not saved.</FormBanner>
        )}
        {banner && <FormBanner title={banner}>The task was not saved. Choose someone from the list again.</FormBanner>}
        {isEdit && (
          <div className="hk-tasks__note">Changes are visible to everyone in {householdName} right away.</div>
        )}

        <FormField id="task-title" label="Task name" required error={errors.title} hint={`Up to ${TASK_NAME_MAX} characters`}>
          <input
            className="hk-tasks__hand"
            value={title}
            maxLength={TASK_NAME_MAX + 20}
            placeholder="What needs doing?"
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>

        <FormField
          id="task-description"
          label="Description (optional)"
          error={errors.description}
          hint={`Up to ${TASK_DESCRIPTION_MAX} characters`}
        >
          <textarea
            className="hk-tasks__hand"
            rows={3}
            value={description}
            placeholder="Anything housemates should know"
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>

        <fieldset className="hk-field hk-tasks__fieldset">
          <legend className="hk-field__label">Due (optional)</legend>
          <div className="hk-tasks__row2">
            <input
              type="date"
              className="hk-field__control"
              aria-label="Due date"
              aria-invalid={errors.due ? "true" : undefined}
              aria-describedby="task-due-note"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <input
              type="time"
              className="hk-field__control"
              aria-label="Due time"
              aria-invalid={errors.due ? "true" : undefined}
              aria-describedby="task-due-note"
              value={dueTime}
              disabled={!dueDate}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </div>
          {errors.due ? (
            <div className="hk-field__error" id="task-due-note">
              <span className="hk-error-dot" aria-hidden="true">!</span>
              {errors.due}
            </div>
          ) : (
            <div className="hk-field__hint" id="task-due-note">
              Cookies are credited only if the task is done by then.
            </div>
          )}
        </fieldset>

        <div className="hk-field">
          <span className="hk-field__label">Cookies (optional)</span>
          <Stepper value={cookies} onChange={setCookies} invalid={Boolean(errors.cookies)} describedBy="task-cookies-note" />
          {errors.cookies ? (
            <div className="hk-field__error" id="task-cookies-note">
              <span className="hk-error-dot" aria-hidden="true">!</span>
              {errors.cookies}
            </div>
          ) : (
            <div className="hk-field__hint" id="task-cookies-note">
              A whole number
            </div>
          )}
        </div>

        {!isEdit && (
          <fieldset className="hk-field hk-tasks__fieldset">
            <legend className="hk-field__label">Assignee (optional)</legend>
            <div className="hk-people-pick">
              <label className={assigneeId === "" ? "hk-person hk-person--on" : "hk-person"}>
                <input type="radio" name="assignee" value="" checked={assigneeId === ""} onChange={() => setAssigneeId("")} />
                <span className="hk-nobody" aria-hidden="true" />
                <span>
                  Nobody yet
                  <small>The task is Available, anyone can pick it up</small>
                </span>
              </label>
              {data.members.map((member) => (
                <label key={member.id} className={assigneeId === member.id ? "hk-person hk-person--on" : "hk-person"}>
                  <input
                    type="radio"
                    name="assignee"
                    value={member.id}
                    checked={assigneeId === member.id}
                    onChange={() => setAssigneeId(member.id)}
                  />
                  <span className="hk-avatar" aria-hidden="true">
                    {initials(member.name)}
                  </span>
                  <span>
                    {member.name}
                    {member.id === data.me.id && <small>you</small>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="hk-tasks__form-actions">
          <button type="submit" className="hk-btn hk-btn--primary" disabled={busy}>
            {isEdit ? "Save changes" : "Create task"}
          </button>
          <Link className="hk-btn hk-btn--secondary" to={backTo}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default TaskForm;
