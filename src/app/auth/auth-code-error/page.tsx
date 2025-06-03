/**
 * 認証エラーページ
 */
export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">認証エラー</h1>
      <p className="text-muted-foreground mb-4">
        認証処理中にエラーが発生しました。
      </p>
      <a
        href="/login"
        className="text-primary underline"
      >
        ログインページに戻る
      </a>
    </div>
  )
}