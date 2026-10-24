const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { getMembership } = require('../utils/membership');
const {
  sendError, handleError, isValidDate, isNonEmptyString,
} = require('../utils/errors');

const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const MAX_BUDGET = 9_999_999_999; // NUMERIC(12,2) limit

/** Returns an error string if `value` is not a valid budget, else null. Empty is allowed. */
const validateBudget = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n))  return 'Budget must be a number.';
  if (n < 0)                return 'Budget cannot be negative.';
  if (n > MAX_BUDGET)       return 'Budget is too large.';
  return null;
};

// ── POST /api/trips ────────────────────────────────────────────
const createTrip = async (req, res) => {
  try {
    const { title, destination, start_date, end_date, description, budget } = req.body || {};

    if (!isNonEmptyString(title))       return sendError(res, 400, 'Please give your trip a title.');
    if (!isNonEmptyString(destination)) return sendError(res, 400, 'Please enter a destination.');
    if (!start_date || !end_date)       return sendError(res, 400, 'Please choose both a start date and an end date.');
    if (!isValidDate(start_date))       return sendError(res, 400, 'The start date is not a valid date.');
    if (!isValidDate(end_date))         return sendError(res, 400, 'The end date is not a valid date.');
    if (title.trim().length > 100)      return sendError(res, 400, 'Trip title must be 100 characters or fewer.');

    // Reject past start dates. We allow a one-day grace because the server
    // compares against the UTC date, which can differ from the user's local
    // date by up to a day depending on their timezone.
    const graceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (start_date < graceDay) {
      return sendError(res, 400, 'The start date cannot be in the past. Pick today or a future date.');
    }
    if (end_date < start_date) {
      return sendError(res, 400, 'The end date must be on or after the start date.');
    }

    const budgetError = validateBudget(budget);
    if (budgetError) return sendError(res, 400, budgetError);

    const tripId = uuidv4();
    const invite_code = generateInviteCode();

    const { data: trip, error } = await supabase
      .from('trips')
      .insert([{
        id: tripId,
        title: title.trim(),
        destination: destination.trim(),
        start_date,
        end_date,
        description: description || '',
        budget: budget ? Number(budget) : 0,
        invite_code,
        organizer_id: req.user.id,
        status: 'upcoming',
      }])
      .select()
      .single();

    if (error) throw error;

    const { error: memberError } = await supabase.from('trip_members').insert([{
      id: uuidv4(),
      trip_id: tripId,
      user_id: req.user.id,
      role: 'organizer',
    }]);

    if (memberError) {
      // Don't leave behind a trip nobody can open
      await supabase.from('trips').delete().eq('id', tripId);
      throw memberError;
    }

    return res.status(201).json({ trip });
  } catch (err) {
    return handleError(res, err, 'createTrip');
  }
};

// ── GET /api/trips ─────────────────────────────────────────────
const getMyTrips = async (req, res) => {
  try {
    const { data: memberships, error } = await supabase
      .from('trip_members')
      .select('role, trips(*)')
      .eq('user_id', req.user.id)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    const trips = memberships.map((m) => ({ ...m.trips, role: m.role }));
    return res.json({ trips });
  } catch (err) {
    return handleError(res, err, 'getMyTrips');
  }
};

// ── GET /api/trips/:id ─────────────────────────────────────────
const getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await getMembership(id, req.user.id);
    if (!member) {
      return sendError(res, 403, 'You are not a member of this trip, or it no longer exists.');
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        trip_members(
          role,
          joined_at,
          users(id, name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!trip) return sendError(res, 404, 'This trip could not be found.');

    return res.json({ trip: { ...trip, my_role: member.role } });
  } catch (err) {
    return handleError(res, err, 'getTripById');
  }
};

