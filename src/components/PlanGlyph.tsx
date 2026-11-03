// Plan view of a unit, drawn from its type. Kotha shows these instead of stock photos: we never invent pictures of a home.
type Room = { x: number; y: number; w: number; h: number; t?: string };
const LAYOUTS: Record<string, Room[]> = {
  room: [{ x: 10, y: 10, w: 100, h: 70, t: 'ROOM' }],
  flat_1bhk: [{ x: 10, y: 10, w: 58, h: 70, t: 'BED' }, { x: 68, y: 10, w: 42, h: 40, t: 'KIT' }, { x: 68, y: 50, w: 42, h: 30, t: 'WC' }],
  flat_2bhk: [{ x: 10, y: 10, w: 40, h: 40, t: 'BED' }, { x: 10, y: 50, w: 40, h: 30, t: 'BED' }, { x: 50, y: 10, w: 60, h: 44, t: 'LIVING' }, { x: 50, y: 54, w: 32, h: 26, t: 'KIT' }, { x: 82, y: 54, w: 28, h: 26, t: 'WC' }],
  flat_3bhk: [{ x: 10, y: 10, w: 34, h: 35, t: 'BED' }, { x: 10, y: 45, w: 34, h: 35, t: 'BED' }, { x: 44, y: 10, w: 36, h: 35, t: 'BED' }, { x: 44, y: 45, w: 36, h: 35, t: 'LIVING' }, { x: 80, y: 10, w: 30, h: 42, t: 'KIT' }, { x: 80, y: 52, w: 30, h: 28, t: 'WC' }],
  house: [{ x: 10, y: 10, w: 50, h: 40, t: 'LIVING' }, { x: 60, y: 10, w: 50, h: 40, t: 'BED' }, { x: 10, y: 50, w: 34, h: 30, t: 'KIT' }, { x: 44, y: 50, w: 36, h: 30, t: 'BED' }, { x: 80, y: 50, w: 30, h: 30, t: 'STAIR' }],
  shutter: [{ x: 10, y: 10, w: 100, h: 70, t: 'SHOP' }],
};
export function PlanGlyph({ kind, className = '', animate = false, labels = true }: { kind: string; className?: string; animate?: boolean; labels?: boolean }) {
  const rooms = LAYOUTS[kind] || LAYOUTS.room;
  return (
    <svg viewBox="0 0 120 90" className={`${animate ? 'draw' : ''} ${className}`} role="img" aria-label={`Plan sketch: ${rooms.map((r) => r.t?.toLowerCase()).join(', ')}`}>
      <rect x="10" y="10" width="100" height="70" fill="none" stroke="#22333B" strokeWidth="2.2" style={{ ['--len' as any]: 340 }} />
      {rooms.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={i === 0 ? 'rgba(198,172,143,.28)' : 'none'} stroke="#22333B" strokeWidth="1" style={{ ['--len' as any]: 2 * (r.w + r.h), ['--d' as any]: `${0.2 + i * 0.12}s` }} />
          {labels && r.t && r.w > 25 && <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 2.5} textAnchor="middle" fontSize="6.5" letterSpacing=".8" fill="#5E503F" fontFamily="Archivo" style={{ fontStretch: '115%' }}>{r.t}</text>}
        </g>
      ))}
      {/* entrance door swing */}
      <path d="M10 66 A 12 12 0 0 1 22 78" fill="none" stroke="#7A5A2E" strokeWidth="1" style={{ ['--len' as any]: 30, ['--d' as any]: '0.9s' }} />
      <line x1="10" y1="66" x2="10" y2="78" stroke="#F3EDE5" strokeWidth="2.6" />
      {kind === 'shutter' && <path d="M30 80 h60" stroke="#7A5A2E" strokeWidth="1" strokeDasharray="3 2" />}
      {/* windows */}
      <line x1="40" y1="10" x2="58" y2="10" stroke="#F3EDE5" strokeWidth="2.6" /><line x1="40" y1="9" x2="58" y2="9" stroke="#22333B" strokeWidth=".6" /><line x1="40" y1="11" x2="58" y2="11" stroke="#22333B" strokeWidth=".6" />
    </svg>
  );
}
