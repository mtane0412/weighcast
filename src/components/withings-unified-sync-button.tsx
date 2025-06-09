/**
 * Withings統合同期ボタンコンポーネント
 * 体重データと体組成データを統合して同期する
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";

interface WithingsUnifiedSyncButtonProps {
  onSyncComplete?: () => void;
}

export function WithingsUnifiedSyncButton({ onSyncComplete }: WithingsUnifiedSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setMessage("");

      const response = await fetch("/api/withings/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "データの同期が完了しました");
        onSyncComplete?.();
      } else {
        setMessage(data.error || "同期に失敗しました");
      }
    } catch (error) {
      console.error("Withings統合同期エラー:", error);
      setMessage("同期中にエラーが発生しました");
    } finally {
      setIsLoading(false);
      // メッセージを3秒後にクリア
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Withingsデータ同期中...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Withingsデータ同期
          </>
        )}
      </Button>
      
      {message && (
        <p className={`text-sm ${
          message.includes("エラー") || message.includes("失敗") 
            ? "text-red-600" 
            : "text-green-600"
        }`}>
          {message}
        </p>
      )}
    </div>
  );
}