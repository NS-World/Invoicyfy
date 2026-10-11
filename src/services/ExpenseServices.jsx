import API, { qs } from "./axios";

export const ExpenseServices = {
  getExpenses: async (page, size, search, extra = {}) =>
    (await API.get(`/master/expense/expenses.php${qs({ page: page + 1, limit: size, search, ...extra })}`)).data,
  getExpense: async (expense_id) => (await API.get(`/master/expense/get-expense-by-id.php${qs({ expense_id })}`)).data,
  addExpense: async (data) => (await API.post("/master/expense/add-expense.php", data)).data,
  updateExpense: async (data) => (await API.put("/master/expense/update-expense.php", data)).data,
  deleteExpense: async (expense_id) => (await API.delete("/master/expense/delete-expense.php", { data: { expense_id } })).data,
  getCategories: async () => (await API.get("/master/expense/categories.php")).data,
};
