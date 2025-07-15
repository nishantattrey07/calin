"use client";

import { CalendarGrid } from "@/components/CalendarGrid";
import { EventModal } from "@/components/EventModal";
import { EventsList } from "@/components/EventsList";
import { useSmartPolling } from "@/lib/hooks/useSmartPolling";
import { CalendarEvent } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function CalendarPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"calendar" | "events">("calendar");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    event?: CalendarEvent | null;
    selectedDate?: Date;
  }>({ isOpen: false });

  const router = useRouter();

  // Fetch events function
  const fetchEvents = useCallback(async () => {
    console.log("🔄 Fetching events...");
    try {
      const response = await fetch("/api/calendar/events");
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      const data = await response.json();
      console.log("📅 Events fetched:", data);
      if (data.success) {
        setEvents(data.events);
        console.log("✅ Events set in state:", data.events.length, "events");
      }
    } catch (err) {
      console.error("❌ Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart polling for real-time updates
  const { triggerAction } = useSmartPolling(async () => {
    try {
      const response = await fetch("/api/calendar/sync");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasChanges) {
          await fetchEvents();
        }
      }
    } catch (err) {
      console.error("❌ Error during smart polling:", err);
      await fetchEvents();
    }
  }, 30000);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/calendar/events");
        if (response.ok) {
          setIsAuthenticated(true);
          const userResponse = await fetch("/api/auth/user");
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserEmail(userData.email || "User");
          }
        } else if (response.status === 401) {
          setIsAuthenticated(false);
          router.push("/login");
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Initial events fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated, fetchEvents]);

  // Event handlers
  const handleSignOut = async () => {
    document.cookie =
      "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/login");
  };

  const handleEventSave = async (eventData: CalendarEvent) => {
    try {
      setLoading(true);

      if (eventData.id) {
        // Update existing event
        const response = await fetch(`/api/calendar/events/${eventData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details || errorData.error || "Failed to update event"
          );
        }
      } else {
        // Create new event
        const response = await fetch("/api/calendar/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (!response.ok) throw new Error("Failed to create event");
      }

      triggerAction();
      await fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);

      // Show user-friendly error messages for updates
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save event";

      if (
        errorMessage.includes("birthday") ||
        errorMessage.includes("system events")
      ) {
        alert(
          "This event cannot be updated because it's a birthday or system event managed by Google."
        );
      } else if (errorMessage.includes("permission")) {
        alert("You don't have permission to update this event.");
      } else if (
        errorMessage.includes("not found") ||
        errorMessage.includes("deleted")
      ) {
        alert("This event no longer exists and cannot be updated.");
        // Refresh events to update the UI
        await fetchEvents();
      } else {
        alert(`Failed to save event: ${errorMessage}`);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "Failed to delete event"
        );
      }

      triggerAction();
      await fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);

      // Show user-friendly error messages
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete event";

      if (
        errorMessage.includes("birthday") ||
        errorMessage.includes("system events")
      ) {
        alert(
          "This event cannot be deleted because it's a birthday or system event managed by Google."
        );
      } else if (errorMessage.includes("permission")) {
        alert("You don't have permission to delete this event.");
      } else if (
        errorMessage.includes("not found") ||
        errorMessage.includes("already been deleted")
      ) {
        alert("This event has already been deleted or no longer exists.");
        // Refresh events to update the UI
        await fetchEvents();
      } else {
        alert(`Failed to delete event: ${errorMessage}`);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-500">
          <svg
            className="animate-spin w-6 h-6"
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
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to view your calendar.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 z-40 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Calin
                </h1>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm text-gray-500 font-medium">
                  Welcome back{userEmail && `, ${userEmail.split("@")[0]}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3 text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live sync</span>
              </div>

              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-50 p-2.5 rounded-full"
                title="Sign Out"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="border-b border-gray-100">
          <nav className="-mb-px flex space-x-12 pt-8">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === "calendar"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-3">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Calendar View</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === "events"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span>Events List</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3 text-gray-500">
              <svg
                className="animate-spin w-6 h-6"
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
              <span>Loading calendar events...</span>
            </div>
          </div>
        ) : activeTab === "calendar" ? (
          <CalendarGrid
            events={events}
            onEventClick={(event) => setModalState({ isOpen: true, event })}
            onDateClick={(date) =>
              setModalState({ isOpen: true, selectedDate: date })
            }
            onEventCreate={(start) =>
              setModalState({
                isOpen: true,
                selectedDate: start,
              })
            }
          />
        ) : (
          <EventsList
            events={events}
            onEventClick={(event) => setModalState({ isOpen: true, event })}
          />
        )}
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        event={modalState.event}
        selectedDate={modalState.selectedDate}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  );
}
