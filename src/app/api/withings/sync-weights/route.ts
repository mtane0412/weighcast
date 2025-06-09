/**
 * Withingsから体重データを同期するAPIエンドポイント
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getWeightMeasures, refreshAccessToken } from '@/lib/withings'

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
    const lastWeight = await prisma.weight.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    })

    const startdate = lastWeight 
      ? Math.floor(lastWeight.date.getTime() / 1000) + 1 // 最後の記録の次の秒から
      : Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // なければ90日前から

    const enddate = Math.floor(Date.now() / 1000)

    console.log('体重データ取得範囲:', { 
      startdate: new Date(startdate * 1000).toISOString(),
      enddate: new Date(enddate * 1000).toISOString()
    })

    // Withings APIから体重データを取得
    const measureResponse = await getWeightMeasures(accessToken, startdate, enddate)

    if (!measureResponse.body?.measuregrps) {
      return NextResponse.json({ 
        message: '新しい体重データはありません',
        syncedCount: 0
      })
    }

    // 体重データを変換して保存
    const weightRecords = measureResponse.body.measuregrps
      .filter(grp => grp.measures.some(m => m.type === 1)) // type 1 = 体重
      .map(grp => {
        const weightMeasure = grp.measures.find(m => m.type === 1)!
        const weight = weightMeasure.value * Math.pow(10, weightMeasure.unit)
        
        return {
          userId: user.id,
          value: weight,
          date: new Date(grp.date * 1000),
          source: 'withings',
        }
      })

    if (weightRecords.length === 0) {
      return NextResponse.json({ 
        message: '新しい体重データはありません',
        syncedCount: 0
      })
    }

    // バッチで挿入（重複は無視）
    const result = await prisma.weight.createMany({
      data: weightRecords,
      skipDuplicates: true
    })

    console.log(`${result.count}件の体重データを保存しました`)

    return NextResponse.json({
      message: `${result.count}件の体重データを同期しました`,
      syncedCount: result.count,
      lastSyncDate: new Date().toISOString()
    })

  } catch (error) {
    console.error('体重データ同期エラー:', error)
    return NextResponse.json(
      { error: '体重データの同期中にエラーが発生しました' },
      { status: 500 }
    )
  }
}