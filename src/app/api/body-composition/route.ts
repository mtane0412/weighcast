/**
 * 体組成データ取得APIエンドポイント
 * 指定期間の体組成データを返す（デフォルト: 1週間）
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '7')
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // 体重データと体組成データを並行取得
    const [weights, bodyCompositions] = await Promise.all([
      prisma.weight.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'desc'
        }
      }),
      prisma.bodyComposition.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'desc'
        }
      })
    ])

    // 体組成データの日時を取得して重複チェック用のSetを作成
    const bodyCompositionDates = new Set(
      bodyCompositions.map(bc => bc.date.toISOString())
    )

    // 体重データをフォーマット（体組成データと重複しないもののみ）
    const formattedWeights = weights
      .filter(weight => !bodyCompositionDates.has(weight.date.toISOString()))
      .map(weight => ({
        id: weight.id,
        date: weight.date.toISOString().split('T')[0],
        datetime: weight.date.toISOString(),
        type: 'weight' as const,
        weight: Number(weight.value),
        source: weight.source
      }))

    // 体組成データをフォーマット
    const formattedBodyCompositions = bodyCompositions.map(bc => ({
      id: bc.id,
      date: bc.date.toISOString().split('T')[0],
      datetime: bc.date.toISOString(),
      type: 'bodyComposition' as const,
      weight: bc.weight ? Number(bc.weight) : null,
      fatMass: bc.fatMass ? Number(bc.fatMass) : null,
      fatFreeMass: bc.fatFreeMass ? Number(bc.fatFreeMass) : null,
      muscleMass: bc.muscleMass ? Number(bc.muscleMass) : null,
      boneMass: bc.boneMass ? Number(bc.boneMass) : null,
      waterMass: bc.waterMass ? Number(bc.waterMass) : null,
      fatRatio: bc.fatRatio ? Number(bc.fatRatio) : null,
      heartRate: bc.heartRate ? Number(bc.heartRate) : null,
      pulseWaveVelocity: bc.pulseWaveVelocity ? Number(bc.pulseWaveVelocity) : null,
      vascularAge: bc.vascularAge ? Number(bc.vascularAge) : null,
      visceralFat: bc.visceralFat ? Number(bc.visceralFat) : null,
      basalMetabolicRate: bc.basalMetabolicRate ? Number(bc.basalMetabolicRate) : null,
      source: bc.source
    }))

    // 日時順にソートして統合
    const allData = [...formattedWeights, ...formattedBodyCompositions]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

    return NextResponse.json({ 
      data: allData,
      weights: formattedWeights,
      bodyCompositions: formattedBodyCompositions
    })
  } catch (error) {
    console.error('Error fetching body composition data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}