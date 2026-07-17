export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            US Inland &amp; Coastal Fleet Dashboard
          </h1>
          <p className="text-xs text-slate-400">
            Tank barges &middot; hopper barges &middot; towboats &middot; tugboats
          </p>
        </div>
      </div>
    </header>
  );
}
