// Blocks server-side requests to private / internal addresses (SSRF protection).
import { lookup } from 'node:dns/promises';
import net from 'node:net';

function privateIP(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return privateIP(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

const hostCache = new Map();

// Resolves the hostname and checks every address. Cached per warm instance.
export async function publicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  // Test-only escape hatch so local fixtures can be served from 127.0.0.1.
  if (process.env.NODE_ENV === 'test' && String(process.env.BLUEPRINT_TEST_ALLOW_HOSTS || '').split(',').includes(host)) return true;
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  if (net.isIP(host)) return !privateIP(host);
  if (!hostCache.has(host)) {
    hostCache.set(host, lookup(host, { all: true })
      .then(list => list.length > 0 && list.every(x => !privateIP(x.address)))
      .catch(() => false));
  }
  return hostCache.get(host);
}

// Returns a normalised public http(s) URL, or '' when the URL is unsafe or malformed.
export async function publicUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    if (!(await publicHost(u.hostname))) return '';
    u.hash = '';
    return u.href;
  } catch { return ''; }
}
