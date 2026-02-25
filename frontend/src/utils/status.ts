export type BadgeColor = "blue" | "green" | "yellow" | "red" | "gray";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  calculated: "Рассчитано",
  approved: "Согласовано",
  warehouse_check: "На проверке склада",
  rework: "Доработка",
  confirmed: "Подтверждено",
};

const BADGE_COLORS: Record<string, BadgeColor> = {
  draft: "gray",
  calculated: "blue",
  approved: "yellow",
  warehouse_check: "blue",
  rework: "red",
  confirmed: "green",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusBadgeColor(status: string): BadgeColor {
  return BADGE_COLORS[status] ?? "gray";
}

export const AVAIL_LABELS: Record<string, string> = {
  in_stock: "В наличии",
  to_order: "Под заказ",
  absent: "Отсутствует",
};

const AVAIL_COLORS: Record<string, BadgeColor> = {
  in_stock: "green",
  to_order: "yellow",
  absent: "red",
};

export function availLabel(status: string): string {
  return AVAIL_LABELS[status] ?? status;
}

export function availBadgeColor(status: string): BadgeColor {
  return AVAIL_COLORS[status] ?? "yellow";
}
