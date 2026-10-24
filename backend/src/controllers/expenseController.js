const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { getMembership } = require('../utils/membership');
const {
  sendError, handleError, isUuid, isValidDate, isNonEmptyString,
} = require('../utils/errors');

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'other'];
const MAX_AMOUNT = 99_999_999; // NUMERIC(10,2) limit
const NOT_MEMBER = 'You are not a member of this trip, or it no longer exists.';

/** All user ids currently in the trip. */
const getTripMemberIds = async (tripId) => {
  const { data, error } = await supabase.from('trip_members').select('user_id').eq('trip_id', tripId);
  if (error) throw error;
  return data.map((m) => m.user_id);
};

/**
 * Validates the optional expense fields. `partial` = true for PATCH (fields may be absent).
 * Returns an error string or null.
 */
const validateExpenseFields = (body, memberIds, { partial = false } = {}) => {
  const { title, amount, category, paid_by, date, split_with } = body;

  if (!partial || title !== undefined) {
    if (!isNonEmptyString(title)) return 'Please enter a title for the expense.';
    if (title.trim().length > 120) return 'The expense title must be 120 characters or fewer.';
  }
  if (!partial || amount !== undefined) {
    if (amount === undefined || amount === null || amount === '') return 'Please enter the amount.';
    const n = Number(amount);
    if (!Number.isFinite(n)) return 'The amount must be a number.';
    if (n <= 0) return 'The amount must be greater than 0.';
    if (n > MAX_AMOUNT) return 'That amount is too large.';
  }
  if (!partial || paid_by !== undefined) {
    if (!paid_by) return 'Please choose who paid for this expense.';
    if (!isUuid(paid_by) || !memberIds.includes(paid_by)) {
      return 'The person who paid must be a current member of this trip.';
    }
  }
  if (category !== undefined && category !== '' && !CATEGORIES.includes(category)) {
    return `Category must be one of: ${CATEGORIES.join(', ')}.`;
  }
  if (date !== undefined && date !== '' && !isValidDate(date)) {
    return 'The expense date is not a valid date.';
  }
  if (split_with !== undefined) {
    if (!Array.isArray(split_with)) return 'The list of people sharing this expense is invalid.';
    if (split_with.length === 0) return 'Select at least one person to split this expense with.';
    if (new Set(split_with).size !== split_with.length) return 'A person was selected more than once in the split.';
    const outsider = split_with.find((uid) => !isUuid(uid) || !memberIds.includes(uid));
    if (outsider !== undefined) {
      return 'Everyone in the split must be a current member of this trip. Refresh the page and try again.';
    }
  }
  return null;
};

const buildSplitRows = (expenseId, userIds, amount) => {
  const share = parseFloat((amount / userIds.length).toFixed(2));
  return userIds.map((uid) => ({ id: uuidv4(), expense_id: expenseId, user_id: uid, share }));
};

// ── GET /api/trips/:tripId/expenses ────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:users!expenses_paid_by_fkey(id, name, avatar_url),
        expense_splits(user_id, share, users(id, name))
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch all trip members for settlement base
    const { data: allMembers, error: membersError } = await supabase
      .from('trip_members')
      .select('user_id, users(id, name)')
      .eq('trip_id', tripId);
    if (membersError) throw membersError;

    // Build per-person net balance using splits
    const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    // net[userId] = total_paid − total_owed
    const net = {};
    allMembers.forEach(m => { net[m.user_id] = { user: m.users, amount: 0 }; });

    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount);
      const splits = exp.expense_splits || [];

      if (splits.length === 0) {
        // No splits recorded → split equally among all trip members
        const share = amount / allMembers.length;
        // Payer gets credited full amount
        if (net[exp.paid_by]) net[exp.paid_by].amount += amount;
        // Everyone (including payer) owes their share
        allMembers.forEach(m => {
          if (net[m.user_id]) net[m.user_id].amount -= share;
        });
      } else {
        // Split only among selected participants
        const sharePerPerson = amount / splits.length;
        if (net[exp.paid_by]) net[exp.paid_by].amount += amount;
        splits.forEach(s => {
          if (net[s.user_id]) net[s.user_id].amount -= sharePerPerson;
        });
      }
    });

    const balances = Object.entries(net).map(([, v]) => ({
      user: v.user,
      net: parseFloat(v.amount.toFixed(2)),
    }));

    const perPersonShare = allMembers.length > 0 ? totalSpent / allMembers.length : 0;
    const settlements = calculateSettlements(balances);

    return res.json({
      expenses,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      perPersonShare: parseFloat(perPersonShare.toFixed(2)),
      balances,
      settlements,
    });
  } catch (err) {
    return handleError(res, err, 'getExpenses');
  }
};

