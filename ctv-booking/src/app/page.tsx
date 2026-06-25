'use client';

import { useEffect, useMemo, useState } from 'react';
import { timeToMinutes, todayISO, type TaskDTO } from '@/lib/types';

type Step = 1 | 2 | 3 | 4;

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);

  const [ten, setTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [ngay, setNgay] = useState(todayISO());

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedGio, setSelectedGio] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Tải danh sách task khi sang bước chọn giờ (step 3) hoặc khi đổi ngày
  useEffect(() => {
    if (step < 3) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    fetch(`/api/tasks?date=${encodeURIComponent(ngay)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          setTasks([]);
        } else {
          setTasks(data.tasks || []);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Không thể tải danh sách ca làm. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, ngay]);

  // Nhóm task theo giờ bắt đầu, sắp xếp theo thời gian
  const gioGroups = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const t of tasks) {
      if (!map.has(t.gioBatDau)) map.set(t.gioBatDau, []);
      map.get(t.gioBatDau)!.push(t);
    }
    return Array.from(map.entries())
      .map(([gio, items]) => ({ gio, items, tongConLai: items.reduce((s, i) => s + i.conLai, 0) }))
      .filter((g) => g.tongConLai > 0)
      .sort((a, b) => timeToMinutes(a.gio) - timeToMinutes(b.gio));
  }, [tasks]);

  const tasksInSelectedGio = useMemo(() => {
    if (!selectedGio) return [];
    return tasks.filter((t) => t.gioBatDau === selectedGio && t.conLai > 0);
  }, [tasks, selectedGio]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  function isValidPhone(phone: string) {
    const cleaned = phone.replace(/[\s.-]/g, '');
    return /^(0|\+84)\d{9,10}$/.test(cleaned);
  }

  const canGoStep2 = ten.trim().length >= 2 && isValidPhone(sdt);

  async function handleSubmit() {
    if (!selectedTask) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ten, sdt, taskId: selectedTask.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Có lỗi xảy ra, vui lòng thử lại');
        // Nếu hết slot, quay lại bước chọn task và refresh danh sách
        if (res.status === 409) {
          setSelectedTaskId(null);
          setStep(3);
          const refreshed = await fetch(`/api/tasks?date=${encodeURIComponent(ngay)}`).then((r) =>
            r.json()
          );
          setTasks(refreshed.tasks || []);
        }
        return;
      }

      setSubmitSuccess(data.message || 'Đăng ký thành công!');
    } catch {
      setSubmitError('Không thể kết nối tới server. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStep(1);
    setTen('');
    setSdt('');
    setNgay(todayISO());
    setSelectedGio(null);
    setSelectedTaskId(null);
    setSubmitSuccess(null);
    setSubmitError('');
  }

  if (submitSuccess) {
    return (
      <SuccessScreen message={submitSuccess} onReset={resetForm} />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] flex flex-col">
      <div className="hatch-bar h-1.5 w-full" />

      <header className="px-5 pt-6 pb-4 max-w-lg mx-auto w-full">
        <p className="font-mono-tag text-[11px] text-[var(--safety-dark)] font-semibold uppercase">
          Đăng ký ca làm
        </p>
        <h1 className="font-display text-2xl font-bold mt-1 text-[var(--ink)]">
          Chọn ca và nhận việc
        </h1>
        <StepIndicator step={step} />
      </header>

      <div className="flex-1 px-5 max-w-lg mx-auto w-full pb-10">
        {step === 1 && (
          <StepInfo
            ten={ten}
            setTen={setTen}
            sdt={sdt}
            setSdt={setSdt}
            canContinue={canGoStep2}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepDate
            ngay={ngay}
            setNgay={setNgay}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepChooseGio
            loading={loading}
            loadError={loadError}
            gioGroups={gioGroups}
            ngay={ngay}
            onBack={() => setStep(2)}
            onSelect={(gio) => {
              setSelectedGio(gio);
              setStep(4);
            }}
          />
        )}

        {step === 4 && selectedGio && (
          <StepChooseTask
            gio={selectedGio}
            items={tasksInSelectedGio}
            selectedTaskId={selectedTaskId}
            setSelectedTaskId={setSelectedTaskId}
            onBack={() => {
              setStep(3);
              setSelectedTaskId(null);
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const labels = ['Thông tin', 'Ngày', 'Giờ', 'Task'];
  return (
    <div className="flex items-center gap-1.5 mt-4">
      {labels.map((label, idx) => {
        const s = (idx + 1) as Step;
        const active = s === step;
        const done = s < step;
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1">
            <div
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                active || done ? 'bg-[var(--safety)]' : 'bg-[var(--line)]'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

function StepInfo({
  ten,
  setTen,
  sdt,
  setSdt,
  canContinue,
  onNext,
}: {
  ten: string;
  setTen: (v: string) => void;
  sdt: string;
  setSdt: (v: string) => void;
  canContinue: boolean;
  onNext: () => void;
}) {
  return (
    <div className="mt-8">
      <Field label="Họ và tên">
        <input
          type="text"
          value={ten}
          onChange={(e) => setTen(e.target.value)}
          placeholder="Nguyễn Văn A"
          className="w-full px-4 py-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] text-base focus:border-[var(--safety)] outline-none transition-colors"
          autoFocus
        />
      </Field>

      <Field label="Số điện thoại">
        <input
          type="tel"
          value={sdt}
          onChange={(e) => setSdt(e.target.value)}
          placeholder="0901234567"
          className="w-full px-4 py-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] text-base focus:border-[var(--safety)] outline-none transition-colors"
        />
      </Field>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full mt-6 py-4 rounded-xl bg-[var(--safety)] text-white font-semibold text-base disabled:bg-[var(--line)] disabled:text-[var(--ink-soft)] transition-colors active:scale-[0.99]"
      >
        Tiếp tục
      </button>
    </div>
  );
}

function StepDate({
  ngay,
  setNgay,
  onBack,
  onNext,
}: {
  ngay: string;
  setNgay: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-8">
      <Field label="Chọn ngày làm việc">
        <input
          type="date"
          value={ngay}
          onChange={(e) => setNgay(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] text-base focus:border-[var(--safety)] outline-none transition-colors"
        />
      </Field>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl border border-[var(--line)] font-semibold text-base text-[var(--ink-soft)] active:scale-[0.99] transition-transform"
        >
          Quay lại
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-xl bg-[var(--safety)] text-white font-semibold text-base active:scale-[0.99] transition-transform"
        >
          Xem ca làm
        </button>
      </div>
    </div>
  );
}

function StepChooseGio({
  loading,
  loadError,
  gioGroups,
  ngay,
  onBack,
  onSelect,
}: {
  loading: boolean;
  loadError: string;
  gioGroups: { gio: string; items: TaskDTO[]; tongConLai: number }[];
  ngay: string;
  onBack: () => void;
  onSelect: (gio: string) => void;
}) {
  return (
    <div className="mt-8">
      <button onClick={onBack} className="text-sm text-[var(--ink-soft)] mb-4 flex items-center gap-1">
        ← Đổi ngày
      </button>

      <p className="text-sm text-[var(--ink-soft)] mb-1">Ngày làm việc</p>
      <p className="font-display text-lg font-bold mb-5">{formatDateVN(ngay)}</p>

      {loading && <LoadingBlock text="Đang tải ca làm..." />}

      {!loading && loadError && <ErrorBlock text={loadError} />}

      {!loading && !loadError && gioGroups.length === 0 && (
        <EmptyBlock text="Ngày này hiện không còn ca làm việc nào trống. Vui lòng chọn ngày khác." />
      )}

      {!loading && !loadError && gioGroups.length > 0 && (
        <div className="space-y-2.5">
          {gioGroups.map((g) => (
            <button
              key={g.gio}
              onClick={() => onSelect(g.gio)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-[var(--line)] bg-[var(--paper-raised)] active:scale-[0.99] transition-transform text-left"
            >
              <div>
                <p className="font-display text-xl font-bold">{g.gio}</p>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                  {g.items.length} loại task · còn {g.tongConLai} chỗ
                </p>
              </div>
              <span className="text-[var(--safety)] text-lg">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepChooseTask({
  gio,
  items,
  selectedTaskId,
  setSelectedTaskId,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  gio: string;
  items: TaskDTO[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
}) {
  return (
    <div className="mt-8">
      <button onClick={onBack} className="text-sm text-[var(--ink-soft)] mb-4 flex items-center gap-1">
        ← Đổi giờ
      </button>

      <p className="text-sm text-[var(--ink-soft)] mb-1">Ca bắt đầu</p>
      <p className="font-display text-lg font-bold mb-5">{gio}</p>

      {items.length === 0 && (
        <EmptyBlock text="Ca này vừa hết slot. Vui lòng quay lại chọn giờ khác." />
      )}

      <div className="space-y-2.5">
        {items.map((t) => {
          const selected = t.id === selectedTaskId;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTaskId(t.id)}
              className={`w-full px-4 py-4 rounded-xl border text-left transition-colors ${
                selected
                  ? 'border-[var(--safety)] bg-[var(--safety-soft)]'
                  : 'border-[var(--line)] bg-[var(--paper-raised)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono-tag text-[10px] uppercase text-[var(--ink-soft)] tracking-wide">
                    {t.team}
                  </span>
                  <p className="font-display text-base font-bold mt-0.5">{t.task}</p>
                  <p className="text-xs text-[var(--ink-soft)] mt-1">
                    {t.gioBatDau} – {t.gioKetThuc}
                    {t.gioNghi ? ` · Nghỉ ${t.gioNghi}` : ''}
                    {t.loaiNhanVien ? ` · ${t.loaiNhanVien}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono-tag text-xs font-semibold px-2.5 py-1 rounded-full ${
                    t.conLai <= 2
                      ? 'bg-[var(--stop-soft)] text-[var(--stop)]'
                      : 'bg-[var(--go-soft)] text-[var(--go)]'
                  }`}
                >
                  còn {t.conLai}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {submitError && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-[var(--stop-soft)] text-[var(--stop)] text-sm font-medium">
          {submitError}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!selectedTaskId || submitting}
        className="w-full mt-6 py-4 rounded-xl bg-[var(--safety)] text-white font-semibold text-base disabled:bg-[var(--line)] disabled:text-[var(--ink-soft)] transition-colors active:scale-[0.99]"
      >
        {submitting ? 'Đang đăng ký...' : 'Xác nhận đăng ký'}
      </button>
    </div>
  );
}

function SuccessScreen({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--paper)] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--go-soft)] flex items-center justify-center mb-5">
        <span className="text-3xl">✓</span>
      </div>
      <h1 className="font-display text-2xl font-bold text-[var(--ink)] mb-2">
        Đăng ký thành công
      </h1>
      <p className="text-[var(--ink-soft)] max-w-xs">{message}</p>
      <button
        onClick={onReset}
        className="mt-8 px-6 py-3.5 rounded-xl bg-[var(--ink)] text-white font-semibold"
      >
        Đăng ký ca khác
      </button>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-[var(--ink-soft)] text-sm">
      {text}
    </div>
  );
}

function ErrorBlock({ text }: { text: string }) {
  return (
    <div className="px-4 py-4 rounded-xl bg-[var(--stop-soft)] text-[var(--stop)] text-sm font-medium">
      {text}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 rounded-xl border border-dashed border-[var(--line)] text-center text-[var(--ink-soft)] text-sm">
      {text}
    </div>
  );
}

function formatDateVN(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
