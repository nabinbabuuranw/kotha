# Kotha · Business plan (Day 3)

Targets, not promises. No revenue has been earned. Expenses so far: $0.

## Customers
1. **Owner-landlords in the Kathmandu Valley** with 2 to 15 rooms, flats or shutters in their own house (the core payer). Typical pain: notebook rent records, arguments about what was paid, electricity sub-meter sums, repairs by phone, brokers taking a month's rent to fill a room.
2. **Small property managers and hostel/PG owners** with 15+ units (Landlord Pro).
3. **Tenants** (free): want proof of payment, a clear balance and a way to report problems that is not a phone call at 9 pm.
4. **Room seekers** (free): students, working people, families searching by area, rent and basics like water and parking.

## Problems solved
- Finding a vacant tenant without a broker: public listing + inquiry inbox, landlord's phone never public.
- "Did you pay Asoj?" disputes: BS-month ledger, numbered receipts with amount in words, a statement both sides see.
- Utilities: add electricity/water/internet lines to any month.
- Repairs: tracked requests with status and notes.

## Competitors (checked by web search on 3 Nov 2026)
- Listing sites: **Room Sewa** (roomsewa.com.np), **Kothabhada.com** and its Facebook page, **Ghar Bhada** (ghar-bhada.com / gharbhada.org), **4kotha.com**, Hamrobazar classifieds and Facebook "room rent" groups.
- Rent management in Nepal: **Ejyalo** (describes itself as Nepal's first digital rent management system), **AITC Homes** (billing for property managers), Deraos (social posts about rent tracking).
- Global tools (TenantCloud, Landlord Studio, Avail): built for US/UK leases, USD, AD months, online rent collection that does not exist here.
- **Name risk:** "kotha" is a common Nepali word and Kothabhada.com uses it. Before any launch Nabin should consider a distinctive brand name or a mark like "Kotha Desk".

## USP
Listings and the landlord's rent book in one free product, in Nepali months, with tenant logins. Honest listings (plan sketches, no stock photos, no fake "verified" badges), no commission, works on a cheap Android phone.

## Pricing
- **Free:** up to 5 units, all features.
- **Landlord Pro:** Rs 699/month or Rs 6,990/year: unlimited units, WhatsApp support.
- Later add-ons (not built): featured listing Rs 199 for 7 days; SMS reminders at cost + margin; eSewa/Khalti rent collection once a merchant account and their APIs are in place.

## Monetization and the NPR 30,000–100,000/month target
- 45 Pro landlords ≈ Rs 31,000/month; 145 ≈ Rs 101,000/month. A target, not a forecast.
- Featured listings could add revenue once there is real search traffic.

## Acquisition
- Door-to-door and WhatsApp with landlords in student areas (Kirtipur, Baneshwor, Bagbazar) and hostels.
- Free printable "To Let" poster with a QR to the listing (tie-in to existing behaviour).
- Partnerships with hostel/PG associations and small brokers who want a tidy rent book for owners.
- Facebook room-rent groups: post listings with a link back to Kotha.

## Recurring revenue potential
High once a landlord's history is in Kotha (switching cost: years of receipts and statements). Annual plan discount encourages prepayment.

## Operating cost
$0 today: one Cloudflare Worker + D1 database on the free tier (100,000 requests/day, 5 GB D1). Paid tier would be about $5/month when traffic exceeds that.

## Limits and honest notes
- No online payments: Pro is switched on manually after eSewa/bank payment. No email or SMS sending yet (inquiries and requests appear in the dashboard; WhatsApp links are click-to-open).
- No photo uploads yet (plan sketches only); no map search.
- Receipts are not tax invoices; landlords handle their own rental income tax.
- Demo data is sample data and resets every 3 hours.
