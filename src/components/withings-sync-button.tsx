/**
 * Withings過去データ同期ボタンコンポーネント
 * 過去の体重データを同期する機能を提供
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface WithingsSyncButtonProps {
  onSyncComplete?: () => void
}

export function WithingsSyncButton({ onSyncComplete }: WithingsSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/withings/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '同期に失敗しました')
      }

      setMessage(`${data.message}（${data.syncedCount}件の新しいデータを取得）`)
      
      // 同期完了後のコールバックを実行
      if (onSyncComplete) {
        onSyncComplete()
      }

    } catch (err) {
      console.error('同期エラー:', err)
      setError(err instanceof Error ? err.message : '同期に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleSync}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            同期中...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Withingsデータを同期
          </>
        )}
      </Button>

      {message && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}