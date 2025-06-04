/**
 * 特定のユーザーをリセットするスクリプト
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.log('Usage: node scripts/reset-user.js <email>')
    process.exit(1)
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (user) {
      await prisma.user.delete({
        where: { id: user.id }
      })
      console.log(`User ${email} has been deleted`)
    } else {
      console.log(`User ${email} not found`)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()