const paths: Record<string, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/></>,
  shuffle: <><path d="M3 7h2c6 0 8 10 14 10h2m-4-4 4 4-4 4M3 17h2c2 0 4-2 5-4m4-3c2-2 3-3 5-3h2m-4-4 4 4-4 4"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  book: <><path d="M12 5v16m0-16C9 3 6 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-1-9 1Z"/></>,
  bookmark: <path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4z"/>,
  retry: <><path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/><path d="m12 8 0 4 3 2"/></>,
  chart: <><path d="M3 3v18h18M8 16v-4m5 4V8m5 8V5"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  back: <path d="M20 12H5m6-6-6 6 6 6"/>,
  moon: <path d="M20.8 14A9 9 0 0 1 10 3.2 9 9 0 1 0 20.8 14z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-8z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12m0-12L6 18"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15m-9-11v6m4-6v6" /></>,
  binary: <><path d="M9 5H6v5h3zm9 9h-3v5h3zM16 5h2v5m-11 4h2v5"/></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  network: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4m-6 4v-4h12v4"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  shield: <><path d="M12 22c5-2 8-6 8-11V5l-8-3-8 3v6c0 5 3 9 8 11z"/><path d="m8 12 3 3 5-6"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0"/></>,
  code: <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10c0 6-5 7-12 7"/></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01m5-9h5m-5 9h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3-1 0 4 2 2-2 2v4l3-1 3 1 1 3h4l1-3 3-1 3 1v-4l-2-2 2-2V6l-3 1-3-1-1-3z"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18m-9 0v2"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
};

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
