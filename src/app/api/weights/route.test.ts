/**
 * 体重データ取得APIエンドポイントのテスト
 */
import { GET, POST } from './route'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('GET /api/weights', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
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

    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
    mockSupabase.from = mockFrom

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
      { date: '2024-01-01T00:00:00Z', value: '70.5' },
      { date: '2024-01-02T00:00:00Z', value: '70.3' },
      { date: '2024-01-03T00:00:00Z', value: '70.1' },
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: mockWeights, error: null }))
            }))
          }))
        }))
      }))
    }))
    mockSupabase.from = mockFrom

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

    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
    mockSupabase.from = mockFrom

    const request = new NextRequest('http://localhost:3000/api/weights?days=30')
    await GET(request)

    expect(mockFrom).toHaveBeenCalledWith('weights')
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

    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
            }))
          }))
        }))
      }))
    }))
    mockSupabase.from = mockFrom

    const request = new NextRequest('http://localhost:3000/api/weights')
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    
    const responseText = await response.text()
    const data = JSON.parse(responseText)
    expect(data).toEqual({ error: 'Failed to fetch weights' })
  })
})

describe('POST /api/weights', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
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
      date: '2024-01-01T00:00:00Z'
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockFrom = jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockWeight, error: null }))
        }))
      }))
    }))
    mockSupabase.from = mockFrom

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