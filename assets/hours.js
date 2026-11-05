/* ==========================================================================
   Opening hours engine, shared by the site and the admin page.

   - Sun to Thu: plain weekly hours.
   - Friday: closes a set number of minutes before candle lighting.
   - Saturday: opens a set number of minutes after Shabbat ends.
   - Special days (Yom Tov, holidays, one-off changes) override everything.
   - A "pause" stops orders for a while without touching the hours.

   Sunset and nightfall are calculated here from each branch's location
   (NOAA / Almanac method, good to about a minute or two). The real build
   swaps this for hebcal zmanim and also pulls Yom Tov dates automatically.

   Mock storage: the browser's localStorage, so admin changes show on the site
   in the same browser only. The real build stores this in Firestore.
   ========================================================================== */
const HOURS = (() => {
  const KEY = 'elis.hours.v1';
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const branches = {
    gg: { name: 'Golders Green', address: '2A Hoop Lane, NW11 8JS', lat: 51.5748, lon: -0.1985 },
    edgware: { name: 'Edgware', address: '7 Edgwarebury Lane, HA8 8LH', lat: 51.6148, lon: -0.2726 }
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v), isTime = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const pad = n => String(n).padStart(2, '0');
  const fmt = min => { min = Math.round(min); return pad(Math.floor(min / 60) % 24) + ':' + pad(((min % 60) + 60) % 60); };
  const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

  /* ---------- Defaults, from the live site plus placeholder Shabbat rules ---------- */
  function defaults() {
    const base = () => ({
      weekly: {
        0: { open: '11:00', close: '22:30', closed: false },
        1: { open: '12:00', close: '20:45', closed: false },
        2: { open: '12:00', close: '20:45', closed: false },
        3: { open: '12:00', close: '20:45', closed: false },
        4: { open: '12:00', close: '20:45', closed: false }
      },
      fri: { open: '12:00', closeBeforeCandle: 120 },
      sat: { openAfterHavdalah: 30, closeAt: '22:30', minOpenMins: 90 },
      overrides: [],
      pausedUntil: null
    });
    const gg = base(); gg.weekly[4].open = '15:00';   // Golders Green opens later on Thursdays
    return { gg, edgware: base() };
  }

  function load() {
    const d = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) for (const b of Object.keys(d)) if (saved[b]) {
        const s = saved[b];
        d[b] = { ...d[b], ...s };
        // keep only well-formed special days, so stored text can never become markup or break the maths
        d[b].overrides = (Array.isArray(s.overrides) ? s.overrides : []).filter(o => o && isDate(o.from) && (!o.to || isDate(o.to)) && (o.type === 'closed' || (o.type === 'custom' && isTime(o.open) && isTime(o.close))))
          .map(o => ({ id: String(o.id || '').replace(/\W/g, ''), from: o.from, to: o.to || '', type: o.type, open: o.open, close: o.close, note: String(o.note || '').slice(0, 60) }));
      }
    } catch (e) { /* private mode: fall back to defaults */ }
    return d;
  }
  function save(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  /* ---------- London clock ---------- */
  const fmtParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short'
  });
  function londonParts(date) {
    const p = Object.fromEntries(fmtParts.formatToParts(date).map(x => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, dow: SHORT.indexOf(p.weekday) };
  }
  function nowLondon() {
    const o = new URLSearchParams(location.search).get('now');     // demo: ?now=2026-12-04T13:30 (London time)
    const m = o && o.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      const [y, mo, d, h, mi] = m.slice(1).map(Number);
      return { y, m: mo, d, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay(), min: h * 60 + mi, demo: true };
    }
    const p = londonParts(new Date());
    return { y: p.y, m: p.m, d: p.d, dow: p.dow, min: p.h * 60 + p.mi };
  }
  function addDays(y, m, d, i) {
    const t = new Date(Date.UTC(y, m - 1, d + i));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay(), key: key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) };
  }
  const label = dt => `${SHORT[dt.dow]} ${dt.d} ${MONTHS[dt.m - 1]}`;

  /* ---------- Sunset and nightfall ---------- */
  const rad = Math.PI / 180;
  function sunEvent(y, m, d, lat, lon, zenith, rising) {
    const N = Math.floor(275 * m / 9) - Math.floor((m + 9) / 12) * (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3)) + d - 30;
    const lngHour = lon / 15, t = N + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634; L = (L % 360 + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad; RA = (RA % 360 + 360) % 360;
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90; RA /= 15;
    const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null;
    const H = (rising ? 360 - Math.acos(cosH) / rad : Math.acos(cosH) / rad) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    return ((T - lngHour) % 24 + 24) % 24;                           // hours, UT
  }
  function zmanim(bkey, y, m, d) {
    const b = branches[bkey];
    const offset = londonParts(new Date(Date.UTC(y, m - 1, d, 12))).h - 12;   // 0 in winter, 1 in summer
    const toLondon = ut => ut == null ? null : ut * 60 + offset * 60;
    const sunset = toLondon(sunEvent(y, m, d, b.lat, b.lon, 90.833, false));
    const night = toLondon(sunEvent(y, m, d, b.lat, b.lon, 98.5, false));    // sun 8.5 degrees below the horizon
    return {
      sunset: sunset == null ? null : Math.round(sunset),
      candle: sunset == null ? null : Math.floor(sunset) - 18,             // 18 minutes before sunset
      havdalah: night == null ? null : Math.ceil(night)
    };
  }

  /* ---------- One day's trading window ---------- */
  function dayWindow(bkey, dt, cfgAll) {
    const cfg = (cfgAll || load())[bkey];
    const z = (dt.dow === 5 || dt.dow === 6) ? zmanim(bkey, dt.y, dt.m, dt.d) : null;
    const ov = cfg.overrides.find(o => o.from <= dt.key && dt.key <= (o.to || o.from));
    if (ov) {
      if (ov.type === 'closed') return { closed: true, note: ov.note || 'Closed', special: true, z };
      return { open: toMin(ov.open), close: toMin(ov.close), note: ov.note || '', special: true, z };
    }
    if (dt.dow === 5) {
      const open = toMin(cfg.fri.open), close = z.candle - cfg.fri.closeBeforeCandle;
      return close > open ? { open, close, z } : { closed: true, note: 'Shabbat', z };
    }
    if (dt.dow === 6) {
      const open = z.havdalah + cfg.sat.openAfterHavdalah;
      const close = toMin(cfg.sat.closeAt);
      // too little time left to be worth opening (late summer Shabbat): stay closed
      return close - open >= cfg.sat.minOpenMins ? { open, close, z } : { closed: true, note: 'Shabbat ends too late to open', z };
    }
    const w = cfg.weekly[dt.dow];
    return w.closed ? { closed: true, note: '', z } : { open: toMin(w.open), close: toMin(w.close), z };
  }

  /* ---------- Open or closed right now ---------- */
  function status(bkey, now = nowLondon()) {
    const cfgAll = load(), cfg = cfgAll[bkey];
    if (!now.demo && cfg.pausedUntil && Date.now() < cfg.pausedUntil) {
      const p = londonParts(new Date(cfg.pausedUntil)), at = fmt(p.h * 60 + p.mi);
      return { open: false, paused: true, title: 'Paused', detail: `The kitchen is catching up. Back at ${at}.`, short: `at ${at}` };
    }
    const today = addDays(now.y, now.m, now.d, 0), w = dayWindow(bkey, today, cfgAll);
    if (w && !w.closed && now.min >= w.open && now.min < w.close) {
      const left = w.close - now.min;
      return { open: true, title: 'Open now', detail: left <= 30 ? `Closing in ${left} min` : `Taking orders until ${fmt(w.close)}` };
    }
    for (let i = 0; i < 15; i++) {
      const dt = addDays(now.y, now.m, now.d, i), x = i === 0 ? w : dayWindow(bkey, dt, cfgAll);
      if (!x || x.closed) continue;
      if (i === 0 && now.min >= x.open) continue;
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[dt.dow];
      const note = w && w.closed && w.note && w.note !== 'Closed' ? w.note : '';
      return { open: false, title: 'Closed', detail: `${note ? note + '. ' : ''}Opens ${when} at ${fmt(x.open)}`, short: `${i === 0 ? 'today' : i === 1 ? 'tomorrow' : SHORT[dt.dow]} ${fmt(x.open)}` };
    }
    return { open: false, title: 'Closed', detail: 'See opening hours', short: 'soon' };
  }

  /* ---------- Next n days, for the site and admin previews ---------- */
  function upcoming(bkey, n = 7, now = nowLondon()) {
    const cfgAll = load();
    return Array.from({ length: n }, (_, i) => { const dt = addDays(now.y, now.m, now.d, i); return { ...dt, label: label(dt), w: dayWindow(bkey, dt, cfgAll) }; });
  }

  return { esc, branches, DAYS, SHORT, defaults, load, save, reset, nowLondon, londonParts, addDays, zmanim, dayWindow, status, upcoming, fmt, toMin };
})();