// ── PATCH /api/trips/:id ───────────────────────────────────────
const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, destination, start_date, end_date, description, budget, status } = req.body || {};

    const member = await getMembership(id, req.user.id);
    if (!member) return sendError(res, 403, 'You are not a member of this trip, or it no longer exists.');
    if (member.role !== 'organizer') {
      return sendError(res, 403, 'Only the trip organizer can change this trip.');
    }

    // Validate status if provided
    const validStatuses = ['upcoming', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return sendError(res, 400, `Status must be one of: ${validStatuses.join(', ')}.`);
    }
    if (title !== undefined && !isNonEmptyString(title)) {
      return sendError(res, 400, 'The trip title cannot be empty.');
    }
    if (destination !== undefined && !isNonEmptyString(destination)) {
      return sendError(res, 400, 'The destination cannot be empty.');
    }
    if (start_date && !isValidDate(start_date)) return sendError(res, 400, 'The start date is not a valid date.');
    if (end_date   && !isValidDate(end_date))   return sendError(res, 400, 'The end date is not a valid date.');
    const budgetError = validateBudget(budget);
    if (budgetError) return sendError(res, 400, budgetError);

    // If only one date changes, compare against the stored other date
    if (start_date || end_date) {
      const { data: current, error: currentError } = await supabase
        .from('trips').select('start_date, end_date').eq('id', id).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return sendError(res, 404, 'This trip could not be found.');
      const newStart = start_date || current.start_date;
      const newEnd   = end_date   || current.end_date;
      if (newEnd < newStart) {
        return sendError(res, 400, 'The end date must be on or after the start date.');
      }
    }

    const updates = {};
    if (title)                     updates.title       = title.trim();
    if (destination)               updates.destination = destination.trim();
    if (start_date)                updates.start_date  = start_date;
    if (end_date)                  updates.end_date    = end_date;
    if (description !== undefined) updates.description = description;
    if (budget !== undefined && budget !== '') updates.budget = Number(budget);
    if (status)                    updates.status      = status;

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'Nothing to update. Send at least one field to change.');
    }
    updates.updated_at = new Date().toISOString();

    const { data: trip, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!trip) return sendError(res, 404, 'This trip could not be found.');

    return res.json({ trip });
  } catch (err) {
    return handleError(res, err, 'updateTrip');
  }
};

// ── DELETE /api/trips/:id ──────────────────────────────────────
const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await getMembership(id, req.user.id);
    if (!member) return sendError(res, 403, 'You are not a member of this trip, or it no longer exists.');
    if (member.role !== 'organizer') {
      return sendError(res, 403, 'Only the trip organizer can delete this trip.');
    }

    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;

    return res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    return handleError(res, err, 'deleteTrip');
  }
};

// ── POST /api/trips/join ───────────────────────────────────────
const joinTrip = async (req, res) => {
  try {
    const invite_code = typeof req.body?.invite_code === 'string' ? req.body.invite_code.trim() : '';
    if (!invite_code) {
      return sendError(res, 400, 'Please enter an invite code.');
    }
    if (invite_code.length !== 6) {
      return sendError(res, 400, 'Invite codes are 6 characters long.');
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, status')
      .eq('invite_code', invite_code.toUpperCase())
      .maybeSingle();

    if (tripError) throw tripError;
    if (!trip) {
      return sendError(res, 404, 'No trip matches that invite code. Double-check it with the organizer.');
    }

    if (trip.status === 'cancelled') {
      return sendError(res, 400, 'This trip has been cancelled, so it is no longer accepting members.');
    }
    if (trip.status === 'completed') {
      return sendError(res, 400, 'This trip is already completed, so it is no longer accepting members.');
    }

    const existing = await getMembership(trip.id, req.user.id);
    if (existing) {
      return sendError(res, 409, 'You are already a member of this trip.');
    }

    const { error: insertError } = await supabase.from('trip_members').insert([{
      id: uuidv4(),
      trip_id: trip.id,
      user_id: req.user.id,
      role: 'member',
    }]);
    if (insertError) throw insertError;

    return res.status(201).json({ trip, message: `Joined "${trip.title}" successfully` });
  } catch (err) {
    return handleError(res, err, 'joinTrip');
  }
};

// ── GET /api/trips/:id/members ─────────────────────────────────
const getTripMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await getMembership(id, req.user.id);
    if (!member) return sendError(res, 403, 'You are not a member of this trip, or it no longer exists.');

    const { data: members, error } = await supabase
      .from('trip_members')
      .select('role, joined_at, users(id, name, email, avatar_url)')
      .eq('trip_id', id);

    if (error) throw error;

    return res.json({ members, my_role: member.role });
  } catch (err) {
    return handleError(res, err, 'getTripMembers');
  }
};

// ── DELETE /api/trips/:id/members/:userId ──────────────────────
const removeMember = async (req, res) => {
  try {
    const { id: tripId, userId } = req.params;

    // Caller must be organizer
    const caller = await getMembership(tripId, req.user.id);
    if (!caller) return sendError(res, 403, 'You are not a member of this trip, or it no longer exists.');
    if (caller.role !== 'organizer') {
      return sendError(res, 403, 'Only the trip organizer can remove members.');
    }

    // Cannot remove yourself (organizer)
    if (userId === req.user.id) {
      return sendError(res, 400, 'You cannot remove yourself because you are the organizer. Delete the trip instead if you no longer need it.');
    }

    // Check target is actually a member
    const target = await getMembership(tripId, userId);
    if (!target) {
      return sendError(res, 404, 'That person is not a member of this trip (they may already have been removed).');
    }
    if (target.role === 'organizer') {
      return sendError(res, 400, 'An organizer cannot be removed.');
    }

    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({ message: 'Member removed successfully' });
  } catch (err) {
    return handleError(res, err, 'removeMember');
  }
};

module.exports = {
  createTrip, getMyTrips, getTripById,
  updateTrip, deleteTrip, joinTrip,
  getTripMembers, removeMember,
};
