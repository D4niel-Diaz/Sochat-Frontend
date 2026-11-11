import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal stand-in for a socket.io client socket
const handlers = new Map();
const fakeSocket = {
  connected: true,
  on: vi.fn((event, fn) => handlers.set(event, [...(handlers.get(event) || []), fn])),
  off: vi.fn((event, fn) => handlers.set(event, (handlers.get(event) || []).filter((h) => h !== fn))),
  once: vi.fn((event, fn) => {
    if (event === "connect") setTimeout(fn, 0);
  }),
  emit: vi.fn(),
  timeout: vi.fn(() => fakeSocket),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn(),
  io: { on: vi.fn(), removeAllListeners: vi.fn() },
};
const fire = (event, data) => (handlers.get(event) || []).forEach((fn) => fn(data));

vi.mock("socket.io-client", () => ({ io: vi.fn(() => fakeSocket) }));

const client = await import("../../lib/socketClient");

beforeEach(async () => {
  handlers.clear();
  fakeSocket.emit.mockClear();
  client.disconnectSocket();
  const connecting = client.connectSocket("token", "me");
  fire("connect");
  await connecting;
});

describe("socketClient", () => {
  it("delivers every message for the chat regardless of order or gaps", () => {
    const received = [];
    client.onMessage(5, (m) => received.push(m.message_id));

    // The partner only ever sees the other side's messages, so ids/sequences have gaps
    fire("message", { chat_id: 5, message_id: 12 });
    fire("message", { chat_id: 5, message_id: 10 });
    fire("message", { chat_id: 9, message_id: 99 }); // other chat: ignored

    expect(received).toEqual([12, 10]);
  });

  it("rejects a send when the server does not acknowledge", async () => {
    fakeSocket.emit.mockImplementationOnce((event, payload, ack) => ack(new Error("timeout")));
    await expect(client.sendMessage(5, "hi")).rejects.toThrow(/did not respond/);
  });

  it("asks the server to rejoin the active chat", () => {
    client.setActiveChat(5);
    expect(fakeSocket.emit).toHaveBeenCalledWith("chat:rejoin", { chatId: 5 });
  });
});
