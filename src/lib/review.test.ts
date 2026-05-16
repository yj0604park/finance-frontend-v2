import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCsrfToken, toggleReviewed } from "./review";

describe("getCsrfToken", () => {
  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("returns empty string when cookie is absent", () => {
    document.cookie = "";
    expect(getCsrfToken()).toBe("");
  });

  it("extracts csrftoken from cookie string", () => {
    document.cookie = "csrftoken=abc123; sessionid=xyz";
    expect(getCsrfToken()).toBe("abc123");
  });

  it("decodes URI-encoded token", () => {
    document.cookie = "csrftoken=hello%20world";
    expect(getCsrfToken()).toBe("hello world");
  });

  it("handles csrftoken as the only cookie", () => {
    document.cookie = "csrftoken=tok";
    expect(getCsrfToken()).toBe("tok");
  });
});

describe("toggleReviewed", () => {
  it("calls the correct REST endpoint", async () => {
    // id format: base64("TransactionNode:42")
    const globalId = btoa("TransactionNode:42");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    await toggleReviewed(globalId);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/money/toggle_reviewed/42/",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );

    fetchSpy.mockRestore();
  });
});
