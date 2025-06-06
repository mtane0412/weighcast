/**
 * 体重入力フォームコンポーネント
 * 体重データを入力・保存する
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface WeightFormProps {
  onWeightAdded?: () => void
}

export function WeightForm({ onWeightAdded }: WeightFormProps) {
  const [weight, setWeight] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const weightValue = parseFloat(weight)
      if (isNaN(weightValue) || weightValue <= 0) {
        setError('有効な体重を入力してください')
        setLoading(false)
        return
      }

      const response = await fetch('/api/weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: weightValue,
          date: date,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '体重の保存に失敗しました')
      }

      setWeight("")
      setDate(new Date().toISOString().split('T')[0])
      setSuccess(true)
      
      if (onWeightAdded) {
        onWeightAdded()
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>体重を記録</CardTitle>
        <CardDescription>
          新しい体重データを入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">体重 (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70.5"
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              体重データを保存しました
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !weight || !date}
            className="w-full"
          >
            {loading ? '保存中...' : '体重を記録'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}