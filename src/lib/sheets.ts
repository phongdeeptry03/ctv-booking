import { google } from 'googleapis';

// Các tên tab cố định trong Google Sheet
export const TASKS_SHEET = 'Tasks';
export const REGISTRATIONS_SHEET = 'Registrations';

// Thứ tự cột trong tab Tasks (A -> J)
export const TASK_COLUMNS = [
  'ID',
  'Ngay',
  'Team',
  'Task',
  'GioBatDau',
  'GioKetThuc',
  'GioNghi',
  'LoaiNhanVien',
  'SoLuongCan',
  'DaDangKy',
] as const;

// Thứ tự cột trong tab Registrations (A -> H)
export const REGISTRATION_COLUMNS = [
  'Timestamp',
  'Ten',
  'SDT',
  'TaskID',
  'Ngay',
  'Team',
  'Task',
  'GioBatDau',
] as const;

export type TaskRow = {
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
  _rowNumber: number; // dòng thực tế trong sheet (để update lại)
};

export type RegistrationRow = {
  Timestamp: string;
  Ten: string;
  SDT: string;
  TaskID: string;
  Ngay: string;
  Team: string;
  Task: string;
  GioBatDau: string;
};

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      'Thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY trong Environment Variables'
    );
  }

  // Khi lưu private key vào biến môi trường, các dấu xuống dòng thường bị
  // chuyển thành literal "\n". Cần chuyển ngược lại thành dấu xuống dòng thật.
  key = key.replace(/\\n/g, '\n');

  return { email, key };
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('Thiếu GOOGLE_SHEET_ID trong Environment Variables');
  return id;
}

async function getSheetsClient() {
  const { email, key } = getCredentials();

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  await auth.authorize();

  return google.sheets({ version: 'v4', auth });
}

/**
 * Đọc toàn bộ dữ liệu của 1 tab dưới dạng mảng các mảng (raw rows),
 * bao gồm cả dòng header (dòng 0).
 */
async function readSheetRaw(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${sheetName}!A:Z`,
  });
  return (res.data.values as string[][]) || [];
}

export async function readTasks(): Promise<TaskRow[]> {
  const rows = await readSheetRaw(TASKS_SHEET);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  return dataRows
    .map((row, idx) => {
      const get = (colName: (typeof TASK_COLUMNS)[number]) => {
        const colIdx = TASK_COLUMNS.indexOf(colName);
        return row[colIdx] ?? '';
      };
      return {
        ID: get('ID'),
        Ngay: get('Ngay'),
        Team: get('Team'),
        Task: get('Task'),
        GioBatDau: get('GioBatDau'),
        GioKetThuc: get('GioKetThuc'),
        GioNghi: get('GioNghi'),
        LoaiNhanVien: get('LoaiNhanVien'),
        SoLuongCan: Number(get('SoLuongCan')) || 0,
        DaDangKy: Number(get('DaDangKy')) || 0,
        _rowNumber: idx + 2, // +2 vì: +1 bỏ header, +1 vì sheet 1-indexed
      };
    })
    .filter((t) => t.ID); // bỏ dòng trống
}

export async function readRegistrations(): Promise<RegistrationRow[]> {
  const rows = await readSheetRaw(REGISTRATIONS_SHEET);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  return dataRows
    .map((row) => {
      const get = (colName: (typeof REGISTRATION_COLUMNS)[number]) => {
        const colIdx = REGISTRATION_COLUMNS.indexOf(colName);
        return row[colIdx] ?? '';
      };
      return {
        Timestamp: get('Timestamp'),
        Ten: get('Ten'),
        SDT: get('SDT'),
        TaskID: get('TaskID'),
        Ngay: get('Ngay'),
        Team: get('Team'),
        Task: get('Task'),
        GioBatDau: get('GioBatDau'),
      };
    })
    .filter((r) => r.Timestamp);
}

export async function appendTaskRow(task: Omit<TaskRow, '_rowNumber'>) {
  const sheets = await getSheetsClient();
  const values = TASK_COLUMNS.map((col) => String((task as any)[col] ?? ''));
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${TASKS_SHEET}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

export async function appendTaskRows(tasks: Omit<TaskRow, '_rowNumber'>[]) {
  if (tasks.length === 0) return;
  const sheets = await getSheetsClient();
  const values = tasks.map((task) =>
    TASK_COLUMNS.map((col) => String((task as any)[col] ?? ''))
  );
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${TASKS_SHEET}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function appendRegistrationRow(reg: RegistrationRow) {
  const sheets = await getSheetsClient();
  const values = REGISTRATION_COLUMNS.map((col) => String((reg as any)[col] ?? ''));
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${REGISTRATIONS_SHEET}!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Cập nhật số "Đã đăng ký" (cột J) của 1 dòng task cụ thể */
export async function updateTaskDaDangKy(rowNumber: number, newValue: number) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${TASKS_SHEET}!J${rowNumber}:J${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newValue]] },
  });
}

/** Cập nhật toàn bộ 1 dòng task (dùng khi sửa task ở trang admin) */
export async function updateTaskRow(rowNumber: number, task: Omit<TaskRow, '_rowNumber'>) {
  const sheets = await getSheetsClient();
  const values = TASK_COLUMNS.map((col) => String((task as any)[col] ?? ''));
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${TASKS_SHEET}!A${rowNumber}:J${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/** Xoá 1 dòng task. Cần lấy sheetId (gid) thực tế của tab Tasks. */
export async function deleteTaskRow(rowNumber: number) {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === TASKS_SHEET
  );
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) {
    throw new Error('Không tìm thấy tab Tasks trong Google Sheet');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}
