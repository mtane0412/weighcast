/**
 * データベース内のユーザー情報を確認するスクリプト
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany()
    console.log('Total users:', users.length)
    console.log('\nUser details:')
    users.forEach(user => {
      console.log({
        id: user.id,
        email: user.email,
        twitchDisplayName: user.twitchDisplayName,
        twitchUsername: user.twitchUsername,
        hasTwitchData: !!(user.twitchId && user.twitchDisplayName),
        twitchProfileImage: user.twitchProfileImage
      })
    })
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()