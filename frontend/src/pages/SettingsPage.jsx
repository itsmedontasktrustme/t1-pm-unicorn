import { useUser } from "@clerk/react";
import usePageLoadTracking from "../logic/usePageLoadTracking";

function SettingsPage() {
  const { user } = useUser();

  usePageLoadTracking("SettingsPage", user);

  return (
    <section className="placeholder-page" aria-label="Settings">
      <h2>Settings</h2>
      <p>This is a placeholder page for app settings.</p>
    </section>
  );
}

export default SettingsPage;
