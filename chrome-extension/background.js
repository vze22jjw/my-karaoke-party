
// const ws = new WebSocket("ws://localhost:41689")

// ws.onopen = () => {
//   console.log('Connected to WebSocket server from background script');
// };


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'mykaraokeparty.videoEnded') {
//     // Find the tab where your Next.js app is running (replace 'YOUR_TAB_ID' with the actual tab ID)
//     chrome.tabs.query({ url: 'http://localhost:3000/*' }, (tabs) => {
//       if (tabs.length > 0) {
//         chrome.tabs.sendMessage(tabs[0].id, { action: 'mykaraokeparty.videoEnded', videoId: message.videoId });
//       } else {
//         console.error('Next.js tab not found');
//       }
//     });
//   }
//   return true; // Keep the message channel open for any response
// });

// // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// //   if (message.action === 'openCustomTab') {
// //     const videoId = message.videoId;
// //     const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

// //     // Construct the intent for Chrome Custom Tabs
// //     const customTabsIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(youtubeUrl));
// //     customTabsIntent.setPackage("com.android.chrome"); // Explicitly target Chrome
// //     customTabsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

// //     try {
// //       context.startActivity(customTabsIntent); // 'context' is your Android context
// //     } catch (activityNotFoundException) {
// //       // Fallback: Open in the YouTube app if Chrome isn't available
// //       const youtubeAppIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(youtubeUrl));
// //       context.startActivity(youtubeAppIntent);
// //     }
// //   }
// // });

// // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// //   debugger;
// //   if (message.event === 'videoEnded') {
// //     // Get the active tab
// //     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
// //       const activeTab = tabs[0];
// //       if (activeTab) {
// //         // Send a message to the content script of the active tab
// //         chrome.tabs.sendMessage(activeTab.id, { action: 'videoEnded' });
// //       }
// //     });
// //   }
// // });

// // window.addEventListener()