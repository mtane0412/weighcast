/**
 * ログインページコンポーネント
 * Twitchアカウントでのログインのみをサポート
 */
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleTwitchLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitch',
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      if (error instanceof Error) {
        setError('ログインに失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>WeighCast</CardTitle>
          <CardDescription>
            Twitchアカウントでログイン
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            WeighCastを利用するには、Twitchアカウントでログインしてください。
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="w-full"
            onClick={handleTwitchLogin}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : 'Twitchでログイン'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}