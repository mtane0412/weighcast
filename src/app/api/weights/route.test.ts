/**
 * 体重データ取得APIエンドポイントのテスト
 */
import { GET, POST } from './route'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    weight: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('GET /api/weights', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    
    // NextResponse.jsonのモック
    jest.spyOn(NextResponse, 'json').mockImplementation((body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {})
        }
      }) as NextResponse
    })
  })

  it('認証されていない場合は401を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    })

    const request = new NextRequest('http://localhost:3000/api/weights')
    const response = await GET(request)

    expect(response.status).toBe(401)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('データがない場合は空の配列を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
        },
      },
      error: null,
    })

    ;(prisma.weight.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/weights')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ weights: [] })
  })

  it('デフォルトで7日間の体重データを返す', async () => {
    const mockUser = {
      id: 'user-id',
    }

    const mockWeights = [
      { date: new Date('2024-01-01T00:00:00Z'), value: '70.5' },
      { date: new Date('2024-01-02T00:00:00Z'), value: '70.3' },
      { date: new Date('2024-01-03T00:00:00Z'), value: '70.1' },
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    ;(prisma.weight.findMany as jest.Mock).mockResolvedValue(mockWeights)

    const request = new NextRequest('http://localhost:3000/api/weights')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data.weights).toEqual([
      { date: '2024-01-01', value: 70.5 },
      { date: '2024-01-02', value: 70.3 },
      { date: '2024-01-03', value: 70.1 },
    ])
  })

  it('指定された日数の体重データを返す', async () => {
    const mockUser = {
      id: 'user-id',
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    ;(prisma.weight.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/weights?days=30')
    await GET(request)

    expect(prisma.weight.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-id',
      }),
    }))
  })

  it('エラーが発生した場合は500を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
        },
      },
      error: null,
    })

    ;(prisma.weight.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/weights')
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ error: 'Internal server error' })
  })
})

describe('POST /api/weights', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    
    // NextResponse.jsonのモック
    jest.spyOn(NextResponse, 'json').mockImplementation((body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {})
        }
      }) as NextResponse
    })
  })

  it('認証されていない場合は401を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    })

    const request = new NextRequest('http://localhost:3000/api/weights', {
      method: 'POST',
      body: JSON.stringify({ value: 70.5 })
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('正常に体重データを保存する', async () => {
    const mockUser = { id: 'user-id' }
    const mockWeight = {
      id: 'weight-id',
      value: '70.5',
      date: new Date('2024-01-01T00:00:00Z')
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    ;(prisma.weight.create as jest.Mock).mockResolvedValue(mockWeight)

    const request = new NextRequest('http://localhost:3000/api/weights', {
      method: 'POST',
      body: JSON.stringify({ value: 70.5, date: '2024-01-01' })
    })
    const response = await POST(request)

    expect(response.status).toBe(201)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data.weight).toEqual({
      id: 'weight-id',
      value: 70.5,
      date: '2024-01-01'
    })
  })

  it('無効な体重値の場合は400を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/weights', {
      method: 'POST',
      body: JSON.stringify({ value: 'invalid' })
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ error: 'Valid weight value is required' })
  })
})