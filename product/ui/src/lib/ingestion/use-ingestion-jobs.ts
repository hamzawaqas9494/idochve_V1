import { useCallback, useEffect, useRef, useState } from "react";
import { listJobs, type JobList } from "@/api";
import { jobFromRow } from "./status-map";
import type { IngestionJob } from "./types";

const POLL_MS = 5000;
const STREAM = "/api/jobs/stream.cfm?filter=all";

/**
 * Queue truth from ColdFusion SSE. Falls back to polling if the stream is unavailable.
 */
export function useIngestionJobs() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [counts, setCounts] = useState({ active: 0, review: 0, ready: 0 });
  const [canTick, setCanTick] = useState(false);
  const [queueUp, setQueueUp] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef<number | null>(null);

  const apply = useCallback((result: JobList) => {
    setJobs(result.items.map(jobFromRow));
    setCounts(result.counts);
    setCanTick(result.canTick);
    setQueueUp(Boolean(result.queue?.available));
    setError("");
    setLoaded(true);
  }, []);

  const refresh = useCallback(() => {
    return listJobs("all")
      .then(apply)
      .catch((err: Error) => {
        setError(err.message);
        setLoaded(true);
      });
  }, [apply]);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPoll = useCallback(() => {
    if (pollRef.current != null) {
      return;
    }
    void refresh();
    pollRef.current = window.setInterval(() => void refresh(), POLL_MS);
  }, [refresh]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      startPoll();
      return () => stopPoll();
    }

    let gotEvent = false;
    const source = new EventSource(STREAM, { withCredentials: true });

    const onJobs = (event: MessageEvent<string>) => {
      gotEvent = true;
      stopPoll();
      try {
        apply(JSON.parse(event.data) as JobList);
      } catch {
        setError("Job progress could not be read.");
      }
    };

    source.addEventListener("jobs", onJobs as EventListener);
    source.onerror = () => {
      if (!gotEvent) {
        source.close();
        startPoll();
      }
    };

    return () => {
      source.removeEventListener("jobs", onJobs as EventListener);
      source.close();
      stopPoll();
    };
  }, [apply, startPoll, stopPoll]);

  return { jobs, counts, canTick, queueUp, error, loaded, refresh };
}
