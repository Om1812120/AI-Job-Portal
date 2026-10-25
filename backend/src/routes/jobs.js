
const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");
const { protect, authorize } = require("../middleware/auth");
const { calculateJobMatch } = require("../utils/jobMatcher");

const router = express.Router();

// GET /api/jobs
// Public: list and search open jobs
router.get("/", async (req, res) => {
  try {
    const { search, location, employmentType, skills } = req.query;

    const filter = { status: "open" };

    if (search && search.trim()) {
      const keyword = search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { company: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }

    if (location && location.trim()) {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    if (employmentType) {
      filter.employmentType = employmentType;
    }

    if (skills && skills.trim()) {
      const skillList = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      if (skillList.length) {
        filter.requiredSkills = {
          $in: skillList.map((skill) => new RegExp(
            "^" + skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
            "i"
          ))
        };
      }
    }

    const jobs = await Job.find(filter)
      .populate("recruiter", "name")
      .sort({ createdAt: -1 });

    res.json({
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error("List jobs error:", error.message);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

// GET /api/jobs/mine/posted
// Recruiter: list their own jobs with applicant counts
// Keep this route before /:id
router.get(
  "/mine/posted",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const jobs = await Job.find({ recruiter: req.user.id })
        .sort({ createdAt: -1 });

      const jobsWithCounts = await Promise.all(
        jobs.map(async (job) => {
          const applicantCount = await Application.countDocuments({ job: job._id });
          return {
            ...job.toObject(),
            applicantCount
          };
        })
      );

      res.json({
        count: jobsWithCounts.length,
        jobs: jobsWithCounts
      });
    } catch (error) {
      console.error("My jobs error:", error.message);
      res.status(500).json({ message: "Failed to fetch your jobs" });
    }
  }
);

// GET /api/jobs/analytics/summary
// Shared: provides KPI metrics for Candidate and Recruiter dashboards
router.get("/analytics/summary", protect, async (req, res) => {
  try {
    if (req.user.role === "recruiter") {
      const myJobs = await Job.find({ recruiter: req.user.id });
      const jobIds = myJobs.map((j) => j._id);

      const totalJobs = myJobs.length;
      const activeJobs = myJobs.filter((j) => j.status === "open").length;
      const totalApplications = await Application.countDocuments({
        job: { $in: jobIds }
      });
      const shortlistedCount = await Application.countDocuments({
        job: { $in: jobIds },
        status: { $in: ["shortlisted", "accepted"] }
      });
      const reviewingCount = await Application.countDocuments({
        job: { $in: jobIds },
        status: "reviewing"
      });

      return res.json({
        role: "recruiter",
        metrics: {
          totalJobs,
          activeJobs,
          totalApplications,
          shortlistedCount,
          reviewingCount,
          conversionRate: totalApplications > 0
            ? Math.round((shortlistedCount / totalApplications) * 100)
            : 0
        }
      });
    } else {
      const user = await User.findById(req.user.id);
      const totalApplications = await Application.countDocuments({
        candidate: req.user.id
      });
      const shortlisted = await Application.countDocuments({
        candidate: req.user.id,
        status: { $in: ["shortlisted", "accepted"] }
      });
      const reviewing = await Application.countDocuments({
        candidate: req.user.id,
        status: "reviewing"
      });
      const totalOpenJobs = await Job.countDocuments({ status: "open" });

      // Profile strength calculation (0 to 100)
      let profileScore = 20; // base for email/account
      if (user?.name) profileScore += 15;
      if (user?.headline) profileScore += 25;
      if (user?.bio) profileScore += 20;
      if (Array.isArray(user?.skills) && user.skills.length >= 3) {
        profileScore += 20;
      } else if (Array.isArray(user?.skills) && user.skills.length > 0) {
        profileScore += 10;
      }

      return res.json({
        role: "candidate",
        metrics: {
          totalApplications,
          shortlisted,
          reviewing,
          totalOpenJobs,
          profileScore: Math.min(100, profileScore),
          skillCount: user?.skills?.length || 0
        }
      });
    }
  } catch (error) {
    console.error("Analytics summary error:", error.message);
    res.status(500).json({ message: "Failed to generate analytics summary" });
  }
});

// GET /api/jobs/recommended
// Candidate: recommend open jobs based on profile skills
router.get(
  "/recommended",
  protect,
  authorize("candidate"),
  async (req, res) => {
    try {
      const candidate = await User.findById(req.user.id).select("skills");

if (!candidate) {
  return res.status(404).json({
    message: "Candidate profile not found"
  });
}

const candidateSkills = Array.isArray(candidate.skills)
  ? candidate.skills
  : [];

      const jobs = await Job.find({ status: "open" })
        .populate("recruiter", "name")
        .sort({ createdAt: -1 });

      const recommendations = jobs
        .map((job) => {
          const match = calculateJobMatch(
            candidateSkills.join(" "),
            job
          );

          return {
            ...job.toObject(),
            recommendationScore: match.matchScore ?? 0,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills
          };
        })
        .sort(
          (a, b) =>
            b.recommendationScore - a.recommendationScore
        );

      res.json({
        count: recommendations.length,
        recommendations,
        matchingMethod: "profile-skill-based"
      });
    } catch (error) {
      console.error("Job recommendations error:", error.message);
      res.status(500).json({
        message: "Failed to generate job recommendations"
      });
    }
  }
);

// POST /api/jobs
// Recruiter: create a job
router.post(
  "/",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const {
        title,
        company,
        location,
        description,
        requiredSkills,
        employmentType,
        salaryMin,
        salaryMax
      } = req.body;

      if (
        !title?.trim() ||
        !company?.trim() ||
        !description?.trim()
      ) {
        return res.status(400).json({
          message: "Title, company and description are required"
        });
      }

      if (
        employmentType &&
        !["Full-time", "Part-time", "Internship", "Contract"].includes(
          employmentType
        )
      ) {
        return res.status(400).json({
          message: "Invalid employment type"
        });
      }

      const minSalary =
        salaryMin === "" || salaryMin == null
          ? undefined
          : Number(salaryMin);

      const maxSalary =
        salaryMax === "" || salaryMax == null
          ? undefined
          : Number(salaryMax);

      if (
        (minSalary !== undefined &&
          (!Number.isFinite(minSalary) || minSalary < 0)) ||
        (maxSalary !== undefined &&
          (!Number.isFinite(maxSalary) || maxSalary < 0))
      ) {
        return res.status(400).json({
          message: "Salary must be a valid non-negative number"
        });
      }

      if (
        minSalary !== undefined &&
        maxSalary !== undefined &&
        minSalary > maxSalary
      ) {
        return res.status(400).json({
          message: "Minimum salary cannot exceed maximum salary"
        });
      }

      const skills = Array.isArray(requiredSkills)
        ? requiredSkills
        : typeof requiredSkills === "string"
          ? requiredSkills.split(",")
          : [];

      const job = await Job.create({
        title: title.trim(),
        company: company.trim(),
        location: location?.trim() || "Not specified",
        description: description.trim(),
        requiredSkills: skills
          .map((skill) => String(skill).trim())
          .filter(Boolean),
        employmentType: employmentType || "Full-time",
        salaryMin: minSalary,
        salaryMax: maxSalary,
        recruiter: req.user.id
      });

      res.status(201).json({
        message: "Job created successfully",
        job
      });
    } catch (error) {
      console.error("Create job error:", error.message);
      res.status(500).json({ message: "Failed to create job", detail: error.message });
    }
  }
);

// GET /api/jobs/:id
// Public: get job details
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(req.params.id)
      .populate("recruiter", "name");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ job });
  } catch (error) {
    console.error("Job details error:", error.message);
    res.status(500).json({ message: "Failed to fetch job details" });
  }
});

// PATCH /api/jobs/:id/status
// Recruiter: update job status (open / closed)
router.patch(
  "/:id/status",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const { status } = req.body;
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ message: "Status must be open or closed" });
      }

      const job = await Job.findOne({ _id: req.params.id, recruiter: req.user.id });
      if (!job) {
        return res.status(404).json({ message: "Job not found or not owned by you" });
      }

      job.status = status;
      await job.save();

      res.json({ message: `Job marked as ${status}`, job });
    } catch (error) {
      console.error("Job status update error:", error.message);
      res.status(500).json({ message: "Failed to update job status" });
    }
  }
);

// DELETE /api/jobs/:id
// Recruiter: delete a job and its applications
router.delete(
  "/:id",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await Job.findOneAndDelete({ _id: req.params.id, recruiter: req.user.id });
      if (!job) {
        return res.status(404).json({ message: "Job not found or not owned by you" });
      }

      await Application.deleteMany({ job: req.params.id });

      res.json({ message: "Job and its applications deleted successfully" });
    } catch (error) {
      console.error("Delete job error:", error.message);
      res.status(500).json({ message: "Failed to delete job" });
    }
  }
);

module.exports = router;
