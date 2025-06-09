/**
 * Withings体組成データ同期ボタンコンポーネント
 * Withings APIから体組成データを取得して同期する
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Activity } from "lucide-react";

interface BodyCompositionSyncButtonProps {
  onSyncComplete?: () => void;
}

export function BodyCompositionSyncButton({ onSyncComplete }: BodyCompositionSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setMessage("");

      const response = await fetch("/api/withings/sync-body-composition", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "体組成データの同期が完了しました");
        onSyncComplete?.();
      } else {
        setMessage(data.error || "同期に失敗しました");
      }
    } catch (error) {
      console.error("体組成データ同期エラー:", error);
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
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            体組成データ同期中...
          </>
        ) : (
          <>
            <Activity className="mr-2 h-4 w-4" />
            体組成データ同期
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