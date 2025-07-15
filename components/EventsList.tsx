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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header with filters */}
      <div className="p-8 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-600"
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
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 w-64 bg-white"
              />
            </div>

            {/* Time filters */}
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
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
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    filter === key
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events found
            </h3>
            <p className="text-gray-500">
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
                className="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 border-l-4 border-l-gray-400"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                      {event.summary || "Untitled Event"}
                    </h4>

                    <div className="flex items-center text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-400"
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
                      <div className="flex items-center text-sm text-gray-600 mb-2 bg-gray-50 rounded-lg px-3 py-2">
                        <svg
                          className="w-4 h-4 mr-2 text-gray-400"
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
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <svg
                    className="w-5 h-5 text-gray-400 ml-2"
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
