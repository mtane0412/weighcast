/**
 * Prismaクライアントのシングルトンインスタンス
 * Next.jsの開発環境でホットリロード時に複数のインスタンスが作成されることを防ぐ
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma