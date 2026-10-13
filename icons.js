// Ícones vetoriais locais (traço simples, 24x24).
const P = {
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  list: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m4 6.5.9.9L6.6 5.6M4 12l.9.9 1.7-1.8M4 17.5l.9.9 1.7-1.8"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 1.8 2.2C10.5 8 11.2 5.5 12 3z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevUp: '<path d="m6 14.5 6-6 6 6"/>',
  chevDown: '<path d="m6 9.5 6 6 6-6"/>',
  dchevL: '<path d="m12 6-6 6 6 6M19 6l-6 6 6 6"/>',
  dchevR: '<path d="m12 6 6 6-6 6M5 6l6 6-6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  sunrise: '<path d="M5 17a7 7 0 0 1 14 0"/><path d="M2.5 20h19M12 5v3M5.2 9.2l1.6 1.6M18.8 9.2l-1.6 1.6"/>',
  sunset: '<path d="M5 17a7 7 0 0 1 14 0"/><path d="M2.5 20h19M8 20.5h8M12 6v3"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  cross: '<path d="M12 3v18M7 8h10"/>',
  star: '<path d="M12 3c.6 4.6 2.4 6.4 7 9-4.6 2.6-6.4 4.4-7 9-.6-4.6-2.4-6.4-7-9 4.6-2.6 6.4-4.4 7-9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  bell: '<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5L6 17z"/><path d="M10 20h4"/>',
  church: '<path d="M12 2.5v3M10.8 4h2.4"/><path d="m12 6.5 5 3.5v9.5H7V10l5-3.5z"/><path d="M10 19.5v-4a2 2 0 0 1 4 0v4"/>',
  hands: '<path d="M12 3.5c-2 2.5-3 4.5-3 7V17l3 3 3-3v-6.5c0-2.5-1-4.5-3-7z"/><path d="M12 7.5V20"/>',
  beads: '<circle cx="12" cy="4.8" r="1.5"/><circle cx="6.3" cy="8.6" r="1.5"/><circle cx="17.7" cy="8.6" r="1.5"/><circle cx="6.3" cy="14.4" r="1.5"/><circle cx="17.7" cy="14.4" r="1.5"/><circle cx="12" cy="18.2" r="1.5"/>',
  dove: '<path d="M4 14c3 0 5-1 7-3.5 1-1.2 2-1.8 3.5-1.8L18 5l-.5 3.5c1.5.6 3 1.7 3.5 3.2-2 .2-3 .8-4 2-2 2.4-4.5 3.8-8 3.8-2 0-3.5-.8-4.5-2.5z"/>',
  house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9.5h13V10"/>',
  wing: '<path d="M4 17c1-6 5-10 11-11-1 3-3 4-5 5 2 0 4-.3 6-1.5-.5 3-3 6-7 7 2 .2 4 0 6-1-1.5 2.5-4.5 4-8 4-1.5 0-2.5-.5-3-2.5z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/>',
  book: '<path d="M4.5 5.5H11a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4.5z"/><path d="M19.5 5.5H13"/><path d="M19.5 5.5V18H13"/>',
  cup: '<path d="M5 10h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3z"/><path d="M17 11h1.5a2 2 0 0 1 0 4H17M8 4v3M12 4v3"/>',
  chalice: '<path d="M7 4h10c0 4-1.5 6-5 6S7 8 7 4z"/><path d="M12 10v6M8.5 20h7M10 16h4"/>',
  candle: '<path d="M12 3c1 1.5 1.6 2.4 1.6 3.4a1.6 1.6 0 0 1-3.2 0C10.4 5.4 11 4.5 12 3z"/><rect x="9" y="9.5" width="6" height="10.5" rx="1"/>',
  eye: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
};
export const PRACTICE_ICONS = ['sunrise', 'sun', 'sunset', 'moon', 'cross', 'star', 'flame', 'candle', 'heart', 'bell', 'church', 'hands', 'beads', 'dove', 'house', 'wing', 'leaf', 'book', 'cup', 'chalice', 'eye'];

export function icon(name, cls = '') {
  const body = P[name] || P.star;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
export const brandMark = (cls = '') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M16 7v18M11 12.5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M25 5.5c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" fill="var(--gold, #C7A86A)"/></svg>`;
