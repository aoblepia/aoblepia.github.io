// script.js - Full dynamic Power Hour

let token = null;
let tracks = [];
let playedURIs = new Set();
let currentIndex = 0;

const startBtn = document.getElementById("start-button");
const playerSection = document.getElementById("player");
const setupSection = document.getElementById("setup");
const countdownDisplay = document.getElementById("countdown");
const albumArt = document.getElementById("album-art");
const trackName = document.getElementById("track-name");
const artistName = document.getElementById("artist-name");
const userName = document.getElementById("user-name");
const trackNum = document.getElementById("track-number");
const ding = document.getElementById("ding");

startBtn.addEventListener("click", async () => {
  const playlistURI = document.getElementById("playlist-uri").value.trim();
  const snippetLength = parseInt(document.getElementById("snippet-length").value);
  const numberOfSongs = parseInt(document.getElementById("number-of-songs").value);

  if (!token) {
    loginWithSpotify();
    return;
  }

  setupSection.classList.add("hidden");
  playerSection.classList.remove("hidden");

  await fetchTracks(playlistURI);
  runPowerHour(snippetLength, numberOfSongs);
});

function loginWithSpotify() {
  const clientId = "1b18fcead5db49a2a6b8cf814411cb01";
  const redirectUri = window.location.href;
  const scopes = "user-read-playback-state user-modify-playback-state streaming";
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  window.location = authUrl;
}

function getTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

async function fetchTracks(playlistURI) {
  const playlistID = playlistURI.split(":").pop();
  let url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;
  tracks = [];

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    tracks.push(...data.items.map((item) => item.track));
    url = data.next;
  }
}

function getRandomTrack() {
  const remaining = tracks.filter((t) => !playedURIs.has(t.uri));
  if (remaining.length === 0) playedURIs.clear();
  const track = remaining[Math.floor(Math.random() * remaining.length)];
  playedURIs.add(track.uri);
  return track;
}

async function playTrack(track) {
  await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uris: [track.uri], position_ms: Math.floor(track.duration_ms / 2) })
  });
}

function updateDisplay(track, index) {
  trackName.textContent = track.name;
  artistName.textContent = "by " + track.artists.map(a => a.name).join(", ");
  trackNum.textContent = `Track ${index + 1}`;
  albumArt.src = track.album.images[0]?.url || "";
  userName.textContent = "Added by: ???";
  userName.style.color = "#aaa";
}

function revealUser(user = "Someone") {
  userName.textContent = `Added by: ${user}`;
  userName.style.color = "#00FFD5";
}

function startCountdown(duration, onEnd, revealName) {
  let timeLeft = duration;
  countdownDisplay.textContent = timeLeft;
  const interval = setInterval(() => {
    timeLeft--;
    countdownDisplay.textContent = timeLeft;

    if (timeLeft === 10) {
      revealUser(revealName);
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      onEnd();
    }
  }, 1000);
}

function playDing() {
  ding.currentTime = 0;
  ding.play().catch(err => console.warn("Ding play error:", err));
}

function runPowerHour(snippetLength, numberOfSongs) {
  async function nextTrack() {
    if (currentIndex >= numberOfSongs) {
      countdownDisplay.textContent = "✅ Done!";
      return;
    }
    const track = getRandomTrack();
    const user = "DJ Power"; // Placeholder

    playDing();
    await playTrack(track);
    updateDisplay(track, currentIndex);
    startCountdown(snippetLength, nextTrack, user);

    currentIndex++;
  }
  currentIndex = 0;
  nextTrack();
}

window.onload = () => {
  token = getTokenFromUrl();
  if (token) {
    startBtn.textContent = "Start Power Hour";
  }
};