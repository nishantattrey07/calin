"use client";

import { CalendarEvent } from "@/lib/types";
import { useMemo, useState } from "react";

interface EventsListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function EventsList({ events, onEventClick }: EventsListProps) {
  const [filter, setFilter] = useState<"all" | "today" | "week" | "month">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    let filtered = events;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Apply time filter
    if (filter === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate < tomorrow;
      });
    } else if (filter === "week") {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filtered = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate <= weekFromNow;
      });
    } else if (filter === "month") {
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      filtered = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate <= monthFromNow;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.summary.toLowerCase().includes(term) ||
          event.description?.toLowerCase().includes(term) ||
          event.location?.toLowerCase().includes(term)
      );
    }

    // Sort by start date
    return filtered.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [events, filter, searchTerm]);

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50">
      {/* Header with filters */}
      <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-t-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-700 rounded-xl flex items-center justify-center">
              <svg
                className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span>Events ({filteredEvents.length})</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Time filters */}
            <div className="flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "today", label: "Today" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    filter === key
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="p-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No events found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm
                ? "Try adjusting your search terms."
                : "No events match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id || `temp-${Math.random()}`}
                onClick={() => onEventClick(event)}
                className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-600 border-l-4 border-l-indigo-500 dark:border-l-indigo-400 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-lg group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                      {event.summary || "Untitled Event"}
                    </h4>

                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-3 bg-slate-50/80 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg px-3 py-2">
                      <svg
                        className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">
                        {formatEventTime(event.start)}
                        {event.end && event.end !== event.start && (
                          <span> - {formatEventTime(event.end)}</span>
                        )}
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-2 bg-slate-50/80 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg px-3 py-2">
                        <svg
                          className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {event.location}
                      </div>
                    )}

                    {event.description && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <svg
                    className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
