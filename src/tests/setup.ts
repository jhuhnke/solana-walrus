// src/tests/setup.ts

// Mock the fetch API to avoid hitting the real Astros API
import { jest } from "@jest/globals";

beforeAll(() => {
    global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ gasFree: true }),
    })) as unknown as typeof fetch;
});

afterAll(() => {
    jest.restoreAllMocks();
});
