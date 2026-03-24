const router = require("express").Router();
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  payBooking,
} = require("../controllers/bookingController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { bookingValidation } = require("../middleware/validate");

router.use(protect); // All booking routes require auth

router.post("/", bookingValidation, createBooking);
router.get("/my", getMyBookings);
router.get("/admin/all", restrictTo("admin"), getAllBookings);
router.get("/:id", getBooking);
router.patch("/:id/cancel", cancelBooking);
router.post("/:id/pay", payBooking);

module.exports = router;
