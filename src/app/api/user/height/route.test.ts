/**
 * 身長APIエンドポイントのテスト
 */
import { GET, PUT } from "./route";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

jest.mock("@/utils/supabase/server");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe("/api/user/height", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("認証されていない場合は401を返す", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "No user" },
          }),
        },
      } as ReturnType<typeof createClient>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("ユーザーの身長を返す", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { email: "test@example.com" } },
            error: null,
          }),
        },
      } as ReturnType<typeof createClient>);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        height: 170.5,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ height: 170.5 });
    });

    it("身長が設定されていない場合はnullを返す", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { email: "test@example.com" } },
            error: null,
          }),
        },
      } as ReturnType<typeof createClient>);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        height: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ height: null });
    });
  });

  describe("PUT", () => {
    it("認証されていない場合は401を返す", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "No user" },
          }),
        },
      } as ReturnType<typeof createClient>);

      const request = new NextRequest("http://localhost:3000/api/user/height", {
        method: "PUT",
        body: JSON.stringify({ height: 170 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("有効な身長で更新に成功する", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { email: "test@example.com" } },
            error: null,
          }),
        },
      } as ReturnType<typeof createClient>);

      (prisma.user.update as jest.Mock).mockResolvedValue({
        height: 175,
      });

      const request = new NextRequest("http://localhost:3000/api/user/height", {
        method: "PUT",
        body: JSON.stringify({ height: 175 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ height: 175 });
    });

    it("無効な身長値で400エラーを返す", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { email: "test@example.com" } },
            error: null,
          }),
        },
      } as ReturnType<typeof createClient>);

      const invalidHeights = [0, -10, 301, "string", null, undefined];

      for (const height of invalidHeights) {
        const request = new NextRequest("http://localhost:3000/api/user/height", {
          method: "PUT",
          body: JSON.stringify({ height }),
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid height value" });
      }
    });
  });
});