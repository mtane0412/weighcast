/**
 * Withingsから体組成データを同期するAPIエンドポイント
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getBodyCompositionMeasures, refreshAccessToken } from '@/lib/withings'

export async function GET() {
  console.log('=== 体組成データ同期API GET テスト ===')
  return NextResponse.json({ message: 'GET endpoint working' })
}

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
    const lastBodyComposition = await prisma.bodyComposition.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    })

    const startdate = lastBodyComposition 
      ? Math.floor(lastBodyComposition.date.getTime() / 1000) + 1 // 最後の記録の次の秒から
      : Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // なければ90日前から

    const enddate = Math.floor(Date.now() / 1000)

    console.log('体組成データ取得範囲:', { 
      startdate: new Date(startdate * 1000).toISOString(),
      enddate: new Date(enddate * 1000).toISOString()
    })

    // Withings APIから体組成データを取得
    const measureResponse = await getBodyCompositionMeasures(accessToken, startdate, enddate)

    if (!measureResponse.body?.measuregrps) {
      return NextResponse.json({ 
        message: '新しい体組成データはありません',
        syncedCount: 0
      })
    }

    // 体組成データを変換して保存
    const bodyCompositionRecords = measureResponse.body.measuregrps
      .map(grp => {
        const data: Record<string, unknown> = {
          userId: user.id,
          date: new Date(grp.date * 1000),
          source: 'withings',
        }

        // 各測定データを対応するフィールドに変換
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
            case 77: // 水分量
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

        return data
      })
      .filter(record => Object.keys(record).length > 4) // userId, date, source以外にデータがあるもの

    if (bodyCompositionRecords.length === 0) {
      return NextResponse.json({ 
        message: '新しい体組成データはありません',
        syncedCount: 0
      })
    }

    // バッチで挿入（重複は無視）
    const result = await prisma.bodyComposition.createMany({
      data: bodyCompositionRecords,
      skipDuplicates: true
    })

    console.log(`${result.count}件の体組成データを保存しました`)

    return NextResponse.json({
      message: `${result.count}件の体組成データを同期しました`,
      syncedCount: result.count,
      lastSyncDate: new Date().toISOString()
    })

  } catch (error) {
    console.error('体組成データ同期エラー:', error)
    return NextResponse.json(
      { error: '体組成データの同期中にエラーが発生しました' },
      { status: 500 }
    )
  }
}