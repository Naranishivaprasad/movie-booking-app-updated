const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const { calculatePrice } = require("../utils/pricing");

// POST /api/bookings — create booking (atomic + idempotent)
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { showId, seats, idempotencyKey } = req.body;

    // 1. Idempotency check — return existing booking if key already used
    const existing = await Booking.findOne({ idempotencyKey }).session(session);
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.json({ success: true, booking: existing, idempotent: true });
    }

    // 2. Show existence check
    const show = await Show.findById(showId).session(session);
    if (!show || !show.isActive) {
      throw new Error("Show not found or no longer available.");
    }

    // 3. Show hasn't started yet
    if (new Date(show.startTime) < new Date()) {
      throw new Error("This show has already started. Cannot book.");
    }

    // 4. Seat conflict check — DB-level (atomic)
    const conflict = await Booking.findOne({
      showId,
      seats: { $in: seats },
      status: { $in: ["pending", "confirmed"] },
    }).session(session);

    if (conflict) {
      throw new Error(`Seats already booked: ${conflict.seats.filter((s) => seats.includes(s)).join(", ")}`);
    }

    // 5. Seat format validation (e.g. A1, B10)
    const validSeatPattern = /^[A-F]\d{1,2}$/;
    const invalidSeats = seats.filter((s) => !validSeatPattern.test(s));
    if (invalidSeats.length > 0) {
      throw new Error(`Invalid seat format: ${invalidSeats.join(", ")}`);
    }

    // 6. Calculate price server-side
    const pricing = calculatePrice(show.basePrice, seats, show.startTime);

    // 7. Create booking as pending — payment step will confirm it
    const expiresAt = new Date(Date.now() + (parseInt(process.env.BOOKING_EXPIRE_MINUTES) || 15) * 60 * 1000);

    const [booking] = await Booking.create(
      [
        {
          userId: req.user._id,
          showId,
          seats,
          totalPrice: pricing.finalPrice,
          discountApplied: pricing.discountAmount,
          idempotencyKey,
          status: "pending",
          expiresAt,
        },
      ],
      { session }
    );

    // 8. Booking stays pending — user must complete payment to confirm
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      booking,
      pricing,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Handle duplicate key (race condition caught at DB level)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One or more seats were just booked by someone else. Please select different seats.",
      });
    }

    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/my — user's own bookings (cursor paginated)
exports.getMyBookings = async (req, res) => {
  try {
    const { cursor, limit = 6 } = req.query;
    const pageSize = Math.min(parseInt(limit), 20);

    const filter = { userId: req.user._id };
    if (cursor) filter._id = { $lt: cursor };

    const bookings = await Booking.find(filter)
      .sort({ _id: -1 })
      .limit(pageSize + 1)
      .populate("showId", "movieName startTime theater screen posterUrl");

    const hasMore = bookings.length > pageSize;
    const results = hasMore ? bookings.slice(0, pageSize) : bookings;

    res.json({
      success: true,
      bookings: results,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/:id — single booking
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "showId",
      "movieName startTime theater screen"
    );

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Only owner or admin can view
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/cancel — cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Booking cannot be cancelled." });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ success: true, message: "Booking cancelled", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/bookings/:id/pay — simulate payment and confirm booking
exports.payBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await require("../models/Booking")
      .findById(req.params.id)
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only owner can pay
    if (booking.userId.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (booking.status === "confirmed") {
      await session.commitTransaction();
      session.endSession();
      return res.json({ success: true, booking, alreadyPaid: true });
    }

    if (booking.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot pay for a booking with status: ${booking.status}`,
      });
    }

    // Check booking not expired
    if (booking.expiresAt && new Date() > booking.expiresAt) {
      booking.status = "expired";
      await booking.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Booking has expired. Please start over." });
    }

    // Validate card fields (backend validation)
    const { cardNumber, cardHolder, expiry, cvv } = req.body;
    if (!cardNumber || !cardHolder || !expiry || !cvv) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "All card fields are required" });
    }
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (!/^\d{16}$/.test(cleanCard)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid card number (must be 16 digits)" });
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid CVV" });
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid expiry format (MM/YY)" });
    }

    // Simulate payment success
    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    // Clear expire so TTL doesn't touch it
    booking.expiresAt = undefined;
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, booking });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings — admin: all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const pageSize = Math.min(parseInt(limit), 50);
    const filter = {};
    if (cursor) filter._id = { $lt: cursor };

    const bookings = await Booking.find(filter)
      .sort({ _id: -1 })
      .limit(pageSize + 1)
      .populate("userId", "name email")
      .populate("showId", "movieName startTime theater");

    const hasMore = bookings.length > pageSize;
    const results = hasMore ? bookings.slice(0, pageSize) : bookings;

    res.json({
      success: true,
      bookings: results,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
