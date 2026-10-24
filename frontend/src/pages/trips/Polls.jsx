import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { SectionLoader } from '../../components/ui/Loader';
import { getInitials, avatarColor, cn } from '../../lib/utils';
import { useSocketEvent } from '../../hooks/useSocket';
import { getErrorMessage } from '../../lib/errors';

export default function Polls() {
  const { id: tripId } = useParams();
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState('member');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPolls = () => {
    api.get(`/trips/${tripId}/polls`)
      .then(({ data }) => setPolls(data.polls))
      .catch((err) => toast.error(getErrorMessage(err, 'Failed to load polls')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPolls();
    api.get(`/trips/${tripId}`).then(({ data }) => setMyRole(data.trip.my_role)).catch(() => {});
  }, [tripId]);

  useSocketEvent('poll_update', fetchPolls);

  const handleVote = async (pollId, optionId) => {
    try {
      const { data } = await api.post(`/trips/${tripId}/polls/${pollId}/vote`, { option_id: optionId });
      setPolls(prev => prev.map(p => p.id === pollId ? data.poll : p));
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to vote')); }
  };

  const handleClose = async (pollId) => {
    try {
      await api.patch(`/trips/${tripId}/polls/${pollId}/close`);
      toast.success('Poll closed');
      fetchPolls();
    } catch (err) { toast.error(getErrorMessage(err, 'Could not close the poll')); }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await api.delete(`/trips/${tripId}/polls/${pollId}`);
      toast.success('Poll deleted');
      fetchPolls();
    } catch (err) { toast.error(getErrorMessage(err, 'Could not delete the poll')); }
  };

  if (loading) return <SectionLoader />;

  return (
    <div className="flex flex-col gap-space-xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-newsreader text-headline-md text-on-surface">Polls & Decisions</h2>
          <p className="font-manrope text-body-sm text-on-surface-variant mt-0.5">
            {polls.length} poll{polls.length !== 1 ? 's' : ''} · vote to decide together
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-secondary">
          <span className="material-symbols-outlined text-xl">add</span> New Poll
        </button>
      </div>

      {/* ── Poll list ── */}
      {polls.length === 0 ? (
        <EmptyPolls onCreate={() => setModalOpen(true)} />
      ) : (
        <div className="flex flex-col gap-space-lg">
          {polls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              userId={user?.id}
              myRole={myRole}
              onVote={handleVote}
              onClose={handleClose}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreatePollModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tripId={tripId}
        onCreated={fetchPolls}
      />
    </div>
  );
}

/* ── Poll Card ─────────────────────────────────────────────────── */
function PollCard({ poll, userId, myRole, onVote, onClose, onDelete }) {
  const totalVotes = poll.poll_options?.reduce((s, o) => s + (o.poll_votes?.length || 0), 0) || 0;
  const isClosed = poll.status === 'closed';
  const isOrganizer = myRole === 'organizer';

  const userVotedOptionId = poll.poll_options
    ?.flatMap(opt => (opt.poll_votes || []).map(v => ({ optId: opt.id, userId: v.user_id })))
    .find(v => v.userId === userId)?.optId;

  const winnerVotes = Math.max(...(poll.poll_options?.map(o => o.poll_votes?.length || 0) || [0]));

  // Collect unique voters
  const voters = poll.poll_options
    ?.flatMap(o => o.poll_votes?.map(v => v.users) || [])
    .filter(Boolean)
    .filter((u, i, arr) => arr.findIndex(x => x?.id === u?.id) === i)
    .slice(0, 6);

  return (
    <div className={cn(
      'bg-surface-container-lowest border rounded-xl overflow-hidden shadow-card transition-opacity',
      isClosed ? 'border-outline-variant opacity-80' : 'border-outline-variant'
    )}>
      {/* Card header */}
      <div className="px-space-lg pt-space-lg pb-space-md border-b border-outline-variant">
        <div className="flex items-start justify-between gap-space-md">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-sm mb-2 flex-wrap">
              {isClosed ? (
                <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-surface-container font-manrope text-label-caps text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm">lock</span> CLOSED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-emerald/10 font-manrope text-label-caps text-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                  OPEN
                </span>
              )}
              <span className="font-manrope text-label-caps text-on-surface-variant">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="font-newsreader text-headline-sm text-on-surface leading-snug">
              {poll.question}
            </h3>
            <p className="font-manrope text-body-sm text-on-surface-variant mt-1">
              by {poll.users?.name}
            </p>
          </div>

          {/* Organizer actions */}
          {isOrganizer && (
            <div className="flex gap-1 shrink-0">
              {!isClosed && (
                <button
                  onClick={() => onClose(poll.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface-variant transition-all"
                  title="Close poll"
                >
                  <span className="material-symbols-outlined text-base">lock</span>
                </button>
              )}
              <button
                onClick={() => onDelete(poll.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant transition-all"
                title="Delete poll"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-space-lg py-space-md flex flex-col gap-space-sm">
        {poll.poll_options?.map(option => {
          const votes = option.poll_votes?.length || 0;
          const pct   = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isVoted   = userVotedOptionId === option.id;
          const isWinner  = isClosed && votes === winnerVotes && votes > 0;

          return (
            <button
              key={option.id}
              onClick={() => !isClosed && onVote(poll.id, option.id)}
              disabled={isClosed}
              className={cn(
                'w-full text-left rounded-xl border overflow-hidden transition-all duration-200',
                isClosed ? 'cursor-default' : 'cursor-pointer hover:border-secondary/60',
                isVoted  ? 'border-secondary bg-secondary-fixed/20' : 'border-outline-variant bg-surface-container-low',
                isWinner ? 'ring-2 ring-emerald/50' : ''
              )}
            >
              <div className="px-space-md py-3 flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm min-w-0 flex-1">
                  {isWinner && <span className="material-symbols-outlined text-base text-emerald shrink-0">emoji_events</span>}
                  {isVoted && !isWinner && (
                    <span className="material-symbols-outlined text-base text-secondary shrink-0">check_circle</span>
                  )}
                  <span className={cn(
                    'font-manrope text-label-lg truncate',
                    isVoted ? 'text-secondary font-semibold' : 'text-on-surface'
                  )}>
                    {option.text}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-manrope text-label-lg font-semibold text-on-surface">{votes}</span>
                  <span className="font-manrope text-label-caps text-on-surface-variant ml-1">{pct}%</span>
                </div>
              </div>
              {/* Progress fill */}
              <div className="h-1 bg-surface-container">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    isWinner ? 'bg-emerald' : isVoted ? 'bg-secondary' : 'bg-outline-variant'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Voter avatar stack */}
      {voters.length > 0 && (
        <div className="px-space-lg pb-space-md flex items-center gap-space-sm">
          <div className="flex items-center -space-x-2">
            {voters.map((u, i) => (
              <div
                key={u?.id ?? i}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-white font-manrope text-[10px] font-bold ring-2 ring-surface-container-lowest',
                  avatarColor(u?.name)
                )}
                title={u?.name}
              >
                {getInitials(u?.name)}
              </div>
            ))}
          </div>
          <span className="font-manrope text-body-sm text-on-surface-variant">
            {totalVotes} {totalVotes === 1 ? 'person has' : 'people have'} voted
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Empty state ── */
function EmptyPolls({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-space-lg text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">how_to_vote</span>
      </div>
      <div>
        <h3 className="font-newsreader text-headline-sm text-on-surface mb-1">No polls yet</h3>
        <p className="font-manrope text-body-md text-on-surface-variant max-w-xs">
          Can't agree on something? Create a poll and let the group decide.
        </p>
      </div>
      <button onClick={onCreate} className="btn-secondary">
        <span className="material-symbols-outlined text-xl">add</span> Create First Poll
      </button>
    </div>
  );
}

/* ── Create Poll Modal ── */
function CreatePollModal({ open, onClose, tripId, onCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setQuestion(''); setOptions(['', '']); }
  }, [open]);

  const addOption    = () => setOptions(o => [...o, '']);
  const removeOption = i  => setOptions(o => o.filter((_, idx) => idx !== i));
  const updateOption = (i, v) => setOptions(o => o.map((x, idx) => idx === i ? v : x));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) { toast.error('Please enter a question for the poll.'); return; }
    const valid = options.map(o => o.trim()).filter(Boolean);
    if (valid.length < 2) { toast.error('A poll needs at least 2 options. Fill in at least two boxes.'); return; }
    if (new Set(valid.map(o => o.toLowerCase())).size !== valid.length) {
      toast.error('Poll options must all be different from each other.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/trips/${tripId}/polls`, { question, options: valid });
      toast.success('Poll created!');
      onCreated(); onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create the poll'));
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a Poll">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label">Question <span className="text-error">*</span></label>
          <input
            required value={question} onChange={e => setQuestion(e.target.value)}
            className="input" placeholder="e.g. Where should we eat Saturday night?"
          />
        </div>

        <div>
          <label className="label">Options <span className="text-error">*</span></label>
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt} onChange={e => updateOption(i, e.target.value)}
                  className="input flex-1" placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button" onClick={() => removeOption(i)}
                    className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant transition-all shrink-0"
                    aria-label="Remove option"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button" onClick={addOption}
            className="mt-2 inline-flex items-center gap-1.5 font-manrope text-label-lg text-secondary hover:text-secondary-container transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span> Add option
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-secondary flex-1 justify-center">
            {loading ? 'Creating…' : 'Create Poll'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
