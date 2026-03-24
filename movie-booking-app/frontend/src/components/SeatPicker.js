import './SeatPicker.css';

export default function SeatPicker({ rows, seatsPerRow, bookedSeats, selectedSeats, onToggle }) {
  return (
    <div className="seat-picker">
      <div className="screen-label">
        <div className="screen-bar" />
        <span>SCREEN</span>
      </div>

      <div className="seat-grid">
        {rows.map((row) => (
          <div key={row} className="seat-row">
            <span className="row-label">{row}</span>
            <div className="seats">
              {Array.from({ length: seatsPerRow }, (_, i) => {
                const seatId = `${row}${i + 1}`;
                const isBooked = bookedSeats.includes(seatId);
                const isSelected = selectedSeats.includes(seatId);
                return (
                  <button
                    key={seatId}
                    className={`seat ${isBooked ? 'seat-booked' : isSelected ? 'seat-selected' : 'seat-available'}`}
                    onClick={() => !isBooked && onToggle(seatId)}
                    disabled={isBooked}
                    title={seatId}
                    aria-label={`Seat ${seatId} ${isBooked ? '(booked)' : isSelected ? '(selected)' : '(available)'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <span className="row-label">{row}</span>
          </div>
        ))}
      </div>

      <div className="seat-legend">
        <div className="legend-item"><div className="legend-dot available" /> Available</div>
        <div className="legend-item"><div className="legend-dot selected" /> Selected</div>
        <div className="legend-item"><div className="legend-dot booked" /> Booked</div>
      </div>
    </div>
  );
}
