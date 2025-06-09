/**
 * テーブル列設定モーダルコンポーネント
 * 表示する列を選択できるチェックボックス式のモーダル
 */

"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean; // 必須列は無効化
}

interface TableColumnSettingsProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export function TableColumnSettings({ columns, onColumnsChange }: TableColumnSettingsProps) {
  const [open, setOpen] = useState(false);
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: checked } : col
      )
    );
  };

  const handleApply = () => {
    onColumnsChange(localColumns);
    setOpen(false);
  };

  const handleCancel = () => {
    setLocalColumns(columns);
    setOpen(false);
  };

  const handleReset = () => {
    const resetColumns = localColumns.map(col => ({ ...col, visible: true }));
    setLocalColumns(resetColumns);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">列設定</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>表示列設定</DialogTitle>
          <DialogDescription>
            表示する列を選択してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            {localColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.visible}
                  disabled={column.disabled}
                  onCheckedChange={(checked) => 
                    handleColumnToggle(column.id, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={column.id} 
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    column.disabled ? 'text-muted-foreground' : ''
                  }`}
                >
                  {column.label}
                  {column.disabled && ' (必須)'}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-start">
            <Button variant="outline" size="sm" onClick={handleReset}>
              すべて表示
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button onClick={handleApply}>
            適用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}