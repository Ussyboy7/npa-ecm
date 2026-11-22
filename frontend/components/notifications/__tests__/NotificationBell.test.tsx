import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getUnreadCount: vi.fn() }));
const socket = vi.hoisted(() => ({
  isConnected: true,
  sendMessage: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/hooks/use-notification-websocket", () => ({
  useNotificationWebSocket: () => ({
    isConnected: socket.isConnected,
    sendMessage: socket.sendMessage,
  }),
}));

vi.mock("@/lib/api/notifications", () => ({ getUnreadCount: api.getUnreadCount }));

import { NotificationBell } from "../NotificationBell";

beforeEach(() => {
  socket.isConnected = true;
  socket.sendMessage.mockClear();
  api.getUnreadCount.mockReset();
  api.getUnreadCount.mockResolvedValue(3);
});

afterEach(() => cleanup());

describe("NotificationBell unread count", () => {
  it("does not ask the socket again when it is already connected", () => {
    render(<NotificationBell />);

    expect(socket.sendMessage).not.toHaveBeenCalled();
    expect(api.getUnreadCount).not.toHaveBeenCalled();
  });

  it("falls back to a single REST read while the socket is disconnected", async () => {
    socket.isConnected = false;

    render(<NotificationBell />);

    await waitFor(() => expect(api.getUnreadCount).toHaveBeenCalledTimes(1));
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });
});
