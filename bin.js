// ------------------------ ELEMENTS ------------------------
const binModal = document.getElementById("recycleBinModal");
const binCustomerList = document.getElementById("binCustomerList");
const binTransList = document.getElementById("binTransList");
const binSearchInput = document.getElementById("binSearchInput");
const binDateInput = document.getElementById("binDateInput");

// ------------------------ OPEN BIN ------------------------
function showBin(ledger) {
  renderBin(ledger);
  binModal.style.display = "flex";
}

// ------------------------ CLOSE BIN ------------------------
function closeBin() {
  binModal.style.display = "none";
}

// ------------------------ SEARCH / FILTER ------------------------
binSearchInput.oninput = () => renderBin(ledger);
binDateInput.onchange = () => renderBin(ledger);

// ------------------------ RENDER BIN ------------------------
function renderBin(ledger) {
  const query = binSearchInput.value.toLowerCase();
  const dateFilter = binDateInput.value;

  // ---------------- CUSTOMERS ----------------
  binCustomerList.innerHTML = "";

  (ledger.__BIN__.customers || []).forEach((cust, index) => {
    if (!cust.name.toLowerCase().includes(query)) return;

    let credit = 0, debit = 0;
    (cust.transactions || []).forEach(t => {
      t.type === "Credit" ? credit += t.amount : debit += t.amount;
    });

    const li = document.createElement("li");
    li.innerHTML = `
      <b>${cust.name}</b>
      <span>Deleted: ${formatDate(cust.deletedAt)}</span>
      <span>₹${credit - debit}</span>
    `;

    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "Restore";
    restoreBtn.onclick = async () => {
      ledger[cust.name] = {
        phones: cust.phones || [],
        transactions: cust.transactions || []
      };
      ledger.__BIN__.customers.splice(index, 1);
      await saveLedgerToCloud();
      renderCustomers();
      renderBin(ledger);
      updateTicker();
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = async () => {
      if (!confirm("Permanently delete customer?")) return;
      ledger.__BIN__.customers.splice(index, 1);
      await saveLedgerToCloud();
      renderBin(ledger);
    };

    li.appendChild(restoreBtn);
    li.appendChild(delBtn);
    binCustomerList.appendChild(li);
  });

  // ---------------- TRANSACTIONS ----------------
  binTransList.innerHTML = "";

  (ledger.__BIN__.transactions || []).forEach((t, index) => {
    if (query && !t.customer.toLowerCase().includes(query)) return;
    if (dateFilter && t.date !== dateFilter) return;

    const li = document.createElement("li");
    li.innerHTML = `
      ${t.customer} | ${t.type}
      | ${formatDate(t.date)}
      | ₹${t.amount}
    `;

    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "Restore";
    restoreBtn.onclick = async () => {
      if (!ledger[t.customer]) {
        ledger[t.customer] = { phones: [], transactions: [] };
      }

      ledger[t.customer].transactions.push({
        date: t.date,
        type: t.type,
        amount: t.amount
      });

      ledger.__BIN__.transactions.splice(index, 1);
      await saveLedgerToCloud();
      renderTransactions();
      renderBin(ledger);
      updateTicker();
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = async () => {
      if (!confirm("Permanently delete transaction?")) return;
      ledger.__BIN__.transactions.splice(index, 1);
      await saveLedgerToCloud();
      renderBin(ledger);
    };

    li.appendChild(restoreBtn);
    li.appendChild(delBtn);
    binTransList.appendChild(li);
  });
}

// ------------------------ DATE FORMAT ------------------------
function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB");
}

async function clearRecycleBin() {
  if (!confirm("This will permanently clear the recycle bin. Continue?")) return;

  ledger.__BIN__.customers = [];
  ledger.__BIN__.transactions = [];

  await saveLedgerToCloud();

  document.getElementById("binCustomerList").innerHTML = "";
  document.getElementById("binTransList").innerHTML = "";

  alert("Recycle bin cleared from cloud.");
}

