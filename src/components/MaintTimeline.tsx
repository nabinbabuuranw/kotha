import type { MaintEvent } from '../lib/api';
import { dateTime, MAINT_STATUS_LABEL } from '../lib/format';
import { Tag } from './ui';
export function MaintTimeline({ events }: { events: MaintEvent[] }) {
  return (
    <ol className="relative ml-2 border-l-2 border-slate pl-6">
      {events.map((e, i) => (
        <li key={i} className="relative pb-5 last:pb-0">
          <span className={`absolute -left-[33px] top-1 h-3.5 w-3.5 border-2 border-slate ${e.status ? 'bg-slate' : 'bg-plaster'}`} />
          <div className="flex flex-wrap items-center gap-2">{e.status && <Tag tone={e.status}>{MAINT_STATUS_LABEL[e.status]}</Tag>}<span className="text-[12.5px] text-umber">{e.actor_name} ({e.actor_role}) · {dateTime(e.created_at)}</span></div>
          {e.note && <p className="mt-1 text-[14.5px]">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
export const CATEGORY: Record<string, string> = { plumbing: 'Plumbing', water: 'Water supply', electrical: 'Electrical', appliance: 'Appliance', structure: 'Walls, roof, doors', pest: 'Pests', other: 'Other' };
