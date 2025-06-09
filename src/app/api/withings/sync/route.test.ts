/**
 * Withings統合データ同期APIエンドポイントのテスト
 */

import { POST } from './route'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/lib/prisma'
import { getBodyCompositionMeasures } from '@/lib/withings'

// モック設定
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

describe('POST /api/withings/sync', () => {
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

  test('新しいデータがない場合は適切なメッセージを返す', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)
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
    expect(data.message).toBe('新しいデータはありません')
    expect(data.weightsSynced).toBe(0)
    expect(data.bodyCompositionsSynced).toBe(0)
  })

  test('体重のみのデータを正しく処理する', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.bodyComposition.findFirst as jest.Mock).mockResolvedValue(null)

    // 体重のみのデータをモック
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
              { value: 655, type: 1, unit: -1 } // 体重のみ 65.5kg
            ]
          }
        ]
      }
    })

    ;(prisma.weight.createMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.bodyComposition.createMany as jest.Mock).mockResolvedValue({ count: 0 })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weightsSynced).toBe(1)
    expect(data.bodyCompositionsSynced).toBe(0)
    expect(data.totalSynced).toBe(1)
  })

  test('体組成データを正しく処理する', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1時間後

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user123',
      withingsAccessToken: 'valid_token',
      withingsRefreshToken: 'valid_refresh_token',
      withingsTokenExpiresAt: futureDate
    })

    ;(prisma.weight.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.bodyComposition.findFirst as jest.Mock).mockResolvedValue(null)

    // 体組成データをモック
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

    ;(prisma.weight.createMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.bodyComposition.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.weightsSynced).toBe(0)
    expect(data.bodyCompositionsSynced).toBe(1)
    expect(data.totalSynced).toBe(1)

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
})