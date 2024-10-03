let userToken = "";
const apiUrl = "https://hiclaim.deltalife.org/api/v1/get-pending-claims/self";
// TODO: Let's hardcode the start and end date for now
const startDate = new Date("2024-07-01");
const endDate = new Date("2025-06-30");

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
      }
    );
  });
});

async function showDashboard(response) {
  const inPatientElem = document.getElementById("in_patient");
  const inPatientTableBodyElem = document.getElementById(
    "in_patient_table_body"
  );
  const outPatientElem = document.getElementById("out_patient");
  const outPatientTableBodyElem = document.getElementById(
    "out_patient_table_body"
  );
  if (response && response.localStorageData) {
    const claimResp = await getClaims(response.localStorageData);
    const claims = await claimResp.json();
    const displayData = calculateDashboard(claims.data);
    prepareTable(inPatientTableBodyElem, displayData.in);
    prepareTable(outPatientTableBodyElem, displayData.out);

    if (Object.keys(displayData.in).length < 1) {
      inPatientElem.style.display = "none";
      document.getElementById("divider").style.display = "none";
    }
    if (Object.keys(displayData.out).length < 1) {
      outPatientElem.style.display = "none";
      document.getElementById("divider").style.display = "none";
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
  }
  console.log(claim_info);
  return claim_info;
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
