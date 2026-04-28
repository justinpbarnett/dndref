export type Colors = Record<"bg" | "bgCard" | "bgCardPinned" | "bgSurface" | "bgInput" | "backdrop", string> &
  Record<"border" | "borderMed" | "borderStrong", string> &
  Record<"textPrimary" | "textSecondary" | "textDim" | "textMuted", string> &
  Record<"location" | "npc" | "faction" | "item" | "unknown" | "active" | "paused" | "error", string> &
  Record<"shadowSoft" | "shadowMedium" | "shadowStrong", string>;
