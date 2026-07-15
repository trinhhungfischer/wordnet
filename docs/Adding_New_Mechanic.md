# Hướng Dẫn Thêm Cơ Chế Mới (Adding a New Mechanic)

Tài liệu này ghi lại cách cấu trúc của `LevelSettings.tsx` hoạt động sau khi được refactor để tự động sắp xếp các cơ chế (mechanics) đang được sử dụng lên trên cùng. 

## Cấu Trúc Hiện Tại
Trong file `src/components/LevelSettings.tsx`, tất cả các cơ chế đều được quản lý thông qua mảng `mechanicsConfig`. Mỗi cơ chế là một object chứa 3 thuộc tính chính:

1. `id`: Chuỗi định danh duy nhất cho cơ chế.
2. `isActive`: Hàm kiểm tra xem cơ chế này có đang được bật (thông qua `forceOpen`) hoặc đã có dữ liệu (thông qua `levelData`) hay không. Trả về `boolean`.
3. `render`: Hàm trả về giao diện JSX (UI) của cơ chế đó.

## Các Bước Thêm Một Cơ Chế Mới

1. Mở file `src/components/LevelSettings.tsx`.
2. Tìm đến mảng `const mechanicsConfig = [ ... ]` bên trong component `LevelSettings`.
3. Thêm một object mới vào mảng này với cấu trúc tương tự:

```tsx
{
  id: 'newMechanicId',
  isActive: () => forceOpen.newMechanic || (levelData.newMechanicData && levelData.newMechanicData.length > 0),
  render: () => (
    <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
      {/* 1. Header & Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Icon (optional) */}
          Mechanic: Tên Cơ Chế Mới
        </h3>
        <Toggle 
          checked={forceOpen.newMechanic || (levelData.newMechanicData && levelData.newMechanicData.length > 0)}
          onChange={(checked) => {
            setForceOpen(prev => ({ ...prev, newMechanic: checked }));
            handleChange('newMechanicData', checked ? [] : undefined);
          }}
        />
      </div>
      
      {/* 2. Content (Chỉ hiển thị khi isActive) */}
      {(forceOpen.newMechanic || (levelData.newMechanicData && levelData.newMechanicData.length > 0)) && (
        <div style={{ marginTop: '16px' }}>
          {/* Giao diện kéo thả, cấu hình chi tiết cho cơ chế mới */}
        </div>
      )}
    </div>
  )
}
```

4. Code React sẽ tự động nhận diện cơ chế mới này, và sắp xếp nó lên đầu nếu nó có dữ liệu (isActive == true) mỗi khi bạn mở level đó lên.
