/* ==========================================================================
   Deal schedules: which deal runs on which day, branch and order type.
   Needs assets/hours.js loaded first (it supplies the London clock).

   A deal runs today when it is switched on, offered at the branch, today's
   weekday is ticked, and today sits inside its optional start and end dates.
   Mock storage: localStorage, so admin changes show on the site in the same
   browser only. The real build stores this in Firestore and the server
   checks the same rules again at checkout.
   ========================================================================== */
const DEALS = (() => {
  const KEY = 'elis.deals.v1';
  const ALL = [0, 1, 2, 3, 4, 5, 6], BOTH = ['gg', 'edgware'];
  const base = (id, name, extra) => ({ id: 'deals:' + id, name, enabled: true, days: ALL, branches: BOTH, mode: 'both', from: '', to: '', chip: '', showChip: false, ...extra });

  function defaults() {
    return [
      base('Party deal', 'Party deal', { chip: '15% off when you order 6 large pizzas', showChip: true }),
      base('Family pizza deal', 'Family pizza deal'),
      base('Medium double deal', 'Medium double deal'),
      base('Kids combo', 'Kids combo'),
      base('Ultimate combo', 'Ultimate combo'),
      base('Tuesday deal', 'Tuesday deal', { days: [2], branches: ['edgware'], mode: 'collection', chip: 'Buy one, get one free on collection', showChip: true }),
      base('Tuesday half price', 'Tuesday half price', { days: [2], branches: ['edgware'], mode: 'delivery', chip: 'Buy one, get one half price on delivery', showChip: true })
    ];
  }
  /* Stored values come from the browser, so keep only the shapes we expect */
  function clean(v, fallback) {
    const date = t => /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
    return {
      id: fallback.id, name: fallback.name, enabled: v.enabled !== false,
      days: Array.isArray(v.days) ? [...new Set(v.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))] : fallback.days,
      branches: Array.isArray(v.branches) ? v.branches.filter(b => BOTH.includes(b)) : fallback.branches,
      mode: ['both', 'collection', 'delivery'].includes(v.mode) ? v.mode : 'both',
      from: date(v.from), to: date(v.to),
      chip: String(v.chip ?? '').slice(0, 70), showChip: !!v.showChip
    };
  }
  function load() {
    const d = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved)) return d.map(x => clean({ ...x, ...(saved.find(s => s.id === x.id) || {}) }, x));
    } catch (e) { /* private mode: use defaults */ }
    return d;
  }
  const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ } };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  function daysLabel(days) {
    const d = [...days].sort((a, b) => a - b), S = HOURS.SHORT, N = HOURS.DAYS;
    if (d.length === 7) return 'Every day';
    if (!d.length) return 'No days';
    if (d.length === 1) return N[d[0]] + 's';
    const run = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
    return run && d.length > 2 ? `${S[d[0]]} to ${S[d[d.length - 1]]}` : d.map(v => S[v]).join(', ');
  }
  const modeLabel = m => m === 'collection' ? 'collection only' : m === 'delivery' ? 'delivery only' : 'collection and delivery';

  /* '' when the deal runs today at this branch, otherwise a short reason */
  function whyNot(deal, branch, now = HOURS.nowLondon()) {
    if (!deal.enabled || !deal.branches.includes(branch)) return 'off';
    const key = HOURS.addDays(now.y, now.m, now.d, 0).key;
    if (deal.from && key < deal.from) return `From ${deal.from}`;
    if (deal.to && key > deal.to) return 'Ended';
    if (!deal.days.includes(now.dow)) return daysLabel(deal.days) + ' only';
    return '';
  }
  const isActive = (deal, branch, now) => whyNot(deal, branch, now) === '';
  const active = (branch, now) => load().filter(d => isActive(d, branch, now));
  const find = id => load().find(d => d.id === id);

  return { ALL, BOTH, defaults, load, save, reset, daysLabel, modeLabel, whyNot, isActive, active, find };
})();
