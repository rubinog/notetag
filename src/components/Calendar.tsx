import React from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  currentDate: dayjs.Dayjs;
  onDateChange: (date: dayjs.Dayjs) => void;
  activeDates: string[]; // ISO string prefixes, e.g., '2026-03-22'
}

export const Calendar: React.FC<CalendarProps> = ({ currentDate, onDateChange, activeDates }) => {
  const daysInMonth = currentDate.daysInMonth();
  const startDay = currentDate.startOf('month').day(); // 0 is Sunday
  
  const handlePrevMonth = () => onDateChange(currentDate.subtract(1, 'month'));
  const handleNextMonth = () => onDateChange(currentDate.add(1, 'month'));

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = currentDate.date(i);
    const dateStr = d.format('YYYY-MM-DD');
    const isActive = activeDates.includes(dateStr);
    const isToday = d.isSame(dayjs(), 'day');

    days.push(
      <div 
        key={i} 
        className={`cal-day ${isActive ? 'has-note' : ''} ${isToday ? 'today' : ''}`}
        onClick={() => onDateChange(d)}
      >
        {i}
      </div>
    );
  }

  return (
    <div className="calendar-widget" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{currentDate.format('MMMM YYYY')}</h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn-icon" onClick={handlePrevMonth} style={{ padding: '0.25rem' }}><ChevronLeft size={16} /></button>
          <button className="btn-icon" onClick={handleNextMonth} style={{ padding: '0.25rem' }}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ color: 'var(--text-muted)', fontWeight: 500, paddingBottom: '0.25rem' }}>{d}</div>
        ))}
        {days}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .cal-day {
          position: relative;
          padding: 0.4rem 0;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-main);
          transition: all 0.2s ease;
        }
        .cal-day:hover:not(.empty) {
          background: var(--bg-panel-hover);
        }
        .cal-day.today {
          background: var(--accent-primary);
          color: white;
          font-weight: bold;
        }
        .cal-day.has-note::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--accent-primary);
          border-radius: 50%;
        }
        .cal-day.today.has-note::after {
          background: white;
        }
      `}} />
    </div>
  );
};
