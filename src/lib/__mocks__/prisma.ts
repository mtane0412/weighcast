/**
 * Prismaクライアントのモック
 */
export const prisma = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  weight: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
}