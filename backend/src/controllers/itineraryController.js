const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { getMembership } = require('../utils/membership');
const { sendError, handleError, isNonEmptyString } = require('../utils/errors');

const ITEM_TYPES = ['activity', 'travel', 'food', 'accommodation', 'other'];
const MAX_COST = 99_999_999; // NUMERIC(10,2) limit

const NOT_MEMBER = 'You are not a member of this trip, or it no longer exists.';

/** Validate the fields shared by add + update. Returns an error string or null. */
const validateItemFields = ({ day_number, type, estimated_cost }, { requireDay = false } = {}) => {
  if (day_number !== undefined && day_number !== '' && day_number !== null) {
    const d = Number(day_number);
    if (!Number.isInteger(d) || d < 1) return 'Day number must be a whole number, 1 or higher.';
    if (d > 365) return 'Day number cannot be more than 365.';
  } else if (requireDay) {
    return 'Please choose which day this activity is on.';
  }
  if (type !== undefined && type !== '' && !ITEM_TYPES.includes(type)) {
    return `Type must be one of: ${ITEM_TYPES.join(', ')}.`;
  }
  if (estimated_cost !== undefined && estimated_cost !== '' && estimated_cost !== null) {
    const c = Number(estimated_cost);
    if (!Number.isFinite(c)) return 'Estimated cost must be a number.';
    if (c < 0) return 'Estimated cost cannot be negative.';
    if (c > MAX_COST) return 'Estimated cost is too large.';
  }
  return null;
};

// GET /api/trips/:tripId/itinerary
const getItinerary = async (req, res) => {
  try {
    const { tripId } = req.params;
    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*, users(id, name)')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    // Group by day
    const grouped = data.reduce((acc, item) => {
      const day = item.day_number;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});

    return res.json({ itinerary: grouped, items: data });
  } catch (err) {
    return handleError(res, err, 'getItinerary');
  }
};

// POST /api/trips/:tripId/itinerary
const addItineraryItem = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, description, day_number, time, location, type, estimated_cost, order_index } = req.body || {};

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    if (!isNonEmptyString(title)) return sendError(res, 400, 'Please give this activity a title.');
    const fieldError = validateItemFields({ day_number, type, estimated_cost }, { requireDay: true });
    if (fieldError) return sendError(res, 400, fieldError);

    const { data, error } = await supabase
      .from('itinerary_items')
      .insert([{
        id: uuidv4(),
        trip_id: tripId,
        title: title.trim(),
        description: description || '',
        day_number: parseInt(day_number, 10),
        time: time || null,
        location: location || '',
        type: type || 'activity',
        estimated_cost: estimated_cost ? Number(estimated_cost) : 0,
        order_index: order_index || 0,
        created_by: req.user.id,
      }])
      .select('*, users(id, name)')
      .single();

    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('itinerary_update', {
      action: 'created',
      item: data,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.status(201).json({ item: data });
  } catch (err) {
    return handleError(res, err, 'addItineraryItem');
  }
};

// PATCH /api/trips/:tripId/itinerary/:itemId
const updateItineraryItem = async (req, res) => {
  try {
    const { tripId, itemId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    // Scoped to this trip so a member of trip A can't edit trip B's items
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select('created_by')
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (itemError) throw itemError;

    if (!item) return sendError(res, 404, 'That itinerary item could not be found. It may have been deleted.');
    if (member.role !== 'organizer' && item.created_by !== req.user.id) {
      return sendError(res, 403, 'You can only edit items you added. Ask the organizer to change this one.');
    }

    const { title, description, day_number, time, location, type, estimated_cost, order_index } = req.body || {};

    if (title !== undefined && !isNonEmptyString(title)) {
      return sendError(res, 400, 'The title cannot be empty.');
    }
    const fieldError = validateItemFields({ day_number, type, estimated_cost });
    if (fieldError) return sendError(res, 400, fieldError);

    const updates = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (day_number) updates.day_number = parseInt(day_number, 10);
    if (time !== undefined) updates.time = time || null;
    if (location !== undefined) updates.location = location;
    if (type) updates.type = type;
    if (estimated_cost !== undefined) updates.estimated_cost = estimated_cost === '' ? 0 : Number(estimated_cost);
    if (order_index !== undefined) updates.order_index = order_index;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('itinerary_items')
      .update(updates)
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .select('*, users(id, name)')
      .single();

    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('itinerary_update', {
      action: 'updated',
      item: data,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ item: data });
  } catch (err) {
    return handleError(res, err, 'updateItineraryItem');
  }
};

// DELETE /api/trips/:tripId/itinerary/:itemId
const deleteItineraryItem = async (req, res) => {
  try {
    const { tripId, itemId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select('created_by')
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (itemError) throw itemError;

    if (!item) return sendError(res, 404, 'That itinerary item could not be found. It may have already been deleted.');
    if (member.role !== 'organizer' && item.created_by !== req.user.id) {
      return sendError(res, 403, 'You can only delete items you added. Ask the organizer to remove this one.');
    }

    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)
      .eq('trip_id', tripId);
    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('itinerary_update', {
      action: 'deleted',
      itemId,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    return handleError(res, err, 'deleteItineraryItem');
  }
};

module.exports = { getItinerary, addItineraryItem, updateItineraryItem, deleteItineraryItem };
