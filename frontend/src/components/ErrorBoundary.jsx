import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message || "Something went wrong." };
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
        <section className="placeholder-page not-found-page" aria-live="assertive">
          <h2>Something went wrong</h2>
          <p>{this.state.errorMessage}</p>
          <p>Please refresh the page and try again.</p>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
