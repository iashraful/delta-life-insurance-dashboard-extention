let userToken = "";
const apiUrl = "https://hiclaim.deltalife.org/api/v1/get-pending-claims/self";

document.addEventListener("DOMContentLoaded", () => {
  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    // Send a message to the content script to get local storage data
    chrome.tabs.sendMessage(
      activeTab.id,
      { action: "getLocalStorage" },
      async (response) => {
        const outputElement = document.getElementById("output");
        if (response && response.localStorageData) {
          const claimResp = await getClaims(response.localStorageData);
          const claims = await claimResp.json();
          // Display the local storage data
          outputElement.textContent = JSON.stringify(claims, null, 2);
        } else {
          outputElement.textContent = "No data found.";
        }
      }
    );
  });
});

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
