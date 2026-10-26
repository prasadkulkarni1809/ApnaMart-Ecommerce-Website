import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="bg-white text-slate-900 dark:bg-gray-950 dark:text-white">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">ApnaMart</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">Find your next everyday favorite.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">Discover useful, well-made products for work, travel, and everyday life.</p>
          <Link to="/products" className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800">Shop products</Link>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-100 via-slate-100 to-amber-50 p-8 dark:border-slate-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white/70 text-8xl dark:bg-slate-950/40" aria-hidden="true">👜</div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Grow with ApnaMart</p>
            <h2 className="mt-2 text-3xl font-bold">Become a Seller</h2>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Bring your products to more customers. Create a seller account and start building your store on our platform.</p>
          </div>
          <Link to="/owners/register" className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">Start Selling</Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
