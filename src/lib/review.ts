/**
 * Shared utilities for the transaction review flow.
 */

export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function toggleReviewed(pk: string): Promise<void> {
  const numericId = atob(pk).split(":")[1];
  await fetch(`/money/toggle_reviewed/${numericId}/`, {
    method: "GET",
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}
