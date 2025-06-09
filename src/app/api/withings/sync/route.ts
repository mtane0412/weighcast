/**
 * Withingsからすべてのデータを同期するAPIエンドポイント
 * 体重データと体組成データを統合して処理する
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getBodyCompositionMeasures, refreshAccessToken } from '@/lib/withings'

export async function POST() {
  try {
    // Supabaseで認証チェック
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser?.withingsAccessToken || !dbUser?.withingsRefreshToken) {
      return NextResponse.json({ error: 'Withings連携がされていません' }, { status: 400 })
    }

    // トークンの有効期限チェックと更新
    let accessToken = dbUser.withingsAccessToken
    const now = new Date()
    
    if (dbUser.withingsTokenExpiresAt && dbUser.withingsTokenExpiresAt <= now) {
      console.log('Withingsトークンの有効期限切れ、リフレッシュします')
      
      try {
        const newTokens = await refreshAccessToken(dbUser.withingsRefreshToken)
        
        // 新しいトークンをDBに保存
        await prisma.user.update({
          where: { id: user.id },
          data: {
            withingsAccessToken: newTokens.access_token,
            withingsRefreshToken: newTokens.refresh_token,
            withingsTokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000)
          }
        })
        
        accessToken = newTokens.access_token
      } catch (error) {
        console.error('トークンリフレッシュエラー:', error)
        return NextResponse.json({ error: 'トークンの更新に失敗しました' }, { status: 500 })
      }
    }

    // 最後の同期から現在までのデータを取得
    // 体重データと体組成データの両方から最新の日付を取得
    const [lastWeight, lastBodyComposition] = await Promise.all([
      prisma.weight.findFirst({
        where: { userId: user.id, source: 'withings' },
        orderBy: { date: 'desc' }
      }),
      prisma.bodyComposition.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
      })
    ])

    const lastWeightDate = lastWeight?.date.getTime() || 0
    const lastBodyCompositionDate = lastBodyComposition?.date.getTime() || 0
    const lastSyncTime = Math.max(lastWeightDate, lastBodyCompositionDate)

    const startdate = lastSyncTime 
      ? Math.floor(lastSyncTime / 1000) + 1 // 最後の記録の次の秒から
      : Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // なければ90日前から

    const enddate = Math.floor(Date.now() / 1000)

    console.log('Withingsデータ取得範囲:', { 
      startdate: new Date(startdate * 1000).toISOString(),
      enddate: new Date(enddate * 1000).toISOString()
    })

    // Withings APIから体組成データを取得（体重も含む）
    const measureResponse = await getBodyCompositionMeasures(accessToken, startdate, enddate)

    if (!measureResponse.body?.measuregrps) {
      return NextResponse.json({ 
        message: '新しいデータはありません',
        weightsSynced: 0,
        bodyCompositionsSynced: 0
      })
    }

    // データを体重のみと体組成データありに分類
    const weightOnlyRecords: Array<{
      userId: string;
      value: number;
      date: Date;
      source: string;
    }> = []

    const bodyCompositionRecords: Array<Record<string, unknown>> = []

    measureResponse.body.measuregrps.forEach(grp => {
      const measureTypes = grp.measures.map(m => m.type)
      const hasBodyComposition = measureTypes.some(type => [5, 6, 8, 76, 77, 88, 91, 122, 155, 226].includes(type))
      
      if (hasBodyComposition) {
        // 体組成データありの場合はBodyCompositionテーブルに保存
        const data: Record<string, unknown> = {
          userId: user.id,
          date: new Date(grp.date * 1000),
          source: 'withings',
        }

        grp.measures.forEach(measure => {
          const value = measure.value * Math.pow(10, measure.unit)
          
          switch (measure.type) {
            case 1: // 体重
              data.weight = value
              break
            case 5: // 除脂肪量
              data.fatFreeMass = value
              break
            case 6: // 体脂肪率
              data.fatRatio = value
              break
            case 8: // 脂肪量
              data.fatMass = value
              break
            case 11: // 心拍数
              data.heartRate = value
              break
            case 76: // 筋肉量
              data.muscleMass = value
              break
            case 77: // 水分量 (%)
              data.waterMass = value
              break
            case 88: // 骨量
              data.boneMass = value
              break
            case 91: // 脈波伝播速度
              data.pulseWaveVelocity = value
              break
            case 122: // 内臓脂肪
              data.visceralFat = value
              break
            case 155: // 血管年齢
              data.vascularAge = value
              break
            case 226: // 基礎代謝率
              data.basalMetabolicRate = value
              break
          }
        })

        bodyCompositionRecords.push(data)
      } else {
        // 体重のみの場合はWeightテーブルに保存
        const weightMeasure = grp.measures.find(m => m.type === 1)
        if (weightMeasure) {
          const weight = weightMeasure.value * Math.pow(10, weightMeasure.unit)
          weightOnlyRecords.push({
            userId: user.id,
            value: weight,
            date: new Date(grp.date * 1000),
            source: 'withings',
          })
        }
      }
    })

    let weightsSynced = 0
    let bodyCompositionsSynced = 0

    // 体重のみのデータを保存
    if (weightOnlyRecords.length > 0) {
      const weightResult = await prisma.weight.createMany({
        data: weightOnlyRecords,
        skipDuplicates: true
      })
      weightsSynced = weightResult.count
    }

    // 体組成データを保存
    if (bodyCompositionRecords.length > 0) {
      const bodyCompositionResult = await prisma.bodyComposition.createMany({
        data: bodyCompositionRecords,
        skipDuplicates: true
      })
      bodyCompositionsSynced = bodyCompositionResult.count
    }

    console.log(`${weightsSynced}件の体重データ、${bodyCompositionsSynced}件の体組成データを保存しました`)

    const totalSynced = weightsSynced + bodyCompositionsSynced
    const message = totalSynced > 0 
      ? `${totalSynced}件のデータを同期しました（体重: ${weightsSynced}件、体組成: ${bodyCompositionsSynced}件）`
      : '新しいデータはありません'

    return NextResponse.json({
      message,
      weightsSynced,
      bodyCompositionsSynced,
      totalSynced,
      lastSyncDate: new Date().toISOString()
    })

  } catch (error) {
    console.error('Withingsデータ同期エラー:', error)
    return NextResponse.json(
      { error: 'データの同期中にエラーが発生しました' },
      { status: 500 }
    )
  }
}