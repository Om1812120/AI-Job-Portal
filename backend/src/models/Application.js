
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true
    },
    coverLetter: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000
    },
    status: {
      type: String,
      enum: [
        "pending",
        "reviewing",
        "shortlisted",
        "rejected",
        "accepted"
      ],
      default: "pending"
    },
    recruiterNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    },
    interviewDate: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

applicationSchema.index(
  { candidate: 1, job: 1 },
  { unique: true }
);

module.exports = mongoose.model("Application", applicationSchema);
