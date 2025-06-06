/**
 * 体重推移チャートコンポーネント
 * 指定期間の体重データをラインチャートで表示
 */
"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface WeightData {
  date: string
  value: number
}

interface WeightChartProps {
  days?: number
  refreshTrigger?: number
}

const chartConfig = {
  weight: {
    label: "体重",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function WeightChart({ days = 7, refreshTrigger = 0 }: WeightChartProps) {
  const [weights, setWeights] = useState<WeightData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const response = await fetch(`/api/weights?days=${days}`)
        if (!response.ok) {
          throw new Error('データの取得に失敗しました')
        }
        const data = await response.json()
        setWeights(data.weights)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchWeights()
  }, [days, refreshTrigger])

  const calculateTrend = () => {
    if (weights.length < 2) return null
    const firstWeight = weights[0].value
    const lastWeight = weights[weights.length - 1].value
    const difference = lastWeight - firstWeight
    const percentage = ((difference / firstWeight) * 100).toFixed(1)
    return { difference, percentage }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-muted-foreground">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (weights.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-muted-foreground">データがありません</div>
        </CardContent>
      </Card>
    )
  }

  const trend = calculateTrend()
  const minWeight = Math.min(...weights.map(w => w.value))
  const maxWeight = Math.max(...weights.map(w => w.value))
  const yAxisDomain = [
    Math.floor(minWeight - 1),
    Math.ceil(maxWeight + 1)
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>体重推移</CardTitle>
        <CardDescription>
          過去{days}日間の体重変化
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={weights}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
            />
            <YAxis
              domain={yAxisDomain}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}kg`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => `${value}kg`}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-weight)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-weight)",
                r: 4,
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      {trend && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium">
            {trend.difference > 0 ? (
              <>
                {trend.percentage}% 増加
                <TrendingUp className="h-4 w-4 text-destructive" />
              </>
            ) : (
              <>
                {Math.abs(Number(trend.percentage))}% 減少
                <TrendingDown className="h-4 w-4 text-green-600" />
              </>
            )}
          </div>
          <div className="text-muted-foreground leading-none">
            {weights[0].value}kg → {weights[weights.length - 1].value}kg
            （{trend.difference > 0 ? '+' : ''}{trend.difference.toFixed(1)}kg）
          </div>
        </CardFooter>
      )}
    </Card>
  )
}