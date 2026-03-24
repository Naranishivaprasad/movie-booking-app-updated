import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import SeatPicker from '../components/SeatPicker';
import { formatDateTime, formatCurrency, formatDuration, generateIdempotencyKey } from '../utils/helpers';
import './ShowDetail.css';

export default function ShowDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [show, setShow] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const { data } = await api.get(`/shows/${id}`);
        setShow(data.show);
        setBookedSeats(data.bookedSeats);
      } catch {
        toast.error('Show not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [id, navigate]);

  // Fetch live pricing preview from server whenever seats change
  useEffect(() => {
    if (!show || selectedSeats.length === 0) { setPricing(null); return; }
    const calc = () => {
      // Client-side preview (mirrors server logic)
      const base = show.basePrice * selectedSeats.length;
      let disc = 0;
      if (selectedSeats.length >= 8) disc = 0.15;
      else if (selectedSeats.length >= 5) disc = 0.1;
      else if (selectedSeats.length >= 3) disc = 0.05;
      const hour = new Date(show.startTime).getHours();
      let surge = 0;
      if (hour >= 18 && hour < 23) surge = 0.2;
      else if (hour < 12) surge = -0.1;
      const discAmt = Math.round(base * disc);
      const surgeAmt = Math.round(base * surge);
      setPricing({
        baseTotal: base,
        discountPercent: disc * 100,
        discountAmount: discAmt,
        surchargePercent: surge * 100,
        surchargeAmount: surgeAmt,
        finalPrice: base - discAmt + surgeAmt,
      });
    };
    calc();
  }, [selectedSeats, show]);

  const toggleSeat = (seatId) => {
    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(s => s !== seatId)
        : prev.length >= 10
          ? (toast.error('Max 10 seats per booking'), prev)
          : [...prev, seatId]
    );
  };

  const handleBook = async () => {
    if (!user) { navigate('/login'); return; }
    if (selectedSeats.length === 0) { toast.error('Please select at least one seat'); return; }
    setBooking(true);
    try {
      const { data } = await api.post('/bookings', {
        showId: id,
        seats: selectedSeats,
        idempotencyKey: generateIdempotencyKey(),
      });
      // Navigate to payment page with booking details
      navigate(`/payment/${data.booking._id}`, {
        state: {
          booking: data.booking,
          pricing: data.pricing,
          show,
          selectedSeats,
        }
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed';
      toast.error(msg);
      // Refresh booked seats in case of conflict
      const { data } = await api.get(`/shows/${id}`);
      setBookedSeats(data.bookedSeats);
      setSelectedSeats([]);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!show) return null;

  const isPast = new Date(show.startTime) < new Date();

  return (
    <div className="show-detail-page page">
      <div className="container">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'Shows', to: '/' },
          { label: show.movieName },
        ]} />

        <div className="show-detail-layout">
          {/* LEFT — Movie info */}
          <div className="show-info-col fade-up">
            <div className="show-poster-wrap">
              {show.posterUrl
                ? <img src={show.posterUrl} alt={show.movieName} className="show-poster-img" onError={e => e.target.style.display='none'} />
                : <div className="show-poster-fallback">🎬</div>
              }
            </div>

            <div className="show-meta-card">
              <div className="show-genres">
                {show.genre?.map(g => <span key={g} className="badge badge-gray">{g}</span>)}
                <span className="badge badge-blue">{show.language}</span>
                <span className="badge badge-gold">{show.rating}</span>
              </div>

              <h1 className="show-title">{show.movieName}</h1>

              {show.description && (
                <p className="show-desc">{show.description}</p>
              )}

              <div className="show-details-grid">
                <div className="detail-item">
                  <span className="detail-label">📅 Date & Time</span>
                  <span className="detail-val">{formatDateTime(show.startTime)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">⏱ Duration</span>
                  <span className="detail-val">{formatDuration(show.duration)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">🏛 Theater</span>
                  <span className="detail-val">{show.theater}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">🎭 Screen</span>
                  <span className="detail-val">{show.screen}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">💺 Total Seats</span>
                  <span className="detail-val">{show.totalSeats}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">🎟 Base Price</span>
                  <span className="detail-val gold">{formatCurrency(show.basePrice)}</span>
                </div>
              </div>

              <div className="pricing-info">
                <div className="pricing-info-title">Dynamic Pricing Rules</div>
                <div className="pricing-rules">
                  <div className="pricing-rule">3–4 seats → 5% off</div>
                  <div className="pricing-rule">5–7 seats → 10% off</div>
                  <div className="pricing-rule">8+ seats → 15% off</div>
                  <div className="pricing-rule peak">6pm–11pm → +20% surge</div>
                  <div className="pricing-rule morning">Before noon → 10% off</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Seat picker */}
          <div className="show-booking-col fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="booking-panel">
              <div className="booking-panel-header">
                <h2>Select Seats</h2>
                <span className="seats-available">
                  {show.totalSeats - bookedSeats.length} of {show.totalSeats} available
                </span>
              </div>

              {isPast ? (
                <div className="show-expired">
                  <div style={{ fontSize: 40 }}>🕐</div>
                  <h3>Show has ended</h3>
                  <p>This show is no longer available for booking.</p>
                  <Link to="/" className="btn btn-secondary" style={{ marginTop: 16 }}>Browse More Shows</Link>
                </div>
              ) : (
                <>
                  <SeatPicker
                    rows={show.rows}
                    seatsPerRow={show.seatsPerRow}
                    bookedSeats={bookedSeats}
                    selectedSeats={selectedSeats}
                    onToggle={toggleSeat}
                  />

                  {/* Price Summary */}
                  {selectedSeats.length > 0 && pricing && (
                    <div className="price-summary fade-in">
                      <div className="price-summary-title">Price Breakdown</div>
                      <div className="price-rows">
                        <div className="price-row">
                          <span>{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} × {formatCurrency(show.basePrice)}</span>
                          <span>{formatCurrency(pricing.baseTotal)}</span>
                        </div>
                        {pricing.discountAmount > 0 && (
                          <div className="price-row discount">
                            <span>Group discount ({pricing.discountPercent}% off)</span>
                            <span>− {formatCurrency(pricing.discountAmount)}</span>
                          </div>
                        )}
                        {pricing.surchargeAmount > 0 && (
                          <div className="price-row surcharge">
                            <span>Peak hour surcharge (+{pricing.surchargePercent}%)</span>
                            <span>+ {formatCurrency(pricing.surchargeAmount)}</span>
                          </div>
                        )}
                        {pricing.surchargeAmount < 0 && (
                          <div className="price-row discount">
                            <span>Morning discount ({pricing.surchargePercent}%)</span>
                            <span>− {formatCurrency(Math.abs(pricing.surchargeAmount))}</span>
                          </div>
                        )}
                        <div className="price-divider" />
                        <div className="price-row total">
                          <span>Total</span>
                          <span>{formatCurrency(pricing.finalPrice)}</span>
                        </div>
                      </div>
                      <div className="selected-seats-list">
                        <span className="selected-label">Selected:</span>
                        {selectedSeats.sort().map(s => (
                          <span key={s} className="selected-seat-chip">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="login-prompt">
                      <span>Please <Link to="/login">sign in</Link> to complete booking</span>
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={handleBook}
                    disabled={booking || selectedSeats.length === 0}
                    style={{ marginTop: 16 }}
                  >
                    {booking
                      ? <><span className="spinner" /> Preparing order...</>
                      : selectedSeats.length === 0
                        ? 'Select seats to continue'
                        : `Proceed to Payment — ${pricing ? formatCurrency(pricing.finalPrice) : '...'}`
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
