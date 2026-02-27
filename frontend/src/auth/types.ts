export type Role = "admin" | "manager" | "warehouse";

export interface UserMe {
  id: number;
  login: string;
  role: Role | null;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Админ",
  manager: "Менеджер",
  warehouse: "Склад",
};

export function roleLabel(role: Role | null): string {
  if (role === null) return "Без роли";
  return ROLE_LABELS[role] ?? role;
}
