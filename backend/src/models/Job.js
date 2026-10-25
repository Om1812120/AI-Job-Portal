
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      default: "Not specified"
    },
    description: {
      type: String,
      required: true
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    employmentType: {
      type: String,
      enum: [
        "Full-time",
        "Part-time",
        "Internship",
        "Contract"
      ],
      default: "Full-time"
    },
    salaryMin: {
      type: Number,
      min: 0
    },
    salaryMax: {
      type: Number,
      min: 0
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
