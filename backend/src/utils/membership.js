const supabase = require('../config/supabase');

/**
 * Returns the caller's trip_members row ({ role }) or null if they are not a member.
 *
 * Unlike a bare `.single()`, this THROWS on real database problems, so an outage
 * shows up as "database unreachable" instead of a misleading "not a member".
 */
const getMembership = async (tripId, userId) => {
  const { data, error } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

module.exports = { getMembership };
