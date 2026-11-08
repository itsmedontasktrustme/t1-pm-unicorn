import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import { getClerkToken } from "../../logic/auth";

const PAGE_SIZE = 9;

function formatAuditDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function AuditHistory({ user }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let active = true;
    setError(null);
    setData(null);

    async function loadPage() {
      const token = await getClerkToken();
      const response = await fetch(`/api/history/action/${user.id}?page=${page}&limit=${PAGE_SIZE}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load audit history.");
      }

      return payload;
    }

    loadPage()
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError);
        }
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey, user?.id]);

  if (error) {
    return <ErrorState text={error.message || "We couldn’t load your audit log."} onRetry={() => setReloadKey((key) => key + 1)} homePath={null} />;
  }

  if (!data) {
    return <LoadingState label="Loading audit history…" variant="rows" count={4} />;
  }

  if (!data.data || data.data.length === 0) {
    return (
      <EmptyState
        title="No audit entries yet"
        text="When you complete or update tasks, the activity log will appear here."
      />
    );
  }

  const pageNumbers = Array.from({ length: Math.max(1, Number(data.totalPages) || 1) }, (_, index) => index + 1);

  return (
    <>
      <div className="hk-audit-list" aria-label="User audit log">
        {data.data.map((entry) => (
          <div key={entry.id} className="hk-audit-item">
            <div className="hk-audit-item__meta">
              <span className="hk-audit-item__component">{entry.component}</span>
              <span className="hk-audit-item__action">{entry.action}</span>
            </div>
            <div className="hk-audit-item__details">
              <span>{entry.userId || "unknown user"}</span>
              <span>{formatAuditDate(entry.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hk-audit-pagination" aria-label="Audit pagination">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
          Previous
        </button>

        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className="hk-audit-pagination__number"
            aria-pressed={pageNumber === page}
            disabled={pageNumber === page}
            onClick={() => setPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!data.hasNextPage}>
          Next
        </button>
      </div>

      <p className="hk-history__lead hk-audit-page">Page {page} of {Math.max(1, Number(data.totalPages) || 1)}</p>
    </>
  );
}

export default AuditHistory;
