// ------------------------ GLOBAL ------------------------
const BIN_ID = "69078e42ae596e708f3ff158";
const API_KEY = "$2a$10$v04xjDK5AzHosL83kt7ACOHqJobD5Y0j44s4Q95b.YT/D0Kw9Cny6";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let ledger = {};
let currentCustomer = null;
let recycleBin = JSON.parse(localStorage.getItem("recycleBin")) || [];

// ------------------------ ELEMENTS ------------------------
const logoutBtn = document.getElementById('logoutBtn');
const ticker = document.getElementById('ticker');
const searchBar = document.getElementById('searchBar');
const customerList = document.getElementById('customerList');
const newCustomer = document.getElementById('newCustomer');
const newPhone = document.getElementById('newPhone');
const addCustomerBtn = document.getElementById('addCustomerBtn');
const whatsappReminderBtn = document.getElementById('whatsappReminderBtn');
const generatePDFBtn = document.getElementById('generatePDFBtn');


const amountInput = document.getElementById('amountInput');
const dateInput = document.getElementById('dateInput');
const creditBtn = document.getElementById('creditBtn');
const debitBtn = document.getElementById('debitBtn');

const customerTitle = document.getElementById('customerTitle');
const transactionTable = document.querySelector('#transactionTable tbody');
const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');

const phoneList = document.getElementById('phoneList');
const newPhoneInput = document.getElementById('newPhoneInput');
const addPhoneBtn = document.getElementById('addPhoneBtn');

const pendingDaysInput = document.getElementById('pendingDays');
const filterPendingBtn = document.getElementById('filterPendingBtn');

const openBinBtn = document.getElementById('openBinBtn');

// ------------------------ INIT ------------------------
window.onload = async () => {
  await loadLedgerFromCloud();
};

// ------------------------ LOGOUT ------------------------
logoutBtn.onclick = () => {
  window.location.href = "login.html";
};


// ------------------------ JSONBIN ------------------------
async function loadLedgerFromCloud() {
  try {
    const res = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });

    const data = await res.json();

    if (data && data.record) {
      ledger = data.record;
    } else {
      ledger = {};
    }

    if (!ledger.__BIN__) {
      ledger.__BIN__ = { customers: [], transactions: [] };
    }

    renderCustomers();
    updateTicker();

  } catch (err) {
    console.error("Cloud load failed:", err);
  }
}
// ------------------------ CUSTOMER ------------------------
addCustomerBtn.onclick = async () => {
  const name = newCustomer.value.trim();
  if (!name) return alert("Enter customer name");
  if (ledger[name]) return alert("Customer exists");

  ledger[name] = { phones: newPhone.value ? [newPhone.value] : [], transactions: [] };
  newCustomer.value = '';
  newPhone.value = '';
  await saveLedgerToCloud();
  renderCustomers();
};

function getPendingDays(transactions) {
  if (!transactions.length) return 0;
  const last = new Date(transactions[transactions.length - 1].date);
  return Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
}

function renderCustomers() {
  customerList.innerHTML = '';
  const q = searchBar.value.toLowerCase();

  Object.keys(ledger).sort().forEach(name => {
    if (name === "__BIN__") return;
    if (!name.toLowerCase().includes(q)) return;

    const li = document.createElement('li');
    const pending = getPendingDays(ledger[name].transactions);

    li.innerHTML = pending > 30 ? `${name} 🔴` : name;
    li.style.fontWeight = 'bold';
    if (pending > 30) {
      li.style.background = 'red';
      li.style.color = 'white';
    }

    li.onclick = () => {
      currentCustomer = name;
      customerTitle.textContent = name;
      renderTransactions();
      updatePhoneList(ledger[name]);
    };

    customerList.appendChild(li);
  });
}

searchBar.oninput = renderCustomers;

// ------------------------ PHONE ------------------------
function updatePhoneList(customer) {
  phoneList.innerHTML = '';
  customer.phones.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = p;

    const del = document.createElement('button');
    del.textContent = '❌';
    del.onclick = async () => {
      customer.phones.splice(i, 1);
      await saveLedgerToCloud();
      updatePhoneList(customer);
    };

    li.appendChild(del);
    phoneList.appendChild(li);
  });
}

addPhoneBtn.onclick = async () => {
  if (!currentCustomer) return alert("Select customer");
  const phone = newPhoneInput.value.trim();
  if (!phone) return alert("Enter phone");

  ledger[currentCustomer].phones.push(phone);
  newPhoneInput.value = '';
  await saveLedgerToCloud();
  updatePhoneList(ledger[currentCustomer]);
};

