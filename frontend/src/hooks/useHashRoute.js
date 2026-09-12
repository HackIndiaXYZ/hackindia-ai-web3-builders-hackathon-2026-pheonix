import { useState, useEffect } from "react";

export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || "/dashboard");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || "/dashboard");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export function navigate(path) {
  window.location.hash = path;
}

export function parseRoute(route) {
  const parts = route.split("/").filter(Boolean);
  return { path: "/" + (parts[0] || "dashboard"), rest: parts.slice(1).join("/") };
}
