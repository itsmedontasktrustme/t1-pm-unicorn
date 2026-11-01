import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { trackAction } from "../logic/HistoryTracker";

function SettingsPage() {
  const { user } = useUser();

  useEffect(() => {
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