// ------------------------ TRANSACTIONS ------------------------
creditBtn.onclick = () => addTransaction("Credit");
debitBtn.onclick = () => addTransaction("Debit");

async function addTransaction(type) {
  if (!currentCustomer) return alert("Select customer");
  const amount = +amountInput.value;
  if (!amount) return alert("Invalid amount");

  ledger[currentCustomer].transactions.push({
    date: dateInput.value || new Date().toISOString().split('T')[0],
    type,
    amount
  });

  amountInput.value = '';
  dateInput.value = '';
  await saveLedgerToCloud();
  renderTransactions();
  updateTicker();
}

// ------------------------ RENDER TRANSACTIONS ------------------------
function renderTransactions() {
  if (!currentCustomer) return;

  const cust = ledger[currentCustomer];
  transactionTable.innerHTML = '';

  let credits = cust.transactions.filter(t => t.type === 'Credit')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let debits = cust.transactions.filter(t => t.type === 'Debit')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const maxLen = Math.max(credits.length, debits.length);

  let runningBalance = 0;
  let totalC = 0;
  let totalD = 0;

  for (let i = 0; i < maxLen; i++) {
    const credit = credits[i];
    const debit = debits[i];

    if (credit) {
      runningBalance += credit.amount;
      totalC += credit.amount;
    }
    if (debit) {
      runningBalance -= debit.amount;
      totalD += debit.amount;
    }

    const row = transactionTable.insertRow();

    row.innerHTML = `
      <td>${credit ? credit.date : ''}</td>

      <td class="credit-col">
        ${credit ? '₹' + credit.amount : ''}
        ${credit ? `
          <button class="delete-credit"
            onclick="deleteTransactionByType('${currentCustomer}', 'Credit', ${i})">
            🗑️
          </button>
        ` : ''}
      </td>

      <td>${debit ? debit.date : ''}</td>

      <td class="debit-col">
        ${debit ? '₹' + debit.amount : ''}
        ${debit ? `
          <button class="delete-debit"
            onclick="deleteTransactionByType('${currentCustomer}', 'Debit', ${i})">
            🗑️
          </button>
        ` : ''}
      </td>

      <td class="${runningBalance >= 0 ? 'balance-pos' : 'balance-neg'}">
        ₹${runningBalance}
      </td>
    `;
  }

  const pending = getPendingDays(cust.transactions);

  summaryDiv.innerHTML = `
    <div style="text-align:center;margin-top:15px;">
      <div>उधार: <span style="color:green;font-weight:bold;">₹${totalC}</span></div>
      <div>जमा: <span style="color:blue;font-weight:bold;">₹${totalD}</span></div>
      <div>शेष: ₹${totalC - totalD}</div>
      <div style="color:${pending > 30 ? 'red' : 'black'}">
        ⏳ Pending Days: <b>${pending}</b>
      </div>
    </div>
  `;
}



// ------------------------ DELETE CUSTOMER ------------------------
deleteCustomerBtn.onclick = async () => {
  if (!currentCustomer) return;
  if (!confirm("Delete customer?")) return;

  ledger.__BIN__.customers.push({
    name: currentCustomer,
    ...ledger[currentCustomer],
    deletedAt: new Date().toISOString()
  });

  delete ledger[currentCustomer];
  currentCustomer = null;
  await saveLedgerToCloud();
  renderCustomers();
  transactionTable.innerHTML = '';
  phoneList.innerHTML = '';
};

// ------------------------ DELETE SINGLE TRANSACTION ------------------------
function deleteTransactionByType(customer, type, index) {
  if (!confirm("Move this transaction to Recycle Bin?")) return;

  const cust = ledger[customer];
  if (!cust) return;

  // Get transactions of this type
  const sameType = cust.transactions.filter(t => t.type === type);
  const txn = sameType[index];
  if (!txn) return;

  // Remove exact transaction
  const realIndex = cust.transactions.indexOf(txn);
  cust.transactions.splice(realIndex, 1);

  // Ensure recycle bin exists
  if (!ledger.__BIN__) ledger.__BIN__ = { customers: [], transactions: [] };

  // Push to recycle bin
  ledger.__BIN__.transactions.push({
    customer,
    ...txn,
    deletedAt: new Date().toISOString()
  });

  saveLedgerToCloud();
  renderTransactions();
}

