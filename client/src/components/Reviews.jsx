import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { date, stars } from '../utils/format.js';

// Form used both for writing a new review and editing an existing one.
function ReviewForm({ initial, onSave, onCancel }) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSave({ rating: Number(rating), comment });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        Rating
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} – {'★'.repeat(n)}</option>)}
        </select>
      </label>
      <label>
        Comment
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row-actions">
        <button type="submit">Save review</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function Reviews({ productId, reviews, reload }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);

  const mine = user ? reviews.find((r) => r.user_id === user.user_id) : null;

  const create = async (data) => {
    await api.post(`/products/${productId}/reviews`, data);
    reload();
  };
  const update = async (id, data) => {
    await api.put(`/reviews/${id}`, data);
    setEditingId(null);
    reload();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.del(`/reviews/${id}`);
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section>
      <h3>Reviews ({reviews.length})</h3>

      {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.map((r) => (
        <div key={r.review_id} className="review">
          {editingId === r.review_id ? (
            <ReviewForm initial={r} onSave={(data) => update(r.review_id, data)} onCancel={() => setEditingId(null)} />
          ) : (
            <>
              <strong>{r.username}</strong> <span className="stars">{stars(r.rating)}</span>{' '}
              <span className="muted">{date(r.review_date)}</span>
              {r.comment && <p>{r.comment}</p>}
              {user && (r.user_id === user.user_id || user.is_admin) && (
                <div className="row-actions">
                  {r.user_id === user.user_id && <button className="secondary" onClick={() => setEditingId(r.review_id)}>Edit</button>}
                  <button className="secondary" onClick={() => remove(r.review_id)}>Delete</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {user && !user.is_admin && !mine && (
        <>
          <h4>Write a review</h4>
          <ReviewForm onSave={create} />
        </>
      )}
      {!user && <p className="muted">Log in to write a review.</p>}
    </section>
  );
}
