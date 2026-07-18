export default function Header() {
  return (
    <header className="bg-[#0a1f5b] text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <span className="flex flex-none items-center rounded-md bg-white px-3 py-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ccm-logo.svg" alt="C&C Marine and Repair" className="h-9 w-auto" />
        </span>
        <div className="min-w-0 border-l border-white/20 pl-4">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            US Inland &amp; Coastal Fleet Dashboard
          </h1>
          <p className="text-xs text-white/60">
            Tank barges &middot; hopper barges &middot; towboats &middot; tugboats
          </p>
        </div>
      </div>
    </header>
  );
}
