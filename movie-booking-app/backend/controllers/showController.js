const Show = require("../models/Show");
const Booking = require("../models/Booking");

// GET /api/shows — cursor-based infinite scroll pagination
exports.getShows = async (req, res) => {
  try {
    const { cursor, limit = 8, search, genre, date } = req.query;
    const pageSize = Math.min(parseInt(limit), 20);

    const filter = { isActive: true };

    // Cursor-based pagination (using _id)
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    // Search
    if (search) {
      filter.movieName = { $regex: search, $options: "i" };
    }

    // Genre filter
    if (genre) {
      filter.genre = { $in: [genre] };
    }

    // Date filter (shows on a specific day)
    if (date) {
      const day = new Date(date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.startTime = { $gte: day, $lt: nextDay };
    }

    const shows = await Show.find(filter)
      .sort({ _id: -1 })
      .limit(pageSize + 1); // fetch one extra to know if there's a next page

    const hasMore = shows.length > pageSize;
    const results = hasMore ? shows.slice(0, pageSize) : shows;

    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    res.json({
      success: true,
      shows: results,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shows/:id — single show with booked seats
exports.getShow = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id);
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });

    // Get booked seats for this show
    const bookings = await Booking.find({
      showId: show._id,
      status: { $in: ["pending", "confirmed"] },
    }).select("seats");

    const bookedSeats = bookings.flatMap((b) => b.seats);

    res.json({
      success: true,
      show,
      bookedSeats,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/shows — admin only
exports.createShow = async (req, res) => {
  try {
    const show = await Show.create(req.body);
    res.status(201).json({ success: true, show });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/shows/:id — admin only
exports.deleteShow = async (req, res) => {
  try {
    await Show.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Show deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
