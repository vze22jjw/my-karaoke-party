
// Get a reference to the YouTube video player element
const videoElement = document.querySelector('video');

// Ensure the video element exists (YouTube might take a moment to load it)
if (videoElement) {
  //videoElement.pause();

  // Event listener for when the video ends
  videoElement.addEventListener('ended', () => {
    console.log('Video ended!');

    // const currentUrl = new URL(window.location.href);
    // const videoId = currentUrl.searchParams.get('v');

    // // Send a message to the background script indicating the video has ended
    // //chrome.runtime.sendMessage({ event: 'videoEnded', videoId });

    // console.log("sending mykaraokeparty.videoEnded message...")

    // window.postMessage({ action: 'mykaraokeparty.videoEnded', videoId }, '*');
    // window.parent.postMessage({ action: 'mykaraokeparty.videoEnded', videoId }, '*');

    // Send a message to the background script
    // chrome.runtime.sendMessage({ action: 'mykaraokeparty.videoEnded', videoId }, (response) => {
    //   // Optional: Handle the response from the background script if needed
    //   console.log("Response from background:", response);
    // });

    window.close();
  });
} else {
  console.error('Video element not found.');
  // You could potentially add a retry mechanism here if needed
}

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'videoEnded') {
//     window.dispatchEvent(new CustomEvent('videoEndedFromExtension', { detail: { event: 'videoEnded' } }));
//   }
// });

// // This will get injected into the YouTube page
// console.log("Content script injected!");

// // content.js

// // Check if the API script is already loaded
// let player;
// function onYouTubeIframeAPIReady() {
//   player = new YT.Player('movie_player', {
//     events: {
//       'onReady': onPlayerReady,
//       'onStateChange': onPlayerStateChange
//     }
//   });
// }

// function onPlayerReady(event) {
//   // You can add any initial setup logic here (if needed)
//   console.log('YouTube player is ready!');
// }

// function onPlayerStateChange(event) {
//   if (event.data === YT.PlayerState.ENDED) {
//     console.log('Video ended!');

//     // Send a message to the background script indicating the video has ended
//     chrome.runtime.sendMessage({ event: 'videoEnded' });
//   }
// }

// if (typeof YT !== "undefined" && YT.Player) {
//   // If the API is already loaded, create the player immediately
//   onYouTubeIframeAPIReady();
// } else {
//   // If not loaded, wait for it to load and then create the player
//   let apiLoaded = false;
//   const checkForApi = () => {
//     if (apiLoaded || (typeof YT !== "undefined" && YT.Player)) {
//       onYouTubeIframeAPIReady();
//       apiLoaded = true;
//     } else {
//       setTimeout(checkForApi, 100); // Check again in 100 milliseconds
//     }
//   };
//   checkForApi();
// }
