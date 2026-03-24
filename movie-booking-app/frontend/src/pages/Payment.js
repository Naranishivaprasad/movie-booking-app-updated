import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Breadcrumb from '../components/Breadcrumb';
import { formatDateTime, formatCurrency } from '../utils/helpers';
import './Payment.css';

const STEPS = ['Order Review', 'Payment Details', 'Processing'];

// Luhn check for card number validation (client-side UX only — backend re-validates)
function luhnCheck(num) {
  const arr = num.replace(/\s/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    let d = arr[i];
    if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function detectCardType(num) {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'MC';
  if (/^3[47]/.test(n)) return 'AMEX';
  if (/^6/.test(n)) return 'RUPAY';
  return null;
}

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(0); // 0=review, 1=form, 2=processing
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [show, setShow] = useState(location.state?.show || null);
  const [loadingBooking, setLoadingBooking] = useState(!booking);

  const [card, setCard] = useState({
    number: '', holder: '', expiry: '', cvv: '',
  });
  const [cardErrors, setCardErrors] = useState({});
  const [cardFlipped, setCardFlipped] = useState(false);
  const [paying, setPaying] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const timerRef = useRef(null);

  // Load booking from API if not in location state
  useEffect(() => {
    if (!booking) {
      api.get(`/bookings/${id}`)
        .then(({ data }) => {
          setBooking(data.booking);
          setShow(data.booking.showId);
        })
        .catch(() => {
          toast.error('Booking not found');
          navigate('/');
        })
        .finally(() => setLoadingBooking(false));
    }
  }, [id, booking, navigate]);

  // Expire warning timer — bookings expire in 15min
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!booking?.expiresAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(booking.expiresAt) - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0) {
        toast.error('Booking expired. Please try again.');
        navigate('/');
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [booking, navigate]);

  const validateCard = () => {
    const errs = {};
    const clean = card.number.replace(/\s/g, '');
    if (clean.length !== 16) errs.number = 'Card number must be 16 digits';
    else if (!luhnCheck(clean)) errs.number = 'Invalid card number';
    if (!card.holder.trim()) errs.holder = 'Cardholder name required';
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
      errs.expiry = 'Enter expiry as MM/YY';
    } else {
      const [mm, yy] = card.expiry.split('/').map(Number);
      const now = new Date();
      const cardDate = new Date(2000 + yy, mm - 1);
      if (mm < 1 || mm > 12) errs.expiry = 'Invalid month';
      else if (cardDate < new Date(now.getFullYear(), now.getMonth())) errs.expiry = 'Card has expired';
    }
    if (!/^\d{3,4}$/.test(card.cvv)) errs.cvv = 'CVV must be 3–4 digits';
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async () => {
    if (!validateCard()) return;
    setStep(2);
    setPaying(true);
    setPaymentFailed(false);

    const steps = [
      { label: 'Verifying card details…', delay: 900 },
      { label: 'Contacting payment gateway…', delay: 1200 },
      { label: 'Confirming with bank…', delay: 1100 },
      { label: 'Finalising your booking…', delay: 900 },
    ];

    let i = 0;
    const runStep = () => {
      setProcessingStep(i);
      timerRef.current = setTimeout(async () => {
        i++;
        if (i < steps.length) { runStep(); return; }

        // Call backend to confirm booking
        try {
          const [mm, yy] = card.expiry.split('/');
          await api.post(`/bookings/${id}/pay`, {
            cardNumber: card.number.replace(/\s/g, ''),
            cardHolder: card.holder,
            expiry: `${mm}/${yy}`,
            cvv: card.cvv,
          });
          toast.success('Payment successful! Booking confirmed 🎉');
          navigate(`/bookings/${id}`, { replace: true });
        } catch (err) {
          setPaymentFailed(true);
          setPaying(false);
          toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
        }
      }, steps[i].delay);
    };
    runStep();
  };

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const cardType = detectCardType(card.number);
  const cardTypeColors = { VISA: '#1a1f71', MC: '#eb001b', AMEX: '#007bc1', RUPAY: '#1e8449' };

  if (loadingBooking) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!booking) return null;

  const showData = show || booking.showId;
  const totalAmount = booking.totalPrice;

  const formatTime = (secs) => {
    if (secs === null) return '';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const processingMessages = [
    'Verifying card details…',
    'Contacting payment gateway…',
    'Confirming with bank…',
    'Finalising your booking…',
  ];

  return (
    <div className="payment-page page">
      <div className="container">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: showData?.movieName || 'Show', to: `/shows/${showData?._id || ''}` },
          { label: 'Payment' },
        ]} />

        {/* Step indicator */}
        <div className="pay-steps fade-up">
          {STEPS.map((s, i) => (
            <div key={s} className={`pay-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="pay-step-dot">
                {i < step ? <span>✓</span> : <span>{i + 1}</span>}
              </div>
              <span className="pay-step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="pay-step-line" />}
            </div>
          ))}
        </div>

        <div className="payment-layout">

          {/* ── STEP 0: ORDER REVIEW ── */}
          {step === 0 && (
            <div className="pay-content fade-up">
              <div className="order-review-card">
                <div className="order-review-header">
                  <h2>Order Summary</h2>
                  {timeLeft !== null && timeLeft < 600 && (
                    <div className={`expire-badge ${timeLeft < 120 ? 'urgent' : ''}`}>
                      ⏱ Expires in {formatTime(timeLeft)}
                    </div>
                  )}
                </div>

                <div className="order-movie-row">
                  <div className="order-movie-icon">🎬</div>
                  <div className="order-movie-info">
                    <div className="order-movie-name">{showData?.movieName}</div>
                    <div className="order-movie-meta">
                      {showData?.theater} · {showData?.screen}
                    </div>
                    <div className="order-movie-time">
                      {showData?.startTime ? formatDateTime(showData.startTime) : ''}
                    </div>
                  </div>
                </div>

                <div className="order-seats-row">
                  <span className="order-seats-label">Seats</span>
                  <div className="order-seats-chips">
                    {booking.seats.sort().map(s => (
                      <span key={s} className="seat-chip">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="order-price-breakdown">
                  <div className="price-line">
                    <span>{booking.seats.length} seat{booking.seats.length > 1 ? 's' : ''}</span>
                    <span>{formatCurrency(totalAmount + (booking.discountApplied || 0))}</span>
                  </div>
                  {booking.discountApplied > 0 && (
                    <div className="price-line discount">
                      <span>Group discount applied</span>
                      <span>− {formatCurrency(booking.discountApplied)}</span>
                    </div>
                  )}
                  <div className="price-divider" />
                  <div className="price-line total">
                    <span>Total Amount</span>
                    <span className="price-total-val">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <div className="order-secure-note">
                  <span>🔒</span>
                  <span>Your order is reserved. Complete payment within {timeLeft !== null ? formatTime(timeLeft) : '15:00'} to confirm your seats.</span>
                </div>

                <div className="order-actions">
                  <button className="btn btn-primary btn-full btn-lg" onClick={() => setStep(1)}>
                    Proceed to Payment →
                  </button>
                  <Link to={`/shows/${showData?._id}`} className="btn btn-ghost btn-full" style={{ marginTop: 8 }}>
                    ← Back to Show
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: PAYMENT FORM ── */}
          {step === 1 && (
            <div className="pay-content fade-up">
              {/* Visual Credit Card */}
              <div className="card-visual-wrap">
                <div className={`card-visual ${cardFlipped ? 'flipped' : ''}`}>
                  <div className="card-front">
                    <div className="card-chip">
                      <div className="chip-lines" />
                    </div>
                    {cardType && (
                      <div className="card-type-badge" style={{ background: cardTypeColors[cardType] }}>
                        {cardType}
                      </div>
                    )}
                    <div className="card-number-display">
                      {card.number
                        ? card.number.padEnd(19, '·').replace(/(.{4})/g, '$1 ').trim()
                        : '•••• •••• •••• ••••'}
                    </div>
                    <div className="card-bottom-row">
                      <div>
                        <div className="card-field-label">CARD HOLDER</div>
                        <div className="card-field-val">{card.holder || 'YOUR NAME'}</div>
                      </div>
                      <div>
                        <div className="card-field-label">EXPIRES</div>
                        <div className="card-field-val">{card.expiry || 'MM/YY'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="card-back">
                    <div className="card-stripe" />
                    <div className="card-cvv-row">
                      <div className="card-cvv-label">CVV</div>
                      <div className="card-cvv-val">{card.cvv ? '•'.repeat(card.cvv.length) : '•••'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Form */}
              <div className="card-form">
                <h2 style={{ marginBottom: 20 }}>Card Details</h2>

                <div className="form-group">
                  <label>Card Number</label>
                  <div className="input-wrap">
                    <input
                      className={`form-input ${cardErrors.number ? 'error' : ''}`}
                      placeholder="1234 5678 9012 3456"
                      value={card.number}
                      maxLength={19}
                      onChange={e => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                    />
                    {cardType && <span className="input-badge">{cardType}</span>}
                  </div>
                  {cardErrors.number && <span className="field-error">{cardErrors.number}</span>}
                </div>

                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input
                    className={`form-input ${cardErrors.holder ? 'error' : ''}`}
                    placeholder="Name as on card"
                    value={card.holder}
                    onChange={e => setCard(p => ({ ...p, holder: e.target.value.toUpperCase() }))}
                  />
                  {cardErrors.holder && <span className="field-error">{cardErrors.holder}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      className={`form-input ${cardErrors.expiry ? 'error' : ''}`}
                      placeholder="MM/YY"
                      value={card.expiry}
                      maxLength={5}
                      onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    />
                    {cardErrors.expiry && <span className="field-error">{cardErrors.expiry}</span>}
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      className={`form-input ${cardErrors.cvv ? 'error' : ''}`}
                      placeholder="•••"
                      value={card.cvv}
                      maxLength={4}
                      type="password"
                      onFocus={() => setCardFlipped(true)}
                      onBlur={() => setCardFlipped(false)}
                      onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    />
                    {cardErrors.cvv && <span className="field-error">{cardErrors.cvv}</span>}
                  </div>
                </div>

                {/* UPI Option (decorative) */}
                <div className="alt-pay-divider"><span>or pay with</span></div>
                <div className="alt-pay-options">
                  {['UPI', 'Net Banking', 'Wallets'].map(opt => (
                    <button
                      key={opt}
                      className="alt-pay-btn"
                      onClick={() => toast('This is a demo — only card payment is enabled', { icon: 'ℹ️' })}
                    >{opt}</button>
                  ))}
                </div>

                <div className="pay-form-actions">
                  <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                  <button
                    className="btn btn-primary btn-lg pay-now-btn"
                    onClick={handlePay}
                    disabled={paying}
                  >
                    🔒 Pay {formatCurrency(totalAmount)}
                  </button>
                </div>

                <div className="pay-secure-badges">
                  <span>🔒 SSL Secured</span>
                  <span>🛡 PCI DSS Compliant</span>
                  <span>✓ 256-bit Encryption</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: PROCESSING ── */}
          {step === 2 && (
            <div className="pay-content processing-screen fade-up">
              {paymentFailed ? (
                <div className="processing-failed">
                  <div className="proc-icon failed">✕</div>
                  <h2>Payment Failed</h2>
                  <p style={{ color: 'var(--text2)', marginTop: 8 }}>
                    Something went wrong. Your seats are still reserved for a few minutes.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => setStep(1)}>
                    Try Again
                  </button>
                  <Link to="/" className="btn btn-ghost" style={{ marginTop: 10, display: 'block', textAlign: 'center' }}>
                    Cancel & Go Home
                  </Link>
                </div>
              ) : (
                <>
                  <div className="processing-animation">
                    <div className="proc-ring" />
                    <div className="proc-ring-2" />
                    <div className="proc-icon-wrap">
                      <span style={{ fontSize: 32 }}>🔒</span>
                    </div>
                  </div>
                  <h2 style={{ marginTop: 24 }}>Processing Payment</h2>
                  <p style={{ color: 'var(--text2)', marginTop: 8, fontSize: 14 }}>
                    Please do not close or refresh this page
                  </p>
                  <div className="processing-steps">
                    {processingMessages.map((msg, i) => (
                      <div key={i} className={`proc-step ${i < processingStep ? 'done' : i === processingStep ? 'active' : ''}`}>
                        <div className="proc-step-icon">
                          {i < processingStep ? '✓' : i === processingStep ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '○'}
                        </div>
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                  <div className="processing-amount">
                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>Amount</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 22 }}>{formatCurrency(totalAmount)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right panel — always show order mini summary */}
          {step < 2 && (
            <div className="pay-sidebar fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="sidebar-summary-card">
                <div className="sidebar-title">Booking Summary</div>
                <div className="sidebar-movie">{showData?.movieName}</div>
                <div className="sidebar-meta">{showData?.theater}</div>
                <div className="sidebar-meta">{showData?.screen}</div>
                {showData?.startTime && (
                  <div className="sidebar-meta">{formatDateTime(showData.startTime)}</div>
                )}
                <div className="sidebar-divider" />
                <div className="sidebar-seats">
                  {booking.seats.sort().map(s => (
                    <span key={s} className="seat-chip-sm">{s}</span>
                  ))}
                </div>
                <div className="sidebar-divider" />
                <div className="sidebar-total-row">
                  <span>Total</span>
                  <span className="sidebar-total-val">{formatCurrency(totalAmount)}</span>
                </div>
                {timeLeft !== null && (
                  <div className={`sidebar-timer ${timeLeft < 120 ? 'urgent' : ''}`}>
                    ⏱ Reserve expires in {formatTime(timeLeft)}
                  </div>
                )}
              </div>
              <div className="sidebar-secure-note">
                <span>🔒</span> Payments are 100% secure and encrypted
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
