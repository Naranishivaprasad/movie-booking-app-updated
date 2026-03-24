const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length > 0 && v.length <= 10,
        message: "Must book between 1 and 10 seats",
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "expired", "cancelled"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountApplied: {
      type: Number,
      default: 0,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 mins from now
    },
    confirmedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate seat booking per show
bookingSchema.index(
  { showId: 1, seats: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

// TTL index to auto-expire pending bookings
bookingSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "pending" },
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
