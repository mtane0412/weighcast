/**
 * ホームページコンポーネント
 * ログインユーザーのTwitchアイコンとdisplay nameを表示
 */
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // データベースからユーザー情報を取得
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  })
  
  console.log('HomePage - Auth user:', {
    id: user.id,
    email: user.email,
    appMetadata: user.app_metadata,
    userMetadata: user.user_metadata,
  })
  console.log('HomePage - DB user:', dbUser)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">WeighCast</h1>
      
      <div className="flex items-center gap-4 mb-8">
        {dbUser?.twitchProfileImage && (
          <Image
            src={dbUser.twitchProfileImage}
            alt={dbUser.twitchDisplayName || 'Profile'}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div>
          <p className="text-xl font-semibold">
            {dbUser?.twitchDisplayName || 'ゲスト'}
          </p>
          {dbUser?.twitchUsername && (
            <p className="text-sm text-muted-foreground">
              @{dbUser.twitchUsername}
            </p>
          )}
        </div>
      </div>
      
      <form action="/auth/signout" method="post">
        <button
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          type="submit"
        >
          ログアウト
        </button>
      </form>
    </div>
  )
}
