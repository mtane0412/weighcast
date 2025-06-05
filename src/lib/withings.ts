/**
 * Withings API OAuth認証とデータ取得のためのユーティリティ関数
 */

export interface WithingsUser {
  userid: string
}

export interface WithingsTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  userid: string
  scope: string
}

export interface WithingsMeasureData {
  grpid: number
  attrib: number
  date: number
  created: number
  category: number
  deviceid: string
  measures: Array<{
    value: number
    type: number
    unit: number
  }>
}

export interface WithingsMeasureResponse {
  status: number
  body: {
    updatetime: number
    timezone: string
    measuregrps: WithingsMeasureData[]
  }
}

/**
 * HMAC-SHA256署名を生成する
 */
async function generateHmacSignature(message: string, clientSecret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(clientSecret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  
  // 16進数エンコード
  const signatureArray = new Uint8Array(signature)
  const hexSignature = Array.from(signatureArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  
  return hexSignature
}

/**
 * パラメータから署名文字列を作る
 */
async function generateSignatureFromParams(params: Record<string, string>, clientSecret: string): Promise<string> {
  // パラメータをアルファベット順にソートして値のみを結合
  const sortedKeys = Object.keys(params).sort()
  const sortedValues = sortedKeys.map(key => params[key]).join(',')
  
  console.log('署名生成:', {
    sortedKeys,
    sortedValues,
    clientSecret: clientSecret.substring(0, 8) + '...'
  })
  
  return generateHmacSignature(sortedValues, clientSecret)
}

/**
 * Nonce（ワンタイムトークン）を取得する
 */
async function getNonce(clientId: string, clientSecret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  // 署名対象パラメータ
  const params = {
    action: 'getnonce',
    client_id: clientId,
    timestamp
  }
  
  // 署名を生成
  const signature = await generateSignatureFromParams(params, clientSecret)
  
  console.log('Nonce取得リクエスト:', {
    url: 'https://wbsapi.withings.net/v2/signature',
    params: { ...params, signature }
  })
  
  const response = await fetch('https://wbsapi.withings.net/v2/signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      ...params,
      signature
    }),
  })

  console.log('Nonce取得レスポンス:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Nonce取得エラー詳細:', errorText)
    throw new Error(`Nonce取得に失敗: HTTPエラー ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('Nonce取得レスポンスデータ:', data)
  
  if (data.status !== 0 || !data.body?.nonce) {
    throw new Error(`Nonce取得エラー: ${data.error || 'Unknown error'}`)
  }

  console.log('Nonce取得成功:', data.body.nonce)
  return data.body.nonce
}

/**
 * Withings OAuth認証URLを生成する
 */
export function getWithingsAuthUrl(): string {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const redirectUri = process.env.WITHINGS_REDIRECT_URI
  
  if (!clientId || !redirectUri) {
    throw new Error('Withings認証に必要な環境変数が設定されていません')
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user.info,user.metrics',
    state: crypto.randomUUID()
  })

  return `https://account.withings.com/oauth2_user/authorize2?${params.toString()}`
}

/**
 * OAuth認証コード→アクセストークン交換
 */
export async function exchangeCodeForToken(code: string): Promise<WithingsTokenResponse> {
  console.log('Withings exchangeCodeForToken開始')
  
  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  const redirectUri = process.env.WITHINGS_REDIRECT_URI

  console.log('環境変数チェック:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    redirectUri
  })

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Withings認証に必要な環境変数が設定されていません')
  }

  return await trySignedOAuth2(clientId, clientSecret, redirectUri, code)
}

/**
 * 署名付きOAuth方式でトークン交換
 */
