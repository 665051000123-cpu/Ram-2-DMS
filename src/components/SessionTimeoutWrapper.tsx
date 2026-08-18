"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function SessionTimeoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(30); // Default 30 mins

  useEffect(() => {
    // Fetch timeout setting from public API
    const fetchTimeoutSetting = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.sessionTimeoutMinutes) {
              setTimeoutMinutes(data.sessionTimeoutMinutes);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch session timeout setting:", err);
      }
    };
    fetchTimeoutSetting();
  }, []);

  const resetTimer = useCallback(() => {
    // This function doesn't need to do anything complex, 
    // it just signals that activity happened.
    // We will use a debounced approach below to reset the actual timeout.
  }, []);

  useEffect(() => {
    if (!session) return; // Don't track if not logged in

    let timeoutId: NodeJS.Timeout;

    const startTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        toast.error("เซสชันหมดอายุเนื่องจากไม่มีการใช้งานระบบ", { duration: 5000 });
        // Logout due to inactivity
        signOut({ callbackUrl: `${window.location.origin}/login` });
      }, timeoutMinutes * 60 * 1000);
    };

    // Events to track activity
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    // Wrap reset timer in a throttle/debounce to avoid excessive calls
    let isThrottled = false;
    const handleActivity = () => {
      if (!isThrottled) {
        startTimer();
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, 1000); // Throttle to max 1 reset per second
      }
    };

    // Attach event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Start initially
    startTimer();

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, timeoutMinutes]);

  return <>{children}</>;
}
