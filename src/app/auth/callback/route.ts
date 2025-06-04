/**
 * Supabase認証コールバックハンドラー
 * Twitch OAuthログイン後、ユーザー情報をデータベースに保存する
 */
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getTwitchUser } from '@/lib/twitch'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      // Twitchユーザー情報を取得
      const providerToken = data.session.provider_token
      const authUser = data.session.user
      
      // デバッグログ
      console.log('Auth callback - Session data:', {
        hasProviderToken: !!providerToken,
        provider: authUser.app_metadata.provider,
        userId: authUser.id,
        email: authUser.email,
        identities: authUser.identities,
        userMetadata: authUser.user_metadata,
      })
      
      // Twitchプロバイダーからのログインの場合
      if (authUser.app_metadata.provider === 'twitch') {
        // Supabaseのuser_metadataから直接Twitch情報を取得
        const twitchMetadata = authUser.user_metadata
        
        // identitiesからもTwitch情報を取得できる可能性がある
        const twitchIdentity = authUser.identities?.find(id => id.provider === 'twitch')
        
        console.log('Auth callback - Twitch metadata:', twitchMetadata)
        console.log('Auth callback - Twitch identity:', twitchIdentity)
        
        try {
          // ユーザー情報をデータベースに保存または更新
          const savedUser = await prisma.user.upsert({
            where: { id: authUser.id },
            update: {
              email: authUser.email,
              twitchId: twitchIdentity?.identity_data?.provider_id || twitchMetadata?.provider_id,
              twitchUsername: twitchMetadata?.preferred_username || twitchMetadata?.name,
              twitchDisplayName: twitchMetadata?.name || twitchMetadata?.full_name,
              twitchProfileImage: twitchMetadata?.avatar_url || twitchMetadata?.picture,
            },
            create: {
              id: authUser.id,
              email: authUser.email,
              twitchId: twitchIdentity?.identity_data?.provider_id || twitchMetadata?.provider_id,
              twitchUsername: twitchMetadata?.preferred_username || twitchMetadata?.name,
              twitchDisplayName: twitchMetadata?.name || twitchMetadata?.full_name,
              twitchProfileImage: twitchMetadata?.avatar_url || twitchMetadata?.picture,
            },
          })
          console.log('Auth callback - User saved successfully:', savedUser)
        } catch (error) {
          console.error('Auth callback - Failed to save user to database:', error)
        }
      } else {
        console.log('Auth callback - Not a Twitch provider')
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}