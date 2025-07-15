import { CalendarEvent } from "@/lib/types";
import { useMemo, useState } from "react";

interface CalendarGridProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventCreate?: (start: Date) => void;
}

export function CalendarGrid({
  events,
  onEventClick,
  onDateClick,
  onEventCreate,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");

  // Calendar navigation
  const navigateCalendar = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") {
        newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      } else if (view === "week") {
        newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
      } else {
        newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
      }
      return newDate;
    });
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    if (view !== "month") return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, view]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check if the event starts on this date OR spans across this date
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      return (
        (eventStart >= dateStart && eventStart <= dateEnd) ||
        (eventStart <= dateStart && eventEnd >= dateStart)
      );
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    if (view === "month") {
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (view === "week") {
      const endOfWeek = new Date(date);
      endOfWeek.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-700/50">
      {/* Calendar Header */}
      <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigateCalendar("prev")}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
            >
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight">
              {formatDate(currentDate)}
            </h2>

            <button
              onClick={() => navigateCalendar("next")}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
            >
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-6 py-3 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Today
            </button>
          </div>

          {/* View Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
              {(["month", "week", "day"] as const).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    view === viewType
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => onEventCreate?.(new Date())}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === "month" && (
        <div className="p-8">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-px mb-6">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="p-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
            {calendarDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.getTime() === today.getTime();
              const dayEvents = getEventsForDate(date);

              return (
                <div
                  key={index}
                  onClick={() => onDateClick?.(date)}
                  className={`min-h-[130px] p-4 bg-white dark:bg-slate-800 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] rounded-xl border ${
                    !isCurrentMonth
                      ? "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  } ${
                    isToday
                      ? "ring-2 ring-indigo-500 ring-opacity-50 bg-indigo-50 dark:bg-indigo-950/30"
                      : ""
                  }`}
                >
                  <div
                    className={`text-sm font-semibold mb-3 flex items-center justify-center ${
                      isToday
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white w-8 h-8 rounded-full shadow-lg"
                        : !isCurrentMonth
                        ? "w-8 h-8 text-slate-400 dark:text-slate-500"
                        : "w-8 h-8 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  <div className="space-y-2">
                    {dayEvents.slice(0, 3).map((event) => {
                      const isSystemEvent =
                        event.eventType === "birthday" ||
                        event.source?.title
                          ?.toLowerCase()
                          ?.includes("birthday") ||
                        event.source?.url?.includes("plus.google.com");

                      return (
                        <div
                          key={event.id || `temp-${Math.random()}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className={`text-xs p-2 rounded-lg cursor-pointer transition-all duration-200 border hover:shadow-sm ${
                            isSystemEvent
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                              : "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-500 hover:border-slate-300 dark:hover:border-slate-400"
                          }`}
                        >
                          <div className="font-semibold leading-tight truncate flex items-center">
                            {isSystemEvent && <span className="mr-1">🎂</span>}
                            {event.summary}
                          </div>
                          {event.location && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-600 rounded-lg p-2 text-center border border-slate-200 dark:border-slate-500">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="p-6">
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            <h3 className="text-lg font-medium mb-2">Week View</h3>
            <p>Week view implementation coming next!</p>
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="p-6">
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            <h3 className="text-lg font-medium mb-2">Day View</h3>
            <p>Day view implementation coming next!</p>
          </div>
        </div>
      )}
    </div>
  );
}
