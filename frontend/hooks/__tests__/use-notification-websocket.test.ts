import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const restoreAuthCookies = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ restoreAuthCookies }));
vi.mock('@/lib/client-logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));
vi.mock('../use-current-user', () => ({
  useCurrentUser: () => ({ currentUser: null }),
}));

import {
  NOTIFICATION_WS_AUTH_CLOSE_CODE,
  NOTIFICATION_WS_RECONNECT_DELAY_MS,
} from '@/lib/constants';
import { WebSocketManager } from '../use-notification-websocket';

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  readonly url: string;
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: '', wasClean: true } as CloseEvent);
  }

  /** Simulate the consumer ending the handshake with a given close code. */
  serverClose(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: true } as CloseEvent);
  }
}

const user = { id: 'user-1', name: 'Amina Yusuf' } as Parameters<WebSocketManager['connect']>[0];

describe('WebSocketManager 4001 recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    restoreAuthCookies.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('refreshes cookies on 4001 and retries exactly once', async () => {
    restoreAuthCookies.mockResolvedValue(true);
    const manager = new WebSocketManager();

    manager.connect(user);
    expect(FakeWebSocket.instances).toHaveLength(1);

    FakeWebSocket.instances[0].serverClose(NOTIFICATION_WS_AUTH_CLOSE_CODE);
    expect(restoreAuthCookies).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(NOTIFICATION_WS_RECONNECT_DELAY_MS);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // The retry is a single attempt: nothing else opens while that socket is
    // pending, so a failed handshake cannot spin the reconnect loop.
    await vi.advanceTimersByTimeAsync(NOTIFICATION_WS_RECONNECT_DELAY_MS * 10);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(restoreAuthCookies).toHaveBeenCalledTimes(1);
  });

  it('stops instead of looping when the cookie refresh fails', async () => {
    restoreAuthCookies.mockResolvedValue(false);
    const manager = new WebSocketManager();

    manager.connect(user);
    FakeWebSocket.instances[0].serverClose(NOTIFICATION_WS_AUTH_CLOSE_CODE);

    await vi.advanceTimersByTimeAsync(NOTIFICATION_WS_RECONNECT_DELAY_MS * 5);

    expect(restoreAuthCookies).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);

    // The exhausted session stays closed: no socket is opened until the
    // caller explicitly disconnects and a new sign-in starts.
    manager.connect(user);
    await vi.advanceTimersByTimeAsync(NOTIFICATION_WS_RECONNECT_DELAY_MS * 5);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(restoreAuthCookies).toHaveBeenCalledTimes(1);
  });

  it('reconnects again after disconnect resets the retry budget', async () => {
    restoreAuthCookies.mockResolvedValue(false);
    const manager = new WebSocketManager();

    manager.connect(user);
    FakeWebSocket.instances[0].serverClose(NOTIFICATION_WS_AUTH_CLOSE_CODE);
    await vi.advanceTimersByTimeAsync(NOTIFICATION_WS_RECONNECT_DELAY_MS * 5);
    expect(FakeWebSocket.instances).toHaveLength(1);

    manager.disconnect();
    manager.connect(user);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
