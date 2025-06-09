/**
 * 体重記録データテーブルコンポーネント
 * 記録された体重データを表形式で表示する
 */

"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeightEntry {
  date: string;
  datetime: string;
  value: number;
  source: string;
}

interface WeightTableProps {
  refreshTrigger?: number;
}

export function WeightTable({ refreshTrigger }: WeightTableProps) {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/weights?days=30");
        if (response.ok) {
          const data = await response.json();
          setWeights(data.weights || []);
        }
      } catch (error) {
        console.error("Failed to fetch weights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeights();
  }, [refreshTrigger]);

  // 日時でソート
  const sortedWeights = [...weights].sort((a, b) => {
    const dateA = new Date(a.datetime);
    const dateB = new Date(b.datetime);
    return sortOrder === "desc" 
      ? dateB.getTime() - dateA.getTime()
      : dateA.getTime() - dateB.getTime();
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  const formatDateTime = (datetimeString: string) => {
    const date = new Date(datetimeString);
    return {
      date: date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      time: date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  };

  const formatSource = (source: string) => {
    return source === "withings" ? "Withings" : "手動入力";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>体重記録一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={toggleSort}
              >
                記録日時 {sortOrder === "desc" ? "↓" : "↑"}
              </TableHead>
              <TableHead className="text-right">体重 (kg)</TableHead>
              <TableHead>データソース</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : sortedWeights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  記録がありません
                </TableCell>
              </TableRow>
            ) : (
              sortedWeights.map((entry, index) => {
                const { date, time } = formatDateTime(entry.datetime);
                return (
                  <TableRow key={`${entry.datetime}-${index}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{date}</span>
                        <span className="text-sm text-muted-foreground">{time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.value.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        entry.source === "withings" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {formatSource(entry.source)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}