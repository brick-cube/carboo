
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BusFront,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Route,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";

interface Vehicle {
  id: string;
  name?: string;
  registrationNumber?: string;
  registration?: string;
  status: string;
}

interface Trip {
  id: string;
  tripCode?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  vehicle?: {
    name?: string;
    registrationNumber?: string;
  };
  route?: {
    name?: string;
  };
  stops?: {
    name: string;
    stopIndex: number;
  }[];
}

function unwrap(response: any) {
  return response?.data?.data ?? response?.data;
}

function getRecords<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    BOARDING: "bg-orange-50 text-orange-700",
    IN_PROGRESS: "bg-emerald-50 text-emerald-700",
    COMPLETED: "bg-zinc-100 text-zinc-600",
    CANCELLED: "bg-red-50 text-red-700",
    DRAFT: "bg-zinc-100 text-zinc-500",
  };

  return styles[status] ?? "bg-zinc-100 text-zinc-600";
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  link,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
  link?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
          <p className="mt-2 text-xs text-zinc-400">{description}</p>
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {link && (
        <Link
          to={link}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#f05a28] hover:underline"
        >
          View details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const vehiclesQuery = useQuery({
    queryKey: ["dashboard", "vehicles"],
    queryFn: async () => {
      const response = await api.get("/vehicles", {
        params: { page: 1, limit: 100 },
      });

      return unwrap(response);
    },
  });

  const tripsQuery = useQuery({
    queryKey: ["dashboard", "trips"],
    queryFn: async () => {
      const response = await api.get("/trips", {
        params: { page: 1, limit: 100 },
      });

      return unwrap(response);
    },
  });

  const vehicles = getRecords<Vehicle>(vehiclesQuery.data);
  const trips = getRecords<Trip>(tripsQuery.data);

  const vehicleTotal =
    vehiclesQuery.data?.pagination?.total ??
    vehiclesQuery.data?.total ??
    vehicles.length;

  const activeVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "ACTIVE",
  ).length;

  const scheduledTrips = trips.filter(
    (trip) => trip.status === "SCHEDULED",
  ).length;

  const ongoingTrips = trips.filter(
    (trip) => trip.status === "IN_PROGRESS",
  ).length;

  const upcomingTrips = trips
    .filter(
      (trip) =>
        ["SCHEDULED", "BOARDING"].includes(trip.status) &&
        new Date(trip.startsAt).getTime() >= Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() -
        new Date(b.startsAt).getTime(),
    )
    .slice(0, 5);

  const recentTrips = [...trips]
    .sort(
      (a, b) =>
        new Date(b.startsAt).getTime() -
        new Date(a.startsAt).getTime(),
    )
    .slice(0, 5);

  const isLoading = vehiclesQuery.isLoading || tripsQuery.isLoading;
  const hasError = vehiclesQuery.isError || tripsQuery.isError;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f05a28]">
            Overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Here's what's happening across your operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/vehicles"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <BusFront className="h-4 w-4" />
            Vehicles
          </Link>

          <Link
            to="/trips/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff5a1f] px-4 text-sm font-semibold text-white transition hover:bg-[#e94b14]"
          >
            <Plus className="h-4 w-4" />
            Create trip
          </Link>
        </div>
      </section>

      {hasError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Some dashboard information could not be loaded. Check your API
          connection and administrator permissions.
          <button
            onClick={() => {
              void vehiclesQuery.refetch();
              void tripsQuery.refetch();
            }}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total vehicles"
          value={isLoading ? "—" : vehicleTotal}
          description="Vehicles registered in your fleet"
          icon={BusFront}
          iconClass="bg-orange-50 text-[#f05a28]"
          link="/vehicles"
        />

        <MetricCard
          title="Active vehicles"
          value={isLoading ? "—" : activeVehicles}
          description="Currently marked as active"
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-600"
          link="/vehicles"
        />

        <MetricCard
          title="Scheduled trips"
          value={isLoading ? "—" : scheduledTrips}
          description="Trips awaiting departure"
          icon={CalendarDays}
          iconClass="bg-blue-50 text-blue-600"
          link="/trips"
        />

        <MetricCard
          title="Trips in progress"
          value={isLoading ? "—" : ongoingTrips}
          description="Currently underway"
          icon={Route}
          iconClass="bg-violet-50 text-violet-600"
          link="/trips"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5">
            <div>
              <h2 className="font-semibold text-zinc-950">
                Upcoming departures
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Your next scheduled trips
              </p>
            </div>

            <Link
              to="/trips"
              className="text-xs font-semibold text-[#f05a28] hover:underline"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-lg bg-zinc-100"
                />
              ))}
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-700">
                No upcoming departures
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Your scheduled trips will appear here.
              </p>
              <Link
                to="/trips/new"
                className="mt-4 inline-flex text-xs font-semibold text-[#f05a28] hover:underline"
              >
                Create your first trip
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {upcomingTrips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#f05a28]">
                      <BusFront className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {trip.tripCode || "Trip"}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {trip.route?.name ||
                          trip.vehicle?.registrationNumber ||
                          "Scheduled journey"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-zinc-800">
                      {formatTime(trip.startsAt)}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatDate(trip.startsAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-5">
            <h2 className="font-semibold text-zinc-950">
              Fleet overview
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Current vehicle status
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <BusFront className="h-4 w-4" />
                </div>
                <span className="text-sm text-zinc-600">Active</span>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                {isLoading ? "—" : activeVehicles}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock3 className="h-4 w-4" />
                </div>
                <span className="text-sm text-zinc-600">Inactive</span>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                {isLoading ? "—" : vehicles.filter((v) => v.status === "INACTIVE").length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <BusFront className="h-4 w-4" />
                </div>
                <span className="text-sm text-zinc-600">Maintenance</span>
              </div>
              <span className="text-sm font-semibold text-zinc-900">
                {isLoading ? "—" : vehicles.filter((v) => v.status === "MAINTENANCE").length}
              </span>
            </div>

            <div className="border-t border-zinc-100 pt-5">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-zinc-500">Active fleet ratio</span>
                <span className="font-semibold text-zinc-800">
                  {isLoading || !vehicleTotal
                    ? "—"
                    : `${Math.round((activeVehicles / Number(vehicleTotal)) * 100)}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[#ff5a1f] transition-all"
                  style={{
                    width: `${
                      vehicleTotal
                        ? Math.min(
                            100,
                            (activeVehicles / Number(vehicleTotal)) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <Link
              to="/vehicles"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#f05a28] hover:underline"
            >
              Manage fleet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5">
          <div>
            <h2 className="font-semibold text-zinc-950">Recent trip activity</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Latest trips in your system
            </p>
          </div>

          <Link
            to="/trips"
            className="text-xs font-semibold text-[#f05a28] hover:underline"
          >
            All trips
          </Link>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm text-zinc-400">Loading trips...</div>
        ) : recentTrips.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Route className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-700">
              No trips created yet
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Create a trip to start managing your operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Trip</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Departure</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {recentTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-zinc-900">
                        {trip.tripCode || "Trip"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {trip.route?.name || "Route not available"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-600">
                      {trip.vehicle?.registrationNumber || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-zinc-700">
                        {formatDate(trip.startsAt)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatTime(trip.startsAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(trip.status)}`}>
                        {trip.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/trips/${trip.id}`}
                        className="text-xs font-semibold text-[#f05a28] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}