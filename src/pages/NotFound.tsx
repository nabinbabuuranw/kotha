import { Link } from '../lib/router';
import { PublicHeader, Footer } from '../components/PublicHeader';
import { PlanGlyph } from '../components/PlanGlyph';
export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="page-in mx-auto max-w-sheet px-5 py-20 text-center lg:px-8">
        <PlanGlyph kind="room" animate labels={false} className="mx-auto w-48" />
        <h1 className="display mt-6 text-[44px]">No room at this address</h1>
        <p className="mt-2 text-umber">The page you asked for is not on the plan.</p>
        <div className="mt-6 flex justify-center gap-3"><Link to="/" className="btn-ghost">Home</Link><Link to="/rooms" className="btn-primary">Find a room</Link></div>
      </main>
      <Footer />
    </>
  );
}
