/**
 * ホームページコンポーネント
 */
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">WeighCast</h1>
      <p className="text-lg text-muted-foreground">
        ようこそ、{user.email}さん
      </p>
      <form action="/auth/signout" method="post" className="mt-4">
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
