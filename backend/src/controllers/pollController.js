const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { getMembership } = require('../utils/membership');
const { sendError, handleError, isNonEmptyString, isUuid } = require('../utils/errors');

const NOT_MEMBER = 'You are not a member of this trip, or it no longer exists.';
const POLL_SELECT = `
  *,
  users(id, name),
  poll_options(id, text, order_index, poll_votes(user_id, users(id, name)))
`;

// GET /api/trips/:tripId/polls
const getPolls = async (req, res) => {
  try {
    const { tripId } = req.params;
    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const { data: polls, error } = await supabase
      .from('polls')
      .select(`
        *,
        users(id, name),
        poll_options(
          id, text, order_index,
          poll_votes(user_id, users(id, name))
        )
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ polls });
  } catch (err) {
    return handleError(res, err, 'getPolls');
  }
};

// POST /api/trips/:tripId/polls
const createPoll = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { question, options, closes_at } = req.body || {};

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    if (!isNonEmptyString(question)) return sendError(res, 400, 'Please enter a question for the poll.');
    if (!Array.isArray(options)) return sendError(res, 400, 'Please add at least 2 options.');

    const cleanOptions = options
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter(Boolean);

    if (cleanOptions.length < 2) return sendError(res, 400, 'A poll needs at least 2 non-empty options.');
    if (cleanOptions.length > 10) return sendError(res, 400, 'A poll can have at most 10 options.');
    const unique = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (unique.size !== cleanOptions.length) {
      return sendError(res, 400, 'Poll options must all be different from each other.');
    }
    if (closes_at && Number.isNaN(new Date(closes_at).getTime())) {
      return sendError(res, 400, 'The poll closing time is not a valid date.');
    }

    const pollId = uuidv4();

    const { error: pollError } = await supabase
      .from('polls')
      .insert([{
        id: pollId,
        trip_id: tripId,
        question: question.trim(),
        created_by: req.user.id,
        closes_at: closes_at || null,
        status: 'open',
      }]);

    if (pollError) throw pollError;

    // Insert options
    const optionRows = cleanOptions.map((text, index) => ({
      id: uuidv4(),
      poll_id: pollId,
      text,
      order_index: index,
    }));

    const { error: optError } = await supabase.from('poll_options').insert(optionRows);
    if (optError) {
      // Don't leave behind a poll with no options
      await supabase.from('polls').delete().eq('id', pollId);
      throw optError;
    }

    const { data: fullPoll, error: fetchError } = await supabase
      .from('polls')
      .select(POLL_SELECT)
      .eq('id', pollId)
      .single();
    if (fetchError) throw fetchError;

    req.io?.to(`trip:${tripId}`).emit('poll_update', {
      action: 'created',
      poll: fullPoll,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.status(201).json({ poll: fullPoll });
  } catch (err) {
    return handleError(res, err, 'createPoll');
  }
};

// POST /api/trips/:tripId/polls/:pollId/vote
const vote = async (req, res) => {
  try {
    const { tripId, pollId } = req.params;
    const { option_id } = req.body || {};

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    if (!option_id) return sendError(res, 400, 'Please choose an option to vote for.');
    if (!isUuid(option_id)) return sendError(res, 400, 'That option is not valid.');

    // Poll must belong to this trip and be open
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('status')
      .eq('id', pollId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (pollError) throw pollError;

    if (!poll) return sendError(res, 404, 'That poll could not be found. It may have been deleted.');
    if (poll.status !== 'open') return sendError(res, 400, 'This poll is closed, so votes can no longer be changed.');

    // Option must belong to this poll
    const { data: option, error: optionError } = await supabase
      .from('poll_options')
      .select('id')
      .eq('id', option_id)
      .eq('poll_id', pollId)
      .maybeSingle();
    if (optionError) throw optionError;
    if (!option) return sendError(res, 400, 'That option does not belong to this poll.');

    // Existing vote in this poll?
    const { data: existingVote, error: voteLookupError } = await supabase
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (voteLookupError) throw voteLookupError;

    if (existingVote) {
      if (existingVote.option_id === option_id) {
        // Toggle off — remove vote
        const { error } = await supabase.from('poll_votes').delete().eq('id', existingVote.id);
        if (error) throw error;
      } else {
        // Change vote
        const { error } = await supabase
          .from('poll_votes')
          .update({ option_id, updated_at: new Date().toISOString() })
          .eq('id', existingVote.id);
        if (error) throw error;
      }
    } else {
      const { error } = await supabase.from('poll_votes').insert([{
        id: uuidv4(),
        poll_id: pollId,
        option_id,
        user_id: req.user.id,
      }]);
      if (error) throw error;
    }

    // Return updated poll (also after removing a vote, so the UI stays in sync)
    const { data: updatedPoll, error: fetchError } = await supabase
      .from('polls')
      .select(POLL_SELECT)
      .eq('id', pollId)
      .single();
    if (fetchError) throw fetchError;

    req.io?.to(`trip:${tripId}`).emit('poll_update', {
      action: 'voted',
      poll: updatedPoll,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ poll: updatedPoll });
  } catch (err) {
    return handleError(res, err, 'vote');
  }
};

// PATCH /api/trips/:tripId/polls/:pollId/close
const closePoll = async (req, res) => {
  try {
    const { tripId, pollId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);
    if (member.role !== 'organizer') {
      return sendError(res, 403, 'Only the trip organizer can close polls.');
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('status')
      .eq('id', pollId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!poll) return sendError(res, 404, 'That poll could not be found. It may have been deleted.');
    if (poll.status === 'closed') return sendError(res, 400, 'This poll is already closed.');

    const { data, error } = await supabase
      .from('polls')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', pollId)
      .eq('trip_id', tripId)
      .select()
      .single();

    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('poll_update', {
      action: 'closed',
      poll: data,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ poll: data });
  } catch (err) {
    return handleError(res, err, 'closePoll');
  }
};

// DELETE /api/trips/:tripId/polls/:pollId
const deletePoll = async (req, res) => {
  try {
    const { tripId, pollId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);
    if (member.role !== 'organizer') {
      return sendError(res, 403, 'Only the trip organizer can delete polls.');
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id')
      .eq('id', pollId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!poll) return sendError(res, 404, 'That poll could not be found. It may have already been deleted.');

    const { error: votesError } = await supabase.from('poll_votes').delete().eq('poll_id', pollId);
    if (votesError) throw votesError;
    const { error: optionsError } = await supabase.from('poll_options').delete().eq('poll_id', pollId);
    if (optionsError) throw optionsError;
    const { error } = await supabase.from('polls').delete().eq('id', pollId).eq('trip_id', tripId);
    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('poll_update', {
      action: 'deleted',
      pollId,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ message: 'Poll deleted' });
  } catch (err) {
    return handleError(res, err, 'deletePoll');
  }
};

module.exports = { getPolls, createPoll, vote, closePoll, deletePoll };
