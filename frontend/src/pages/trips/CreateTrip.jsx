import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Globe, Calendar, IndianRupee, FileText, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { Spinner } from '../../components/ui/Loader';
import { getErrorMessage } from '../../lib/errors';

// Common Indian + international cities for quick pick
const POPULAR_CITIES = [
  'Goa', 'Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Manali',
  'Rishikesh', 'Kerala', 'Ladakh', 'Udaipur', 'Ooty', 'Shimla',
  'Kolkata', 'Hyderabad', 'Agra', 'Varanasi', 'Bali', 'Bangkok',
  'Dubai', 'Singapore', 'Paris', 'London', 'New York', 'Tokyo',
];

// Today's date (in the user's OWN timezone) as YYYY-MM-DD.
// toISOString() would give the UTC date, which is wrong for a few hours each day.
const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function CreateTrip() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', city: '', country: '', start_date: '', end_date: '', description: '', budget: '',
  });
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCityInput = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, city: val }));
    if (val.length > 0) {
      const matches = POPULAR_CITIES.filter((c) =>
        c.toLowerCase().startsWith(val.toLowerCase())
      );
      setCitySuggestions(matches.slice(0, 5));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const pickCity = (city) => {
    setForm((f) => ({ ...f, city }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please give your trip a title.');
      return;
    }
    if (!form.city.trim()) {
      toast.error('Please enter the city you are travelling to.');
      return;
    }
    if (!form.start_date) {
      toast.error('Please choose a start date.');
      return;
    }
    if (!form.end_date) {
      toast.error('Please choose an end date.');
      return;
    }
    if (form.start_date < todayStr()) {
      toast.error('The start date cannot be in the past. Pick today or a future date.');
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error('The end date must be on or after the start date.');
      return;
    }
    if (form.budget !== '' && (isNaN(parseFloat(form.budget)) || parseFloat(form.budget) < 0)) {
      toast.error('Budget must be a number that is 0 or more.');
      return;
    }
    setLoading(true);
    try {
      // Combine city + country into destination string
      const destination = form.country.trim()
        ? `${form.city.trim()}, ${form.country.trim()}`
        : form.city.trim();

      const { data } = await api.post('/trips', {
        title: form.title,
        destination,
        start_date: form.start_date,
        end_date: form.end_date,
        description: form.description,
        budget: form.budget ? parseFloat(form.budget) : 0,
      });
      toast.success('Trip created! Share the invite code with your crew 🎉');
      navigate(`/trips/${data.trip.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create the trip'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-2xl shrink-0">
            ✈️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create a New Trip</h1>
            <p className="text-slate-500 text-sm">Fill in the details below and invite your crew</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Trip Title */}
          <div>
            <label htmlFor="title" className="label">
              Trip Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title" name="title" required
              value={form.title} onChange={handleChange}
              className="input" placeholder="e.g. Goa Trip Dec 2026"
            />
            <p className="text-xs text-slate-400 mt-1">Give your trip a memorable name your group will recognise.</p>
          </div>

          {/* Destination — City + Country */}
          <div>
            <label className="label">
              Destination <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-5 gap-3">
              {/* City — 3/5 width */}
              <div className="col-span-3 relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                <input
                  id="city" name="city" required
                  value={form.city}
                  onChange={handleCityInput}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => form.city && setShowSuggestions(citySuggestions.length > 0)}
                  className="input pl-9"
                  placeholder="City *"
                  autoComplete="off"
                />
                {/* Autocomplete dropdown */}
                {showSuggestions && (
                  <ul className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-surface-200 rounded-lg shadow-card-md overflow-hidden">
                    {citySuggestions.map((city) => (
                      <li key={city}>
                        <button
                          type="button"
                          onMouseDown={() => pickCity(city)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 hover:text-primary-700 flex items-center gap-2"
                        >
                          <MapPin size={12} className="text-slate-400" /> {city}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Country — 2/5 width */}
              <div className="col-span-2 relative">
                <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="country" name="country"
                  value={form.country} onChange={handleChange}
                  className="input pl-9"
                  placeholder="Country"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Enter the city you're heading to. Country is optional.</p>
          </div>

          {/* Dates */}
          <div>
            <label className="label">
              Dates <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="start_date" name="start_date" type="date" required
                  value={form.start_date} onChange={handleChange}
                  className="input pl-9"
                  min={todayStr()}
                  aria-label="Start date"
                />
              </div>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="end_date" name="end_date" type="date" required
                  value={form.end_date} onChange={handleChange}
                  className="input pl-9"
                  min={form.start_date}
                  aria-label="End date"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="label">Estimated Budget</label>
            <div className="relative">
              <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="budget" name="budget" type="number" min="0"
                value={form.budget} onChange={handleChange}
                className="input pl-9" placeholder="e.g. 35000"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Set a rough total so the group can track spending against it.</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">Trip Description</label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <textarea
                id="description" name="description" rows={3}
                value={form.description} onChange={handleChange}
                className="input pl-9 resize-none"
                placeholder="What's the vibe? Beach holiday, adventure trek, family reunion…"
              />
            </div>
          </div>

          {/* Preview pill */}
          {form.city && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-surface-100 rounded-lg px-4 py-2.5">
              <MapPin size={14} className="text-primary-500" />
              <span>
                Heading to <strong className="text-slate-800">
                  {form.city}{form.country ? `, ${form.country}` : ''}
                </strong>
                {form.start_date && form.end_date && (
                  <> · {form.start_date} → {form.end_date}</>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Spinner size="sm" className="text-white" /> : null}
              {loading ? 'Creating…' : 'Create Trip 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
