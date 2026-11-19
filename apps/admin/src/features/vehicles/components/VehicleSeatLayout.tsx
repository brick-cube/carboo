import { Armchair, DoorOpen, LayoutGrid } from "lucide-react";
import type { VehicleSeat } from "../types/vehicle.types";

const seatTone: Record<string, string> = {
  REGULAR: "border-slate-300 bg-slate-100 text-slate-700",
  PREMIUM: "border-violet-300 bg-violet-100 text-violet-700",
  SLEEPER: "border-sky-300 bg-sky-100 text-sky-700",
  RECLINER: "border-amber-300 bg-amber-100 text-amber-700",
  DRIVER: "border-slate-700 bg-slate-700 text-white",
  STAFF: "border-emerald-300 bg-emerald-100 text-emerald-700",
};

export default function VehicleSeatLayout({ seats, selectedSeatId, onSelect, editable = false }: {
  seats: VehicleSeat[];
  selectedSeatId?: string;
  onSelect?: (seat: VehicleSeat) => void;
  editable?: boolean;
}) {
  const maxX = Math.max(600, ...seats.map((seat) => seat.x + seat.width + 24));
  const maxY = Math.max(420, ...seats.map((seat) => seat.y + seat.height + 24));
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-semibold text-slate-800">Vehicle floor plan</p><p className="text-xs text-slate-500">Top view · Select a seat to inspect it</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500"><LayoutGrid size={13} /> {seats.length} total seats</span>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative mx-auto rounded-[42px] border-2 border-slate-300 bg-slate-50/80" style={{ width: maxX, height: maxY, maxWidth: "100%" }}>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-200 px-5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Front</div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Rear</div>
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-slate-300"><DoorOpen size={13} /> Door</div>
          {seats.map((seat) => {
            const key = seat.id ?? seat.seatNumber;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect?.(seat)}
                title={`${seat.seatNumber} · ${seat.seatType}${seat.isBookable ? "" : " · Not bookable"}`}
                className={`absolute flex flex-col items-center justify-center rounded-lg border text-[10px] font-bold shadow-sm transition ${seatTone[seat.seatType] ?? seatTone.REGULAR} ${selectedSeatId === seat.id ? "z-10 outline outline-2 outline-orange-500 outline-offset-2" : "hover:z-10 hover:brightness-95"} ${!seat.isActive ? "opacity-40" : ""}`}
                style={{
                  left: seat.x,
                  top: seat.y,
                  width: seat.width,
                  height: seat.height,
                  transform: `rotate(${seat.rotation}deg)`,
                }}
              >
                <Armchair size={13} className="mb-0.5 opacity-60" />
                {seat.seatNumber}
              </button>
            );
          })}
          {!seats.length && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">No seats have been configured.</div>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(seatTone).filter(([type]) => seats.some((seat) => seat.seatType === type)).map(([type, tone]) => <span key={type} className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`h-3 w-3 rounded border ${tone}`} />{type}</span>)}
        <span className="ml-auto text-xs text-slate-400">{editable ? "Select a seat to edit its properties" : "Preview only"}</span>
      </div>
    </div>
  );
}