// ------------------------ TICKER ------------------------
function updateTicker() {
  let c = 0, d = 0;
  Object.values(ledger).forEach(v => {
    if (!v.transactions) return;
    v.transactions.forEach(t => t.type === 'Credit' ? c += t.amount : d += t.amount);
  });
  ticker.textContent = `कुल उधार ₹${c} | कुल जमा ₹${d} | शेष ₹${c-d}`;
}

// ------------------------ PENDING FILTER ------------------------
filterPendingBtn.onclick = () => {
  const days = +pendingDaysInput.value;
  if (!days) return alert("Enter days");

  customerList.innerHTML = '';
  Object.keys(ledger).forEach(name => {
    if (name === "__BIN__") return;
    if (getPendingDays(ledger[name].transactions) >= days) {
      const li = document.createElement('li');
      li.textContent = name + ' 🔴';
      li.style.background = 'red';
      li.style.color = 'white';
      li.onclick = () => {
        currentCustomer = name;
        customerTitle.textContent = name;
        renderTransactions();
        updatePhoneList(ledger[name]);
      };
      customerList.appendChild(li);
    }
  });
};

// ------------------------ RECYCLE BIN ------------------------
openBinBtn.onclick = () => {
  if (typeof showBin === "function") showBin(ledger);
  else alert("Recycle Bin not loaded");
};

// ------------------------ DATE FORMAT HELPER ------------------------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
}


// ------------------------ WHATSAPP REMINDER ------------------------
whatsappReminderBtn.onclick = () => {
  if (!currentCustomer) {
    alert("Select a customer first");
    return;
  }

  const cust = ledger[currentCustomer];
  if (!cust.transactions.length) {
    alert("No transactions found");
    return;
  }

  const choice = prompt(
`Choose option:
1 - Last entry
2 - All entries
3 - Only Udhar
4 - Only Jama
5 - Specific date entry (YYYY-MM-DD)`
  );

  if (!choice) return;

  let selected = [];
  let balance = 0;

  // Calculate full balance always
  cust.transactions.forEach(t => {
    balance += t.type === "Credit" ? t.amount : -t.amount;
  });

  switch (choice) {
    case "1": // Last entry
      selected = [cust.transactions[cust.transactions.length - 1]];
      break;

    case "2": // All
      selected = cust.transactions;
      break;

    case "3": // Only Credit
      selected = cust.transactions.filter(t => t.type === "Credit");
      break;

    case "4": // Only Debit
      selected = cust.transactions.filter(t => t.type === "Debit");
      break;

    case "5": { // Specific date
      const date = prompt("Enter date (YYYY-MM-DD)");
      if (!date) return;
      selected = cust.transactions.filter(t => t.date === date);
      if (!selected.length) {
        alert("No entry found for this date");
        return;
      }
      break;
    }

    default:
      alert("Invalid option");
      return;
  }

  let message = "";

  selected.forEach(t => {
    const d = formatDate(t.date);
    if (t.type === "Credit") {
      message += `Udhar ₹${t.amount} on ${d}\n`;
    } else {
      message += `Jama ₹${t.amount} on ${d}\n`;
    }
  });

  message += `\nRemaining Balance: ₹${balance}`;

  const phone = cust.phones[0];
  if (!phone) {
    alert("No phone number found");
    return;
  }

    const url =
    `https://wa.me/91${phone}?text=` +
    encodeURIComponent(message);

  openWhatsAppDirect(url);
};


// ------------------------ GENERATE PDF ------------------------
generatePDFBtn.onclick = () => {
  if (!currentCustomer) {
    alert("Select a customer first");
    return;
  }

  const customer = ledger[currentCustomer];
  if (!customer.transactions || customer.transactions.length === 0) {
    alert("No transactions found");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text(`Radhe Radhe Ledger`, 14, 10);
  doc.text(`Customer: ${currentCustomer}`, 14, 18);

  let balance = 0;

  const rows = customer.transactions.map(t => {
    balance += t.type === 'Credit' ? t.amount : -t.amount;
    return [
      t.date,
      t.type === 'Credit' ? t.amount : '',
      t.type === 'Debit' ? t.amount : '',
      balance
    ];
  });

  doc.autoTable({
    startY: 25,
    head: [['Date', 'Credit', 'Debit', 'Running Balance']],
    body: rows
  });

  doc.save(`${currentCustomer}_ledger.pdf`);
};

// ------------------------ WHATSAPP OPEN HELPER (DO NOT MODIFY) ------------------------
function openWhatsAppDirect(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}




