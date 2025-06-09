/**
 * Withings体組成データ同期APIエンドポイントのテスト
 */

import { POST } from './route'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getBodyCompositionMeasures, refreshAccessToken } from '@/lib/withings'

// モック設定
jest.mock('@/utils/supabase/server')
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    bodyComposition: {
      findFirst: jest.fn(),
      createMany: jest.fn()
    }
  }
}))
jest.mock('@/lib/withings')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetBodyCompositionMeasures = getBodyCompositionMeasures as jest.MockedFunction<typeof getBodyCompositionMeasures>
const mockRefreshAccessToken = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>

// モック実装
beforeEach(() => {
  jest.clearAllMocks()
  
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      })
    }
  } as ReturnType<typeof createClient>)
})

describe('POST /api/withings/sync-body-composition', () => {
  test('認証されていない場合は401エラーを返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null
        })
      }
    } as ReturnType<typeof createClient>)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('認証が必要です')
  })

  test('Withings連携がされていない場合は400エラーを返す', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: null,
      withingsRefreshToken: null,
      withingsTokenExpiresAt: null
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Withings連携がされていません')
  })

  test('体組成データがない場合は適切なメッセージを返す', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    ;(prisma.bodyComposition.findFirst as jest.Mock).mockResolvedValue(null)

    mockGetBodyCompositionMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: Math.floor(Date.now() / 1000),
        timezone: 'Asia/Tokyo',
        measuregrps: []
      }
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('新しい体組成データはありません')
    expect(data.syncedCount).toBe(0)
  })

  test('新しい体組成データがある場合は保存して成功レスポンスを返す', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    ;(prisma.bodyComposition.findFirst as jest.Mock).mockResolvedValue(null)

    // 体組成データの測定結果をモック
    mockGetBodyCompositionMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: Math.floor(Date.now() / 1000),
        timezone: 'Asia/Tokyo',
        measuregrps: [
          {
            grpid: 1,
            attrib: 1,
            date: Math.floor(new Date('2025-06-09T13:30:23Z').getTime() / 1000),
            created: Math.floor(Date.now() / 1000),
            category: 1,
            deviceid: 'device123',
            measures: [
              { value: 655, type: 1, unit: -1 }, // 体重 65.5kg
              { value: 25, type: 6, unit: 0 },   // 体脂肪率 25%
              { value: 450, type: 76, unit: -1 } // 筋肉量 45.0kg
            ]
          }
        ]
      }
    })

    ;(prisma.bodyComposition.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('1件の体組成データを同期しました')
    expect(data.syncedCount).toBe(1)
    expect(data.lastSyncDate).toBeDefined()

    expect(prisma.bodyComposition.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user123',
          date: new Date('2025-06-09T13:30:23Z'),
          source: 'withings',
          weight: 65.5,
          fatRatio: 25,
          muscleMass: 45.0
        }
      ],
      skipDuplicates: true
    })
  })

  test('トークンの有効期限が切れている場合はリフレッシュを実行する', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1時間前

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'expired_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: pastDate
    })

    mockRefreshAccessToken.mockResolvedValue({
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expires_in: 3600,
      userid: 'user123',
      scope: 'user.info,user.metrics'
    })

    ;(prisma.user.update as jest.Mock).mockResolvedValue({})
    ;(prisma.bodyComposition.findFirst as jest.Mock).mockResolvedValue(null)

    mockGetBodyCompositionMeasures.mockResolvedValue({
      status: 0,
      body: {
        updatetime: Math.floor(Date.now() / 1000),
        timezone: 'Asia/Tokyo',
        measuregrps: []
      }
    })

    await POST()
    
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid_refresh_token')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        withingsAccessToken: 'new_access_token',
        withingsRefreshToken: 'new_refresh_token',
        withingsTokenExpiresAt: expect.any(Date)
      }
    })
    expect(mockGetBodyCompositionMeasures).toHaveBeenCalledWith('new_access_token', expect.any(Number), expect.any(Number))
  })
})