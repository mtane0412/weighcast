/**
 * 体重・体組成記録データテーブルコンポーネント
 * 記録された体重データと体組成データを表形式で表示する
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
  id: string;
  date: string;
  datetime: string;
  type: 'weight';
  weight: number;
  source: string;
}

interface BodyCompositionEntry {
  id: string;
  date: string;
  datetime: string;
  type: 'bodyComposition';
  weight: number | null;
  fatMass: number | null;
  fatFreeMass: number | null;
  muscleMass: number | null;
  boneMass: number | null;
  waterMass: number | null;
  fatRatio: number | null;
  heartRate: number | null;
  pulseWaveVelocity: number | null;
  vascularAge: number | null;
  visceralFat: number | null;
  basalMetabolicRate: number | null;
  source: string;
}

type DataEntry = WeightEntry | BodyCompositionEntry;

interface WeightTableProps {
  refreshTrigger?: number;
}

export function WeightTable({ refreshTrigger }: WeightTableProps) {
  const [data, setData] = useState<DataEntry[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/body-composition?days=30");
        if (response.ok) {
          const responseData = await response.json();
          setData(responseData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  // 日時でソート
  const sortedData = [...data].sort((a, b) => {
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

  const formatValue = (value: number | null, unit: string = '', decimals: number = 1) => {
    if (value === null) return '-';
    return `${value.toFixed(decimals)}${unit}`;
  };

  const getDisplayWeight = (entry: DataEntry) => {
    if (entry.type === 'weight') {
      return entry.weight;
    } else {
      return entry.weight;
    }
  };

  const renderBodyCompositionData = (entry: BodyCompositionEntry) => {
    const metrics: string[] = [];
    
    if (entry.fatRatio !== null && entry.fatRatio !== undefined) {
      metrics.push(`体脂肪率: ${formatValue(entry.fatRatio, '%')}`);
    }
    if (entry.muscleMass !== null && entry.muscleMass !== undefined) {
      metrics.push(`筋肉量: ${formatValue(entry.muscleMass, 'kg')}`);
    }
    if (entry.fatMass !== null && entry.fatMass !== undefined) {
      metrics.push(`脂肪量: ${formatValue(entry.fatMass, 'kg')}`);
    }
    if (entry.waterMass !== null && entry.waterMass !== undefined) {
      metrics.push(`水分量: ${formatValue(entry.waterMass, 'kg')}`);
    }
    if (entry.boneMass !== null && entry.boneMass !== undefined) {
      metrics.push(`骨量: ${formatValue(entry.boneMass, 'kg')}`);
    }
    if (entry.heartRate !== null && entry.heartRate !== undefined) {
      metrics.push(`心拍数: ${formatValue(entry.heartRate, 'bpm', 0)}`);
    }
    if (entry.basalMetabolicRate !== null && entry.basalMetabolicRate !== undefined) {
      metrics.push(`基礎代謝: ${formatValue(entry.basalMetabolicRate, 'kcal', 0)}`);
    }
    if (entry.visceralFat !== null && entry.visceralFat !== undefined) {
      metrics.push(`内臓脂肪: ${formatValue(entry.visceralFat)}`);
    }
    if (entry.vascularAge !== null && entry.vascularAge !== undefined) {
      metrics.push(`血管年齢: ${formatValue(entry.vascularAge, '歳', 0)}`);
    }
    
    return metrics.length > 0 ? metrics.join(', ') : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>健康データ記録一覧</CardTitle>
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
              <TableHead>体組成データ</TableHead>
              <TableHead>データソース</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  記録がありません
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((entry, index) => {
                const { date, time } = formatDateTime(entry.datetime);
                const weight = getDisplayWeight(entry);
                const bodyCompositionData = entry.type === 'bodyComposition' 
                  ? renderBodyCompositionData(entry)
                  : null;
                
                return (
                  <TableRow key={`${entry.datetime}-${index}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{date}</span>
                        <span className="text-sm text-muted-foreground">{time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {weight ? formatValue(weight, '', 1) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {bodyCompositionData ? (
                        <div className="max-w-xs">
                          <span className="text-muted-foreground">{bodyCompositionData}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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