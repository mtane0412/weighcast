/**
 * Withings OAuth認証開始エンドポイント
 * ユーザーをWithingsの認証ページにリダイレクトする
 */
import { NextResponse } from 'next/server'
import { getWithingsAuthUrl } from '@/lib/withings'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    // ユーザーがログインしているかチェック
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // Withings認証URLにリダイレクト
    const authUrl = getWithingsAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Withings認証エラー:', error)
    return NextResponse.json(
      { error: 'Withings認証の開始に失敗しました' },
      { status: 500 }
    )
  }
}