import { Link } from '../lib/router';
import type { Listing } from '../lib/api';
import { rs, kindLabel, floorLabel } from '../lib/format';
import { PlanGlyph } from './PlanGlyph';
import { Tag } from './ui';
import { Icon } from './Icons';

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link to={`/rooms/${l.id}`} className="lift group flex h-full flex-col border border-line bg-[#F8F3EC]">
      <div className="relative border-b border-line bg-plaster px-6 pt-5 pb-3">
        <PlanGlyph kind={l.kind} className="mx-auto h-[118px] w-full max-w-[200px]" />
        <div className="absolute left-3 top-3 flex gap-1.5">{l.is_demo ? <Tag tone="demo">Demo</Tag> : null}<Tag tone="listed">{kindLabel(l.kind)}</Tag></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[16.5px] font-semibold leading-snug group-hover:underline underline-offset-4">{l.label}</p>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[13.5px] text-umber"><Icon name="pin" size={15} />{l.locality} · {floorLabel(l.floor)}{l.area_sqft ? ` · ${l.area_sqft} sq ft` : ''}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-umber">
          {l.water24 ? <span className="inline-flex items-center gap-1"><Icon name="tap" size={14} />24h water</span> : null}
          {l.attached_bath ? <span className="inline-flex items-center gap-1"><Icon name="bath" size={14} />Attached bath</span> : null}
          {l.parking !== 'none' ? <span className="inline-flex items-center gap-1"><Icon name="car" size={14} />{l.parking === 'car' ? 'Car' : 'Bike'} parking</span> : null}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <p><span className="display text-[24px] num">{rs(l.rent)}</span><span className="text-[13px] text-umber"> /month</span></p>
          <Icon name="chevron" size={18} className="text-umber transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
export function ListingCardSkeleton() {
  return <div className="border border-line bg-[#F8F3EC]" aria-hidden="true"><div className="skel h-[146px]" /><div className="space-y-2 p-4"><div className="skel h-5 w-3/4" /><div className="skel h-4 w-1/2" /><div className="skel mt-6 h-7 w-1/3" /></div></div>;
}
