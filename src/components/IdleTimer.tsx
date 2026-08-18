"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

// 1 Hour in milliseconds
const IDLE_TIMEOUT = 60 * 60 * 1000;

export default function IdleTimer() {
  const { data: session } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      // If idle timeout reached, log the user out
      if (session) {
        signOut({ callbackUrl: `${window.location.origin}/login?idle=true` });
      }
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // Only run if the user is logged in
    if (!session) return;

    // Events that count as "activity"
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Attach event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session]);

  return null; // This component doesn't render anything
}
