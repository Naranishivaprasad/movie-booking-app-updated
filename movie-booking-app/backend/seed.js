require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected for seeding");
};

const seed = async () => {
  await connectDB();

  const User = require("./models/User");
  const Show = require("./models/Show");

  // Clear existing
  await User.deleteMany({});
  await Show.deleteMany({});
  console.log("Cleared existing data");

  // Create users
  await User.create([
    { name: "Admin User", email: "admin@cinema.com", password: "admin123", role: "admin" },
    { name: "John Doe", email: "john@example.com", password: "user1234", role: "user" },
  ]);
  console.log("✅ Users seeded");

  // Create shows
  const now = new Date();
  const shows = [
    {
      movieName: "Interstellar",
      description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      genre: ["Sci-Fi", "Drama", "Adventure"],
      language: "English",
      duration: 169,
      rating: "UA",
      theater: "PVR Cinemas",
      screen: "Screen 1",
      startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      basePrice: 250,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    {
      movieName: "Dune: Part Two",
      description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      genre: ["Sci-Fi", "Action", "Adventure"],
      language: "English",
      duration: 167,
      rating: "UA",
      theater: "INOX",
      screen: "Screen 2",
      startTime: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      basePrice: 300,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    },
    {
      movieName: "Oppenheimer",
      description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
      genre: ["Biography", "Drama", "History"],
      language: "English",
      duration: 181,
      rating: "UA",
      theater: "Cinepolis",
      screen: "Screen 3",
      startTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      basePrice: 280,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    },
    {
      movieName: "Kalki 2898-AD",
      description: "A futuristic mythological sci-fi set in the year 2898 AD, combining ancient Indian mythology with dystopian science fiction.",
      genre: ["Sci-Fi", "Action", "Mythology"],
      language: "Telugu",
      duration: 181,
      rating: "UA",
      theater: "Prasads IMAX",
      screen: "IMAX",
      startTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      basePrice: 350,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/dBMSgwSPKhCpOj2vvgVkAeB8cfC.jpg",
    },
    {
      movieName: "The Dark Knight",
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      genre: ["Action", "Crime", "Drama"],
      language: "English",
      duration: 152,
      rating: "UA",
      theater: "PVR Director's Cut",
      screen: "Screen 1",
      startTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      basePrice: 220,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    },
    {
      movieName: "RRR",
      description: "A fictional story about two legendary revolutionaries and their journey away from home before they began fighting for their country in the 1920s.",
      genre: ["Action", "Drama", "History"],
      language: "Telugu",
      duration: 182,
      rating: "UA",
      theater: "Prasads Multiplex",
      screen: "Screen 2",
      startTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      basePrice: 200,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/nEufeZlyAOLqZMedljnt6qd4jc2.jpg",
    },
    {
      movieName: "Avatar: The Way of Water",
      description: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.",
      genre: ["Sci-Fi", "Action", "Adventure"],
      language: "English",
      duration: 192,
      rating: "UA",
      theater: "INOX",
      screen: "3D Screen",
      startTime: new Date(now.getTime() + 10 * 60 * 60 * 1000),
      basePrice: 400,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    },
    {
      movieName: "Pushpa 2: The Rule",
      description: "Pushpa Raj, a feared red sandalwood smuggler, expands his empire while facing a relentless police officer.",
      genre: ["Action", "Thriller", "Drama"],
      language: "Telugu",
      duration: 188,
      rating: "A",
      theater: "Cinemax",
      screen: "Screen 1",
      startTime: new Date(now.getTime() + 7 * 60 * 60 * 1000),
      basePrice: 250,
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
      posterUrl: "https://image.tmdb.org/t/p/w500/xDGbZ0JJ3mYaGKy4Nzd9Kph6NNn.jpg",
    },
  ];

  await Show.insertMany(shows);
  console.log("✅ Shows seeded");

  console.log("\n🎬 Seed complete!");
  console.log("👤 Admin: admin@cinema.com / admin123");
  console.log("👤 User:  john@example.com / user1234");

  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
