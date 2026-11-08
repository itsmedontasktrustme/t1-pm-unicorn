import { useSearchParams } from "react-router-dom";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import { LoadingState } from "../../components/states";
import AuditHistory from "./AuditHistory";
import HouseholdHistory from "./HouseholdHistory";
import MyHistory from "./MyHistory";

/*
 * History tab — completed tasks and cookies overview (US10).
 * "Household" (HK-90, steps 2–5) or "Mine" across all households (HK-87, 2a–2b);
 * the choice is kept in ?view=mine so it survives reloads and can be linked.
 * Replaces the earlier page that showed the technical UI-event log; activity logging
 * itself (logic/HistoryTracker, /api/history/action) is unchanged and simply not shown here.
 */
function HistoryPage() {
  const { user } = useResident();
  const { current, isLoading } = useCurrentHousehold();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "mine" ? "mine" : searchParams.get("view") === "audit" ? "audit" : "household";

  usePageLoadTracking("HistoryPage", user);

  const choose = (next) => {
    if (next === "household") {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ view: next }, { replace: true });
  };

  return (
    <div className="hk-household hk-history">
      <div className="hk-household__head">
        <h2>History</h2>
      </div>

      <div className="hk-history__switch" role="group" aria-label="History view">
        <button type="button" aria-pressed={view === "household"} onClick={() => choose("household")}>
          Household
        </button>
        <button type="button" aria-pressed={view === "mine"} onClick={() => choose("mine")}>
          Mine
        </button>
        <button type="button" aria-pressed={view === "audit"} onClick={() => choose("audit")}>
          Audit
        </button>
      </div>

      {view === "mine" ? (
        <MyHistory user={user} />
      ) : view === "audit" ? (
        <AuditHistory user={user} />
      ) : isLoading || !current ? (
        <LoadingState label="Loading history…" variant="rows" count={4} />
      ) : (
        <HouseholdHistory user={user} householdId={current.id} />
      )}
    </div>
  );
}

export default HistoryPage;
