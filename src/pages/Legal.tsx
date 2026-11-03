import { useEffect } from 'react';
import { PublicHeader, Footer } from '../components/PublicHeader';

const TERMS: [string, string][] = [
  ['What Kotha is', 'Kotha is a listing board for rentals in the Kathmandu Valley and a record-keeping tool for landlords and their tenants. Kotha is not a broker, does not inspect properties and is not a party to any rental agreement.'],
  ['Accounts', 'You must give a real name and an email you control. Keep your password private. One person, one account. We may suspend accounts that post false listings, harass people or misuse the service.'],
  ['Listings', 'Landlords are responsible for what they list: the rent, the deposit, the facilities and whether the unit is really available. Do not list a place you do not have the right to rent out. Listings marked Demo are sample data.'],
  ['Rent records and receipts', 'The rent ledger and receipts are records you create. They are not tax invoices and they are not legal proof of a contract on their own. Keep your own written rental agreement (bhada samjhauta).'],
  ['Tenant access', 'A landlord can give a tenant a code to see their own statement, receipts and repair requests. The landlord can reset that code at any time, which removes the old link.'],
  ['Plans and payment', 'Free accounts can manage up to five units. Landlord Pro costs Rs 699 a month or Rs 6,990 a year and is switched on by the Kotha team after payment. There are no hidden fees and no commission.'],
  ['Availability', 'We try to keep Kotha running, but it is provided as is, without a guarantee that it will always be available or free of errors. Export or print anything you must keep.'],
  ['Changes', 'We may update these terms. If a change is significant we will show a notice in the app before it applies.'],
];
const PRIVACY: [string, string][] = [
  ['What we collect', 'Account details (name, email, optional mobile number, a hashed password), what landlords enter (properties, units, tenants, charges, payments, repair requests) and inquiries renters send (name, mobile number, message).'],
  ['What we do not collect', 'No advertising trackers, no analytics cookies, no location tracking. The only cookie is the sign-in session cookie (HttpOnly, Secure).'],
  ['Who can see what', 'Public listings show the unit, the locality and the landlord\'s first name, never a phone number. Inquiries are visible only to that landlord. A tenant sees only their own statement and requests. The Kotha team can see accounts for support and moderation.'],
  ['Passwords and security', 'Passwords are stored as salted PBKDF2-SHA256 hashes. Sessions expire after 14 days. Sign-in and inquiry forms are rate limited.'],
  ['Where data lives', 'On Cloudflare\'s infrastructure (Workers and D1 database). We do not sell or share personal data.'],
  ['Your choices', 'You can edit your profile at any time. To delete your account and data, email the Kotha team from your account email; we will confirm when it is done.'],
];
export default function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = kind === 'terms' ? { h: 'Terms of Service', items: TERMS } : { h: 'Privacy Policy', items: PRIVACY };
  useEffect(() => { document.title = `${t.h} · Kotha`; }, [t.h]);
  return (
    <>
      <PublicHeader />
      <main className="page-in mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow">Last updated 3 November 2026</p>
        <h1 className="display mt-3 text-[44px]">{t.h}</h1>
        <ol className="mt-8 space-y-6">
          {t.items.map(([h, p], i) => (<li key={h} className="grid gap-2 border-t border-line pt-5 sm:grid-cols-[60px_1fr]"><span className="eyebrow">§{i + 1}</span><div><h2 className="text-[18px] font-semibold wide">{h}</h2><p className="mt-1.5 text-[15.5px] leading-relaxed text-umber">{p}</p></div></li>))}
        </ol>
      </main>
      <Footer />
    </>
  );
}
