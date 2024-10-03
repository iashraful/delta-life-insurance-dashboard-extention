// Function to read local storage data
function readLocalStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data; // You can also send this data back to your background script if needed
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getLocalStorage") {
    const localStorageData = readLocalStorage();
    sendResponse({ localStorageData });
  }
});
