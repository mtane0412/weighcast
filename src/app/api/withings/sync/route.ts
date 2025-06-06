/**
 * Withings過去データ同期API
 * 過去の体重データを取得してデータベースに保存（重複回避）
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { getWeightMeasures, refreshAccessToken } from '@/lib/withings'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // データベースからユーザー情報を取得
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser || !dbUser.withingsUserId || !dbUser.withingsAccessToken) {
      return NextResponse.json({ 
        error: 'Withings連携が必要です' 
      }, { status: 400 })
    }

    let accessToken = dbUser.withingsAccessToken

    // トークンの有効期限をチェック
    if (dbUser.withingsTokenExpiresAt && new Date() > dbUser.withingsTokenExpiresAt) {
      if (!dbUser.withingsRefreshToken) {
        return NextResponse.json({ 
          error: 'Withingsの再認証が必要です' 
        }, { status: 400 })
      }

      // トークンを更新
      const tokenResponse = await refreshAccessToken(dbUser.withingsRefreshToken)
      accessToken = tokenResponse.access_token
      
      // 更新されたトークンをDBに保存
      await prisma.user.update({
        where: { id: user.id },
        data: {
          withingsAccessToken: tokenResponse.access_token,
          withingsRefreshToken: tokenResponse.refresh_token,
          withingsTokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        }
      })
    }

    // 最新の体重データの日付を取得（重複回避のため）
    const latestWeight = await prisma.weight.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    })

    // 開始日を設定（最新データの翌日から、または30日前から）
    const startDate = latestWeight 
      ? new Date(latestWeight.date.getTime() + 24 * 60 * 60 * 1000) // 翌日
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30日前

    const endDate = new Date()

    console.log('Withings同期範囲:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      latestWeightDate: latestWeight?.date?.toISOString()
    })

    // 開始日が現在より未来の場合は同期不要
    if (startDate > endDate) {
      return NextResponse.json({ 
        message: '同期するデータがありません',
        syncedCount: 0 
      })
    }

    // Withings APIから体重データを取得
    const measureResponse = await getWeightMeasures(
      accessToken,
      Math.floor(startDate.getTime() / 1000),
      Math.floor(endDate.getTime() / 1000)
    )

    let syncedCount = 0

    if (measureResponse.body.measuregrps && measureResponse.body.measuregrps.length > 0) {
      // 体重データ（type: 1）を抽出して保存
      for (const group of measureResponse.body.measuregrps) {
        const weightMeasure = group.measures.find(m => m.type === 1)
        
        if (weightMeasure) {
          const weightValue = weightMeasure.value * Math.pow(10, weightMeasure.unit)
          const measureDate = new Date(group.date * 1000)

          // 重複チェック（同じ日付のデータが既に存在するかチェック）
          const existingWeight = await prisma.weight.findFirst({
            where: {
              userId: user.id,
              date: {
                gte: new Date(measureDate.getFullYear(), measureDate.getMonth(), measureDate.getDate()),
                lt: new Date(measureDate.getFullYear(), measureDate.getMonth(), measureDate.getDate() + 1)
              }
            }
          })

          if (!existingWeight) {
            await prisma.weight.create({
              data: {
                userId: user.id,
                value: weightValue,
                date: measureDate
              }
            })
            syncedCount++
          } else {
            console.log('重複データをスキップ:', {
              date: measureDate.toISOString(),
              value: weightValue
            })
          }
        }
      }
    }

    console.log('Withings同期完了:', {
      syncedCount,
      totalGroups: measureResponse.body.measuregrps?.length || 0
    })

    return NextResponse.json({
      message: '同期が完了しました',
      syncedCount
    })

  } catch (error) {
    console.error('Withings同期エラー:', error)
    return NextResponse.json(
      { error: 'データ同期に失敗しました' },
      { status: 500 }
    )
  }
}