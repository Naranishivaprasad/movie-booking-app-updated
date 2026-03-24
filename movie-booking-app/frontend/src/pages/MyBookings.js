import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Breadcrumb from '../components/Breadcrumb';
import { formatDateTime, formatCurrency } from '../utils/helpers';
import './MyBookings.css';

const STATUS_COLORS = {
  confirmed: 'var(--green)', pending: 'var(--gold)',
  cancelled: 'var(--red)', expired: 'var(--red)', failed: 'var(--red)',
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const fetchBookings = useCallback(async (cursor = null, replace = false) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const params = { limit: 6 };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/bookings/my', { params });
      if (replace) setBookings(data.bookings);
      else setBookings(prev => [...prev, ...data.bookings]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchBookings(null, true); }, [fetchBookings]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore && nextCursor) {
        fetchBookings(nextCursor);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, nextCursor, fetchBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="my-bookings-page page">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'My Bookings' }]} />

        <div className="page-header fade-up">
          <div>
            <h1 className="section-title">My Bookings</h1>
            <p className="section-sub">Your ticket history and upcoming shows</p>
          </div>
        </div>

        {loading ? (
          <div className="bookings-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="booking-row-skeleton">
                <div className="skeleton" style={{ height: 100 }} />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="icon">🎟</div>
            <h3>No bookings yet</h3>
            <p>Start by exploring available shows</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Browse Shows</Link>
          </div>
        ) : (
          <>
            <div className="bookings-list">
              {bookings.map((booking, i) => {
                const show = booking.showId;
                const color = STATUS_COLORS[booking.status] || 'var(--text3)';
                return (
                  <div key={booking._id} className="booking-row fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="booking-row-left">
                      <div className="booking-status-dot" style={{ background: color }} />
                      <div className="booking-row-info">
                        <div className="booking-row-movie">
                          {show?.movieName || 'Unknown Show'}
                        </div>
                        <div className="booking-row-meta">
                          {show ? formatDateTime(show.startTime) : '—'} ·{' '}
                          {show?.theater} · {show?.screen}
                        </div>
                        <div className="booking-row-seats">
                          {booking.seats.sort().map(s => (
                            <span key={s} className="mini-seat">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="booking-row-right">
                      <div className="booking-row-price">{formatCurrency(booking.totalPrice)}</div>
                      <div className="booking-row-status" style={{ color }}>
                        {booking.status.toUpperCase()}
                      </div>
                      <div className="booking-row-actions">
                        <Link to={`/bookings/${booking._id}`} className="btn btn-ghost btn-sm">View</Link>
                        {['confirmed', 'pending'].includes(booking.status) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(booking._id)}
                          >Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div className="spinner" />
              </div>
            )}
            {!hasMore && bookings.length > 0 && (
              <div className="end-msg" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}>
                ✦ All bookings loaded ✦
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
