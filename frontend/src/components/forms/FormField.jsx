import { cloneElement } from "react";

/**
 * Label + control + hint/error, wired for screen readers.
 * Pass the input/textarea as the only child; it receives id,
 * aria-invalid and aria-describedby automatically.
 */
function FormField({ id, label, required = false, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const control = cloneElement(children, {
    id,
    className: ["hk-field__control", children.props.className].filter(Boolean).join(" "),
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined
  });

  return (
    <div className="hk-field">
      <label className="hk-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="hk-field__required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {control}
      {error && (
        <div className="hk-field__error" id={errorId}>
          <span className="hk-error-dot" aria-hidden="true">!</span>
          {error}
        </div>
      )}
      {!error && hint && (
        <div className="hk-field__hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default FormField;
