import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import stopBearImage from "../assets/stopBear.jpg";
import { trackAction } from "../logic/HistoryTracker";

function HistoryPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const hasTrackedLoad = useRef(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

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
      return;
    }

    async function fetchHistory() {
      setLoading(true);

      try {
        const response = await fetch(`/api/history/action/${encodeURIComponent(user.id)}`);

        if (!response.ok) {
          throw new Error("Unable to load history");
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        setEntries(data);
      } catch (error) {
        console.error("Unable to fetch history entries", error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [isLoaded, isSignedIn, user?.id]);

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
    </div>
  );
}

export default HistoryPage;
