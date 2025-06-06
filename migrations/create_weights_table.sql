-- Supabaseでweights用のテーブルを作成
-- ユーザーの体重データを保存するテーブル

-- 既存のテーブルを削除（存在する場合）
DROP TABLE IF EXISTS weights;

-- weightsテーブルを作成
CREATE TABLE weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value DECIMAL(5,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX idx_weights_user_id_date ON weights(user_id, date);

-- RLS (Row Level Security) を有効化
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成：ユーザーは自分の体重データのみ読み書き可能
CREATE POLICY "Users can view their own weights" ON weights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weights" ON weights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weights" ON weights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weights" ON weights
  FOR DELETE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weights_updated_at
  BEFORE UPDATE ON weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();