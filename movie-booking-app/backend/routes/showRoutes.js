const router = require("express").Router();
const { getShows, getShow, createShow, deleteShow } = require("../controllers/showController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

router.get("/", getShows);
router.get("/:id", getShow);
router.post("/", protect, restrictTo("admin"), createShow);
router.delete("/:id", protect, restrictTo("admin"), deleteShow);

module.exports = router;
