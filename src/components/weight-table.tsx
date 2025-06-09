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
import { TableColumnSettings, ColumnConfig } from "./table-column-settings";

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

  // 列設定の初期状態
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "datetime", label: "記録日時", visible: true, disabled: true },
    { id: "weight", label: "体重 (kg)", visible: true },
    { id: "fatRatio", label: "体脂肪率 (%)", visible: true },
    { id: "muscleMass", label: "筋肉量 (kg)", visible: true },
    { id: "fatMass", label: "脂肪量 (kg)", visible: true },
    { id: "boneMass", label: "骨量 (kg)", visible: true },
    { id: "waterMass", label: "水分量 (%)", visible: true },
    { id: "fatFreeMass", label: "除脂肪量 (kg)", visible: false },
    { id: "heartRate", label: "心拍数 (bpm)", visible: false },
    { id: "pulseWaveVelocity", label: "脈波伝播速度 (m/s)", visible: false },
    { id: "vascularAge", label: "血管年齢 (歳)", visible: false },
    { id: "visceralFat", label: "内臓脂肪レベル", visible: false },
    { id: "basalMetabolicRate", label: "基礎代謝 (kcal)", visible: false },
    { id: "source", label: "データソース", visible: true },
  ]);

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

  // 列の値を取得するヘルパー関数
  const getCellValue = (entry: DataEntry, columnId: string) => {
    switch (columnId) {
      case "weight":
        const weight = getDisplayWeight(entry);
        return weight ? formatValue(weight, '', 1) : '-';
      case "fatRatio":
        return entry.type === 'bodyComposition' && entry.fatRatio !== null 
          ? formatValue(entry.fatRatio, '', 1) : '-';
      case "muscleMass":
        return entry.type === 'bodyComposition' && entry.muscleMass !== null 
          ? formatValue(entry.muscleMass, '', 1) : '-';
      case "fatMass":
        return entry.type === 'bodyComposition' && entry.fatMass !== null 
          ? formatValue(entry.fatMass, '', 1) : '-';
      case "boneMass":
        return entry.type === 'bodyComposition' && entry.boneMass !== null 
          ? formatValue(entry.boneMass, '', 1) : '-';
      case "waterMass":
        return entry.type === 'bodyComposition' && entry.waterMass !== null 
          ? formatValue(entry.waterMass, '', 1) : '-';
      case "fatFreeMass":
        return entry.type === 'bodyComposition' && entry.fatFreeMass !== null 
          ? formatValue(entry.fatFreeMass, '', 1) : '-';
      case "heartRate":
        return entry.type === 'bodyComposition' && entry.heartRate !== null 
          ? formatValue(entry.heartRate, '', 0) : '-';
      case "pulseWaveVelocity":
        return entry.type === 'bodyComposition' && entry.pulseWaveVelocity !== null 
          ? formatValue(entry.pulseWaveVelocity, '', 1) : '-';
      case "vascularAge":
        return entry.type === 'bodyComposition' && entry.vascularAge !== null 
          ? formatValue(entry.vascularAge, '', 0) : '-';
      case "visceralFat":
        return entry.type === 'bodyComposition' && entry.visceralFat !== null 
          ? formatValue(entry.visceralFat, '', 0) : '-';
      case "basalMetabolicRate":
        return entry.type === 'bodyComposition' && entry.basalMetabolicRate !== null 
          ? formatValue(entry.basalMetabolicRate, '', 0) : '-';
      default:
        return '-';
    }
  };

  const visibleColumns = columns.filter(col => col.visible);
  const totalColumns = visibleColumns.length;


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>健康データ記録一覧</CardTitle>
        <TableColumnSettings 
          columns={columns} 
          onColumnsChange={setColumns}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={
                    column.id === "datetime" 
                      ? "cursor-pointer hover:bg-muted/50"
                      : column.id === "source" 
                        ? "" 
                        : "text-right"
                  }
                  onClick={column.id === "datetime" ? toggleSort : undefined}
                >
                  {column.id === "datetime" 
                    ? `${column.label} ${sortOrder === "desc" ? "↓" : "↑"}`
                    : column.label
                  }
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={totalColumns} className="text-center text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumns} className="text-center text-muted-foreground">
                  記録がありません
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((entry, index) => {
                const { date, time } = formatDateTime(entry.datetime);
                
                return (
                  <TableRow key={`${entry.datetime}-${index}`}>
                    {visibleColumns.map((column) => (
                      <TableCell 
                        key={column.id}
                        className={
                          column.id === "datetime" 
                            ? ""
                            : column.id === "weight"
                              ? "text-right font-medium"
                              : column.id === "source"
                                ? ""
                                : "text-right"
                        }
                      >
                        {column.id === "datetime" ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{date}</span>
                            <span className="text-sm text-muted-foreground">{time}</span>
                          </div>
                        ) : column.id === "source" ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            entry.source === "withings" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {formatSource(entry.source)}
                          </span>
                        ) : (
                          getCellValue(entry, column.id)
                        )}
                      </TableCell>
                    ))}
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