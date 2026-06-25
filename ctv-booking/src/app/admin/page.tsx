'use client';

import { useEffect, useMemo, useState } from 'react';
import { todayISO, timeToMinutes } from '@/lib/types';

type AdminTask = {
  ID: string;
  Ngay: string;
  Team: string;
  Task: string;
  GioBatDau: string;
  GioKetThuc: string;
  GioNghi: string;
  LoaiNhanVien: string;
  SoLuongCan: number;
  DaDangKy: number;
  daDangKyLive: number;
  _rowNumber: number;
};

type Registration = {
  Timestamp: string;
  Ten: string;
  SDT: string;
  TaskID: string;
  Ngay: string;
  Team: string;
  Task: string;
  GioBatDau: string;
};

type Tab = 'tasks' | 'registrations';

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Thử gọi 1 API admin để xem có session hợp lệ không
    fetch('/api/admin/tasks')
      .then((res) => {
        setLoggedIn(res.status !== 401);
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--ink-soft)]">Đang tải...</div>;
  }

  if (!loggedIn) {
    return <LoginScreen onSuccess={() => setLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
        return;
      }
      onSuccess();
    } catch {
      setError('Không thể kết nối server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] flex items-center justify-center px-5">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-[var(--paper-raised)] border border-[var(--line)] rounded-2xl p-6"
      >
        <p className="font-mono-tag text-[11px] text-[var(--safety-dark)] font-semibold uppercase">
          Khu vực quản trị
        </p>
        <h1 className="font-display text-xl font-bold mt-1 mb-5">Đăng nhập admin</h1>

        <div className="mb-3">
          <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1.5">
            Tên đăng nhập
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--line)] outline-none focus:border-[var(--safety)]"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1.5">
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--line)] outline-none focus:border-[var(--safety)]"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--stop)] font-medium mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[var(--ink)] text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('tasks');
  const [date, setDate] = useState(todayISO());

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <div className="hatch-bar h-1.5 w-full" />

      <header className="px-6 py-5 border-b border-[var(--line)] bg-[var(--paper-raised)] flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono-tag text-[11px] text-[var(--safety-dark)] font-semibold uppercase">
            Quản trị
          </p>
          <h1 className="font-display text-xl font-bold">Quản lý ca làm CTV</h1>
        </div>

        <button
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            onLogout();
          }}
          className="text-sm font-medium text-[var(--ink-soft)] border border-[var(--line)] px-4 py-2 rounded-lg"
        >
          Đăng xuất
        </button>
      </header>

      <div className="px-6 pt-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 flex-wrap mb-5">
          <div className="flex gap-2">
            <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>
              Danh sách Task
            </TabButton>
            <TabButton active={tab === 'registrations'} onClick={() => setTab('registrations')}>
              CTV đã đăng ký
            </TabButton>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-[var(--ink-soft)]">Ngày:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--line)] text-sm"
            />
          </div>
        </div>

        {tab === 'tasks' && <TasksTab date={date} />}
        {tab === 'registrations' && <RegistrationsTab date={date} />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? 'bg-[var(--ink)] text-white' : 'bg-[var(--paper-raised)] text-[var(--ink-soft)] border border-[var(--line)]'
      }`}
    >
      {children}
    </button>
  );
}

function TasksTab({ date }: { date: string }) {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  async function loadTasks() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tasks?date=${encodeURIComponent(date)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi tải dữ liệu');
        return;
      }
      setTasks(data.tasks || []);
    } catch {
      setError('Không thể kết nối server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => timeToMinutes(a.GioBatDau) - timeToMinutes(b.GioBatDau)),
    [tasks]
  );

  async function handleDelete(id: string) {
    if (!confirm('Xoá task này? Hành động không thể hoàn tác.')) return;
    const res = await fetch(`/api/admin/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) loadTasks();
    else {
      const data = await res.json();
      alert(data.error || 'Xoá thất bại');
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg(`Lỗi: ${data.error}`);
        return;
      }
      setImportMsg(data.message);
      loadTasks();
    } catch {
      setImportMsg('Lỗi khi upload file');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[var(--safety)] text-white text-sm font-semibold"
        >
          + Thêm task
        </button>

        <label className="px-4 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] text-sm font-semibold cursor-pointer">
          {importing ? 'Đang import...' : 'Import Excel/CSV'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = '';
            }}
          />
        </label>

        {importMsg && <span className="text-sm text-[var(--ink-soft)]">{importMsg}</span>}
      </div>

      {showForm && (
        <TaskFormModal
          initial={editingTask}
          defaultDate={date}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadTasks();
          }}
        />
      )}

      {loading && <p className="text-[var(--ink-soft)] text-sm py-8">Đang tải...</p>}
      {error && <p className="text-[var(--stop)] text-sm py-4">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper-raised)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-3 py-2.5 font-medium">Giờ</th>
                <th className="px-3 py-2.5 font-medium">Team</th>
                <th className="px-3 py-2.5 font-medium">Task</th>
                <th className="px-3 py-2.5 font-medium">Kết thúc</th>
                <th className="px-3 py-2.5 font-medium">Nghỉ</th>
                <th className="px-3 py-2.5 font-medium">Loại NV</th>
                <th className="px-3 py-2.5 font-medium text-center">Cần</th>
                <th className="px-3 py-2.5 font-medium text-center">Đã đăng ký</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.ID} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-3 py-2.5 font-mono-tag font-semibold">{t.GioBatDau}</td>
                  <td className="px-3 py-2.5">{t.Team}</td>
                  <td className="px-3 py-2.5 font-medium">{t.Task}</td>
                  <td className="px-3 py-2.5">{t.GioKetThuc}</td>
                  <td className="px-3 py-2.5">{t.GioNghi}</td>
                  <td className="px-3 py-2.5">{t.LoaiNhanVien}</td>
                  <td className="px-3 py-2.5 text-center">{t.SoLuongCan}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.daDangKyLive >= t.SoLuongCan
                          ? 'bg-[var(--stop-soft)] text-[var(--stop)]'
                          : 'bg-[var(--go-soft)] text-[var(--go)]'
                      }`}
                    >
                      {t.daDangKyLive}/{t.SoLuongCan}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditingTask(t);
                        setShowForm(true);
                      }}
                      className="text-[var(--ink-soft)] text-xs font-semibold mr-3"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(t.ID)}
                      className="text-[var(--stop)] text-xs font-semibold"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[var(--ink-soft)]">
                    Chưa có task nào cho ngày này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskFormModal({
  initial,
  defaultDate,
  onClose,
  onSaved,
}: {
  initial: AdminTask | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ngay, setNgay] = useState(initial?.Ngay || defaultDate);
  const [team, setTeam] = useState(initial?.Team || '');
  const [task, setTask] = useState(initial?.Task || '');
  const [gioBatDau, setGioBatDau] = useState(initial?.GioBatDau || '');
  const [gioKetThuc, setGioKetThuc] = useState(initial?.GioKetThuc || '');
  const [gioNghi, setGioNghi] = useState(initial?.GioNghi || '');
  const [loaiNhanVien, setLoaiNhanVien] = useState(initial?.LoaiNhanVien || '');
  const [soLuongCan, setSoLuongCan] = useState(initial?.SoLuongCan ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');

    const payload = { ngay, team, task, gioBatDau, gioKetThuc, gioNghi, loaiNhanVien, soLuongCan };

    try {
      const res = await fetch('/api/admin/tasks', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { ...payload, id: initial.ID } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lưu thất bại');
        return;
      }
      onSaved();
    } catch {
      setError('Không thể kết nối server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--paper-raised)] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold mb-4">
          {initial ? 'Sửa task' : 'Thêm task mới'}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <FormField label="Ngày" type="date" value={ngay} onChange={setNgay} />
          <FormField label="Team" value={team} onChange={setTeam} placeholder="Outbound" />
        </div>

        <FormField label="Task" value={task} onChange={setTask} placeholder="Pick" />

        <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
          <FormField label="Giờ bắt đầu" value={gioBatDau} onChange={setGioBatDau} placeholder="6:00" />
          <FormField label="Giờ kết thúc" value={gioKetThuc} onChange={setGioKetThuc} placeholder="17:30" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <FormField label="Giờ nghỉ" value={gioNghi} onChange={setGioNghi} placeholder="1:30" />
          <FormField label="Loại NV" value={loaiNhanVien} onChange={setLoaiNhanVien} placeholder="PT thường" />
        </div>

        <FormField
          label="Số lượng cần"
          type="number"
          value={String(soLuongCan)}
          onChange={(v) => setSoLuongCan(Number(v) || 0)}
        />

        {error && <p className="text-sm text-[var(--stop)] font-medium mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--line)] font-semibold text-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--safety)] text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--ink-soft)] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] text-sm outline-none focus:border-[var(--safety)]"
      />
    </div>
  );
}

function RegistrationsTab({ date }: { date: string }) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/registrations?date=${encodeURIComponent(date)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRegs(data.registrations || []);
      })
      .catch(() => setError('Không thể tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [date]);

  function exportCSV() {
    const headers = ['Thời gian', 'Tên', 'SĐT', 'Ngày', 'Team', 'Task', 'Giờ bắt đầu'];
    const rows = regs.map((r) => [r.Timestamp, r.Ten, r.SDT, r.Ngay, r.Team, r.Task, r.GioBatDau]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dang-ky-ctv-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--ink-soft)]">{regs.length} CTV đã đăng ký</p>
        <button
          onClick={exportCSV}
          disabled={regs.length === 0}
          className="px-4 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-raised)] text-sm font-semibold disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {loading && <p className="text-[var(--ink-soft)] text-sm py-8">Đang tải...</p>}
      {error && <p className="text-[var(--stop)] text-sm py-4">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper-raised)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
                <th className="px-3 py-2.5 font-medium">Thời gian đăng ký</th>
                <th className="px-3 py-2.5 font-medium">Tên</th>
                <th className="px-3 py-2.5 font-medium">SĐT</th>
                <th className="px-3 py-2.5 font-medium">Team</th>
                <th className="px-3 py-2.5 font-medium">Task</th>
                <th className="px-3 py-2.5 font-medium">Giờ</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r, idx) => (
                <tr key={idx} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-3 py-2.5 text-[var(--ink-soft)] text-xs">
                    {new Date(r.Timestamp).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{r.Ten}</td>
                  <td className="px-3 py-2.5">{r.SDT}</td>
                  <td className="px-3 py-2.5">{r.Team}</td>
                  <td className="px-3 py-2.5">{r.Task}</td>
                  <td className="px-3 py-2.5 font-mono-tag">{r.GioBatDau}</td>
                </tr>
              ))}
              {regs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[var(--ink-soft)]">
                    Chưa có CTV nào đăng ký ngày này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
