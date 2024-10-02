console.log('This is a popup!');

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
      // Filter requests based on your criteria
      if (details.url.startsWith("https://hiclaim.deltalife.org/api/")) {
        // Send the request to the background script
        console.log(details)
        chrome.runtime.sendMessage({ request: details });
      }
    },
    { urls: ["https://hiclaim.deltalife.org/*"] },
    ["requestBody"]
  );