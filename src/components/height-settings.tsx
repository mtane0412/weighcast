/**
 * 身長設定コンポーネント
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HeightSettings() {
  const [height, setHeight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchHeight();
  }, []);

  const fetchHeight = async () => {
    try {
      const response = await fetch("/api/user/height");
      if (response.ok) {
        const data = await response.json();
        if (data.height) {
          setHeight(data.height.toString());
        }
      }
    } catch (error) {
      console.error("Failed to fetch height:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const heightValue = parseFloat(height);
    if (isNaN(heightValue) || heightValue <= 0 || heightValue > 300) {
      setMessage({ type: "error", text: "身長は1〜300cmの範囲で入力してください" });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/height", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ height: heightValue }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "身長を更新しました" });
      } else {
        setMessage({ type: "error", text: "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "エラーが発生しました" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>身長設定</CardTitle>
        <CardDescription>BMI計算のために身長を設定してください</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="height">身長 (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              min="1"
              max="300"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170.5"
              className="w-32"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "error" ? "text-red-500" : "text-green-500"}`}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : "保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}