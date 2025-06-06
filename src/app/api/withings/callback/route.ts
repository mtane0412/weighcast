/**
 * Withings OAuth認証コールバックエンドポイント
 * 認証コードをトークンに交換し、ユーザー情報を保存する
 */
import { NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/withings'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  console.log('Withings callback開始 - URL:', request.url)
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    console.log('Withings callback - パラメータ:', { code: !!code, error, state })

    if (error) {
      console.error('Withings認証エラー:', error)
      return NextResponse.redirect(new URL('/?withings_error=auth_denied', request.url))
    }

    if (!code) {
      console.error('Withings認証コードが見つかりません')
      return NextResponse.redirect(new URL('/?withings_error=no_code', request.url))
    }

    console.log('ユーザー認証チェック開始')
    // ユーザーがログインしているかチェック
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('ユーザーがログインしていません')
      return NextResponse.redirect(new URL('/login?withings_error=not_logged_in', request.url))
    }

    console.log('ユーザー認証OK - ユーザーID:', user.id)
    console.log('Withingsトークン交換開始 - コード:', code.substring(0, 10) + '...')

    // 認証コードをトークンに交換
    const tokenData = await exchangeCodeForToken(code)
    console.log('Withingsトークン取得成功:', {
      userid: tokenData.userid,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    })
    
    // トークンの有効期限を計算
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    console.log('データベース更新開始')
    // データベースにWithings情報を保存
    await prisma.user.update({
      where: { id: user.id },
      data: {
        withingsUserId: tokenData.userid,
        withingsAccessToken: tokenData.access_token,
        withingsRefreshToken: tokenData.refresh_token,
        withingsTokenExpiresAt: expiresAt,
      },
    })

    console.log('Withings認証成功:', {
      userId: user.id,
      withingsUserId: tokenData.userid,
      expiresAt: expiresAt.toISOString(),
    })

    // 初回の体重データ同期を実行
    try {
      console.log('初回体重データ同期を開始')
      const syncResponse = await fetch(new URL('/api/withings/sync-weights', request.url).toString(), {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        console.log('初回同期成功:', syncData)
      } else {
        console.error('初回同期失敗:', await syncResponse.text())
      }
    } catch (syncError) {
      console.error('初回同期エラー:', syncError)
      // 同期エラーがあっても連携自体は成功しているので続行
    }

    // メインページにリダイレクト
    return NextResponse.redirect(new URL('/?withings_success=connected', request.url))
  } catch (error) {
    console.error('Withingsコールバックエラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return NextResponse.redirect(new URL('/?withings_error=callback_failed', request.url))
  }
}