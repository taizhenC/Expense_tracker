// ============================================================
// STATE — the single source of truth
// ============================================================
// Every expense is a plain object: { id, description, amount, category, date }
// They all live in this ONE array. The screen is just a picture of this array.
// "let" (not "const") because we sometimes replace the whole array (on delete).
let expenses = [];

// ============================================================
// GRAB THE ELEMENTS WE NEED FROM THE PAGE
// ============================================================
// document.getElementById finds an element by its id="" from the HTML.
// We do this once, up top, so we can reuse these references everywhere.
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

// ============================================================
// SMALL HELPER — format a number as money like "$12.50"
// ============================================================
// toFixed(2) forces exactly 2 decimals and returns a string.
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

// ============================================================
// RENDER — redraw the whole screen from the array
// ============================================================
// This is the heart of the app. We call it after EVERY change.
function render() {
  // Start from the full array, then narrow/reorder it for display.
  // We never change "expenses" itself here — we build a separate "shown" list.

  // ---- 1) FILTER by the chosen category ----
  const selectedCategory = filterInput.value; // "all" or a category name
  let shown = expenses.filter(function (expense) {
    // "all" keeps everything; otherwise keep only matching categories.
    return selectedCategory === "all" || expense.category === selectedCategory;
  });

  // ---- 2) SORT by the chosen option ----
  // sort() compares two items (a, b). Return negative = a first,
  // positive = b first. We copy first with slice() so we don't mutate.
  const sortBy = sortInput.value; // e.g. "date-desc"
  shown = shown.slice().sort(function (a, b) {
    if (sortBy === "amount-asc") return a.amount - b.amount;
    if (sortBy === "amount-desc") return b.amount - a.amount;
    // Dates are strings like "2026-06-14". For YYYY-MM-DD, comparing the
    // strings with < / > also sorts them chronologically.
    if (sortBy === "date-asc") return a.date < b.date ? -1 : 1;
    return a.date > b.date ? -1 : 1; // "date-desc" (default)
  });

  // ---- Empty state: nothing to show? Show a friendly message. ----
  list.innerHTML = ""; // wipe whatever was there before
  if (shown.length === 0) {
    const message = document.createElement("li");
    message.className = "empty";
    message.textContent = "No expenses yet — add one above!";
    list.appendChild(message);
  } else {
    // ---- Build one <li> row per expense ----
    shown.forEach(function (expense) {
      const row = document.createElement("li");

      // Description (bold)
      const desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = expense.description;

      // Category + date (small, grey)
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = expense.category + " • " + expense.date;

      // Amount as currency
      const amount = document.createElement("span");
      amount.className = "amount";
      amount.textContent = formatCurrency(expense.amount);

      // Delete button for THIS row
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      // When clicked, remove this expense (by its id) and redraw.
      deleteBtn.addEventListener("click", function () {
        deleteExpense(expense.id);
      });

      // Put the pieces into the row, then the row into the list.
      row.appendChild(desc);
      row.appendChild(meta);
      row.appendChild(amount);
      row.appendChild(deleteBtn);
      list.appendChild(row);
    });
  }

  // ---- Totals (always based on what's shown) ----
  updateTotals(shown);
}

