import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import stopBearImage from "../assets/stopBear.jpg";
import historyIcon from "../assets/book-green.svg";
import usePageLoadTracking from "../logic/usePageLoadTracking";
import { EmptyState, ErrorState, LoadingState } from "../components/states";

function HistoryPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  usePageLoadTracking("HistoryPage", user);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setEntries([]);
      setLoading(false);
      setError(null);
      setPage(1);
      setTotalPages(1);
      setHasPreviousPage(false);
      setHasNextPage(false);
      return;
    }

    async function fetchHistory() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/history/action/${encodeURIComponent(user.id)}?page=${page}&limit=12`);

        if (!response.ok) {
          const failure = new Error("Unable to load history");
          failure.status = response.status;
          throw failure;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        setEntries(data);
        setTotalPages(Number(payload?.totalPages) || 1);
        setHasPreviousPage(Boolean(payload?.hasPreviousPage));
        setHasNextPage(Boolean(payload?.hasNextPage));
      } catch (fetchError) {
        console.error("Unable to fetch history entries", fetchError);
        setEntries([]);
        setError({ status: fetchError.status });
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [isLoaded, isSignedIn, user?.id, page, reloadKey]);

  if (!isLoaded || loading) {
    return (
      <div className="placeholder-page history-page">
        <h2>History</h2>
        <LoadingState label="Loading history…" variant="rows" count={5} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="placeholder-page not-found-page" aria-label="Authentication required">
        <h2>Hold on!</h2>
        <p>Can’t let you in, log in first please.</p>
        <img src={stopBearImage} alt="Please log in first" className="not-found-image" />
      </section>
    );
  }

  if (error) {
    return (
      <div className="placeholder-page history-page">
        <h2>History</h2>
        <ErrorState
          text="We couldn’t load your history. Check your connection and try again."
          onRetry={() => setReloadKey((key) => key + 1)}
          code={error.status}
        />
      </div>
    );
  }

  if (entries.length === 0 && page === 1) {
    return (
      <div className="placeholder-page history-page">
        <h2>History</h2>
        <EmptyState
          iconSrc={historyIcon}
          title="Nothing here yet"
          text="Once you and your housemates start completing tasks, the activity will show up here."
        />
      </div>
    );
  }

  return (
    <div className="placeholder-page history-page">
      <h2>History</h2>
      <div className="history-list" aria-label="Activity history">
        {entries.map((entry) => (
          <div key={entry.id} className="history-item">
            <span className="history-dot" aria-hidden="true" />
            <span>
              {entry.component}: {entry.action}
              {entry.createdAt ? ` (${new Date(entry.createdAt).toLocaleString()})` : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="pagination-controls" aria-label="History pagination">
        <button
          type="button"
          className="pagination-button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={!hasPreviousPage}
        >
          Previous
        </button>

        <span className="pagination-status">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          className="pagination-button"
          onClick={() => setPage((current) => current + 1)}
          disabled={!hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default HistoryPage;
