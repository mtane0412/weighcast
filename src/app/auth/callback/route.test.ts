/**
 * Supabase認証コールバックハンドラーのテスト
 */
import { GET } from './route'
import { createClient } from '@/utils/supabase/server'
import { getTwitchUser } from '@/lib/twitch'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// モックの設定
jest.mock('@/utils/supabase/server')
jest.mock('@/lib/twitch')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
    },
  },
}))
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url) => ({
      status: 307,
      headers: new Map([['location', url]]),
    })),
  },
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetTwitchUser = getTwitchUser as jest.MockedFunction<typeof getTwitchUser>
const mockPrismaUpsert = prisma.user.upsert as jest.MockedFunction<typeof prisma.user.upsert>

describe('GET /auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch fresh Twitch data and update user information', async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          error: null,
          data: {
            session: {
              provider_token: 'twitch-token-123',
              user: {
                id: 'user-123',
                email: 'test@example.com',
                app_metadata: { provider: 'twitch' },
                user_metadata: {
                  provider_id: '123456789',
                  name: 'OldDisplayName',
                  preferred_username: 'oldusername',
                },
                identities: [{
                  provider: 'twitch',
                  identity_data: { provider_id: '123456789' }
                }],
              },
            },
          },
        }),
      },
    }
    
    mockCreateClient.mockResolvedValue(mockSupabase as any)
    
    // Twitch APIから最新の情報を返す
    mockGetTwitchUser.mockResolvedValue({
      id: '123456789',
      login: 'tanenob',
      display_name: 'たねのぶ',
      profile_image_url: 'https://example.com/new-avatar.jpg',
      email: 'test@example.com',
    })
    
    mockPrismaUpsert.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      twitchId: '123456789',
      twitchUsername: 'tanenob',
      twitchDisplayName: 'たねのぶ',
      twitchProfileImage: 'https://example.com/new-avatar.jpg',
    })

    const request = new Request('http://localhost:3000/auth/callback?code=test-code')
    const response = await GET(request)

    // Twitch APIが呼ばれたことを確認
    expect(mockGetTwitchUser).toHaveBeenCalledWith('twitch-token-123')
    
    // データベースが最新の情報で更新されたことを確認
    expect(mockPrismaUpsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {
        email: 'test@example.com',
        twitchId: '123456789',
        twitchUsername: 'tanenob',
        twitchDisplayName: 'たねのぶ',
        twitchProfileImage: 'https://example.com/new-avatar.jpg',
      },
      create: {
        id: 'user-123',
        email: 'test@example.com',
        twitchId: '123456789',
        twitchUsername: 'tanenob',
        twitchDisplayName: 'たねのぶ',
        twitchProfileImage: 'https://example.com/new-avatar.jpg',
      },
    })
    
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/')
  })

  it('should fall back to Supabase metadata when Twitch API fails', async () => {
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          error: null,
          data: {
            session: {
              provider_token: 'twitch-token-123',
              user: {
                id: 'user-123',
                email: 'test@example.com',
                app_metadata: { provider: 'twitch' },
                user_metadata: {
                  provider_id: '123456789',
                  nickname: '日本語表示名',
                  display_name: 'DisplayFromSupabase',
                  login: 'loginfromsupabase',
                  avatar_url: 'https://example.com/supabase-avatar.jpg',
                },
                identities: [{
                  provider: 'twitch',
                  identity_data: { provider_id: '123456789' }
                }],
              },
            },
          },
        }),
      },
    }
    
    mockCreateClient.mockResolvedValue(mockSupabase as any)
    
    // Twitch APIが失敗
    mockGetTwitchUser.mockResolvedValue(null)
    
    mockPrismaUpsert.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      twitchId: '123456789',
      twitchUsername: 'loginfromsupabase',
      twitchDisplayName: '日本語表示名',
      twitchProfileImage: 'https://example.com/supabase-avatar.jpg',
    })

    const request = new Request('http://localhost:3000/auth/callback?code=test-code')
    await GET(request)

    // Supabaseのメタデータが使用されたことを確認
    expect(mockPrismaUpsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {
        email: 'test@example.com',
        twitchId: '123456789',
        twitchUsername: 'loginfromsupabase',
        twitchDisplayName: '日本語表示名',
        twitchProfileImage: 'https://example.com/supabase-avatar.jpg',
      },
      create: {
        id: 'user-123',
        email: 'test@example.com',
        twitchId: '123456789',
        twitchUsername: 'loginfromsupabase',
        twitchDisplayName: '日本語表示名',
        twitchProfileImage: 'https://example.com/supabase-avatar.jpg',
      },
    })
  })

  it('should redirect to error page when no code is provided', async () => {
    const request = new Request('http://localhost:3000/auth/callback')
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/auth/auth-code-error')
  })
})