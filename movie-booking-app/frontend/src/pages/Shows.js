import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import MovieCard from '../components/MovieCard';
import './Shows.css';

const GENRES = ['Action', 'Drama', 'Sci-Fi', 'Comedy', 'Thriller', 'Adventure', 'Biography', 'History', 'Mythology'];

export default function Shows() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchShows = useCallback(async (cursor = null, replace = false) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const params = { limit: 8 };
      if (cursor) params.cursor = cursor;
      if (debouncedSearch) params.search = debouncedSearch;
      if (genre) params.genre = genre;

      const { data } = await api.get('/shows', { params });
      if (replace) {
        setShows(data.shows);
      } else {
        setShows(prev => [...prev, ...data.shows]);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, genre]);

  // Reset on filter change
  useEffect(() => {
    setNextCursor(null);
    fetchShows(null, true);
  }, [fetchShows]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && nextCursor) {
          fetchShows(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, nextCursor, fetchShows]);

  return (
    <div className="shows-page page">
      <div className="shows-hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-title-main">NOW</span>
              <span className="hero-title-accent">SHOWING</span>
            </h1>
            <p className="hero-sub">Book your seats for the hottest shows in town</p>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Filters */}
        <div className="filters fade-in">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text" placeholder="Search movies..."
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <div className="genre-filters">
            <button
              className={`genre-btn ${!genre ? 'active' : ''}`}
              onClick={() => setGenre('')}
            >All</button>
            {GENRES.map(g => (
              <button
                key={g}
                className={`genre-btn ${genre === g ? 'active' : ''}`}
                onClick={() => setGenre(genre === g ? '' : g)}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="movie-card-skeleton">
                <div className="skeleton" style={{ height: 220 }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 20, width: '85%' }} />
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                  <div className="skeleton" style={{ height: 40 }} />
                  <div className="skeleton" style={{ height: 32 }} />
                </div>
              </div>
            ))}
          </div>
        ) : shows.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎭</div>
            <h3>No shows found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="shows-meta">
              <span>{shows.length} show{shows.length !== 1 ? 's' : ''} {hasMore ? '(scroll for more)' : ''}</span>
            </div>
            <div className="grid-3">
              {shows.map((show, i) => (
                <div key={show._id} style={{ animationDelay: `${(i % 8) * 0.05}s` }}>
                  <MovieCard show={show} />
                </div>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {loadingMore && (
              <div className="load-more-spinner">
                <div className="spinner spinner-lg" />
                <span>Loading more shows...</span>
              </div>
            )}

            {!hasMore && shows.length > 0 && (
              <div className="end-msg">
                <span>✦ You've seen all shows ✦</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
