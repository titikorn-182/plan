import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotifications } from "@/features/notifications/queries";
import { getUnreadNotificationCount } from "@/lib/auth/unread-notifications";
import { getViewer } from "@/lib/auth/viewer";

type QueryError = { code: string; message: string };
type CountResult = { count: number | null; error: QueryError | null };

const request = vi.hoisted(() => ({ current: new Map<unknown, Map<string, unknown>>() }));

// Unit tests run outside RSC. Give each simulated render its own React cache scope.
vi.mock("react", () => ({
  cache:
    <Args extends unknown[], Result>(fn: (...args: Args) => Result) =>
    (...args: Args): Result => {
      let calls = request.current.get(fn);
      if (!calls) {
        calls = new Map();
        request.current.set(fn, calls);
      }
      const key = JSON.stringify(args);
      if (!calls.has(key)) calls.set(key, fn(...args));
      return calls.get(key) as Result;
    },
}));

const mock = vi.hoisted(() => {
  const unread = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn<() => Promise<CountResult>>(),
  };
  const list = {
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  const notifications = {
    select: vi.fn((_columns: string, options?: { head?: boolean }) =>
      options?.head ? unread : list,
    ),
  };
  const profile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  const roles = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  };
  const auth = { getClaims: vi.fn() };
  const client = {
    auth,
    from: vi.fn((table: string) => {
      if (table === "notifications") return notifications;
      if (table === "profiles") return profile;
      if (table === "user_roles") return roles;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  return { unread, list, notifications, profile, roles, auth, client };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

describe("notification queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.current = new Map();
    mock.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "viewer-id", email: "viewer@example.test" } },
      error: null,
    });
    mock.profile.maybeSingle.mockResolvedValue({
      data: { full_name: "Viewer", email: "viewer@example.test", is_active: true },
      error: null,
    });
    mock.roles.eq.mockResolvedValue({
      data: [{ role: "staff", active_from: null, active_until: null }],
      error: null,
    });
    mock.unread.is.mockResolvedValue({ count: 4, error: null });
    mock.list.range.mockResolvedValue({ data: [], count: 21, error: null });
  });

  it("shares one recipient-scoped count between a concurrent layout and notifications page", async () => {
    const [viewer, notifications] = await Promise.all([getViewer(), getNotifications(2)]);

    expect(viewer.unreadNotifications).toBe(4);
    expect(notifications).toMatchObject({
      data: { unreadCount: 4, pagination: { page: 2, total: 21, totalPages: 2 } },
      error: null,
    });
    expect(mock.unread.is).toHaveBeenCalledExactlyOnceWith("read_at", null);
    expect(mock.unread.eq).toHaveBeenCalledExactlyOnceWith("recipient_id", "viewer-id");
    expect(mock.notifications.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(mock.list.range).toHaveBeenCalledExactlyOnceWith(20, 39);
    expect(mock.auth.getClaims).toHaveBeenCalledTimes(1);
  });

  it("keeps distinct recipient counts separate within a render", async () => {
    mock.unread.is
      .mockResolvedValueOnce({ count: 4, error: null })
      .mockResolvedValueOnce({ count: 8, error: null });

    const first = await getUnreadNotificationCount("first-recipient");
    const second = await getUnreadNotificationCount("second-recipient");

    expect(first.count).toBe(4);
    expect(second.count).toBe(8);
    expect(mock.unread.eq.mock.calls).toEqual([
      ["recipient_id", "first-recipient"],
      ["recipient_id", "second-recipient"],
    ]);
  });

  it("reloads the unread count in a new request", async () => {
    expect((await getNotifications()).data.unreadCount).toBe(4);
    request.current = new Map();
    mock.unread.is.mockResolvedValue({ count: 1, error: null });

    expect((await getNotifications()).data.unreadCount).toBe(1);
    expect(mock.unread.is).toHaveBeenCalledTimes(2);
  });

  it("preserves a count failure for the notifications page after the shell uses its fallback", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.unread.is.mockResolvedValue({
      count: null,
      error: { code: "42501", message: "private database detail" },
    });

    expect((await getViewer()).unreadNotifications).toBe(0);
    const notifications = await getNotifications();

    expect(notifications.error).toBeTruthy();
    expect(notifications.error).not.toContain("private database detail");
    expect(mock.unread.is).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "[application-error]",
      expect.stringContaining('"operation":"notifications.list"'),
    );
  });

  it("still reports list failures when the shared count succeeds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.list.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: "42501", message: "list denied" },
    });

    const notifications = await getNotifications();

    expect(notifications.error).toBeTruthy();
    expect(notifications.data.items).toEqual([]);
    expect(notifications.data.unreadCount).toBe(4);
  });

  it("retains the login redirect before loading an unauthenticated viewer's count", async () => {
    mock.auth.getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    await expect(getNotifications()).rejects.toThrow("redirect:/login");
    expect(mock.unread.is).not.toHaveBeenCalled();
  });
});
