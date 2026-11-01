import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { trackAction } from "../logic/HistoryTracker";

const historyEntries = [
  "Andrea created a task #7",
  "Ondrej completed task #12",
  "Marta updated the kitchen checklist",
  "Jakub added a new resident profile",
  "Anna completed task #3"
];

function HistoryPage() {
  const { user } = useUser();

  useEffect(() => {
    trackAction("HistoryPage", user, "load");
  }, [user]);

  return (
    <div className="placeholder-page history-page">
      <h2>History</h2>
      <div className="history-list" aria-label="Activity history">
        {historyEntries.map((entry, index) => (
          <div key={`${entry}-${index}`} className="history-item">
            <span className="history-dot" aria-hidden="true" />
            <span>{entry}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryPage;
