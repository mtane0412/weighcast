/**
 * Withings APIライブラリのユニットテスト
 */
import { getWithingsAuthUrl, exchangeCodeForToken } from './withings'

// 環境変数をモック
const mockEnv = {
  WITHINGS_CLIENT_ID: 'test_client_id',
  WITHINGS_CLIENT_SECRET: 'test_client_secret',
  WITHINGS_REDIRECT_URI: 'http://localhost:3003/api/withings/callback'
}

describe('Withings OAuth', () => {
  beforeAll(() => {
    Object.assign(process.env, mockEnv)
  })

  describe('getWithingsAuthUrl', () => {
    test('正しい認証URLを生成する', () => {
      const authUrl = getWithingsAuthUrl()
      
      expect(authUrl).toContain('https://account.withings.com/oauth2_user/authorize2')
      expect(authUrl).toContain('client_id=test_client_id')
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3003%2Fapi%2Fwithings%2Fcallback')
      expect(authUrl).toContain('response_type=code')
      expect(authUrl).toContain('scope=user.info%2Cuser.metrics')
      expect(authUrl).toContain('state=')
    })

    test('環境変数が不足している場合エラーを投げる', () => {
      const originalClientId = process.env.WITHINGS_CLIENT_ID
      delete process.env.WITHINGS_CLIENT_ID

      expect(() => getWithingsAuthUrl()).toThrow('Withings認証に必要な環境変数が設定されていません')

      process.env.WITHINGS_CLIENT_ID = originalClientId
    })
  })

  describe('exchangeCodeForToken', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    test('正常にトークンを取得する', async () => {
      // Nonce取得成功
      const mockNonceResponse = {
        status: 0,
        body: { nonce: 'test_nonce' }
      }
      
      // 署名付きOAuth成功
      const mockSignedResponse = {
        status: 0,
        body: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          userid: 'test_user_id',
          scope: 'user.info,user.metrics'
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockNonceResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSignedResponse)
        })

      const result = await exchangeCodeForToken('test_code')

      expect(result).toEqual(mockSignedResponse.body)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        'https://wbsapi.withings.net/v2/signature',
        expect.objectContaining({
          method: 'POST'
        })
      )
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'https://wbsapi.withings.net/v2/oauth2',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    test('Nonce取得が失敗した場合エラーを投げる', async () => {
      // Nonce取得が失敗
      const mockNonceError = { 
        status: 1,
        error: 'invalid_request' 
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNonceError)
      })

      await expect(exchangeCodeForToken('test_code')).rejects.toThrow('Nonce取得エラー: invalid_request')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('Nonce取得のHTTP通信が失敗した場合例外を投げる', async () => {
      // Nonce取得のHTTP通信が失敗
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('Error details')
      })

      await expect(exchangeCodeForToken('invalid_code')).rejects.toThrow('Nonce取得に失敗: HTTPエラー')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})