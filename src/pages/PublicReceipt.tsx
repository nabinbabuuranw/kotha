import { useEffect } from 'react';
import { useApi } from '../lib/useApi';
import type { Receipt } from '../lib/api';
import { ReceiptDoc } from '../components/ReceiptDoc';
import { Brand, ErrorBox, Skeleton } from '../components/ui';
import { Icon } from '../components/Icons';
export function ReceiptActions() {
  return <button className="btn-primary" onClick={() => window.print()}><Icon name="print" size={18} />Print or save as PDF</button>;
}
export default function PublicReceipt({ token }: { token: string }) {
  const { data, error, loading } = useApi<{ receipt: Receipt }>(`/receipts/${token}`);
  useEffect(() => { if (data) document.title = `Receipt ${data.receipt.receipt_no} · Kotha`; }, [data]);
  return (
    <main className="page-in mx-auto max-w-[820px] px-4 py-8">
      <div className="no-print mb-6 flex items-center justify-between"><Brand /><ReceiptActions /></div>
      {loading && <Skeleton className="h-[420px]" />}
      {error && <ErrorBox text={error === 'We could not find that.' ? 'This receipt link is not valid.' : error} />}
      {data && <ReceiptDoc r={data.receipt} />}
    </main>
  );
}
