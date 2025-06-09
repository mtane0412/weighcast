/**
 * テーブル列設定モーダルコンポーネントのテスト
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableColumnSettings, ColumnConfig } from './table-column-settings';

describe('TableColumnSettings', () => {
  const mockColumns: ColumnConfig[] = [
    { id: 'datetime', label: '記録日時', visible: true, disabled: true },
    { id: 'weight', label: '体重 (kg)', visible: true },
    { id: 'fatRatio', label: '体脂肪率 (%)', visible: true },
    { id: 'muscleMass', label: '筋肉量 (kg)', visible: false },
    { id: 'source', label: 'データソース', visible: true },
  ];

  const mockOnColumnsChange = jest.fn();

  beforeEach(() => {
    mockOnColumnsChange.mockClear();
  });

  test('設定ボタンがレンダリングされる', () => {
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    expect(settingsButton).toBeInTheDocument();
  });

  test('設定ボタンをクリックするとモーダルが開く', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    expect(screen.getByText('表示列設定')).toBeInTheDocument();
    expect(screen.getByText('表示する列を選択してください。')).toBeInTheDocument();
  });

  test('列のチェックボックスが正しく表示される', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    // すべての列がチェックボックスとして表示される
    expect(screen.getByLabelText('記録日時 (必須)')).toBeInTheDocument();
    expect(screen.getByLabelText('体重 (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('体脂肪率 (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('筋肉量 (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('データソース')).toBeInTheDocument();
  });

  test('チェックボックスの初期状態が正しい', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    expect(screen.getByLabelText('記録日時 (必須)')).toBeChecked();
    expect(screen.getByLabelText('体重 (kg)')).toBeChecked();
    expect(screen.getByLabelText('体脂肪率 (%)')).toBeChecked();
    expect(screen.getByLabelText('筋肉量 (kg)')).not.toBeChecked();
    expect(screen.getByLabelText('データソース')).toBeChecked();
  });

  test('必須列は無効化されている', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    const disabledCheckbox = screen.getByLabelText('記録日時 (必須)');
    expect(disabledCheckbox).toBeDisabled();
  });

  test('チェックボックスの状態を変更できる', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    const muscleMassCheckbox = screen.getByLabelText('筋肉量 (kg)');
    await user.click(muscleMassCheckbox);

    expect(muscleMassCheckbox).toBeChecked();
  });

  test('すべて表示ボタンで全ての列が表示状態になる', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    const showAllButton = screen.getByRole('button', { name: 'すべて表示' });
    await user.click(showAllButton);

    expect(screen.getByLabelText('筋肉量 (kg)')).toBeChecked();
  });

  test('適用ボタンで変更が反映される', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    const muscleMassCheckbox = screen.getByLabelText('筋肉量 (kg)');
    await user.click(muscleMassCheckbox);

    const applyButton = screen.getByRole('button', { name: '適用' });
    await user.click(applyButton);

    expect(mockOnColumnsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'muscleMass', visible: true })
      ])
    );
  });

  test('キャンセルボタンで変更が破棄される', async () => {
    const user = userEvent.setup();
    render(<TableColumnSettings columns={mockColumns} onColumnsChange={mockOnColumnsChange} />);
    
    const settingsButton = screen.getByRole('button', { name: /列設定/i });
    await user.click(settingsButton);

    const muscleMassCheckbox = screen.getByLabelText('筋肉量 (kg)');
    await user.click(muscleMassCheckbox);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    await user.click(cancelButton);

    expect(mockOnColumnsChange).not.toHaveBeenCalled();
  });
});