// Greedy minimum-transactions settlement
function calculateSettlements(balances) {
  const debtors   = balances.filter(b => b.net < -0.01).map(b => ({ user: b.user, amount: Math.abs(b.net) })).sort((a, b) => b.amount - a.amount);
  const creditors = balances.filter(b => b.net >  0.01).map(b => ({ user: b.user, amount: b.net          })).sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].user, to: creditors[j].user, amount: parseFloat(amount.toFixed(2)) });
    debtors[i].amount   -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount   < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return settlements;
}

// ── POST /api/trips/:tripId/expenses ───────────────────────────
const addExpense = async (req, res) => {
  try {
    const { tripId } = req.params;
    const body = req.body || {};
    const { title, amount, category, paid_by, notes, date, split_with } = body;
    // split_with: array of user IDs who share this expense (optional)

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const memberIds = await getTripMemberIds(tripId);
    const validationError = validateExpenseFields(body, memberIds);
    if (validationError) return sendError(res, 400, validationError);

    const expenseId = uuidv4();
    const parsedAmount = parseFloat(amount);

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        id: expenseId,
        trip_id: tripId,
        title: title.trim(),
        amount: parsedAmount,
        category: category || 'other',
        paid_by,
        notes: notes || '',
        date: date || new Date().toISOString().split('T')[0],
        added_by: req.user.id,
      }])
      .select('*, payer:users!expenses_paid_by_fkey(id, name, avatar_url)')
      .single();

    if (error) throw error;

    // Persist splits if provided. If this fails we must NOT keep the expense:
    // without split rows it would silently be shared by everyone in the trip.
    if (Array.isArray(split_with) && split_with.length > 0) {
      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(buildSplitRows(expenseId, split_with, parsedAmount));
      if (splitError) {
        await supabase.from('expenses').delete().eq('id', expenseId);
        throw splitError;
      }
    }

    req.io?.to(`trip:${tripId}`).emit('expense_update', {
      action: 'created',
      expense: data,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.status(201).json({ expense: data });
  } catch (err) {
    return handleError(res, err, 'addExpense');
  }
};

