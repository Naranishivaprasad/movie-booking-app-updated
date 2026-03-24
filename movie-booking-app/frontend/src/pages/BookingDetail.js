import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import Breadcrumb from '../components/Breadcrumb';
import { formatDateTime, formatCurrency, statusColor } from '../utils/helpers';
import './BookingDetail.css';

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        setBooking(data.booking);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      const { data } = await api.patch(`/bookings/${id}/cancel`);
      setBooking(data.booking);
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!booking) return (
    <div className="container page">
      <div className="empty-state"><div className="icon">🎟</div><h3>Booking not found</h3></div>
    </div>
  );

  const show = booking.showId;
  const color = statusColor(booking.status);
  const colorVar = color === 'green' ? 'var(--green)' : color === 'gold' ? 'var(--gold)' : 'var(--red)';

  return (
    <div className="booking-detail-page page">
      <div className="container">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'My Bookings', to: '/my-bookings' },
          { label: `Booking #${booking._id.slice(-6).toUpperCase()}` },
        ]} />

        <div className="booking-detail-layout">
          {/* Main card */}
          <div className="ticket-card fade-up">
            <div className="ticket-header" style={{ borderColor: colorVar }}>
              <div className="ticket-status-row">
                <div className="ticket-icon">🎟</div>
                <div>
                  <div className="ticket-id">#{booking._id.slice(-8).toUpperCase()}</div>
                  <div className="ticket-status" style={{ color: colorVar }}>
                    ● {booking.status.toUpperCase()}
                  </div>
                </div>
              </div>
              {booking.status === 'confirmed' && (
                <div className="confirmed-checkmark">✓</div>
              )}
            </div>

            <div className="ticket-body">
              <div className="ticket-movie">
                <h2 className="ticket-movie-name">{show?.movieName || '—'}</h2>
                <div className="ticket-theater">{show?.theater} · {show?.screen}</div>
              </div>

              <div className="ticket-divider">
                <div className="ticket-hole left" />
                <div className="ticket-dash-line" />
                <div className="ticket-hole right" />
              </div>

              <div className="ticket-info-grid">
                <div className="ticket-info-item">
                  <span className="ticket-info-label">DATE & TIME</span>
                  <span className="ticket-info-val">{show ? formatDateTime(show.startTime) : '—'}</span>
                </div>
                <div className="ticket-info-item">
                  <span className="ticket-info-label">SEATS</span>
                  <span className="ticket-info-val seats-display">
                    {booking.seats.sort().map(s => (
                      <span key={s} className="ticket-seat">{s}</span>
                    ))}
                  </span>
                </div>
                <div className="ticket-info-item">
                  <span className="ticket-info-label">TOTAL PAID</span>
                  <span className="ticket-info-val gold-text">{formatCurrency(booking.totalPrice)}</span>
                </div>
                {booking.discountApplied > 0 && (
                  <div className="ticket-info-item">
                    <span className="ticket-info-label">DISCOUNT SAVED</span>
                    <span className="ticket-info-val" style={{ color: 'var(--green)' }}>
                      {formatCurrency(booking.discountApplied)}
                    </span>
                  </div>
                )}
                <div className="ticket-info-item">
                  <span className="ticket-info-label">BOOKED ON</span>
                  <span className="ticket-info-val">{formatDateTime(booking.createdAt)}</span>
                </div>
              </div>

              {booking.status === 'confirmed' && (
                <div className="ticket-barcode">
                  <div className="barcode-lines">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="barcode-line" style={{
                        width: [1, 2, 1, 3, 1, 2, 1, 1, 2, 3][i % 10] + 'px',
                        opacity: 0.7 + Math.random() * 0.3,
                      }} />
                    ))}
                  </div>
                  <div className="barcode-id">{booking._id.slice(-12).toUpperCase()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="booking-actions fade-up" style={{ animationDelay: '0.15s' }}>
            <Link to="/" className="btn btn-secondary btn-full">Browse More Shows</Link>
            <Link to="/my-bookings" className="btn btn-ghost btn-full">View All Bookings</Link>
            {['confirmed', 'pending'].includes(booking.status) && (
              <button
                className="btn btn-danger btn-full"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <><span className="spinner" /> Cancelling...</> : 'Cancel Booking'}
              </button>
            )}
            <div className="booking-note">
              Booking ID: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: 12 }}>
                {booking._id}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
