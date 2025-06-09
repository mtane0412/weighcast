/**
 * ホームダッシュボードコンポーネント
 * 体重チャート、フォーム、テーブルを統合管理
 */
"use client"

import { useState } from "react"
import { WeightChart } from "./weight-chart"
import { WeightForm } from "./weight-form"
import { WithingsUnifiedSyncButton } from "./withings-unified-sync-button"
import { HeightSettings } from "./height-settings"
import { WeightTable } from "./weight-table"

export function HomeDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleWeightAdded = () => {
    // チャートをリフレッシュするためにトリガーを更新
    setRefreshTrigger(prev => prev + 1)
  }

  const handleSyncComplete = () => {
    // 同期完了後にチャートをリフレッシュ
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <WeightChart refreshTrigger={refreshTrigger} />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <WeightForm onWeightAdded={handleWeightAdded} />
          <WithingsUnifiedSyncButton onSyncComplete={handleSyncComplete} />
          <HeightSettings />
        </div>
      </div>
      <div>
        <WeightTable refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}