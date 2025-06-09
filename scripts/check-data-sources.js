/**
 * データソースの分布を確認するスクリプト
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataSources() {
  try {
    console.log('=== データソース分布の確認 ===\n');

    // 全体の統計
    const totalWeights = await prisma.weight.count();
    const manualCount = await prisma.weight.count({
      where: { source: 'manual' }
    });
    const withingsCount = await prisma.weight.count({
      where: { source: 'withings' }
    });

    console.log(`総データ数: ${totalWeights}件`);
    console.log(`手動入力: ${manualCount}件 (${((manualCount/totalWeights)*100).toFixed(1)}%)`);
    console.log(`Withings: ${withingsCount}件 (${((withingsCount/totalWeights)*100).toFixed(1)}%)`);

    // ユーザー別の詳細
    const users = await prisma.user.findMany({
      include: {
        weights: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });

    for (const user of users) {
      if (user.weights.length > 0) {
        console.log(`\n--- ユーザー ${user.twitchUsername || user.email || user.id} ---`);
        console.log('最新10件のデータ:');
        user.weights.forEach(weight => {
          console.log(`  ${weight.date.toISOString().split('T')[0]}: ${weight.value}kg (${weight.source})`);
        });
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataSources();