const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isUuid } = require('../utils/errors');
const {
  createTrip, getMyTrips, getTripById,
  updateTrip, deleteTrip, joinTrip, getTripMembers, removeMember,
} = require('../controllers/tripController');
const {
  getItinerary, addItineraryItem,
  updateItineraryItem, deleteItineraryItem,
} = require('../controllers/itineraryController');
const {
  getPolls, createPoll, vote,
  closePoll, deletePoll,
} = require('../controllers/pollController');
const {
  getExpenses, addExpense, updateExpense,
  deleteExpense, getBudgetOverview,
} = require('../controllers/expenseController');

// All routes require authentication
router.use(authenticate);

// Reject malformed IDs up front with a clear message. Without this, Postgres
// fails with a cryptic "invalid input syntax for type uuid" error that used to
// surface as a misleading "not a member" / "not found".
const PARAM_LABELS = {
  id: 'trip', tripId: 'trip', userId: 'user',
  itemId: 'itinerary item', pollId: 'poll', expenseId: 'expense',
};
Object.entries(PARAM_LABELS).forEach(([name, label]) => {
  router.param(name, (_req, res, next, value) => {
    if (!isUuid(value)) return res.status(400).json({ error: `Invalid ${label} ID.` });
    next();
  });
});

// Trip CRUD
router.get('/', getMyTrips);
router.post('/', createTrip);
router.post('/join', joinTrip);
router.get('/:id', getTripById);
router.patch('/:id', updateTrip);
router.delete('/:id', deleteTrip);
router.get('/:id/members', getTripMembers);
router.delete('/:id/members/:userId', removeMember);

// Itinerary
router.get('/:tripId/itinerary', getItinerary);
router.post('/:tripId/itinerary', addItineraryItem);
router.patch('/:tripId/itinerary/:itemId', updateItineraryItem);
router.delete('/:tripId/itinerary/:itemId', deleteItineraryItem);

// Polls
router.get('/:tripId/polls', getPolls);
router.post('/:tripId/polls', createPoll);
router.post('/:tripId/polls/:pollId/vote', vote);
router.patch('/:tripId/polls/:pollId/close', closePoll);
router.delete('/:tripId/polls/:pollId', deletePoll);

// Expenses & Budget
router.get('/:tripId/expenses', getExpenses);
router.post('/:tripId/expenses', addExpense);
router.patch('/:tripId/expenses/:expenseId', updateExpense);
router.delete('/:tripId/expenses/:expenseId', deleteExpense);
router.get('/:tripId/budget', getBudgetOverview);

module.exports = router;
