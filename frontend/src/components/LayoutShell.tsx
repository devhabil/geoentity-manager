import { MapPin, Map as MapIcon } from 'lucide-react'

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
          GeoEntity Manager
        </h1>
        <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
        <p className="hidden text-xs text-slate-500 sm:inline-block">
          Manage vehicles, IoT sensors,{' '}
          <strong className="font-semibold text-slate-700">and facilities</strong> on a map
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            JD
          </div>
          <div className="hidden text-xs leading-tight md:block">
            <div className="font-semibold text-slate-800">John Doe</div>
            <div className="text-[11px] text-slate-500">Operations</div>
          </div>
        </div>
      </div>
    </header>
  )
}

export function NavRail() {
  return (
    <nav
      className="hidden w-16 shrink-0 flex-col items-center bg-[#0f2340] py-3.5 text-slate-300 lg:flex"
      aria-label="Primary navigation"
    >
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md">
        <MapPin className="h-4 w-4" />
      </div>

      <div className="flex w-full flex-col items-center gap-2 px-1.5">
        <div className="flex w-full flex-col items-center gap-1 rounded-xl bg-white/12 py-2.5 text-[11px] font-semibold text-white">
          <MapPin className="h-4 w-4 text-sky-400" />
          <span>Entities</span>
        </div>
        <div
          className="flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium text-slate-400"
          title="Map View (active in main workspace)"
        >
          <MapIcon className="h-4 w-4" />
          <span>Map</span>
        </div>
      </div>
    </nav>
  )
}
