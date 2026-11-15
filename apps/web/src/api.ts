const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type Note = { id: number; title: string; content: string; created_at: string };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  health: () => req<{ status: string; version: string }>("/health"),
  listNotes: () => req<Note[]>("/notes"),
  createNote: (title: string, content: string) =>
    req<Note>("/notes", { method: "POST", body: JSON.stringify({ title, content }) }),
  deleteNote: (id: number) => req<void>(`/notes/${id}`, { method: "DELETE" }),
};

export type Account = { id: number; name: string; kind: string; initial_cents: number; balance_cents: number; tx_count: number };
export type Category = { id: number; name: string; type: "expense" | "income"; color: string };
export type Tx = {
  id: number; type: "expense" | "income"; amount_cents: number; day: string; note: string;
  account_id: number; account_name: string; category_id: number | null; category_name: string; category_color: string;
};
export type Summary = {
  balance_cents: number; income_cents: number; expense_cents: number;
  by_category: { name: string; color: string; cents: number }[]; recent: Tx[]; accounts: Account[];
};
export type NewTx = { type: string; amount_cents: number; day: string; note: string; account_id: number; category_id: number | null };

const j = (b: unknown) => JSON.stringify(b);
export const fin = {
  summary: (month: string) => req<Summary>(`/finance/summary?month=${month}`),
  accounts: () => req<Account[]>("/finance/accounts"),
  addAccount: (name: string, kind: string, initial_cents: number) =>
    req<Account>("/finance/accounts", { method: "POST", body: j({ name, kind, initial_cents }) }),
  delAccount: (id: number) => req<void>(`/finance/accounts/${id}`, { method: "DELETE" }),
  categories: () => req<Category[]>("/finance/categories"),
  addCategory: (name: string, type: string, color: string) =>
    req<Category>("/finance/categories", { method: "POST", body: j({ name, type, color }) }),
  delCategory: (id: number) => req<void>(`/finance/categories/${id}`, { method: "DELETE" }),
  txs: (month: string, q = "") => req<Tx[]>(`/finance/transactions?month=${month}&q=${encodeURIComponent(q)}`),
  addTx: (t: NewTx) => req<Tx>("/finance/transactions", { method: "POST", body: j(t) }),
  delTx: (id: number) => req<void>(`/finance/transactions/${id}`, { method: "DELETE" }),
};

export const eur = (cents: number) =>
  (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
export const toCents = (s: string) => Math.round(parseFloat(s.replace(",", ".")) * 100);
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export type BudgetRow = { id: number; category_id: number; category_name: string; color: string; limit_cents: number; spent_cents: number };
export type ReportRow = { month: string; income_cents: number; expense_cents: number; net_worth_cents: number };
export const fin2 = {
  budgets: (month: string) => req<BudgetRow[]>(`/finance/budgets?month=${month}`),
  setBudget: (category_id: number, limit_cents: number) =>
    req<{ ok: boolean }>("/finance/budgets", { method: "POST", body: JSON.stringify({ category_id, limit_cents }) }),
  delBudget: (id: number) => req<void>(`/finance/budgets/${id}`, { method: "DELETE" }),
  report: (periods: number) => req<ReportRow[]>(`/finance/report?periods=${periods}`),
};

export type Goal = { id: number; name: string; target_cents: number; saved_cents: number; deadline: string | null };
export type Rec = { id: number; note: string; type: "expense" | "income"; amount_cents: number; freq: string; next_day: string; active: boolean; account_name: string; category_name: string };
export const fin3 = {
  goals: () => req<Goal[]>("/finance/goals"),
  addGoal: (name: string, target_cents: number, deadline: string | null) =>
    req<Goal>("/finance/goals", { method: "POST", body: JSON.stringify({ name, target_cents, deadline }) }),
  goalAdd: (id: number, delta_cents: number) =>
    req<Goal>(`/finance/goals/${id}/add`, { method: "POST", body: JSON.stringify({ delta_cents }) }),
  delGoal: (id: number) => req<void>(`/finance/goals/${id}`, { method: "DELETE" }),
  recurring: () => req<Rec[]>("/finance/recurring"),
  addRec: (r: { note: string; type: string; amount_cents: number; account_id: number; category_id: number | null; freq: string; start: string }) =>
    req<Rec>("/finance/recurring", { method: "POST", body: JSON.stringify(r) }),
  toggleRec: (id: number) => req<Rec>(`/finance/recurring/${id}/toggle`, { method: "POST" }),
  delRec: (id: number) => req<void>(`/finance/recurring/${id}`, { method: "DELETE" }),
};

export const fin4 = {
  updateTx: (id: number, t: NewTx) => req<Tx>(`/finance/transactions/${id}`, { method: "PUT", body: JSON.stringify(t) }),
  updateAccount: (id: number, name: string, kind: string, initial_cents: number) =>
    req<Account>(`/finance/accounts/${id}`, { method: "PUT", body: JSON.stringify({ name, kind, initial_cents }) }),
  updateCategory: (id: number, name: string, type: string, color: string) =>
    req<Category>(`/finance/categories/${id}`, { method: "PUT", body: JSON.stringify({ name, type, color }) }),
  exportAll: () => req<{ transactions: Tx[] } & Record<string, unknown>>("/finance/export"),
};
