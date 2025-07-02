let userToken = "";
const apiUrl = "https://hiclaim.deltalife.org/api/v1/get-pending-claims/self";
let dashResp = null;
let { startDate, endDate } = getCurrentFiscalYear();

const fiscalYearSelect = document.getElementById("fiscal-year-select");
fiscalYearSelect.addEventListener("change", async function (value) {
  let dateRange;
  if (value.target.value === "Last_Fiscal_Year") {
    dateRange = getLastFiscalYear();
  } else {
    dateRange = getCurrentFiscalYear();
  }
  startDate = dateRange.startDate;
  endDate = dateRange.endDate;
  await showDashboard(dashResp, true);
});

document.addEventListener("DOMContentLoaded", () => {
  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    // Send a message to the content script to get local storage data
    chrome.tabs.sendMessage(
      activeTab.id,
      { action: "getLocalStorage" },
      async (response) => {
        await showDashboard(response);
        dashResp = response;
      }
    );
  });
});

function getCurrentFiscalYear() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 6 = July, etc.)

  let startDate, endDate;

  if (currentMonth < 6) {
    // If current month is before July (January to June)
    startDate = new Date(currentYear - 1, 6, 1); // July 1st of last year
    endDate = new Date(currentYear, 5, 30); // June 30th of current year
  } else {
    // If current month is July or later
    startDate = new Date(currentYear, 6, 1); // July 1st of current year
    endDate = new Date(currentYear + 1, 5, 30); // June 30th of next year
  }

  return { startDate, endDate };
}

function getLastFiscalYear() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 6 = July, etc.)

  let startDate, endDate;

  if (currentMonth < 6) {
    // If current month is before July (January to June)
    // Last fiscal year is July 1, two years ago, to June 30, last year
    startDate = new Date(currentYear - 2, 6, 1); // July 1st of two years ago
    endDate = new Date(currentYear - 1, 5, 30); // June 30th of last year
  } else {
    // If current month is July or later
    // Last fiscal year is July 1, last year, to June 30, current year
    startDate = new Date(currentYear - 1, 6, 1); // July 1st of last year
    endDate = new Date(currentYear, 5, 30); // June 30th of current year
  }

  return { startDate, endDate };
}

function updateReportDate(elemId) {
  const inDateRangeElem = document.getElementById(elemId);
  inDateRangeElem.textContent = `(${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
}

async function showDashboard(response, flushTable = false) {
  updateReportDate("in-date-range");
  updateReportDate("out-date-range");

  const inPatientElem = document.getElementById("in_patient");
  const inPatientTableBodyElem = document.getElementById(
    "in_patient_table_body"
  );
  const inPatientTableFootElem = document.getElementById(
    "in_patient_table_foot"
  );
  const outPatientElem = document.getElementById("out_patient");
  const outPatientTableBodyElem = document.getElementById(
    "out_patient_table_body"
  );
  const outPatientTableFootElem = document.getElementById(
    "out_patient_table_foot"
  );

  if (flushTable) {
    inPatientTableBodyElem.innerHTML = "";
    inPatientTableFootElem.innerHTML = "";
    outPatientTableBodyElem.innerHTML = "";
    outPatientTableFootElem.innerHTML = "";
    if (inPatientElem && inPatientElem.children.length >= 3) {
      inPatientElem.children[2].remove(); // Remove the third child element (0-based index)
      document.getElementById("in-patient-table").style.display = "block";
    }
    if (outPatientElem && outPatientElem.children.length >= 3) {
      outPatientElem.children[2].remove(); // Remove the third child element (0-based index)
      document.getElementById("out-patient-table").style.display = "block";
    }
  }
  if (response && response.localStorageData) {
    const claimResp = await getClaims(response.localStorageData);
    const claims = await claimResp.json();
    const calculatedData = calculateDashboard(claims.data);
    prepareTable(inPatientTableBodyElem, calculatedData.data.in);
    prepareTable(outPatientTableBodyElem, calculatedData.data.out);
    prepareTableFooter(inPatientTableFootElem, calculatedData.total.in);
    prepareTableFooter(outPatientTableFootElem, calculatedData.total.out);

    if (Object.keys(calculatedData.data.in).length < 1) {
      inPatientElem.appendChild(addTextChildElem("p", "No data found"));
      document.getElementById("in-patient-table").style.display = "none";
    }
    if (Object.keys(calculatedData.data.out).length < 1) {
      outPatientElem.appendChild(addTextChildElem("p", "No data found"));
      document.getElementById("out-patient-table").style.display = "none";
    }
  }
}

async function getClaims(localStorageData) {
  userToken = localStorageData.hi_claim_userToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + userToken,
    },
  };
  return fetch(apiUrl, options).catch((error) => {
    console.error("Error fetching data:", error);
  });
}

function calculateDashboard(data) {
  let claim_info = {
    in: {},
    out: {},
  };
  let total_count = {
    in: { completed: 0, pending: 0 },
    out: { completed: 0, pending: 0 },
  };
  for (const item of data) {
    const dt = new Date(item.created_at);
    if (dt < startDate || dt > endDate) {
      continue;
    }

    let visitType = item.claim_type_text === "Out patient" ? "out" : "in";

    if (!(item.name in claim_info[visitType])) {
      claim_info[visitType][item.name] = {
        completed: 0,
        pending: 0,
      };
    }
    claim_info[visitType][item.name]["completed"] +=
      item.status == "5" ? JSON.parse(item.claim_amount.split(" ")[1]) : 0;
    claim_info[visitType][item.name]["pending"] +=
      item.status != "5" ? JSON.parse(item.claim_amount.split(" ")[1]) : 0;

    total_count[visitType]["completed"] +=
      item.status == "5" ? JSON.parse(item.claim_amount.split(" ")[1]) : 0;
    total_count[visitType]["pending"] +=
      item.status != "5" ? JSON.parse(item.claim_amount.split(" ")[1]) : 0;
  }
  return { data: claim_info, total: total_count };
}

function prepareTable(tBodyElem, data) {
  for (const [key, value] of Object.entries(data)) {
    const row = tBodyElem.insertRow();
    const cell1 = row.insertCell();
    const cell2 = row.insertCell();
    const cell3 = row.insertCell();
    cell1.textContent = key;
    cell2.textContent = value["pending"];
    cell3.textContent = value["completed"];
  }
}

function prepareTableFooter(tFootElem, data) {
  if (data.pending > 0 || data.completed > 0) {
    const row = tFootElem.insertRow();
    const cell1 = row.insertCell();
    const cell2 = row.insertCell();
    const cell3 = row.insertCell();
    cell1.textContent = "Total";
    cell2.textContent = data.pending;
    cell3.textContent = data.completed;
  }
}

function addTextChildElem(tag, text) {
  const node = document.createElement(tag);
  const textnode = document.createTextNode(text);
  node.appendChild(textnode);
  return node;
}
