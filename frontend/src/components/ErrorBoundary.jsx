import React from "react";
import StatePanel from "./states/StatePanel";

/*
 * Last-resort screen when the app crashes while rendering (HK-93).
 * Uses the shared error state; the technical details go to the console only, never to the user.
 * The links reload the page on purpose: a crashed React tree cannot recover by client-side navigation.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Frontend error]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="hk-crash">
          <StatePanel
            tone="danger"
            role="alert"
            icon="!"
            title="Oops, something went wrong"
            text="This page stopped working. Reload it to try again."
            actions={
              <>
                <button type="button" className="hk-btn hk-btn--primary" onClick={() => window.location.reload()}>
                  Reload page
                </button>
                <a href="/home" className="hk-btn hk-btn--secondary">
                  Go to Home
                </a>
              </>
            }
            note="If it keeps happening, tell the household owner."
          />
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
