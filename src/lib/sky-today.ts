/** Seoul-based almanac helpers: moon phase + sunrise/sunset, computed locally. */

const SEOUL_LAT = 37.5665;
const SEOUL_LON = 126.978; // east positive

const RAD = Math.PI / 180;

function toJulian(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86_400_000);
}

export type MoonPhase = {
  /** 0 = new moon, 0.5 = full moon */
  fraction: number;
  /** illuminated percentage, 0-100 */
  illumination: number;
  label: string;
};

const PHASE_LABELS: [number, string][] = [
  [0.0625, "삭 (신월)"],
  [0.1875, "초승달"],
  [0.3125, "상현달"],
  [0.4375, "차오르는 달"],
  [0.5625, "보름달"],
  [0.6875, "기우는 달"],
  [0.8125, "하현달"],
  [0.9375, "그믐달"],
];

export function moonPhase(date = new Date()): MoonPhase {
  const synodic = 29.530588853;
  const knownNewMoon = 2451550.1; // 2000-01-06 18:14 UTC
  const days = toJulian(date) - knownNewMoon;
  const fraction = ((days / synodic) % 1 + 1) % 1;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) / 2 * 100);
  const label = PHASE_LABELS.find(([limit]) => fraction < limit)?.[1] ?? "삭 (신월)";
  return { fraction, illumination, label };
}

export type SunTimes = { sunrise: Date | null; sunset: Date | null };

/** NOAA sunrise equation, simplified. */
export function sunTimes(date = new Date(), lat = SEOUL_LAT, lon = SEOUL_LON): SunTimes {
  const n = Math.ceil(toJulian(date) - 2451545.0 + 0.0008);
  const meanSolarNoon = n + -lon / 360;
  const M = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit =
    2451545.0 + meanSolarNoon + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.44 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosOmega =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosOmega > 1 || cosOmega < -1) return { sunrise: null, sunset: null };
  const omega = Math.acos(cosOmega) / RAD;
  return {
    sunrise: fromJulian(transit - omega / 360),
    sunset: fromJulian(transit + omega / 360),
  };
}

export function hhmm(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(d);
}

/** Stable index for a given day, so the pick changes once per day. */
export function daySeed(date = new Date()): number {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1_000_000;
  return h;
}
