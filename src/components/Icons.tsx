// Kotha's own drafting-pen icon set: 24px grid, 1.5px strokes, square caps, mitred joins (no icon library).
import type { SVGProps } from 'react';
const P: Record<string, string> = {
  search: 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5.5 5.5',
  key: 'M8 14.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM11.5 11H21M18 11v3M15 11v2.5',
  door: 'M5 21V3h11v18M3 21h18M16 5l3 1v15M12.5 12h.01',
  building: 'M4 21V7l8-4 8 4v14M2.5 21h19M8 10h2M14 10h2M8 14h2M14 14h2M10 21v-3h4v3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5M15.5 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.6c2 .6 3.4 2.3 4 5.4',
  receipt: 'M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21V3zM8.5 8h7M8.5 11.5h7M8.5 15h4',
  wrench: 'M14.5 4a4.5 4.5 0 0 0-4.3 5.8L3.5 16.5 7.5 20.5l6.7-6.7A4.5 4.5 0 0 0 20 9.5l-3 3-3.5-1-1-3.5 3-3a4.5 4.5 0 0 0-1-.5z',
  tap: 'M4 10h9a4 4 0 0 1 4 4v1M9 10V6M6 6h6M17 18.5c0 1.1-.9 2-2 2s-2-.9-2-2c0-1.3 2-3.5 2-3.5s2 2.2 2 3.5z',
  bolt: 'M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7v-7z',
  plus: 'M12 4.5v15M4.5 12h15',
  close: 'M5.5 5.5l13 13M18.5 5.5l-13 13',
  menu: 'M3.5 7h17M3.5 12h17M3.5 17h17',
  arrow: 'M4 12h15M14 6.5l5.5 5.5-5.5 5.5',
  back: 'M20 12H5M10 6.5 4.5 12l5.5 5.5',
  chevron: 'M9 5.5l6.5 6.5L9 18.5',
  down: 'M5.5 9l6.5 6.5L18.5 9',
  phone: 'M5 3.5h4l1.5 4.5-2.5 1.5a11 11 0 0 0 6.5 6.5l1.5-2.5 4.5 1.5v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z',
  chat: 'M4 4.5h16v11H9.5L5 19.5v-4H4v-11zM8 9h8M8 12h5',
  logout: 'M14.5 4.5H19.5v15h-5M10.5 16.5 6 12l4.5-4.5M6 12h10',
  check: 'M4.5 12.5l5 5 10-11',
  plan: 'M3.5 3.5h17v17h-17zM3.5 12h7M10.5 3.5v6M14 12h6.5M14 12v8.5M10.5 15.5v5',
  inbox: 'M3.5 13.5 6 4.5h12l2.5 9v6h-17v-6zM3.5 13.5H9a3 3 0 0 0 6 0h5.5',
  ledger: 'M5 3.5h13.5v17H5zM8.5 3.5v17M11.5 8h4.5M11.5 11.5h4.5M11.5 15h3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  calendar: 'M4 5.5h16v15H4zM4 10h16M8.5 3v4M15.5 3v4',
  copy: 'M8.5 8.5h11v11h-11zM5.5 15.5h-1v-11h11v1',
  ruler: 'M2.5 15.5 15.5 2.5l6 6-13 13-6-6zM6 12l2 2M9 9l3 3M12 6l2 2',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeoff: 'M3.5 3.5l17 17M10 6c.6-.3 1.3-.5 2-.5 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.4 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.5 4.2-1.1',
  shield: 'M12 2.5 4.5 5.5v6c0 4.5 3.2 8.4 7.5 10 4.3-1.6 7.5-5.5 7.5-10v-6L12 2.5z',
  pin: 'M12 21.5s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  stairs: 'M3 20.5h4.5v-4.5h4.5v-4.5h4.5V7h4.5',
  car: 'M4 16.5V12l2-5h12l2 5v4.5M3.5 16.5h17M7 19.5v-3M17 19.5v-3M7.5 13.5h.01M16.5 13.5h.01',
  bath: 'M3.5 12h17v2.5a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5V12zM6 12V5a2 2 0 0 1 4 0',
  sofa: 'M4 11V7h16v4M2.5 11h4v4h11v-4h4v7.5h-19V11zM5 18.5V20M19 18.5V20',
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 20, className = '', ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" className={className} {...rest}>
      <path d={P[name]} />
    </svg>
  );
}
