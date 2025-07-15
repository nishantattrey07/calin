import { CalendarEvent } from "@/lib/types";
import React, { useEffect, useState } from "react";

// Utility functions to check event permissions
const isEventDeletable = (event: CalendarEvent | null): boolean => {
  if (!event) return false;

  // Birthday events and system events cannot be deleted
  if (event.eventType === "birthday") return false;

  // Events with certain source properties (like birthdays from Google+) cannot be deleted
  if (event.source?.title?.toLowerCase()?.includes("birthday")) return false;
  if (event.source?.url?.includes("plus.google.com")) return false;

  // Generally, if an event doesn't have an ID, it's likely not deletable
  if (!event.id) return false;

  return true;
};

const isEventEditable = (event: CalendarEvent | null): boolean => {
  if (!event) return true; // New events are editable

  // Birthday events and system events cannot be edited
  if (event.eventType === "birthday") return false;

  // Events with certain source properties cannot be edited
  if (event.source?.title?.toLowerCase()?.includes("birthday")) return false;
  if (event.source?.url?.includes("plus.google.com")) return false;

  return true;
};

const getEventTypeMessage = (event: CalendarEvent | null): string => {
  if (!event) return "";

  if (event.eventType === "birthday") {
    return "Birthday events are managed by Google and cannot be modified.";
  }

  if (event.source?.title?.toLowerCase()?.includes("birthday")) {
    return "System events cannot be modified.";
  }

  return "This event cannot be modified.";
};

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  selectedDate?: Date;
  onSave: (event: CalendarEvent) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSave,
  onDelete,
}: EventModalProps) {
  const [formData, setFormData] = useState<CalendarEvent>({
    summary: "",
    start: "",
    end: "",
    description: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (event) {
      // Editing existing event
      setFormData({
        id: event.id,
        summary: event.summary || "",
        start: formatDateTimeLocal(new Date(event.start)),
        end: formatDateTimeLocal(new Date(event.end)),
        description: event.description || "",
        location: event.location || "",
      });
    } else if (selectedDate) {
      // Creating new event
      const startTime = new Date(selectedDate);
      startTime.setHours(9, 0, 0, 0); // Default to 9 AM
      const endTime = new Date(startTime);
      endTime.setHours(10, 0, 0, 0); // Default 1 hour duration

      setFormData({
        summary: "",
        start: formatDateTimeLocal(startTime),
        end: formatDateTimeLocal(endTime),
        description: "",
        location: "",
      });
    }
    setError(null);
  }, [event, selectedDate, isOpen]);

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.summary.trim()) {
        throw new Error("Event title is required");
      }
      if (!formData.start || !formData.end) {
        throw new Error("Start and end times are required");
      }
      if (new Date(formData.start) >= new Date(formData.end)) {
        throw new Error("End time must be after start time");
      }

      // Convert to ISO strings
      const eventToSave = {
        ...formData,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
      };

      await onSave(eventToSave);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;

    if (window.confirm("Are you sure you want to delete this event?")) {
      setDeleteLoading(true);
      setError(null);
      try {
        await onDelete(event.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete event");
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/80 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {event ? "Edit Event" : "Create New Event"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                {error}
              </div>
            </div>
          )}

          {/* Read-only warning for system events */}
          {event && !isEventEditable(event) && (
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {getEventTypeMessage(event)}
              </div>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label
              htmlFor="summary"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Event Title *
            </label>
            <input
              type="text"
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              disabled={!!(event && !isEventEditable(event))}
              className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                event && !isEventEditable(event)
                  ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
              }`}
              placeholder="Enter event title"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Start Time *
              </label>
              <input
                type="datetime-local"
                id="start"
                name="start"
                value={formData.start}
                onChange={handleInputChange}
                disabled={!!(event && !isEventEditable(event))}
                className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                  event && !isEventEditable(event)
                    ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                }`}
              />
            </div>
            <div>
              <label
                htmlFor="end"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                End Time *
              </label>
              <input
                type="datetime-local"
                id="end"
                name="end"
                value={formData.end}
                onChange={handleInputChange}
                disabled={!!(event && !isEventEditable(event))}
                className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                  event && !isEventEditable(event)
                    ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                }`}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location || ""}
              onChange={handleInputChange}
              disabled={!!(event && !isEventEditable(event))}
              className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                event && !isEventEditable(event)
                  ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
              }`}
              placeholder="Add location"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              disabled={!!(event && !isEventEditable(event))}
              rows={3}
              className={`w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none ${
                event && !isEventEditable(event)
                  ? "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
              }`}
              placeholder="Add description"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <div>
            {event && onDelete && isEventDeletable(event) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-6 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-all duration-200 disabled:opacity-50 font-medium border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 flex items-center space-x-2"
              >
                {deleteLoading && (
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span>Delete Event</span>
              </button>
            )}
            {event && !isEventDeletable(event) && (
              <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                System events cannot be deleted
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || deleteLoading}
              className="px-6 py-3 text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50 font-medium border border-slate-300 dark:border-slate-600"
            >
              {event && !isEventEditable(event) ? "Close" : "Cancel"}
            </button>
            {(!event || isEventEditable(event)) && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl"
              >
                {loading && (
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span>{event ? "Update Event" : "Create Event"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
