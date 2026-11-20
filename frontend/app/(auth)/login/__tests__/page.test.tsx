import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  fetchOidcStatus: vi.fn(async () => ({ enabled: false })),
  login: vi.fn(),
  verifyLoginMFA: vi.fn(),
  requestLoginMFAEmail: vi.fn(),
  clearTokens: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("next/image", () => ({ default: () => null }));

vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));
vi.mock("@/lib/client-logger", () => ({ logError: vi.fn() }));
vi.mock("@/components/ui/sonner", () => ({ toast: mocks.toast }));
vi.mock("@/lib/api-client", () => ({
  login: mocks.login,
  clearTokens: mocks.clearTokens,
  isMfaChallenge: (data: { mfa_required?: boolean }) => data?.mfa_required === true,
  verifyLoginMFA: mocks.verifyLoginMFA,
  requestLoginMFAEmail: mocks.requestLoginMFAEmail,
  getOidcLoginUrl: () => "/oidc/login",
  fetchOidcStatus: mocks.fetchOidcStatus,
  restoreAuthCookies: vi.fn(async () => false),
}));

import { resolveRedirectPath } from "@/lib/auth-redirect";
import LoginPage from "../page";

const REMEMBER_KEY = "npa_ecm_remember_me";

// jsdom under Node 22 loses the bare `localStorage` global, so install a
// deterministic store on window the way the auth tests do.
const installStorage = (): Storage => {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  return storage;
};

let storage: Storage;

beforeEach(() => {
  storage = installStorage();
  window.history.replaceState({}, "", "/login");
  mocks.searchParams = new URLSearchParams();
  mocks.login.mockReset();
  mocks.verifyLoginMFA.mockReset();
  mocks.requestLoginMFAEmail.mockReset();
  mocks.clearTokens.mockReset();
  mocks.toast.error.mockReset();
});

afterEach(() => cleanup());

describe("LoginPage", () => {
  it("keeps the standard sign-in form without demo persona credentials", async () => {
    render(<LoginPage />);

    expect(await screen.findByLabelText("Username")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByText("Remember username")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect((screen.getByLabelText("Username") as HTMLInputElement).required).toBe(true);
    expect(screen.queryByText("Select a demo persona")).toBeNull();
    expect(screen.queryByText("Choose grade level / role")).toBeNull();
    expect(document.body.textContent).not.toContain("demo");
    expect(document.body.textContent).not.toContain("ChangeMe123!");
  });

  it("prefills a previously remembered username", async () => {
    storage.setItem(REMEMBER_KEY, JSON.stringify({ username: "md" }));

    render(<LoginPage />);

    expect(await screen.findByLabelText("Username")).toHaveProperty("value", "md");
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  });

  it("remembers the username after an MFA challenge instead of dropping it", async () => {
    // jsdom cannot stub location; the redirect attempt logs a notice instead.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.login.mockResolvedValue({
      mfa_required: true,
      challenge_id: "challenge-1",
      methods: ["totp"],
      expires_in: 300,
    });
    mocks.verifyLoginMFA.mockResolvedValue({ detail: "Signed in." });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "  md  ");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByLabelText("Verification code")).toBeTruthy();
    expect(mocks.login).toHaveBeenCalledWith("md", "secret");

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));

    await waitFor(() =>
      expect(JSON.parse(storage.getItem(REMEMBER_KEY) || "null")).toEqual({ username: "md" }),
    );
    expect(mocks.verifyLoginMFA).toHaveBeenCalledWith("challenge-1", "123456", "totp");
    consoleError.mockRestore();
  });
});

describe("single sign-on errors", () => {
  it("shows the failure but removes it from the URL", async () => {
    window.history.replaceState({}, "", "/login?sso_error=Access%20denied");
    mocks.searchParams = new URLSearchParams("sso_error=Access denied");

    render(<LoginPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("Access denied");
    expect(window.location.search).not.toContain("sso_error");
  });
});

describe("MFA back navigation", () => {
  it("returns to the credential form without clearing the session", async () => {
    mocks.login.mockResolvedValue({
      mfa_required: true,
      challenge_id: "challenge-1",
      methods: ["email"],
      expires_in: 300,
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(await screen.findByLabelText("Username"), "md");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Back to sign in" }));

    expect(await screen.findByLabelText("Username")).toBeTruthy();
    expect(mocks.clearTokens).not.toHaveBeenCalled();
  });
});

describe("email MFA code", () => {
  it("disables the send button while the request is pending", async () => {
    let finishSend!: () => void;
    mocks.login.mockResolvedValue({
      mfa_required: true,
      challenge_id: "challenge-1",
      methods: ["email"],
      expires_in: 300,
    });
    mocks.requestLoginMFAEmail.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishSend = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(await screen.findByLabelText("Username"), "md");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const send = await screen.findByRole("button", { name: "Send code to my email" });
    await user.click(send);
    await user.click(send);

    expect(mocks.requestLoginMFAEmail).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending…" })).toHaveProperty("disabled", true);

    finishSend();

    expect(await screen.findByRole("button", { name: "Resend email code" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});

describe("login failures", () => {
  const submitCredentials = async (password: string) => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(await screen.findByLabelText("Username"), "md");
    await user.type(screen.getByLabelText("Password"), password);
    await user.click(screen.getByRole("button", { name: "Continue" }));
  };

  it("keeps an existing session when the password is simply wrong", async () => {
    mocks.login.mockRejectedValue(new Error("Invalid username or password"));

    await submitCredentials("wrong-password");

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith("Invalid username or password"),
    );
    expect(mocks.clearTokens).not.toHaveBeenCalled();
  });

  it("leaves an existing session alone when the sign-in request fails unexpectedly", async () => {
    mocks.login.mockRejectedValue(new Error("Login failed"));

    await submitCredentials("secret");

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Login failed"));
    expect(mocks.clearTokens).not.toHaveBeenCalled();
  });
});

describe("resolveRedirectPath", () => {
  it("keeps an allowed in-app path with its query string", () => {
    expect(resolveRedirectPath("/dms?tab=forms&segment=submissions")).toBe(
      "/dms?tab=forms&segment=submissions",
    );
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example/dashboard",
    "/dashboard/../../admin",
    "/login?redirect=/inbox",
  ])("rejects %s", (candidate) => {
    expect(resolveRedirectPath(candidate)).toBe("/dashboard");
  });

  it("falls back for unknown routes", () => {
    expect(resolveRedirectPath("/not-a-real-route")).toBe("/dashboard");
    expect(resolveRedirectPath(null)).toBe("/dashboard");
  });
});
