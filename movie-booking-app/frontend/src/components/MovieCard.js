import { Link } from 'react-router-dom';
import { formatDate, formatTime, formatCurrency, formatDuration } from '../utils/helpers';
import './MovieCard.css';

export default function MovieCard({ show }) {
  const isPeak = () => {
    const h = new Date(show.startTime).getHours();
    return h >= 18 && h < 23;
  };

  return (
    <Link to={`/shows/${show._id}`} className="movie-card fade-up">
      <div className="movie-poster">
        {show.posterUrl ? (
          <img src={show.posterUrl} alt={show.movieName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="poster-fallback" style={{ display: show.posterUrl ? 'none' : 'flex' }}>
          <span>🎬</span>
        </div>
        <div className="movie-rating-badge">{show.rating}</div>
        {isPeak() && <div className="peak-badge">PEAK</div>}
      </div>

      <div className="movie-info">
        <div className="movie-genres">
          {show.genre?.slice(0, 2).map(g => (
            <span key={g} className="genre-chip">{g}</span>
          ))}
          <span className="genre-chip lang">{show.language}</span>
        </div>

        <h3 className="movie-title">{show.movieName}</h3>

        <div className="movie-meta">
          <span>⏱ {formatDuration(show.duration)}</span>
          <span>·</span>
          <span>🏛 {show.theater}</span>
        </div>

        <div className="movie-schedule">
          <div className="schedule-item">
            <span className="schedule-label">DATE</span>
            <span className="schedule-val">{formatDate(show.startTime)}</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-label">TIME</span>
            <span className="schedule-val">{formatTime(show.startTime)}</span>
          </div>
        </div>

        <div className="movie-footer">
          <div className="price-display">
            <span className="price-from">from</span>
            <span className="price-val">{formatCurrency(show.basePrice)}</span>
          </div>
          <div className="book-btn">Book →</div>
        </div>
      </div>
    </Link>
  );
}
