import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { trackAction } from "../logic/HistoryTracker";

function SettingsPage() {
  const { user } = useUser();
  const hasTrackedLoad = useRef(false);

  useEffect(() => {
    if (hasTrackedLoad.current) {
      return;
    }

    hasTrackedLoad.current = true;
    trackAction("SettingsPage", user, "load");
  }, [user]);

  return (
    <section className="placeholder-page" aria-label="Settings">
      <h2>Settings</h2>
      <p>This is a placeholder page for app settings.</p>
    </section>
  );
}

export default SettingsPage;
