// State: the single source of truth. Each expense is
// { id, description, amount, category, date }. The DOM is rendered from this.
let expenses = [];

// Elements
const form = document.getElementById("expense-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const errorBox = document.getElementById("error");

const list = document.getElementById("expense-list");
const countEl = document.getElementById("count");
const totalEl = document.getElementById("total");
const categoryTotalsEl = document.getElementById("category-totals");

const filterInput = document.getElementById("filter");
const sortInput = document.getElementById("sort");
const convertBtn = document.getElementById("convert-btn");
const convertedEl = document.getElementById("converted");

const STORAGE_KEY = "expenses";

function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

// Redraw the whole UI from state. Called after every change.
function render() {
  // Filter by category ("all" keeps everything).
  const selectedCategory = filterInput.value;
  let shown = expenses.filter(function (expense) {
    return selectedCategory === "all" || expense.category === selectedCategory;
  });

  // Sort. slice() first so we don't mutate the filtered array.
  const sortBy = sortInput.value;
  shown = shown.slice().sort(function (a, b) {
    if (sortBy === "amount-asc") return a.amount - b.amount;
    if (sortBy === "amount-desc") return b.amount - a.amount;
    // Dates are "YYYY-MM-DD" strings, so comparing them sorts chronologically.
    if (sortBy === "date-asc") return a.date < b.date ? -1 : 1;
    return a.date > b.date ? -1 : 1; // date-desc (default)
  });

  list.innerHTML = "";

  if (shown.length === 0) {
    const message = document.createElement("li");
    message.className = "empty";
    message.textContent = "No expenses yet — add one above!";
    list.appendChild(message);
  } else {
    shown.forEach(function (expense) {
      const row = document.createElement("li");

      const desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = expense.description;

      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = expense.category + " • " + expense.date;

      const amount = document.createElement("span");
      amount.className = "amount";
      amount.textContent = formatCurrency(expense.amount);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        deleteExpense(expense.id);
      });

      row.appendChild(desc);
      row.appendChild(meta);
      row.appendChild(amount);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  updateTotals(shown);
}

// Totals reflect whatever is currently shown (i.e. the filtered view).
function updateTotals(shown) {
  countEl.textContent = shown.length;

  const total = shown.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);
  totalEl.textContent = formatCurrency(total);

  const byCategory = shown.reduce(function (totals, expense) {
    if (totals[expense.category] === undefined) {
      totals[expense.category] = 0;
    }
    totals[expense.category] += expense.amount;
    return totals;
  }, {});

  categoryTotalsEl.innerHTML = "";
  Object.keys(byCategory).forEach(function (category) {
    const line = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = category;
    const value = document.createElement("span");
    value.textContent = formatCurrency(byCategory[category]);
    line.appendChild(name);
    line.appendChild(value);
    categoryTotalsEl.appendChild(line);
  });
}

function deleteExpense(id) {
  expenses = expenses.filter(function (expense) {
    return expense.id !== id;
  });
  save();
  render();
}

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  // Validate before adding.
  if (description === "") {
    showError("Please enter a description.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showError("Amount must be a number greater than 0.");
    return;
  }
  if (date === "") {
    showError("Please pick a date.");
    return;
  }
  clearError();

  expenses.push({
    id: Date.now(),
    description: description,
    amount: amount,
    category: category,
    date: date,
  });
  save();
  render();

  form.reset();
  setDateToToday();
});

function showError(message) {
  errorBox.textContent = message;
}

function clearError() {
  errorBox.textContent = "";
}

// Filter/sort just trigger a redraw; render() reads their values.
filterInput.addEventListener("change", render);
sortInput.addEventListener("change", render);

// localStorage only stores strings, so we go through JSON.
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expenses = Array.isArray(data) ? data : [];
  } catch (error) {
    // Missing or corrupt data — fall back to an empty list.
    expenses = [];
  }
}

// Convert the current total to EUR using a live exchange rate.
convertBtn.addEventListener("click", async function () {
  const usdTotal = parseFloat(totalEl.textContent.replace("$", ""));

  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";
  convertedEl.classList.remove("error-text");
  convertedEl.textContent = "";

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) {
      throw new Error("Bad response from server");
    }
    const data = await response.json();
    const eurTotal = usdTotal * data.rates.EUR;
    convertedEl.textContent = "≈ €" + eurTotal.toFixed(2);
  } catch (error) {
    convertedEl.classList.add("error-text");
    convertedEl.textContent = "Could not get exchange rate. Try again.";
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to EUR";
  }
});

function setDateToToday() {
  dateInput.value = new Date().toISOString().slice(0, 10);
}

// Startup
load();
setDateToToday();
render();
