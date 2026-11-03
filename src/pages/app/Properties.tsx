import { useState, type FormEvent } from 'react';
import { useApi } from '../../lib/useApi';
import { api, errorText, type Property, type Unit } from '../../lib/api';
import { LOCALITIES, UNIT_KINDS, KIND_LABEL, SUITED, SUITED_LABEL } from '../../../shared/rent';
import { rs, kindLabel, floorLabel } from '../../lib/format';
import { Field, Input, Select, Textarea, Check, Modal, ErrorBox, SkeletonRows, Empty, Tag, useToast } from '../../components/ui';
import { Icon } from '../../components/Icons';
import { PlanGlyph } from '../../components/PlanGlyph';
import { Link } from '../../lib/router';

function PropertyForm({ p, onDone }: { p?: Property; onDone: () => void }) {
  const [f, setF] = useState({ name: p?.name || '', locality: p?.locality || 'Baneshwor', address: p?.address || '', notes: p?.notes || '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { await api(p ? `/l/properties/${p.id}` : '/l/properties', { method: p ? 'PUT' : 'POST', body: f }); toast(p ? 'Property saved' : 'Property added'); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" hint="What you call the building, e.g. Shrestha Niwas"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Locality"><Select value={f.locality} onChange={(e) => setF({ ...f, locality: e.target.value })}>{LOCALITIES.map((l) => <option key={l}>{l}</option>)}</Select></Field>
      <Field label="Address (private, shown on receipts)"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Notes (private)"><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {e && <ErrorBox text={e} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : p ? 'Save property' : 'Add property'}</button>
    </form>
  );
}

function UnitForm({ u, propertyId, onDone }: { u?: Unit; propertyId: number; onDone: () => void }) {
  const [f, setF] = useState<any>({
    property_id: propertyId, label: u?.label || '', kind: u?.kind || 'room', floor: u?.floor ?? 0, area_sqft: u?.area_sqft ?? '', rent: u ? u.rent / 100 : '', deposit: u ? u.deposit / 100 : '',
    furnished: u?.furnished || 'none', parking: u?.parking || 'none', water24: !!u?.water24, attached_bath: !!u?.attached_bath, suited: u?.suited || 'anyone', available_from: u?.available_from || '', description: u?.description || '', listed: !!u?.listed,
  });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { await api(u ? `/l/units/${u.id}` : '/l/units', { method: u ? 'PUT' : 'POST', body: { ...f, rent: String(f.rent), deposit: String(f.deposit) } }); toast(u ? 'Unit saved' : 'Unit added'); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center gap-4 border border-line bg-bone/50 p-3"><PlanGlyph kind={f.kind} className="h-16 w-24 shrink-0" labels={false} /><p className="text-[13px] text-umber">Listings show a plan sketch drawn from the unit type, so renters never see a photo that is not this home.</p></div>
      <Field label="Unit name" hint="e.g. Room 2A, First floor 1BHK"><Input required value={f.label} onChange={(e) => set('label', e.target.value)} /></Field>
      <Field label="Type"><Select value={f.kind} onChange={(e) => set('kind', e.target.value)}>{UNIT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></Field>
      <Field label="Floor"><Select value={f.floor} onChange={(e) => set('floor', Number(e.target.value))}>{[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{floorLabel(n)}</option>)}</Select></Field>
      <Field label="Area in sq ft (optional)"><Input inputMode="numeric" value={f.area_sqft} onChange={(e) => set('area_sqft', e.target.value.replace(/\D/g, ''))} /></Field>
      <Field label="Monthly rent (Rs)"><Input required inputMode="decimal" value={f.rent} onChange={(e) => set('rent', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
      <Field label="Deposit (Rs)"><Input inputMode="decimal" value={f.deposit} onChange={(e) => set('deposit', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
      <Field label="Furnishing"><Select value={f.furnished} onChange={(e) => set('furnished', e.target.value)}><option value="none">Unfurnished</option><option value="semi">Semi-furnished</option><option value="full">Furnished</option></Select></Field>
      <Field label="Parking"><Select value={f.parking} onChange={(e) => set('parking', e.target.value)}><option value="none">None</option><option value="bike">Bike</option><option value="car">Car</option></Select></Field>
      <Field label="Suits"><Select value={f.suited} onChange={(e) => set('suited', e.target.value)}>{SUITED.map((s) => <option key={s} value={s}>{SUITED_LABEL[s]}</option>)}</Select></Field>
      <Field label="Free from (optional)"><Input type="date" value={f.available_from} onChange={(e) => set('available_from', e.target.value)} /></Field>
      <div className="sm:col-span-2 flex flex-wrap gap-6"><Check label="24-hour water" checked={f.water24} onChange={(e) => set('water24', e.target.checked)} /><Check label="Attached bathroom" checked={f.attached_bath} onChange={(e) => set('attached_bath', e.target.checked)} /></div>
      <Field label="Description for renters" className="sm:col-span-2"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Light, water, distance to the main road, who it suits…" /></Field>
      <div className="sm:col-span-2 border border-ink p-3"><Check label="Show on public listings while vacant" checked={f.listed} onChange={(e) => set('listed', e.target.checked)} /></div>
      {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : u ? 'Save unit' : 'Add unit'}</button>
    </form>
  );
}

export default function Properties() {
  const props = useApi<{ items: Property[] }>('/l/properties');
  const units = useApi<{ items: Unit[] }>('/l/units');
  const [modal, setModal] = useState<null | { t: 'prop'; p?: Property } | { t: 'unit'; pid: number; u?: Unit }>(null);
  const toast = useToast();
  const reload = () => { props.reload(true); units.reload(true); setModal(null); };
  const del = async (path: string, what: string) => { if (!confirm(`Delete this ${what}?`)) return; try { await api(path, { method: 'DELETE' }); toast(`${what[0].toUpperCase() + what.slice(1)} deleted`); reload(); } catch (x) { toast(errorText(x), 'err'); } };
  const toggle = async (u: Unit) => { try { await api(`/l/units/${u.id}/listed`, { body: { listed: !u.listed } }); toast(u.listed ? 'Taken off listings' : 'Now listed publicly'); units.reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  if (props.error) return <ErrorBox text={props.error} onRetry={() => props.reload()} />;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[14.5px] text-umber">Buildings you own and every unit in them. Tick “listed” to show a vacant unit on Kotha.</p>
        <button className="btn-primary" onClick={() => setModal({ t: 'prop' })}><Icon name="plus" size={18} />Add property</button></div>
      {props.loading || units.loading ? <SkeletonRows rows={5} /> : props.data!.items.length === 0 ? (
        <Empty icon="building" title="No properties yet" action={<button className="btn-primary" onClick={() => setModal({ t: 'prop' })}>Add your first property</button>}>Start with the building, then add its rooms, flats or shutters.</Empty>
      ) : (
        <div className="space-y-8">
          {props.data!.items.map((p) => {
            const us = units.data?.items.filter((u) => u.property_id === p.id) || [];
            return (
              <section key={p.id} className="border border-ink bg-[#FBF8F4]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-4 py-3">
                  <div><h2 className="text-[19px] font-semibold wide">{p.name}</h2><p className="text-[13px] text-umber">{p.locality}{p.address ? ` · ${p.address}` : ''} · {p.units} units, {p.occupied} rented</p></div>
                  <div className="flex gap-1.5"><button className="btn-ghost btn-sm" onClick={() => setModal({ t: 'unit', pid: p.id })}><Icon name="plus" size={16} />Unit</button><button className="btn-quiet btn-sm" onClick={() => setModal({ t: 'prop', p })}>Edit</button><button className="btn-quiet btn-sm text-due" onClick={() => del(`/l/properties/${p.id}`, 'property')}>Delete</button></div>
                </header>
                {us.length === 0 ? <p className="p-4 text-[14px] text-umber">No units yet. <button className="underline" onClick={() => setModal({ t: 'unit', pid: p.id })}>Add one</button>.</p> : (
                  <div className="overflow-x-auto"><table className="tbl min-w-[720px]">
                    <thead><tr><th>Unit</th><th>Type</th><th>Rent</th><th>Status</th><th>Listed</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>{us.map((u) => (
                      <tr key={u.id}>
                        <td><p className="font-medium">{u.label}</p><p className="text-[12.5px] text-umber">{floorLabel(u.floor)}{u.area_sqft ? ` · ${u.area_sqft} sq ft` : ''}</p></td>
                        <td>{kindLabel(u.kind)}</td><td className="num">{rs(u.rent)}</td>
                        <td>{u.tenant_name ? <><Tag tone="occupied">Rented</Tag><p className="mt-1 text-[12.5px] text-umber">{u.tenant_name}</p></> : <Tag tone="vacant">Vacant</Tag>}</td>
                        <td>{u.tenant_name ? <span className="text-[12.5px] text-umber">n/a</span> : <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" className="check" checked={!!u.listed} onChange={() => toggle(u)} aria-label={`List ${u.label}`} />{u.listed ? <Link to={`/rooms/${u.id}`} className="underline">View</Link> : 'Off'}</label>}{u.hidden ? <p className="mt-1"><Tag tone="due">Hidden by admin</Tag></p> : null}</td>
                        <td className="text-right whitespace-nowrap"><button className="btn-quiet btn-sm" onClick={() => setModal({ t: 'unit', pid: p.id, u })}>Edit</button><button className="btn-quiet btn-sm text-due" onClick={() => del(`/l/units/${u.id}`, 'unit')}>Delete</button></td>
                      </tr>))}</tbody>
                  </table></div>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Modal open={modal?.t === 'prop'} onClose={() => setModal(null)} title={modal?.t === 'prop' && modal.p ? 'Edit property' : 'Add property'}>{modal?.t === 'prop' && <PropertyForm p={modal.p} onDone={reload} />}</Modal>
      <Modal wide open={modal?.t === 'unit'} onClose={() => setModal(null)} title={modal?.t === 'unit' && modal.u ? 'Edit unit' : 'Add unit'}>{modal?.t === 'unit' && <UnitForm u={modal.u} propertyId={modal.pid} onDone={reload} />}</Modal>
    </div>
  );
}
