import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './style.css';

const SNIPPET_DURATION = 20;
const TRACK_TOTAL = 60;
const REVEAL_AT = 10;
const DING_SOUND = new Audio('/mario_coin_sound.mp3');
const DEFAULT_PLAYLIST_ID = '0vQTg4ClycXZ9jyg9gaCHy';
const CLIENT_ID = '1b18fcead5db49a2a6b8cf814411cb01';
const REDIRECT_URI = 'http://localhost:5173/';
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [playlistMode, setPlaylistMode] = useState('default');
  const [playlistId, setPlaylistId] = useState(DEFAULT_PLAYLIST_ID);
  const [tracks, setTracks] = useState([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [count, setCount] = useState(SNIPPET_DURATION);
  const [revealed, setRevealed] = useState(false);
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState('auth');
  const [contributorNamesEnabled, setContributorNamesEnabled] = useState(false);
  const [mappingEntries, setMappingEntries] = useState([]);
  const [incrementSize, setIncrementSize] = useState(100);
  const [trackCount, setTrackCount] = useState(0);

  const playerRef = useRef(null);
  const currentTrack = tracks.length > 0 ? tracks[trackIndex % tracks.length] : null;

  const getUserByIndex = (index) => {
    if (!contributorNamesEnabled) {
      if (playlistMode === 'default') {
        if (index < 100) return 'Nick';
        if (index < 200) return 'John';
        if (index < 300) return 'Molly';
        if (index < 400) return 'Aidan';
        if (index < 500) return 'Abbie';
        if (index < 600) return 'Fergy';
        if (index < 700) return 'Garrett';
      }
      return '???';
    }
    for (const { range, name } of mappingEntries) {
      const [start, end] = range.split('-').map(Number);
      if (index >= start && index <= end) return name || '???';
    }
    return '???';
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const token = urlParams.get('access_token');
    if (token) {
      setAccessToken(token);
      setStage('select');
    }
  }, []);

  useEffect(() => {
    if (!accessToken || playerRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Power Hour Player',
        getOAuthToken: cb => cb(accessToken),
        volume: 0.8
      });
      player.connect();
      playerRef.current = player;
      player.addListener('ready', ({ device_id }) => {
        playerRef.current.deviceId = device_id;
      });
    };
  }, [accessToken]);

  useEffect(() => {
    if (
      playlistMode === 'custom' &&
      contributorNamesEnabled &&
      trackCount > 0 &&
      incrementSize > 0
    ) {
      const entries = [];
      const groupSize = parseInt(incrementSize);
      for (let i = 0; i < trackCount; i += groupSize) {
        entries.push({
          range: `${i}-${Math.min(i + groupSize - 1, trackCount - 1)}`,
          name: ''
        });
      }
      setMappingEntries(entries);
    }
  }, [trackCount, incrementSize, contributorNamesEnabled, playlistMode]);

  useEffect(() => {
    if (!started || !currentTrack) return;
    DING_SOUND.play();
    setRevealed(false);
    setCount(SNIPPET_DURATION);
    playCurrentTrack();
    const timer = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            setTrackIndex((i) => i + 1);
          }, 1000);
          return 0;
        }
        if (c === REVEAL_AT + 1) setRevealed(true);
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [trackIndex, currentTrack, started]);

  const playCurrentTrack = async () => {
    if (!accessToken || !playerRef.current?.deviceId || !tracks.length) return;
    try {
      const uri = tracks[trackIndex % tracks.length].uri;
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${playerRef.current.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri], position_ms: 60000 })
      });
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const loginToSpotify = () => {
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    window.location = `${authEndpoint}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token`;
  };

  const fetchTracks = async (token, pid) => {
    try {
      let allItems = [];
      let nextUrl = `https://api.spotify.com/v1/playlists/${pid}/tracks?limit=100`;

      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        allItems = [...allItems, ...data.items];
        nextUrl = data.next;
      }

      const count = allItems.length;
      setTrackCount(count);

      const shuffled = allItems.map(({ track }, i) => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        albumArt: track.album.images[0]?.url,
        uri: track.uri,
        user: getUserByIndex(i)
      })).filter(Boolean).sort(() => Math.random() - 0.5);

      setTracks(shuffled);
    } catch (e) {
      alert("Could not fetch playlist. Check the ID and try again.");
    }
  };

  if (stage === 'auth') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-5xl font-bold mb-6">Power Hour</h1>
        <button onClick={loginToSpotify} className="bg-green-500 px-6 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition">Login with Spotify</button>
      </div>
    );
  }

  if (stage === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8">
        <h1 className="text-4xl font-bold mb-4">Configure Playlist</h1>
        <select
          className="bg-neutral-800 border border-neutral-600 rounded px-4 py-2 text-white mb-6"
          value={playlistMode}
          onChange={(e) => setPlaylistMode(e.target.value)}
        >
          <option value="default">Default Playlist</option>
          <option value="custom">Custom Playlist</option>
        </select>
        {playlistMode === 'custom' && (
          <input
            type="text"
            placeholder="Enter custom playlist ID"
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-4 py-2 text-white mb-6 w-96"
          />
        )}
        <button
          onClick={async () => {
            await fetchTracks(accessToken, playlistId);
            setStage('confirm');
          }}
          className="bg-green-500 px-6 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition"
        >
          Confirm and Load Tracks
        </button>
      </div>
    );
  }

  if (stage === 'confirm' && !started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-4">Ready to begin?</h1>
        <button onClick={() => setStarted(true)} className="bg-green-500 px-6 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition">Start Power Hour</button>
        <button onClick={() => setStage('select')} className="mt-4 text-sm text-gray-400 underline">Back to Playlist Selection</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-zinc-900 to-neutral-800 text-white p-6">
      <h1 className="text-xl tracking-wide uppercase text-gray-400 mb-4">Track {trackIndex + 1} / {TRACK_TOTAL}</h1>
      {currentTrack && (
        <motion.div key={currentTrack.uri} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <img src={currentTrack.albumArt} alt="Album Art" className="rounded-2xl shadow-lg w-80 h-80 object-cover mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-1">{currentTrack.name}</h2>
          <h3 className="text-xl text-gray-400 mb-6">{currentTrack.artist}</h3>
        </motion.div>
      )}
      <div className="w-full max-w-lg h-4 bg-neutral-700 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-yellow-400 transition-all duration-1000"
          style={{ width: `${(count / SNIPPET_DURATION) * 100}%` }}
        ></div>
      </div>
      {revealed && currentTrack && (
        <p className="text-lg italic text-cyan-300 mb-4">Added by: {currentTrack.user}</p>
      )}
      <button onClick={() => {
        setStarted(false);
        setStage('config');
        setTrackIndex(0);
      }} className="mt-6 text-sm text-gray-500 hover:text-white underline">Back to Config</button>
    </div>
  );
}

export default App;
