const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movieName: {
      type: String,
      required: [true, "Movie name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    genre: {
      type: [String],
      default: [],
    },
    language: {
      type: String,
      default: "English",
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    posterUrl: {
      type: String,
      default: "",
    },
    rating: {
      type: String,
      enum: ["U", "UA", "A", "S"],
      default: "UA",
    },
    theater: {
      type: String,
      required: true,
    },
    screen: {
      type: String,
      default: "Screen 1",
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: 0,
    },
    totalSeats: {
      type: Number,
      default: 60,
    },
    rows: {
      type: [String],
      default: ["A", "B", "C", "D", "E", "F"],
    },
    seatsPerRow: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Show", showSchema);
