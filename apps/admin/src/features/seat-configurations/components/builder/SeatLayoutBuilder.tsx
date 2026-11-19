import { useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Armchair,
  DoorOpen,
  Plus,
  RotateCw,
  Trash2,
  Users,
} from "lucide-react";
import type {
  LayoutElement,
  LayoutElementType,
  LayoutSeat,
  SeatType,
} from "../../types/seat-configuration.types";
import {
  createElement,
  createSeat,
  elementLabels,
  seatTypeLabels,
  validateLayout,
} from "../../utils/seat-layout.utils";

type Props = {
  canvasWidth: number;
  canvasHeight: number;
  seats: LayoutSeat[];
  elements: LayoutElement[];
  onChange: (value: {
    canvasWidth: number;
    canvasHeight: number;
    seats: LayoutSeat[];
    elements: LayoutElement[];
  }) => void;
};

type Selection = { kind: "seat"; id: string } | { kind: "element"; id: number } | null;
type DragState = { selection: Exclude<Selection, null>; offsetX: number; offsetY: number } | null;

const seatTypes: SeatType[] = ["REGULAR", "PREMIUM", "SLEEPER", "RECLINER", "DRIVER", "STAFF"];
const elementTypes: LayoutElementType[] = ["AISLE", "DOOR", "STAIRCASE", "DRIVER_AREA", "WHEEL", "WINDOW", "TABLE", "OTHER"];

const seatStyle: Record<SeatType, string> = {
  REGULAR: "border-slate-300 bg-slate-100 text-slate-700",
  PREMIUM: "border-amber-400 bg-amber-100 text-amber-800",
  SLEEPER: "border-violet-400 bg-violet-100 text-violet-800",
  RECLINER: "border-sky-400 bg-sky-100 text-sky-800",
  DRIVER: "border-slate-500 bg-slate-300 text-slate-800",
  STAFF: "border-rose-400 bg-rose-100 text-rose-800",
};

function NumberField({ label, value, min = 0, step = 1, onChange }: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  );
}

