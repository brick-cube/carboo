import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Check, LoaderCircle, Save } from "lucide-react";
import { Link } from "react-router-dom";
import SeatLayoutBuilder from "./builder/SeatLayoutBuilder";
import type {
  LayoutElement,
  LayoutSeat,
  SeatConfiguration,
  SeatConfigurationPayload,
} from "../types/seat-configuration.types";
import { DEFAULT_CANVAS, validateLayout } from "../utils/seat-layout.utils";

type Props = {
  initial?: SeatConfiguration;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (payload: SeatConfigurationPayload) => void;
};

function getPayloadSeat(seat: LayoutSeat): LayoutSeat {
  const {
    seatNumber, label, seatType, x, y, width, height, rotation,
    rowNumber, columnNumber, deckNumber, isBookable, isActive,
    priceMultiplier, metadata,
  } = seat;
  return {
    seatNumber, label: label ?? null, seatType, x, y, width, height, rotation,
    rowNumber: rowNumber ?? null, columnNumber: columnNumber ?? null,
    deckNumber, isBookable, isActive, priceMultiplier, metadata: metadata ?? null,
  };
}

function getPayloadElement(element: LayoutElement): LayoutElement {
  const { type, label, x, y, width, height, rotation, metadata } = element;
  return { type, label: label ?? null, x, y, width, height, rotation, metadata: metadata ?? null };
}

export default function SeatConfigurationForm({ initial, isPending, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [canvasWidth, setCanvasWidth] = useState(initial?.canvasWidth ?? DEFAULT_CANVAS.width);
  const [canvasHeight, setCanvasHeight] = useState(initial?.canvasHeight ?? DEFAULT_CANVAS.height);
  const [seats, setSeats] = useState<LayoutSeat[]>(initial?.seats ?? []);
  const [elements, setElements] = useState<LayoutElement[]>(initial?.elements ?? []);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setDescription(initial.description ?? "");
    setCanvasWidth(initial.canvasWidth);
    setCanvasHeight(initial.canvasHeight);
    setSeats(initial.seats ?? []);
    setElements(initial.elements ?? []);
  }, [initial]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a name for this seat configuration.");
      return;
    }
    const layoutErrors = validateLayout(seats, elements, canvasWidth, canvasHeight);
    if (layoutErrors.length) {
      setError(layoutErrors[0]);
      return;
    }
    setError("");
    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      canvasWidth,
      canvasHeight,
      seats: seats.map(getPayloadSeat),
      elements: elements.map(getPayloadElement),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/seat-configurations" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to configurations
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/seat-configurations" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e94b13] disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff5a1f]"><Check className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-slate-950">Configuration details</h2><p className="mt-1 text-sm text-slate-500">Give this reusable seat layout a clear name and description.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Configuration name <span className="text-red-500">*</span></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="e.g. 2+1 Premium Coach" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Optional notes about this layout" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5a1f] focus:ring-4 focus:ring-orange-100" /></label>
        </div>
      </section>

      <SeatLayoutBuilder
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        seats={seats}
        elements={elements}
        onChange={(value) => {
          setCanvasWidth(value.canvasWidth);
          setCanvasHeight(value.canvasHeight);
          setSeats(value.seats);
          setElements(value.elements);
        }}
      />

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    </form>
  );
}
