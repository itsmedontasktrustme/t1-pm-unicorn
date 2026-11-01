import { useEffect } from "react";
import { trackAction } from "./HistoryTracker";

const trackedLoads = new Set();

function usePageLoadTracking(pageName, user, action = "load") {
  const userId = user?.id || user?.userId || "anonymous";
  const trackingKey = `${pageName}|${action}|${userId}`;

  useEffect(() => {
    if (trackedLoads.has(trackingKey)) {
      return;
    }

    trackedLoads.add(trackingKey);
    trackAction(pageName, user, action);

    return () => {
      trackedLoads.delete(trackingKey);
    };
  }, [pageName, userId, action, user]);
}

export default usePageLoadTracking;
