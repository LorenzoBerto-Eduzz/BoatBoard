export async function loadRuntimeContext() {
  try {
    const response = await fetch("/api/runtime", { cache: "no-store" });
    if (response.ok) return response.json();
  } catch {
    // Hosted/static deployments are public-facing unless their adapter explicitly reports otherwise.
  }
  return { mode: "production" };
}
