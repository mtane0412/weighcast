/**
 * 既存の体重データのソースを分析・修正するスクリプト
 * Withingsから同期されたと思われるデータを特定し、sourceを'withings'に更新
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeAndFixDataSources() {
  try {
    console.log('既存データの分析を開始...');

    // Withings連携済みユーザーを取得
    const usersWithWithings = await prisma.user.findMany({
      where: {
        withingsAccessToken: {
          not: null
        }
      },
      include: {
        weights: {
          where: {
            source: 'manual'
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });

    console.log(`Withings連携済みユーザー数: ${usersWithWithings.length}`);

    for (const user of usersWithWithings) {
      console.log(`\nユーザー ${user.id} の分析中...`);
      console.log(`現在"manual"のデータ数: ${user.weights.length}`);

      if (user.weights.length === 0) {
        console.log('  -> スキップ（データなし）');
        continue;
      }

      // Withingsから同期されたと思われるデータの特徴を分析
      const potentialWithingsData = await analyzeWeightPatterns(user.weights);

      if (potentialWithingsData.length > 0) {
        console.log(`  -> Withingsと思われるデータ: ${potentialWithingsData.length}件`);
        
        // 実際に更新するかユーザーに確認
        console.log('  -> 以下のデータをWithingsに更新します:');
        potentialWithingsData.slice(0, 5).forEach(weight => {
          console.log(`     ${weight.date.toISOString().split('T')[0]}: ${weight.value}kg`);
        });
        if (potentialWithingsData.length > 5) {
          console.log(`     ... 他 ${potentialWithingsData.length - 5}件`);
        }

        // バッチ更新
        const weightIds = potentialWithingsData.map(w => w.id);
        const updateResult = await prisma.weight.updateMany({
          where: {
            id: {
              in: weightIds
            }
          },
          data: {
            source: 'withings'
          }
        });

        console.log(`  -> ${updateResult.count}件を更新しました`);
      } else {
        console.log('  -> Withingsデータは見つかりませんでした');
      }
    }

    console.log('\n=== 最終結果 ===');
    const totalManual = await prisma.weight.count({
      where: { source: 'manual' }
    });
    const totalWithings = await prisma.weight.count({
      where: { source: 'withings' }
    });

    console.log(`手動入力: ${totalManual}件`);
    console.log(`Withings: ${totalWithings}件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 体重データのパターンを分析してWithingsから同期されたと思われるデータを特定
 */
async function analyzeWeightPatterns(weights) {
  const potentialWithingsData = [];

  // 分析ロジック:
  // 1. 連続する日付で規則的に記録されている
  // 2. 小数点以下の精度が高い（Withingsは0.1kg単位以上の精度）
  // 3. 時間間隔が一定（毎日同じような時間）
  // 4. 複数のデータポイントが存在する

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    
    // 基本的な条件：小数点以下の値があるか、連続性があるか
    const hasDecimal = weight.value % 1 !== 0;
    const isPartOfSequence = checkSequence(weights, i);
    const hasConsistentTiming = checkTimingConsistency(weights, i);

    // Withingsっぽい条件をチェック
    if (hasDecimal || isPartOfSequence || hasConsistentTiming) {
      potentialWithingsData.push(weight);
    }
  }

  return potentialWithingsData;
}

/**
 * 連続性をチェック（前後のデータとの日付間隔）
 */
function checkSequence(weights, index) {
  if (weights.length < 3) return false;

  const current = weights[index];
  const prev = weights[index - 1];
  const next = weights[index + 1];

  // 前後のデータとの日付差をチェック
  let isSequential = false;

  if (prev) {
    const daysDiff = Math.abs(
      (current.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 2) isSequential = true; // 2日以内
  }

  if (next) {
    const daysDiff = Math.abs(
      (next.date.getTime() - current.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 2) isSequential = true; // 2日以内
  }

  return isSequential;
}

/**
 * 時間の一貫性をチェック（同じ時間帯に記録されているか）
 */
function checkTimingConsistency(weights, index) {
  if (weights.length < 2) return false;

  const current = weights[index];
  const currentHour = current.date.getHours();

  // 周辺のデータと時間が近いかチェック
  const nearbyWeights = weights.slice(Math.max(0, index - 2), index + 3);
  const similarTimeCount = nearbyWeights.filter(w => 
    Math.abs(w.date.getHours() - currentHour) <= 2
  ).length;

  return similarTimeCount >= 2;
}

// スクリプト実行
if (require.main === module) {
  console.log('データソース修正スクリプトを開始します...');
  console.log('このスクリプトは既存の"manual"データを分析し、');
  console.log('Withingsから同期されたと思われるデータを"withings"に更新します。\n');
  
  analyzeAndFixDataSources()
    .then(() => {
      console.log('\nスクリプト完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('スクリプトエラー:', error);
      process.exit(1);
    });
}