export default function SeatLayoutBuilder({
  canvasWidth,
  canvasHeight,
  seats,
  elements,
  onChange,
}: Props) {
  const [selection, setSelection] = useState<Selection>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const errors = useMemo(
    () => validateLayout(seats, elements, canvasWidth, canvasHeight),
    [seats, elements, canvasWidth, canvasHeight],
  );

  const selectedSeat = selection?.kind === "seat"
    ? seats.find((seat) => seat.seatNumber === selection.id)
    : undefined;
  const selectedElementIndex = selection?.kind === "element" ? selection.id : -1;
  const selectedElement = selectedElementIndex >= 0 ? elements[selectedElementIndex] : undefined;

  const commit = (nextSeats: LayoutSeat[], nextElements: LayoutElement[] = elements, width = canvasWidth, height = canvasHeight) => {
    onChange({ canvasWidth: width, canvasHeight: height, seats: nextSeats, elements: nextElements });
  };

  const patchSeat = (seatNumber: string, patch: Partial<LayoutSeat>) => {
    commit(seats.map((seat) => seat.seatNumber === seatNumber ? { ...seat, ...patch } : seat));
  };

  const patchElement = (index: number, patch: Partial<LayoutElement>) => {
    commit(seats, elements.map((element, current) => current === index ? { ...element, ...patch } : element));
  };

  const addSeat = () => {
    const seat = createSeat(seats);
    commit([...seats, seat]);
    setSelection({ kind: "seat", id: seat.seatNumber });
  };

  const addElement = (type: LayoutElementType) => {
    const element = createElement(type, elements.length);
    const index = elements.length;
    commit(seats, [...elements, element]);
    setSelection({ kind: "element", id: index });
  };

  const removeSelection = () => {
    if (!selection) return;
    if (selection.kind === "seat") {
      commit(seats.filter((seat) => seat.seatNumber !== selection.id));
    } else {
      commit(seats, elements.filter((_element, index) => index !== selection.id));
    }
    setSelection(null);
  };

  const beginDrag = (event: ReactPointerEvent, item: Exclude<Selection, null>, x: number, y: number) => {
    if ((event.target as HTMLElement).closest("input,select,button[data-no-drag]")) return;
    event.preventDefault();
    const canvas = event.currentTarget.closest("[data-layout-canvas]") as HTMLDivElement | null;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    setSelection(item);
    setDrag({
      selection: item,
      offsetX: event.clientX - bounds.left - x,
      offsetY: event.clientY - bounds.top - y,
    });
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const currentSeat = drag.selection.kind === "seat"
      ? seats.find((seat) => seat.seatNumber === drag.selection.id)
      : undefined;
    const currentElement = drag.selection.kind === "element"
      ? elements[drag.selection.id]
      : undefined;
    const item = currentSeat ?? currentElement;
    if (!item) return;
    const maxX = Math.max(0, canvasWidth - item.width);
    const maxY = Math.max(0, canvasHeight - item.height);
    const x = Math.round(Math.max(0, Math.min(maxX, event.clientX - bounds.left - drag.offsetX)));
    const y = Math.round(Math.max(0, Math.min(maxY, event.clientY - bounds.top - drag.offsetY)));
    if (drag.selection.kind === "seat") patchSeat(drag.selection.id, { x, y });
    else patchElement(drag.selection.id, { x, y });
  };

  const updateCanvas = (key: "canvasWidth" | "canvasHeight", value: number) => {
    const width = key === "canvasWidth" ? value : canvasWidth;
    const height = key === "canvasHeight" ? value : canvasHeight;
    onChange({ canvasWidth: width, canvasHeight: height, seats, elements });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Seat layout</h2>
          <p className="mt-1 text-sm text-slate-500">Build a top-view layout. Select an item to edit it, or drag it to reposition.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addSeat} className="inline-flex items-center gap-2 rounded-xl bg-[#ff5a1f] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#e94b13]">
            <Plus className="h-4 w-4" /> Add seat
          </button>
          <button type="button" onClick={removeSelection} disabled={!selection} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Remove selected
          </button>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Armchair className="h-4 w-4 text-[#ff5a1f]" /> Vehicle top view</div>
            <div className="text-xs text-slate-500">{seats.length} total · {seats.filter((seat) => seat.isActive && seat.isBookable).length} bookable</div>
          </div>

          <div className="overflow-auto rounded-xl bg-slate-100 p-4">
            <div
              data-layout-canvas
              onPointerMove={moveDrag}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
              className="relative mx-auto touch-none rounded-[34px] border-[5px] border-slate-300 bg-white shadow-inner"
              style={{ width: canvasWidth, height: canvasHeight, minWidth: canvasWidth }}
            >
              <div className="absolute left-1/2 top-3 h-2 w-20 -translate-x-1/2 rounded-full bg-slate-200" />
              <div className="absolute bottom-3 left-1/2 h-2 w-20 -translate-x-1/2 rounded-full bg-slate-200" />
              <div className="absolute left-1/2 top-8 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">Front</div>

              {elements.map((element, index) => (
                <div
                  key={element.id ?? `element-${index}`}
                  onPointerDown={(event) => beginDrag(event, { kind: "element", id: index }, element.x, element.y)}
                  className={`absolute flex cursor-grab select-none items-center justify-center overflow-hidden rounded-md border text-center text-[9px] font-bold uppercase tracking-wide active:cursor-grabbing ${element.type === "AISLE" ? "border-dashed border-slate-300 bg-slate-100/80 text-slate-400" : "border-slate-400 bg-slate-200 text-slate-600"} ${selection?.kind === "element" && selection.id === index ? "z-20 ring-2 ring-[#ff5a1f] ring-offset-1" : ""}`}
                  style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)` }}
                  title={`${elementLabels[element.type]} – drag to move`}
                >
                  {element.label || elementLabels[element.type]}
                </div>
              ))}

              {seats.map((seat) => (
                <div
                  key={seat.id ?? seat.seatNumber}
                  onPointerDown={(event) => beginDrag(event, { kind: "seat", id: seat.seatNumber }, seat.x, seat.y)}
                  onClick={() => setSelection({ kind: "seat", id: seat.seatNumber })}
                  className={`absolute flex cursor-grab select-none flex-col items-center justify-center rounded-lg border-2 text-[9px] font-bold shadow-sm active:cursor-grabbing ${seatStyle[seat.seatType]} ${selection?.kind === "seat" && selection.id === seat.seatNumber ? "z-30 ring-2 ring-[#ff5a1f] ring-offset-2" : ""} ${!seat.isActive ? "opacity-40" : ""} ${!seat.isBookable ? "border-dashed" : ""}`}
                  style={{ left: seat.x, top: seat.y, width: seat.width, height: seat.height, transform: `rotate(${seat.rotation}deg)` }}
                  title={`${seat.seatNumber} · ${seatTypeLabels[seat.seatType]}`}
                >
                  <Armchair className="h-4 w-4" />
                  <span className="max-w-full truncate px-0.5">{seat.seatNumber}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {seatTypes.map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <i className={`h-3 w-3 rounded border ${seatStyle[type]}`} /> {seatTypeLabels[type]}
              </span>
            ))}
          </div>
          {errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">Layout needs attention</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-800">
                {errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Layout elements</h3>
            <p className="mt-1 text-xs text-slate-500">Add structural items to the vehicle floor plan.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {elementTypes.map((type) => (
                <button key={type} type="button" onClick={() => addElement(type)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700">
                  {elementLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Canvas dimensions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <NumberField label="Width" min={280} value={canvasWidth} onChange={(value) => updateCanvas("canvasWidth", value)} />
              <NumberField label="Height" min={400} value={canvasHeight} onChange={(value) => updateCanvas("canvasHeight", value)} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Coordinates are saved in pixels.</p>
          </div>

          {selectedSeat && (
            <div className="rounded-2xl border border-orange-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Seat properties</h3>
                <Armchair className="h-4 w-4 text-[#ff5a1f]" />
              </div>
              <div className="space-y-3">
                <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Seat number</span><input value={selectedSeat.seatNumber} onChange={(event) => {
                  const next = event.target.value;
                  const old = selectedSeat.seatNumber;
                  patchSeat(old, { seatNumber: next });
                  setSelection({ kind: "seat", id: next });
                }} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-orange-400" /></label>
                <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Seat type</span><select value={selectedSeat.seatType} onChange={(event) => patchSeat(selectedSeat.seatNumber, { seatType: event.target.value as SeatType })} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm">{seatTypes.map((type) => <option key={type} value={type}>{seatTypeLabels[type]}</option>)}</select></label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X position" value={selectedSeat.x} onChange={(value) => patchSeat(selectedSeat.seatNumber, { x: value })} />
                  <NumberField label="Y position" value={selectedSeat.y} onChange={(value) => patchSeat(selectedSeat.seatNumber, { y: value })} />
                  <NumberField label="Width" min={12} value={selectedSeat.width} onChange={(value) => patchSeat(selectedSeat.seatNumber, { width: value })} />
                  <NumberField label="Height" min={12} value={selectedSeat.height} onChange={(value) => patchSeat(selectedSeat.seatNumber, { height: value })} />
                  <NumberField label="Row" min={1} value={selectedSeat.rowNumber ?? 1} onChange={(value) => patchSeat(selectedSeat.seatNumber, { rowNumber: value })} />
                  <NumberField label="Column" min={1} value={selectedSeat.columnNumber ?? 1} onChange={(value) => patchSeat(selectedSeat.seatNumber, { columnNumber: value })} />
                  <NumberField label="Deck" min={1} value={selectedSeat.deckNumber} onChange={(value) => patchSeat(selectedSeat.seatNumber, { deckNumber: value })} />
                  <NumberField label="Price multiplier" min={0.1} step={0.1} value={selectedSeat.priceMultiplier} onChange={(value) => patchSeat(selectedSeat.seatNumber, { priceMultiplier: value })} />
                </div>
                <button type="button" onClick={() => patchSeat(selectedSeat.seatNumber, { rotation: (selectedSeat.rotation + 90) % 360 })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600"><RotateCw className="h-3.5 w-3.5" /> Rotate 90°</button>
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={selectedSeat.isBookable} onChange={(event) => patchSeat(selectedSeat.seatNumber, { isBookable: event.target.checked })} /> Bookable seat</label>
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={selectedSeat.isActive} onChange={(event) => patchSeat(selectedSeat.seatNumber, { isActive: event.target.checked })} /> Active</label>
              </div>
            </div>
          )}

          {selectedElement && (
            <div className="rounded-2xl border border-orange-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Element properties</h3><DoorOpen className="h-4 w-4 text-[#ff5a1f]" /></div>
              <div className="space-y-3">
                <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Label</span><input value={selectedElement.label ?? ""} onChange={(event) => patchElement(selectedElementIndex, { label: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={selectedElement.x} onChange={(value) => patchElement(selectedElementIndex, { x: value })} />
                  <NumberField label="Y" value={selectedElement.y} onChange={(value) => patchElement(selectedElementIndex, { y: value })} />
                  <NumberField label="Width" min={1} value={selectedElement.width} onChange={(value) => patchElement(selectedElementIndex, { width: value })} />
                  <NumberField label="Height" min={1} value={selectedElement.height} onChange={(value) => patchElement(selectedElementIndex, { height: value })} />
                </div>
                <button type="button" onClick={() => patchElement(selectedElementIndex, { rotation: (selectedElement.rotation + 90) % 360 })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600"><RotateCw className="h-3.5 w-3.5" /> Rotate 90°</button>
              </div>
            </div>
          )}

          {!selection && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <Users className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-700">Select a seat or element</p>
              <p className="mt-1 text-[11px] text-slate-500">Its properties will appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
