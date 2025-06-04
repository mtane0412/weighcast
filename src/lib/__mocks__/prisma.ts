/**
 * Prismaクライアントのモック
 */
export const prisma = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}