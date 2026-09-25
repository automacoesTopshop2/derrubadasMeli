chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('control.html');
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url, active: true });
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('control.html'), active: true });
});
