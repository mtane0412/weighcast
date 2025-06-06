/**
 * 体重データ同期APIのテスト
 */

import { POST } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getWeightMeasures, refreshAccessToken } from '@/lib/withings'

// NextResponseのモック
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {})
        }
      })
      response.json = async () => data
      Object.defineProperty(response, 'status', {
        value: init?.status || 200,
        writable: false,
        enumerable: true,
        configurable: true
      })
      return response
    })
  },
  NextRequest: jest.requireActual('next/server').NextRequest
}))

// モックの設定
jest.mock('@/utils/supabase/server')
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    weight: {
      findFirst: jest.fn(),
      createMany: jest.fn()
    }
  }
}))
jest.mock('@/lib/withings')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetWeightMeasures = getWeightMeasures as jest.MockedFunction<typeof getWeightMeasures>
const mockRefreshAccessToken = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>

describe('POST /api/withings/sync-weights', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  it('未認証の場合は401エラーを返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('認証が必要です')
  })

  it('Withings連携されていない場合は400エラーを返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: null,
      withingsRefreshToken: null
    })

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Withings連携がされていません')
  })

  it('トークンが期限切れの場合は更新してからデータを取得する', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    const expiredDate = new Date(Date.now() - 1000) // 1秒前

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'old_token',
      withingsRefreshToken: 'refresh_token',
      withingsTokenExpiresAt: expiredDate
    })

    mockRefreshAccessToken.mockResolvedValue({
      access_token: 'new_token',
      refresh_token: 'new_refresh_token',
      expires_in: 3600,
      userid: 'withings_user_id',
      scope: 'user.info,user.metrics'
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)

    mockGetWeightMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: Date.now() / 1000,
        timezone: 'Asia/Tokyo',
        measuregrps: []
      }
    })

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    await POST(request)

    expect(mockRefreshAccessToken).toHaveBeenCalledWith('refresh_token')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        withingsAccessToken: 'new_token',
        withingsRefreshToken: 'new_refresh_token',
        withingsTokenExpiresAt: expect.any(Date)
      }
    })
    expect(mockGetWeightMeasures).toHaveBeenCalledWith('new_token', expect.any(Number), expect.any(Number))
  })

  it('新しい体重データがある場合は保存して成功レスポンスを返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    const futureDate = new Date(Date.now() + 3600000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    const lastWeightDate = new Date('2025-01-01T00:00:00Z')
    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue({
      date: lastWeightDate
    })

    const measureDate = Math.floor(Date.now() / 1000)
    mockGetWeightMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: measureDate,
        timezone: 'Asia/Tokyo',
        measuregrps: [
          {
            grpid: 1,
            attrib: 0,
            date: measureDate,
            created: measureDate,
            category: 1,
            deviceid: 'device123',
            measures: [
              {
                value: 65500,
                type: 1,
                unit: -3
              }
            ]
          }
        ]
      }
    })

    ;(prisma.weight.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('1件の体重データを同期しました')
    expect(data.syncedCount).toBe(1)
    expect(data.lastSyncDate).toBeDefined()

    expect(prisma.weight.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user123',
          value: 65.5,
          date: new Date(measureDate * 1000)
        }
      ],
      skipDuplicates: true
    })
  })

  it('新しいデータがない場合は0件として成功レスポンスを返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'refresh_token',
      withingsTokenExpiresAt: new Date(Date.now() + 3600000)
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)

    mockGetWeightMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: Date.now() / 1000,
        timezone: 'Asia/Tokyo',
        measuregrps: []
      }
    })

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('新しい体重データはありません')
    expect(data.syncedCount).toBe(0)
  })

  it('Withings APIエラーの場合は500エラーを返す', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } })
      }
    }
    // @ts-expect-error - モックのため一部のプロパティのみ定義
    mockCreateClient.mockResolvedValue(mockSupabase)

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'refresh_token',
      withingsTokenExpiresAt: new Date(Date.now() + 3600000)
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)

    mockGetWeightMeasures.mockRejectedValue(new Error('API Error'))

    const request = new NextRequest('http://localhost:3000/api/withings/sync-weights', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('体重データの同期中にエラーが発生しました')
  })
})