/**
 * Prismaクライアントのモック
 */
module.exports = {
  PrismaClient: jest.fn().mockImplementation(() => {
    return {
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      weight: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    }
  }),
}