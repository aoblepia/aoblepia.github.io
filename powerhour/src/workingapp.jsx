/*────────────────────────  src/App.jsx  ────────────────────────
  Power Hour – sleek full-screen player
  React + Vite + Tailwind + Spotify Web Playback SDK + framer-motion
  ───────────────────────────────────────────────────────────────*/
  import React, { useState, useEffect, useRef } from 'react';
  import { AnimatePresence, motion } from 'framer-motion';
  import './style.css';               // tailwind layers already injected
  
  /*────────────  CONSTANTS  ────────────*/
  const DEFAULT_SNIPPET = 60;          // seconds
  const MAX_ROUNDS      = 60;          // classic “power hour”
  const DING_SOUND      = new Audio('/mario_coin_sound.mp3');
  
  const DEFAULT_PLAYLIST_ID = '0vQTg4ClycXZ9jyg9gaCHy';
  const CLIENT_ID       = '1b18fcead5db49a2a6b8cf814411cb01';
  const REDIRECT_URI    = window.location.origin + '/';
  const SCOPES          = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'playlist-read-private',
  ].join(' ');
  
  /*────────────  MAIN APP  ────────────*/
  export default function App() {
    /*── global flow ──*/
    const [token, setToken]     = useState(null);
    const [stage, setStage]     = useState('auth');           // auth | setup | confirm | play
  
    /*── playlist / mapping ──*/
    const [mode, setMode]           = useState('default');
    const [playlistId, setPlaylistId]= useState(DEFAULT_PLAYLIST_ID);
    const [tracks, setTracks]       = useState([]);
    const [trackIdx, setTrackIdx]   = useState(0);
    const [trackTotal, setTrackTotal]= useState(MAX_ROUNDS);
  
    /* snippet timing */
    const [snippetLen, setSnippetLen] = useState(DEFAULT_SNIPPET);
    const revealAt      = Math.floor(snippetLen / 2);
    const [count, setCount]          = useState(snippetLen);
    const [revealed, setRevealed]    = useState(false);
  
    /* mapping UI */
    const [enableMap, setEnableMap]  = useState(false);
    const [incSize, setIncSize]      = useState(100);
    const [entries, setEntries]      = useState([]);
    const [trackCount, setTrackCount]= useState(0);
  
    /* settings drawer */
    const [drawer, setDrawer]        = useState(false);
    const [tempLen, setTempLen]      = useState(snippetLen);
  
    /* misc */
    const [loading, setLoading]      = useState(false);
    const playerRef = useRef(null);
    const curTrack  = tracks[trackIdx] ?? {};
  
    /*────────────  HELPERS  ────────────*/
    const login = () => {
      const auth = 'https://accounts.spotify.com/authorize';
      window.location.href =
        `${auth}?response_type=token&client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SCOPES)}`;
    };
  
    const defaultNames = ['Nick','John','Molly','Aidan','Abbie','Fergy','Garrett'];
  
    const getUserName = (origIdx) => {
      // contributor mapping (custom)
      if (enableMap && entries.length) {
        for (const { range, name } of entries) {
          const [s, e] = range.split('-').map(Number);
          if (origIdx >= s && origIdx <= e) return name || '???';
        }
      }
      // default mode fallback
      return defaultNames[Math.floor(origIdx / 100)] ?? '???';
    };
  
    const buildSkeleton = total => {
      const list = [];
      for (let i = 0; i < total; i += incSize) {
        list.push({ range: `${i}-${Math.min(i + incSize - 1, total - 1)}`, name: '' });
      }
      setEntries(list);
    };
  
    /*────────────  EFFECTS  ────────────*/
  
    /* 1️⃣ grab token after OAuth */
    useEffect(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.get('access_token')) {
        setToken(hash.get('access_token'));
        setStage('setup');
      }
    }, []);
  
    /* 2️⃣ load Spotify Web Playback SDK */
    useEffect(() => {
      if (!token || playerRef.current) return;
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.async = true;
      document.body.appendChild(s);
      window.onSpotifyWebPlaybackSDKReady = () => {
        const player = new window.Spotify.Player({
          name: 'Power Hour Player',
          getOAuthToken: cb => cb(token),
          volume: 0.85,
        });
        player.connect();
        player.addListener('ready', ({ device_id }) => (player.deviceId = device_id));
        playerRef.current = player;
      };
    }, [token]);
  
    /* 3️⃣ rebuild skeleton when needed */
    useEffect(() => {
      if (enableMap && trackCount) buildSkeleton(trackCount);
    }, [enableMap, incSize, trackCount]);
  
    /* 4️⃣ countdown per-track */
    useEffect(() => {
      if (stage !== 'play' || !tracks.length) return;
      DING_SOUND.play();
      playTrack();
      setCount(snippetLen);
      setRevealed(false);
  
      const timer = setInterval(() => {
        setCount(c => {
          if (c <= 1) {
            clearInterval(timer);
            setTimeout(() => setTrackIdx(i => (i + 1) % trackTotal), 1000);
            return 0;
          }
          if (c === revealAt + 1) setRevealed(true);
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }, [trackIdx, stage, snippetLen]);
  
    /*────────────  DATA LOAD  ────────────*/
    async function fetchTracks(id) {
      setLoading(true);
      try {
        let items = [],
          next = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
        while (next) {
          const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          items.push(...data.items);
          next = data.next;
        }
        // shuffle items (Fisher-Yates)
        items = items
          .map((it, idx) => ({ ...it, origIdx: idx }))
          .sort(() => Math.random() - 0.5);
  
        // Keep only the first MAX_ROUNDS tracks to honour “power hour”
        const chosen = items.slice(0, MAX_ROUNDS);
  
        setTracks(
          chosen.map(x => ({
            name: x.track.name,
            artist: x.track.artists.map(a => a.name).join(', '),
            albumArt: x.track.album.images[0]?.url,
            uri: x.track.uri,
            user: getUserName(x.origIdx),
          }))
        );
        setTrackTotal(chosen.length);
        setTrackCount(items.length);
      } catch (err) {
        alert('Could not load playlist – check the ID or your Spotify plan.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  
    /*────────────  PLAY  ────────────*/
    async function playTrack() {
      if (!token || !playerRef.current?.deviceId) return;
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${playerRef.current.deviceId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ uris: [curTrack.uri], position_ms: 60000 }),
        }
      ).catch(console.error);
    }
  
    /*────────────  UI SECTIONS  ────────────*/
    if (stage === 'auth')
      return (
        <Screen>
          <h1 className="title mb-8">Power&nbsp;Hour</h1>
          <PrimaryBtn onClick={login}>Login with Spotify</PrimaryBtn>
        </Screen>
      );
  
    if (stage === 'setup')
      return (
        <Screen>
          <h1 className="title mb-6">Configure Playlist</h1>
  
          <select value={mode} onChange={e => setMode(e.target.value)} className="select">
            <option value="default">Default playlist</option>
            <option value="custom">Custom playlist</option>
          </select>
  
          {mode === 'custom' && (
            <>
              <Input
                value={playlistId}
                onChange={e => setPlaylistId(e.target.value)}
                placeholder="Spotify playlist ID"
              />
              <label className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  className="accent-pink-500"
                  checked={enableMap}
                  onChange={e => setEnableMap(e.target.checked)}
                />
                Enable contributor mapping
              </label>
  
              {enableMap && (
                <>
                  <Input
                    type="number"
                    min={1}
                    value={incSize}
                    onChange={e => setIncSize(+e.target.value)}
                    placeholder="Increment size"
                  />
                </>
              )}
            </>
          )}
  
          <PrimaryBtn
            disabled={loading}
            onClick={() => fetchTracks(playlistId).then(() => setStage('confirm'))}
            className="mt-6"
          >
            {loading ? 'Loading…' : 'Confirm & Load Tracks'}
          </PrimaryBtn>
        </Screen>
      );
  
    if (stage === 'confirm')
      return (
        <Screen>
          <h1 className="title mb-6">Ready to start?</h1>
  
          {enableMap && (
            <div className="w-full max-w-xl mx-auto space-y-3 overflow-y-auto max-h-[50vh] p-2">
              {entries.map((e, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input readOnly value={e.range} className="w-28" />
                  <Input
                    placeholder="Name"
                    value={e.name}
                    onChange={v => {
                      const c = [...entries];
                      c[idx].name = v.target.value;
                      setEntries(c);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
  
          <PrimaryBtn onClick={() => setStage('play')} className="mt-8">
            Start Power Hour
          </PrimaryBtn>
        </Screen>
      );
  
    /*─────  PLAYBACK  ─────*/
    return (
      <Screen full className="relative !px-0">
        {/* Settings Drawer Toggle */}
        <button
          onClick={() => {
            setTempLen(snippetLen);
            setDrawer(true);
          }}
          className="absolute top-6 right-6 text-gray-400 hover:text-white text-2xl lg:text-3xl"
          aria-label="Settings"
        >
          ⚙
        </button>
  
        {/* Split layout */}
        <div className="flex flex-col lg:flex-row w-full h-full">
          {/* Album Art */}
          <div className="lg:w-1/2 flex items-center justify-center bg-black/10">
            <AnimatePresence mode="wait">
              <motion.img
                key={curTrack.uri}
                src={curTrack.albumArt}
                alt={curTrack.name}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="max-h-[80vh] max-w-[80vw] lg:max-w-none lg:w-[70vh] lg:h-[70vh] object-cover rounded-2xl shadow-2xl"
              />
            </AnimatePresence>
          </div>
  
          {/* Text / Controls */}
          <div className="lg:w-1/2 flex flex-col justify-center px-8 py-12 lg:p-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={curTrack.uri + '-info'}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <p className="uppercase tracking-widest text-sm text-gray-400 mb-2">
                  Track {trackIdx + 1} / {trackTotal}
                </p>
                <h2 className="text-3xl lg:text-5xl font-bold mb-2">{curTrack.name}</h2>
                <p className="text-xl lg:text-2xl text-gray-400 mb-8">{curTrack.artist}</p>
  
                {/* Progress bar */}
                <div className="w-full h-4 bg-neutral-700 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${(count / snippetLen) * 100}%` }}
                  />
                </div>
                <p className="text-5xl font-mono">{count}s</p>
  
                {revealed && (
                  <p className="italic text-cyan-300 mt-6 text-2xl">
                    Added by: {curTrack.user}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
  
        {/* SETTINGS DRAWER */}
        <AnimatePresence>
          {drawer && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-96 bg-neutral-900/95 backdrop-blur-lg z-50 p-8 flex flex-col"
            >
              <h2 className="text-2xl font-bold mb-6">Settings</h2>
  
              <label className="block mb-6">
                Snippet length&nbsp;
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={tempLen}
                  onChange={e => setTempLen(+e.target.value)}
                  className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 w-24 ml-2"
                />
                &nbsp;seconds
              </label>
  
              <PrimaryBtn
                onClick={() => {
                  setSnippetLen(tempLen);
                  setCount(tempLen);
                  setDrawer(false);
                }}
              >
                Save Changes
              </PrimaryBtn>
  
              <hr className="my-6 border-neutral-700" />
  
              <SecondaryBtn
                onClick={() => {
                  setStage('setup');
                  setDrawer(false);
                  setTrackIdx(0);
                }}
                className="mb-4"
              >
                Back to Config
              </SecondaryBtn>
  
              <SecondaryBtn onClick={() => setDrawer(false)}>Close</SecondaryBtn>
            </motion.div>
          )}
        </AnimatePresence>
      </Screen>
    );
  }
  
  /*────────────  MINI UI LIB  ────────────*/
  const Screen = ({ fill = false, children, className = '' }) => (
    <div
      className={[
        'min-h-screen w-full',
        fill ? ''                         /* full-bleed layout */
             : 'flex items-center justify-center', /* centre by default */
        'bg-gradient-to-br from-black via-neutral-900 to-neutral-800 text-white',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
  
  const PrimaryBtn = ({ children, className = '', ...p }) => (
    <button
      {...p}
      className={`bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:pointer-events-none text-lg font-semibold px-6 py-3 rounded-full transition ${className}`}
    >
      {children}
    </button>
  );
  
  const SecondaryBtn = ({ children, className = '', ...p }) => (
    <button
      {...p}
      className={`underline text-gray-400 hover:text-white transition ${className}`}
    >
      {children}
    </button>
  );
  
  const Input = ({ className = '', ...p }) => (
    <input
      {...p}
      className={`bg-neutral-800 border border-neutral-600 rounded px-3 py-2 w-full text-white ${className}`}
    />
  );
  