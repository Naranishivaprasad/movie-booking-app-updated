import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import Breadcrumb from '../components/Breadcrumb';
import { formatDateTime, formatCurrency } from '../utils/helpers';
import './Admin.css';

const TABS = ['Shows', 'Bookings', 'Add Show'];

export default function Admin() {
  const [tab, setTab] = useState('Shows');
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showsLoading, setShowsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [hasMoreBookings, setHasMoreBookings] = useState(true);
  const [bookingCursor, setBookingCursor] = useState(null);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const [form, setForm] = useState({
    movieName: '', description: '', genre: '', language: 'English',
    duration: '', rating: 'UA', theater: '', screen: 'Screen 1',
    startTime: '', basePrice: '', totalSeats: 60,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchShows = useCallback(async () => {
    setShowsLoading(true);
    try {
      const { data } = await api.get('/shows', { params: { limit: 50 } });
      setShows(data.shows);
    } catch (e) { console.error(e); }
    finally { setShowsLoading(false); }
  }, []);

  const fetchBookings = useCallback(async (cursor = null, replace = false) => {
    if (replace) setBookingsLoading(true); else setLoadingMoreBookings(true);
    try {
      const params = { limit: 10 };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/bookings/admin/all', { params });
      if (replace) setBookings(data.bookings);
      else setBookings(prev => [...prev, ...data.bookings]);
      setBookingCursor(data.nextCursor);
      setHasMoreBookings(data.hasMore);
    } catch (e) { console.error(e); }
    finally { setBookingsLoading(false); setLoadingMoreBookings(false); }
  }, []);

  useEffect(() => { fetchShows(); }, [fetchShows]);
  useEffect(() => { if (tab === 'Bookings') fetchBookings(null, true); }, [tab, fetchBookings]);

  useEffect(() => {
    if (tab !== 'Bookings') return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreBookings && !loadingMoreBookings && bookingCursor) {
        fetchBookings(bookingCursor);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [tab, hasMoreBookings, loadingMoreBookings, bookingCursor, fetchBookings]);

  const handleDeactivate = async (showId) => {
    if (!window.confirm('Deactivate this show?')) return;
    await api.delete(`/shows/${showId}`);
    setShows(prev => prev.filter(s => s._id !== showId));
  };

  const handleAddShow = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    try {
      const payload = {
        ...form,
        genre: form.genre.split(',').map(g => g.trim()).filter(Boolean),
        duration: parseInt(form.duration),
        basePrice: parseInt(form.basePrice),
        totalSeats: parseInt(form.totalSeats),
        rows: ['A', 'B', 'C', 'D', 'E', 'F'],
        seatsPerRow: Math.ceil(parseInt(form.totalSeats) / 6),
      };
      await api.post('/shows', payload);
      setSaveMsg('✅ Show created successfully!');
      setForm({ movieName: '', description: '', genre: '', language: 'English', duration: '', rating: 'UA', theater: '', screen: 'Screen 1', startTime: '', basePrice: '', totalSeats: 60 });
      fetchShows();
    } catch (err) {
      setSaveMsg('❌ ' + (err.response?.data?.message || 'Failed to create show'));
    } finally {
      setSaving(false);
    }
  };

  const fieldChange = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="admin-page page">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Admin Dashboard' }]} />
        <div className="admin-header fade-up">
          <div>
            <h1 className="section-title">Admin Dashboard</h1>
            <p className="section-sub">Manage shows, bookings, and more</p>
          </div>
        </div>

        <div className="admin-tabs fade-up">
          {TABS.map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'Shows' && '🎬 '}{t === 'Bookings' && '🎟 '}{t === 'Add Show' && '➕ '}{t}
            </button>
          ))}
        </div>

        {/* Shows Tab */}
        {tab === 'Shows' && (
          <div className="admin-section fade-in">
            {showsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Movie</th><th>Theater</th><th>Date & Time</th><th>Price</th><th>Seats</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shows.map(show => (
                      <tr key={show._id}>
                        <td>
                          <div className="table-movie-name">{show.movieName}</div>
                          <div className="table-sub">{show.language} · {show.rating} · {show.duration}min</div>
                        </td>
                        <td>
                          <div>{show.theater}</div>
                          <div className="table-sub">{show.screen}</div>
                        </td>
                        <td className="table-mono">{formatDateTime(show.startTime)}</td>
                        <td className="table-mono gold">{formatCurrency(show.basePrice)}</td>
                        <td className="table-mono">{show.totalSeats}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(show._id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shows.length === 0 && (
                  <div className="empty-state"><div className="icon">🎭</div><h3>No shows found</h3></div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {tab === 'Bookings' && (
          <div className="admin-section fade-in">
            {bookingsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th><th>User</th><th>Movie</th><th>Seats</th><th>Amount</th><th>Status</th><th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => {
                        const statusColors = { confirmed: 'var(--green)', pending: 'var(--gold)', cancelled: 'var(--red)', expired: 'var(--red)', failed: 'var(--red)' };
                        return (
                          <tr key={b._id}>
                            <td><span className="table-mono table-id">#{b._id.slice(-6).toUpperCase()}</span></td>
                            <td>
                              <div>{b.userId?.name || '—'}</div>
                              <div className="table-sub">{b.userId?.email}</div>
                            </td>
                            <td>{b.showId?.movieName || '—'}</td>
                            <td>
                              <div className="mini-seats-wrap">
                                {b.seats.sort().map(s => <span key={s} className="mini-seat-admin">{s}</span>)}
                              </div>
                            </td>
                            <td className="table-mono gold">{formatCurrency(b.totalPrice)}</td>
                            <td>
                              <span className="table-status" style={{ color: statusColors[b.status] }}>
                                ● {b.status}
                              </span>
                            </td>
                            <td className="table-sub">{formatDateTime(b.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bookings.length === 0 && (
                    <div className="empty-state"><div className="icon">🎟</div><h3>No bookings yet</h3></div>
                  )}
                </div>
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMoreBookings && <div style={{ textAlign: 'center', padding: '16px' }}><div className="spinner" /></div>}
              </>
            )}
          </div>
        )}

        {/* Add Show Tab */}
        {tab === 'Add Show' && (
          <div className="admin-section fade-in">
            <div className="add-show-form-wrap">
              <form className="add-show-form" onSubmit={handleAddShow}>
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Movie Name *</label>
                    <input className="input-field" value={form.movieName} onChange={fieldChange('movieName')} placeholder="e.g. Interstellar" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Theater *</label>
                    <input className="input-field" value={form.theater} onChange={fieldChange('theater')} placeholder="e.g. PVR Cinemas" required />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea className="input-field" value={form.description} onChange={fieldChange('description')} rows={3} placeholder="Movie synopsis..." />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Genre (comma separated)</label>
                    <input className="input-field" value={form.genre} onChange={fieldChange('genre')} placeholder="Action, Sci-Fi, Drama" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Language</label>
                    <select className="input-field" value={form.language} onChange={fieldChange('language')}>
                      {['English','Hindi','Telugu','Tamil','Malayalam','Kannada'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Duration (minutes) *</label>
                    <input className="input-field" type="number" value={form.duration} onChange={fieldChange('duration')} placeholder="120" required min={1} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Rating</label>
                    <select className="input-field" value={form.rating} onChange={fieldChange('rating')}>
                      {['U','UA','A','S'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Screen</label>
                    <input className="input-field" value={form.screen} onChange={fieldChange('screen')} placeholder="Screen 1" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Start Time *</label>
                    <input className="input-field" type="datetime-local" value={form.startTime} onChange={fieldChange('startTime')} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Base Price (₹) *</label>
                    <input className="input-field" type="number" value={form.basePrice} onChange={fieldChange('basePrice')} placeholder="200" required min={0} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Total Seats</label>
                    <input className="input-field" type="number" value={form.totalSeats} onChange={fieldChange('totalSeats')} min={6} max={120} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Poster URL (optional)</label>
                  <input className="input-field" value={form.posterUrl || ''} onChange={fieldChange('posterUrl')} placeholder="https://..." />
                </div>

                {saveMsg && (
                  <div className={`save-msg ${saveMsg.startsWith('✅') ? 'success' : 'error'}`}>{saveMsg}</div>
                )}

                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving ? <><span className="spinner" /> Creating...</> : 'Create Show'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
