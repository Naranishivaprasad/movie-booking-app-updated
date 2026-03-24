const cron = require("node-cron");
const Booking = require("../models/Booking");

// Run every minute — expire pending bookings past their expiry time
const startExpireJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const result = await Booking.updateMany(
        {
          status: "pending",
          expiresAt: { $lt: new Date() },
        },
        { $set: { status: "expired" } }
      );

      if (result.modifiedCount > 0) {
        console.log(`⏰ Expired ${result.modifiedCount} pending booking(s)`);
      }
    } catch (err) {
      console.error("Expire job error:", err.message);
    }
  });

  console.log("✅ Booking expiry cron job started");
};

module.exports = { startExpireJob };
