/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';

export interface StaffSchedule {
  name: string;
  monthlySchedule: {
    [dateKey: string]: string;
  };
}

const getProxyUrl = (monthName: string) => {
  return `/api/proxy-sheet?month=${encodeURIComponent(monthName)}`;
};

export const getDateISO = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const parseShiftTime = (shiftStr: string) => {
  if (!shiftStr || shiftStr === 'OFF' || shiftStr === 'PTO' || shiftStr.includes('OFFSET')) return null;
  
  const timeMatch = shiftStr.match(/(\d+)(AM|PM)-(\d+)(AM|PM)/i);
  if (!timeMatch) return null;

  const convertTo24h = (hours: number, modifier: string) => {
    let h = hours;
    if (h === 12) h = (modifier.toUpperCase() === 'PM' ? 12 : 0);
    else if (modifier.toUpperCase() === 'PM') h += 12;
    return { hours: h, minutes: 0 };
  };

  return {
    start: convertTo24h(parseInt(timeMatch[1]), timeMatch[2]),
    end: convertTo24h(parseInt(timeMatch[3]), timeMatch[4])
  };
};

export const getStaffStatus = (staff: StaffSchedule, currentTime: Date = new Date()) => {
  const now = currentTime;
  const todayKey = getDateISO(now.getFullYear(), now.getMonth(), now.getDate());
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayKey = getDateISO(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate());
  
  const todayShift = staff.monthlySchedule?.[todayKey];
  const yesterdayShift = staff.monthlySchedule?.[yesterdayKey];

  if (!todayShift) return 'Offline';
  if (todayShift === 'PTO') return 'PTO';
  if (todayShift && (todayShift.includes('OFFSET') || todayShift.includes('OFFSET'))) return 'OFFSET';

  const times = parseShiftTime(todayShift);
  if (times) {
    const start = new Date(now);
    start.setHours(times.start.hours, 0, 0, 0);
    const end = new Date(now);
    end.setHours(times.end.hours, 0, 0, 0);

    if (times.end.hours < times.start.hours) { 
      if (now >= start) return 'Active';
    } else { 
      if (now >= start && now < end) return 'Active';
    }

    if (now < start) return 'Next Shift';
  }

  const yTimes = parseShiftTime(yesterdayShift);
  if (yTimes && yTimes.end.hours < yTimes.start.hours) {
    const yEnd = new Date(now);
    yEnd.setHours(yTimes.end.hours, 0, 0, 0);
    if (now < yEnd) return 'Active';
  }

  if (todayShift === 'OFF') return 'Restday';

  return 'Offline';
};

export const fetchMonthData = async (monthName: string): Promise<{monthName: string, data: StaffSchedule[]}> => {
  try {
    const url = getProxyUrl(monthName);
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return { monthName, data: [] };
    
    const csvData = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        complete: (results) => {
          const rows = (results.data as string[][]).filter(r => r.length >= 7 && r.some(c => c.trim().length > 0));
          if (rows.length < 2) return resolve({ monthName, data: [] });

          let headerRowIndex = rows.findIndex(r => r[0]?.toLowerCase().includes('date') || r[1]?.toLowerCase().includes('day'));
          if (headerRowIndex === -1) {
            const firstDataIndex = rows.findIndex(r => r[0] === '1');
            headerRowIndex = firstDataIndex > 0 ? firstDataIndex - 1 : 1;
          }

          const headers = rows[headerRowIndex];
          const personnelNames = headers.slice(2, 9);
          const dataStartIndex = headerRowIndex + 1; 

          const BLACKLIST_KEYWORDS = ['SCHEDULE', 'MANILA', 'REGULAR', 'HCIT', 'DATE', 'DAY', 'SUPPORT'];

          const monthDate = new Date(monthName);
          const year = monthDate.getFullYear();
          const monthIdx = monthDate.getMonth();

          const monthData = personnelNames
            .map((name, pIdx) => {
              const cleanedName = (name.trim().split('\n')[0] || '').trim();
              const isInvalid = !cleanedName || 
                              cleanedName.length < 2 || 
                              BLACKLIST_KEYWORDS.some(k => cleanedName.toUpperCase().includes(k));
              
              return {
                name: cleanedName || `Unknown-${pIdx}`,
                isInvalid,
                originalIdx: pIdx + 2,
                monthlySchedule: {} as {[dateKey: string]: string}
              };
            })
            .filter(staff => !staff.isInvalid);

          for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            const dateStr = row[0]?.trim();
            if (!dateStr || isNaN(parseInt(dateStr))) continue;
            const dayNum = parseInt(dateStr);
            
            const dateKey = getDateISO(year, monthIdx, dayNum);

            monthData.forEach((staff) => {
              const shift = row[staff.originalIdx];
              if (shift) {
                staff.monthlySchedule[dateKey] = shift.trim();
              }
            });
          }
          resolve({ monthName, data: monthData });
        },
        error: (err) => reject(err)
      });
    });
  } catch (e) {
    return { monthName, data: [] };
  }
};
