import { format, addDays, differenceInDays } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function DateRangePicker({ checkIn, checkOut, onCheckIn, onCheckOut }) {
  const nights = checkIn && checkOut ? differenceInDays(new Date(checkOut), new Date(checkIn)) : 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1 block">
          <Calendar size={11} /> Check-in
        </label>
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => {
            onCheckIn(e.target.value);
            if (checkOut && e.target.value >= checkOut) {
              onCheckOut(format(addDays(new Date(e.target.value), 1), 'yyyy-MM-dd'));
            }
          }}
          className="input text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1 block">
          <Calendar size={11} /> Check-out
        </label>
        <input
          type="date"
          value={checkOut}
          min={checkIn ? format(addDays(new Date(checkIn), 1), 'yyyy-MM-dd') : tomorrow}
          onChange={(e) => onCheckOut(e.target.value)}
          className="input text-sm"
        />
      </div>
      {nights > 0 && (
        <div className="col-span-2 text-center text-xs text-brand-400 font-medium">
          {nights} night{nights > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
