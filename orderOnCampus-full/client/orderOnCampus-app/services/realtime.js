import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';
import { getToken } from './api';

// One Socket.IO connection while the student is signed in. The server authenticates it with the
// student's token and decides which rooms it joins (their own orders + public menu/content changes);
// the app cannot subscribe to anything else. Events only say what changed — screens refetch from the API.
let socket = null;
let status = 'off'; // off | connecting | live | offline
const listeners = new Set();
const statusListeners = new Set();
let seen = [];

const setStatus = (s) => {
  status = s;
  statusListeners.forEach((fn) => fn(s));
};
const dispatch = (event) => listeners.forEach((fn) => { try { fn(event); } catch (e) { console.warn(e); } });

export async function connectRealtime() {
  const token = await getToken();
  if (!token) return;
  if (socket) {
    if (!socket.connected) socket.connect();
    return;
  }
  setStatus('connecting');
  socket = io(API_URL, { transports: ['websocket'], auth: { token }, reconnectionDelayMax: 10000 });
  let everConnected = false;
  socket.on('connect', () => {
    setStatus('live');
    if (everConnected) dispatch({ type: 'resync', at: new Date().toISOString() });
    everConnected = true;
  });
  socket.on('disconnect', () => setStatus('offline'));
  socket.on('connect_error', () => setStatus('offline'));
  socket.on('event', (event) => {
    if (!event?.id || seen.includes(event.id)) return; // drop duplicates
    seen = [event.id, ...seen].slice(0, 200);
    dispatch(event);
  });
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  seen = [];
  setStatus('off');
}

// Coming back to the foreground: reconnect if needed and ask screens to refetch.
AppState.addEventListener('change', (state) => {
  if (state !== 'active' || !socket) return;
  if (!socket.connected) socket.connect();
  dispatch({ type: 'resync', at: new Date().toISOString() });
});

export const subscribeRealtime = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const subscribeRealtimeStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };
export const getRealtimeStatus = () => status;
