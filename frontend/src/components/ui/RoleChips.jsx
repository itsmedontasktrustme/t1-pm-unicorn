import { ROLE_LABELS } from "../../logic/format";

/** Role chips (Owner / Manager / Housemate) in the Brand Kit colours. */
function RoleChips({ roles }) {
  return roles.map((role) => (
    <span key={role} className={`hk-chip hk-chip--${role}`}>
      {ROLE_LABELS[role] || role}
    </span>
  ));
}

export default RoleChips;
