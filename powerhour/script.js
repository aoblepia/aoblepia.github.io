let token = null;
let tracks = [];
let currentTrackIndex = 0;
let countdownInterval = null;

const TRACK_SNIPPET_DURATION = 20;
const PLAYLIST_ID = "0vQTg4ClycXZ9jyg9gaCHy";
const USERS = ["Nick", "John", "Molly", "Aidan", "Abbie", "Fergy", "Garrett"];

const elements = {
  startButton: document.getElementById("start-button"),
  countdown: document.getElementById("countdown"),
  trackName: document.getElementById("track-name"),
  artistName: document.getElementById("artist-name"),
  userName: document.getElementById("user-name"),
  trackNumber: document.getElementById("track-number"),
  albumArt: document.getElementById("album-art"),
  ding: document.getElementById("ding")
};

elements.startButton.addEventListener("click", async () => {
  console.log("Start button clicked.");
  if (!token) {
    console.log("No token found, initiating login...");
    loginWithSpotify();
  } else {
    console.log("Token found, starting Power Hour...");
    startPowerHour();
  }
});

function loginWithSpotify() {
  const clientId = "1b18fcead5db49a2a6b8cf814411cb01";
  const redirectUri = window.location.href;
  const scopes = "user-read-playback-state user-modify-playback-state streaming";
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  console.log("Redirecting to Spotify auth:", authUrl);
  window.location = authUrl;
}

window.onload = () => {
  token = getTokenFromUrl();
  console.log("Page loaded. Token:", token);
  if (token) {
    elements.startButton.textContent = "Start Power Hour";
  }
};

function getTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

async function fetchPlaylistTracks() {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  tracks = data.items.map(item => item.track);
}

function pickRandomTrack() {
  const remainingTracks = tracks.filter((_, i) => i !== currentTrackIndex);
  return remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
}

function updateDisplay(track, userName, index) {
  elements.trackName.textContent = track.name;
  elements.artistName.textContent = "by " + track.artists.map(a => a.name).join(", ");
  elements.trackNumber.textContent = `Track ${index + 1}`;
  elements.albumArt.src = track.album.images[0].url;
  elements.userName.textContent = "Added by: ???";
}

function revealUser(userName) {
  elements.userName.textContent = `Added by: ${userName}`;
  elements.userName.style.color = "#00FFD5";
}

function startCountdown(duration, onFinish, revealName) {
  let timeLeft = duration;
  elements.countdown.textContent = timeLeft;
  countdownInterval = setInterval(() => {
    timeLeft--;
    elements.countdown.textContent = timeLeft;

    if (timeLeft === 10) {
      revealUser(revealName);
    }

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      onFinish();
    }
  }, 1000);
}

function playDing() {
  elements.ding.currentTime = 0;
  elements.ding.play();
}

async function playTrack(track) {
  await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [track.uri], position_ms: Math.floor(track.duration_ms / 2) })
  });
}

async function playNext() {
  currentTrackIndex++;
  if (currentTrackIndex >= 60) return;

  const track = pickRandomTrack();
  const userName = USERS[Math.floor(currentTrackIndex / 10)] || "Unknown";

  updateDisplay(track, userName, currentTrackIndex);
  playDing();
  await playTrack(track);
  startCountdown(TRACK_SNIPPET_DURATION, playNext, userName);
}

async function startPowerHour() {
  await fetchPlaylistTracks();
  currentTrackIndex = 0;
  playNext();
}

window.onload = () => {
  token = getTokenFromUrl();
  if (token) {
    elements.startButton.textContent = "Start Power Hour";
  }
};