// ============================================================
// TOTALS — overall, per-category, and count
// ============================================================
function updateTotals(shown) {
  // Count is just how many rows are shown.
  countEl.textContent = shown.length;

  // Overall total: reduce() walks the array adding each amount onto a running sum.
  // The "0" is the starting value of "sum".
  const total = shown.reduce(function (sum, expense) {
    return sum + expense.amount;
  }, 0);
  totalEl.textContent = formatCurrency(total);

  // Per-category totals: reduce() builds an object like { Food: 25, Transport: 10 }.
  const byCategory = shown.reduce(function (totals, expense) {
    // If we haven't seen this category yet, start it at 0.
    if (totals[expense.category] === undefined) {
      totals[expense.category] = 0;
    }
    totals[expense.category] = totals[expense.category] + expense.amount;
    return totals;
  }, {});

  // Draw the per-category lines.
  categoryTotalsEl.innerHTML = "";
  // Object.keys turns { Food: 25 } into ["Food"] so we can loop the categories.
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

// ============================================================
// DELETE — remove one expense by id, then redraw
// ============================================================
function deleteExpense(id) {
  // filter() keeps every expense whose id is NOT the one we're deleting.
  expenses = expenses.filter(function (expense) {
    return expense.id !== id;
  });
  save();   // remember the change
  render();
}

// ============================================================
// ADD — handle the form submit (with validation)
// ============================================================
form.addEventListener("submit", function (event) {
  // Stop the browser from reloading the page (its default for form submit).
  event.preventDefault();

  // Read the current values from the inputs.
  const description = descriptionInput.value.trim(); // trim removes stray spaces
  const amount = parseFloat(amountInput.value);      // text -> number
  const category = categoryInput.value;
  const date = dateInput.value;

  // ---- Validate BEFORE adding ----
  if (description === "") {
    showError("Please enter a description.");
    return; // stop here; do not add
  }
  // isNaN = "is Not a Number" — true if amount wasn't a valid number.
  if (isNaN(amount) || amount <= 0) {
    showError("Amount must be a number greater than 0.");
    return;
  }
  if (date === "") {
    showError("Please pick a date.");
    return;
  }

  // All good — clear any old error.
  clearError();

  // Build the new expense object. Date.now() gives a unique-enough id.
  const newExpense = {
    id: Date.now(),
    description: description,
    amount: amount,
    category: category,
    date: date,
  };

  // Add it to the array (our source of truth), save, then redraw.
  expenses.push(newExpense);
  save();
  render();

  // Reset the form and put the date back to today for the next entry.
  form.reset();
  setDateToToday();
});

// ---- tiny error helpers, so the code above reads cleanly ----
function showError(message) {
  errorBox.textContent = message;
}
function clearError() {
  errorBox.textContent = "";
}

// ============================================================
// FILTER + SORT — just trigger a redraw
// ============================================================
// render() already reads the dropdown values, so these listeners only
// need to call render(). No duplicated logic.
filterInput.addEventListener("change", render);
sortInput.addEventListener("change", render);

// ============================================================
// PERSISTENCE — save to / load from localStorage
// ============================================================
// localStorage can only store strings, so we convert to/from JSON text.
const STORAGE_KEY = "expenses";

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Only accept it if it's actually an array; otherwise start empty.
    expenses = Array.isArray(data) ? data : [];
  } catch (error) {
    // Corrupt/unparseable data — don't crash, just start empty.
    expenses = [];
  }
}

// ============================================================
// CONVERT TO EUR — fetch a live exchange rate (async/await)
// ============================================================
convertBtn.addEventListener("click", async function () {
  // The amount we want to convert = the current overall (filtered) total.
  // We re-read it from the page text we already rendered.
  const usdTotal = parseFloat(totalEl.textContent.replace("$", ""));

  // ---- Loading state ----
  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";
  convertedEl.classList.remove("error-text");
  convertedEl.textContent = "";

  try {
    // await pauses here until the network reply comes back.
    const response = await fetch("https://open.er-api.com/v6/latest/USD");

    // A bad HTTP response (e.g. 500) does NOT throw on its own — check it.
    if (!response.ok) {
      throw new Error("Bad response from server");
    }

    const data = await response.json(); // parse the JSON body
    const rate = data.rates.EUR;        // the USD -> EUR rate
    const eurTotal = usdTotal * rate;

    // Show the converted amount next to the USD total.
    convertedEl.textContent = "≈ €" + eurTotal.toFixed(2);
  } catch (error) {
    // Network failure or bad response — show it, don't hide it.
    convertedEl.classList.add("error-text");
    convertedEl.textContent = "Could not get exchange rate. Try again.";
  } finally {
    // Always runs — restore the button whether we succeeded or failed.
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to EUR";
  }
});

// ============================================================
// STARTUP — runs once when the page loads
// ============================================================
function setDateToToday() {
  // new Date() is now; toISOString() looks like "2026-06-14T...".
  // slice(0, 10) keeps just the "2026-06-14" part the date input wants.
  dateInput.value = new Date().toISOString().slice(0, 10);
}

load();          // bring back saved expenses (if any)
setDateToToday();
render();         // draw the screen from whatever we loaded
