import { useEffect } from "react";

export default function useSSE() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

    es.addEventListener("update", (e) => {
      try {
        const { module } = JSON.parse(e.data);
        window.dispatchEvent(new CustomEvent("sixportal:update", { detail: { module } }));
      } catch {}
    });

    es.onerror = () => {};

    return () => es.close();
  }, []);
}
