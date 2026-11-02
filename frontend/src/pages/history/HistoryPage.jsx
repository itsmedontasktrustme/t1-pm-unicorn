import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import { LoadingState } from "../../components/states";
import HouseholdHistory from "./HouseholdHistory";

/*
 * History tab — completed tasks and cookies overview (US10).
 * Replaces the earlier page that showed the technical UI-event log; activity logging
 * itself (logic/HistoryTracker, /api/history/action) is unchanged and simply not shown here.
 */
function HistoryPage() {
  const { user } = useResident();
  const { current, isLoading } = useCurrentHousehold();

  usePageLoadTracking("HistoryPage", user);

  return (
    <div className="hk-household hk-history">
      <div className="hk-household__head">
        <h2>History</h2>
      </div>
      {isLoading || !current ? (
        <LoadingState label="Loading history…" variant="rows" count={4} />
      ) : (
        <HouseholdHistory user={user} householdId={current.id} />
      )}
    </div>
  );
}

export default HistoryPage;
