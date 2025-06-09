import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// グローバルなRequestとResponseを定義
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  headers: new Map(),
  nextUrl: {
    searchParams: new URLSearchParams(new URL(url).search)
  },
  json: async () => options?.body ? JSON.parse(options.body) : {},
  ...options,
}))

global.Response = jest.fn().mockImplementation((body, options) => ({
  body,
  headers: new Map(),
  status: options?.status || 200,
  text: async () => body,
  json: async () => JSON.parse(body),
  ...options,
}))

// Web Crypto API のモック
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// crypto.subtle のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-1234-5678',
    subtle: {
      importKey: jest.fn().mockResolvedValue('mock-key'),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
})

// btoa のモック
global.btoa = jest.fn().mockReturnValue('mock-base64-signature')

// ResizeObserverのモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// fetchのモック
global.fetch = jest.fn()

// NextResponseのモック
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      const response = new Response(JSON.stringify(data), init)
      response.json = async () => data
      return response
    },
    redirect: (url) => {
      const response = new Response(null, {
        status: 302,
        headers: { Location: url.toString() }
      })
      return response
    }
  },
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    headers: new Map(),
    nextUrl: {
      searchParams: new URLSearchParams(new URL(url).search)
    },
    json: async () => options?.body ? JSON.parse(options.body) : {},
    ...options,
  }))
}))