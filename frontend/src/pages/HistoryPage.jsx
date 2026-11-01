import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import stopBearImage from "../assets/stopBear.jpg";
import { trackAction } from "../logic/HistoryTracker";

function HistoryPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const hasTrackedLoad = useRef(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    if (hasTrackedLoad.current) {
      return;
    }

    hasTrackedLoad.current = true;
    trackAction("HistoryPage", user, "load");
  }, [user]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setEntries([]);
      setLoading(false);
      setPage(1);
      setTotalPages(1);
      setHasPreviousPage(false);
      setHasNextPage(false);
      return;
    }

    async function fetchHistory() {
      setLoading(true);

      try {
        const response = await fetch(`/api/history/action/${encodeURIComponent(user.id)}?page=${page}&limit=12`);

        if (!response.ok) {
          throw new Error("Unable to load history");
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        setEntries(data);
        setTotalPages(Number(payload?.totalPages) || 1);
        setHasPreviousPage(Boolean(payload?.hasPreviousPage));
        setHasNextPage(Boolean(payload?.hasNextPage));
      } catch (error) {
        console.error("Unable to fetch history entries", error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [isLoaded, isSignedIn, user?.id, page]);

  if (!isLoaded || loading) {
    return (
      <div className="placeholder-page history-page" aria-live="polite">
        <h2>History</h2>
        <div className="history-list">
          <div className="history-item history-loading-item">
            <span className="history-spinner" aria-hidden="true" />
            <span>Loading history...</span>
          </div>
        </div>
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

  return (
    <div className="placeholder-page history-page">
      <h2>History</h2>
      <div className="history-list" aria-label="Activity history">
        {entries.length === 0 ? (
          <div className="history-item">
            <span className="history-dot" aria-hidden="true" />
            <span>No activity recorded yet.</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="history-item">
              <span className="history-dot" aria-hidden="true" />
              <span>
                {entry.component}: {entry.action}
                {entry.createdAt ? ` (${new Date(entry.createdAt).toLocaleString()})` : ""}
              </span>
            </div>
          ))
        )}
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
