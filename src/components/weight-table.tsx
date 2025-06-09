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
              <TableHead className="text-right">体脂肪率 (%)</TableHead>
              <TableHead className="text-right">筋肉量 (kg)</TableHead>
              <TableHead className="text-right">脂肪量 (kg)</TableHead>
              <TableHead className="text-right">水分量 (kg)</TableHead>
              <TableHead className="text-right">骨量 (kg)</TableHead>
              <TableHead>データソース</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  記録がありません
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((entry, index) => {
                const { date, time } = formatDateTime(entry.datetime);
                const weight = getDisplayWeight(entry);
                
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
                    <TableCell className="text-right">
                      {entry.type === 'bodyComposition' && entry.fatRatio !== null 
                        ? formatValue(entry.fatRatio, '', 1) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.type === 'bodyComposition' && entry.muscleMass !== null 
                        ? formatValue(entry.muscleMass, '', 1) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.type === 'bodyComposition' && entry.fatMass !== null 
                        ? formatValue(entry.fatMass, '', 1) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.type === 'bodyComposition' && entry.waterMass !== null 
                        ? formatValue(entry.waterMass, '', 1) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.type === 'bodyComposition' && entry.boneMass !== null 
                        ? formatValue(entry.boneMass, '', 1) 
                        : '-'
                      }
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