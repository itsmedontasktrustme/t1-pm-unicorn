/* Display helpers shared by all screens. */

export const ROLE_LABELS = { owner: "Owner", manager: "Manager", housemate: "Housemate" };

// Background colours for initials avatars, picked by position in a list.
export const AVATAR_COLOURS = ["var(--hk-orange)", "var(--hk-lime)", "var(--hk-peach)", "#e9dcc8"];

/** "Harry Potter" → "HP" (at most two letters; "?" without a name). */
export function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