// ── PATCH /api/trips/:tripId/expenses/:expenseId ───────────────
const updateExpense = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;
    const body = req.body || {};

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    // Scoped to this trip so a member of trip A can't edit trip B's expenses
    const { data: expense, error: lookupError } = await supabase
      .from('expenses')
      .select('added_by, amount')
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!expense) return sendError(res, 404, 'That expense could not be found. It may have been deleted.');
    if (member.role !== 'organizer' && expense.added_by !== req.user.id) {
      return sendError(res, 403, 'You can only edit expenses you added. Ask the organizer to change this one.');
    }

    const memberIds = await getTripMemberIds(tripId);
    const validationError = validateExpenseFields(body, memberIds, { partial: true });
    if (validationError) return sendError(res, 400, validationError);

    const { title, amount, category, paid_by, notes, date, split_with } = body;
    const updates = {};
    if (title)                 updates.title    = title.trim();
    if (amount !== undefined)  updates.amount   = parseFloat(amount);
    if (category)              updates.category = category;
    if (paid_by)               updates.paid_by  = paid_by;
    if (notes !== undefined)   updates.notes    = notes;
    if (date)                  updates.date     = date;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .select('*, payer:users!expenses_paid_by_fkey(id, name, avatar_url)')
      .single();

    if (error) throw error;

    // Replace splits if provided. Insert the new rows first, then remove the
    // old ones, so a failure can never leave the expense with no split at all.
    if (Array.isArray(split_with) && split_with.length > 0) {
      const { data: oldSplits, error: oldError } = await supabase
        .from('expense_splits').select('id').eq('expense_id', expenseId);
      if (oldError) throw oldError;

      const finalAmount = updates.amount ?? parseFloat(expense.amount);
      const { error: insertError } = await supabase
        .from('expense_splits')
        .insert(buildSplitRows(expenseId, split_with, finalAmount));
      if (insertError) throw insertError;

      const oldIds = oldSplits.map((r) => r.id);
      if (oldIds.length > 0) {
        const { error: deleteError } = await supabase.from('expense_splits').delete().in('id', oldIds);
        if (deleteError) throw deleteError;
      }
    }

    req.io?.to(`trip:${tripId}`).emit('expense_update', {
      action: 'updated',
      expense: data,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ expense: data });
  } catch (err) {
    return handleError(res, err, 'updateExpense');
  }
};

// ── DELETE /api/trips/:tripId/expenses/:expenseId ──────────────
const deleteExpense = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const { data: expense, error: lookupError } = await supabase
      .from('expenses')
      .select('added_by')
      .eq('id', expenseId)
      .eq('trip_id', tripId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!expense) return sendError(res, 404, 'That expense could not be found. It may have already been deleted.');
    if (member.role !== 'organizer' && expense.added_by !== req.user.id) {
      return sendError(res, 403, 'You can only delete expenses you added. Ask the organizer to remove this one.');
    }

    // Splits are deleted by CASCADE, but be explicit
    const { error: splitError } = await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
    if (splitError) throw splitError;
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('trip_id', tripId);
    if (error) throw error;

    req.io?.to(`trip:${tripId}`).emit('expense_update', {
      action: 'deleted',
      expenseId,
      updatedBy: { id: req.user.id, name: req.user.name },
    });

    return res.json({ message: 'Expense deleted' });
  } catch (err) {
    return handleError(res, err, 'deleteExpense');
  }
};

// ── GET /api/trips/:tripId/budget ──────────────────────────────
const getBudgetOverview = async (req, res) => {
  try {
    const { tripId } = req.params;

    const member = await getMembership(tripId, req.user.id);
    if (!member) return sendError(res, 403, NOT_MEMBER);

    const [
      { data: trip, error: tripError },
      { data: expenses, error: expensesError },
      { data: itinerary, error: itineraryError },
    ] = await Promise.all([
      supabase.from('trips').select('budget').eq('id', tripId).single(),
      supabase.from('expenses').select('amount, category').eq('trip_id', tripId),
      supabase.from('itinerary_items').select('estimated_cost').eq('trip_id', tripId),
    ]);

    if (tripError || expensesError || itineraryError) throw (tripError || expensesError || itineraryError);

    const totalBudget    = trip?.budget || 0;
    const totalSpent     = (expenses  || []).reduce((s, e) => s + parseFloat(e.amount),        0);
    const estimatedCost  = (itinerary || []).reduce((s, i) => s + parseFloat(i.estimated_cost || 0), 0);
    const remaining      = totalBudget - totalSpent;

    const byCategory = (expenses || []).reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
      return acc;
    }, {});

    return res.json({
      totalBudget,
      totalSpent:    parseFloat(totalSpent.toFixed(2)),
      estimatedCost: parseFloat(estimatedCost.toFixed(2)),
      remaining:     parseFloat(remaining.toFixed(2)),
      byCategory,
    });
  } catch (err) {
    return handleError(res, err, 'getBudgetOverview');
  }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, getBudgetOverview };