async function trySignedOAuth2(clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<WithingsTokenResponse> {
  // Nonce取得
  console.log('Nonce取得開始')
  const nonce = await getNonce(clientId, clientSecret)
  
  // 署名対象パラメータ（action, client_id, nonceのみ）
  const sigParams = {
    action: 'requesttoken',
    client_id: clientId,
    nonce,
  }
  
  // 署名を生成
  const signature = await generateSignatureFromParams(sigParams, clientSecret)
  
  // リクエスト本体パラメータ（すべて）
  const requestBody = new URLSearchParams({
    action: 'requesttoken',
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    nonce,
    redirect_uri: redirectUri,
    signature
  })

  console.log('署名付きAPIリクエスト送信:', {
    url: 'https://wbsapi.withings.net/v2/oauth2',
    method: 'POST',
    body: Object.fromEntries(requestBody)
  })

  const response = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  })

  console.log('署名付きAPIレスポンス:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('署名付きAPIエラーレスポンス:', errorText)
    throw new Error(`Withings API 通信失敗: ${response.statusText} - ${response.status}`)
  }

  const data = await response.json()
  console.log('署名付きAPIレスポンスデータ:', data)
  
  if (data.status !== 0 || !data.body) {
    console.error('署名付きAPI エラー:', data)
    throw new Error(`Withings API エラー: ${data.error || 'Unknown error'}`)
  }

  console.log('署名付きトークン交換成功')
  return data.body
}

/**
 * リフレッシュトークンによるアクセストークン再取得
 */
export async function refreshAccessToken(refreshToken: string): Promise<WithingsTokenResponse> {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Withings認証に必要な環境変数が設定されていません')
  }

  // Nonce取得
  const nonce = await getNonce(clientId, clientSecret)
  
  // 署名対象パラメータ
  const sigParams = {
    action: 'requesttoken',
    client_id: clientId,
    nonce,
  }
  
  // 署名を生成
  const signature = await generateSignatureFromParams(sigParams, clientSecret)

  // 本体パラメータ
  const requestBody = new URLSearchParams({
    action: 'requesttoken',
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    nonce,
    signature
  })

  console.log('Withingsトークン更新リクエスト:', {
    url: 'https://wbsapi.withings.net/v2/oauth2',
    method: 'POST',
    body: Object.fromEntries(requestBody)
  })

  const response = await fetch('https://wbsapi.withings.net/v2/oauth2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  })

  console.log('Withingsトークン更新レスポンス:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Withingsトークン更新エラー詳細:', errorText)
    throw new Error(`Withings API 通信失敗: ${response.statusText} - ${response.status}`)
  }

  const data = await response.json()
  console.log('Withingsトークン更新レスポンスデータ:', data)
  
  if (data.status !== 0) {
    console.error('Withingsトークン更新API エラー:', data)
    throw new Error(`Withings API エラー: ${data.error || 'Unknown error'}`)
  }

  console.log('Withingsトークン更新成功')
  return data.body
}

/**
 * 体重データ取得（Measure API）
 */
export async function getWeightMeasures(accessToken: string, startdate?: number, enddate?: number): Promise<WithingsMeasureResponse> {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Withings認証に必要な環境変数が設定されていません')
  }

  // Nonce取得
  const nonce = await getNonce(clientId, clientSecret)
  
  // 本体パラメータ
  const params: Record<string, string> = {
    action: 'getmeas',
    client_id: clientId,
    meastypes: '1',   // 体重のみ
    category: '1',    // 実測値
    nonce,
    ...(startdate && { startdate: startdate.toString() }),
    ...(enddate && { enddate: enddate.toString() }),
  }

  // 署名対象パラメータ
  const sigParams = {
    action: params.action,
    client_id: params.client_id,
    nonce: params.nonce,
  }
  
  // 署名を生成
  const signature = await generateSignatureFromParams(sigParams, clientSecret)
  
  const requestBody = new URLSearchParams({
    ...params,
    signature
  })

  console.log('Withings体重データ取得リクエスト:', {
    url: 'https://wbsapi.withings.net/v2/measure',
    method: 'POST',
    params: Object.fromEntries(requestBody)
  })

  const response = await fetch('https://wbsapi.withings.net/v2/measure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: requestBody
  })

  console.log('Withings体重データ取得レスポンス:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Withings体重データ取得エラー詳細:', errorText)
    throw new Error(`Withings API 通信失敗: ${response.statusText} - ${response.status}`)
  }

  const data = await response.json()
  console.log('Withings体重データ取得レスポンスデータ:', data)
  
  if (data.status !== 0) {
    throw new Error(`Withings API エラー: ${data.error || 'Unknown error'}`)
  }

  return data
}