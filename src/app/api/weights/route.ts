/**
 * 体重データ取得APIエンドポイント
 * 指定期間の体重データを返す（デフォルト: 1週間）
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '7')
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const weights = await prisma.weight.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    const formattedWeights = weights.map(weight => ({
      date: weight.date.toISOString().split('T')[0],
      value: Number(weight.value)
    }))

    return NextResponse.json({ weights: formattedWeights })
  } catch (error) {
    console.error('Error fetching weights:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { value, date } = body

    if (!value || typeof value !== 'number') {
      return NextResponse.json({ error: 'Valid weight value is required' }, { status: 400 })
    }

    const weightDate = date ? new Date(date) : new Date()

    const weight = await prisma.weight.create({
      data: {
        userId: user.id,
        value: value,
        date: weightDate
      }
    })

    return NextResponse.json({ 
      weight: {
        id: weight.id,
        value: Number(weight.value),
        date: weight.date.toISOString().split('T')[0]
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error saving weight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}