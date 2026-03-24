const { body, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  handleValidationErrors,
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const bookingValidation = [
  body("showId").notEmpty().withMessage("Show ID is required").isMongoId().withMessage("Invalid show ID"),
  body("seats").isArray({ min: 1, max: 10 }).withMessage("Seats must be an array of 1 to 10"),
  body("seats.*").isString().trim().notEmpty().withMessage("Each seat must be a non-empty string"),
  body("idempotencyKey").notEmpty().withMessage("Idempotency key is required"),
  handleValidationErrors,
];

module.exports = { registerValidation, loginValidation, bookingValidation };
