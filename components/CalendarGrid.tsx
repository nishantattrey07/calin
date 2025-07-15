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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Calendar Header */}
      <div className="p-8 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigateCalendar("prev")}
              className="p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300"
            >
              <svg
                className="w-5 h-5 text-gray-600"
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

            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
              {formatDate(currentDate)}
            </h2>

            <button
              onClick={() => navigateCalendar("next")}
              className="p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300"
            >
              <svg
                className="w-5 h-5 text-gray-600"
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
              className="px-6 py-3 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Today
            </button>
          </div>

          {/* View Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-200">
              {(["month", "week", "day"] as const).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    view === viewType
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => onEventCreate?.(new Date())}
              className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
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
                className="p-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 bg-gray-50 rounded-2xl p-1">
            {calendarDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.getTime() === today.getTime();
              const dayEvents = getEventsForDate(date);

              return (
                <div
                  key={index}
                  onClick={() => onDateClick?.(date)}
                  className={`min-h-[130px] p-4 bg-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] rounded-xl border ${
                    !isCurrentMonth
                      ? "text-gray-400 bg-gray-50 border-gray-100"
                      : "border-gray-100 hover:border-gray-200"
                  } ${
                    isToday
                      ? "ring-2 ring-gray-900 ring-opacity-20 bg-gray-50"
                      : ""
                  }`}
                >
                  <div
                    className={`text-sm font-semibold mb-3 flex items-center justify-center ${
                      isToday
                        ? "bg-gray-900 text-white w-8 h-8 rounded-full"
                        : !isCurrentMonth
                        ? "w-8 h-8 text-gray-400"
                        : "w-8 h-8 text-gray-700"
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
                              ? "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 hover:border-blue-300"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold leading-tight truncate flex items-center">
                            {isSystemEvent && <span className="mr-1">🎂</span>}
                            {event.summary}
                          </div>
                          {event.location && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
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
          <div className="text-center text-gray-500 py-12">
            <h3 className="text-lg font-medium mb-2">Week View</h3>
            <p>Week view implementation coming next!</p>
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            <h3 className="text-lg font-medium mb-2">Day View</h3>
            <p>Day view implementation coming next!</p>
          </div>
        </div>
      )}
    </div>
  );
}
