import { Platform } from 'react-native';

// When running on web (browser), use localhost.
// When running on a real device, use the local network IP of this computer.
const LAN_IP = '192.168.0.129'; // Your computer's IP on the local Wi-Fi

// Replace this with your actual live Vercel link once you deploy!
const PRODUCTION_URL = 'https://quotation-app-pi.vercel.app';

export const API_BASE = __DEV__
  ? (Platform.OS === 'web' ? 'http://localhost:3000' : `http://${LAN_IP}:3000`)
  : PRODUCTION_URL;

