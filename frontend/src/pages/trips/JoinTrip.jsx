import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Spinner } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/errors';

export default function JoinTrip() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter an invite code.');
      return;
    }
    if (code.trim().length !== 6) {
      toast.error('Invite codes are 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/trips/join', { invite_code: code.trim() });
      toast.success(data.message);
      navigate(`/trips/${data.trip.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not join the trip'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔗</div>
          <h1 className="text-2xl font-bold text-slate-800">Join a Trip</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter the 6-character invite code shared by your organizer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="code" className="label">Invite Code</label>
            <div className="relative">
              <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input pl-9 text-center tracking-widest text-lg font-mono uppercase"
                placeholder="ABC123"
                maxLength={6}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full justify-center">
            {loading ? <Spinner size="sm" className="text-white" /> : null}
            {loading ? 'Joining…' : 'Join Trip'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-4">
          Don't have a code? Ask your trip organizer to share it.
        </p>
      </div>
    </div>
  );
}
