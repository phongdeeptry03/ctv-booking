export type TaskDTO = {
  id: string;
  ngay: string;
  team: string;
  task: string;
  gioBatDau: string;
  gioKetThuc: string;
  gioNghi: string;
  loaiNhanVien: string;
  soLuongCan: number;
  daDangKy: number;
  conLai: number;
};

/**
 * Chuyển "6:00" hoặc "18:30" thành số phút trong ngày để sắp xếp.
 * Dùng để sort các giờ bắt đầu theo thứ tự thời gian thực tế trong ca làm
 * (ca đêm như 18:00, 19:00 sẽ đứng sau ca sáng 6:00, 7:00).
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function formatDateForDisplay(isoOrSlashDate: string): string {
  // Hỗ trợ cả "2026-06-26" và "6/26/2026"
  return isoOrSlashDate;
}

/** Chuẩn hoá ngày về dạng YYYY-MM-DD để so sánh/lưu trữ nhất quán */
export function normalizeDateString(input: string): string {
  const trimmed = input.trim();

  // Đã đúng dạng YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Dạng M/D/YYYY hoặc MM/DD/YYYY
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  return trimmed;
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
