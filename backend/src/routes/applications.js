
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { extractResumeText } = require("../utils/resumeParser");
const { calculateJobMatch } = require("../utils/jobMatcher");

const Application = require("../models/Application");
const Job = require("../models/Job");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(new Error("Only PDF, DOC, and DOCX resumes are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* AI Resume ATS Match Analyzer */
router.post(
  "/ai-match-preview",
  protect,
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "Resume must be 5 MB or smaller."
              : err.message
        });
      }
      next();
    });
  },
  async (req, res) => {
    let uploadedFilePath;
    try {
      if (req.file) {
        uploadedFilePath = req.file.path;
      }

      const { jobId, resumeText: rawResumeText, customSkills, customDescription } = req.body;
      let resumeText = (rawResumeText || "").trim();

      if (uploadedFilePath) {
        resumeText = await extractResumeText(uploadedFilePath);
      }

      if (!resumeText) {
        return res.status(400).json({
          message: "Please provide a resume file or resume text to analyze."
        });
      }

      let targetJob = null;
      if (jobId && /^[a-f\d]{24}$/i.test(jobId)) {
        targetJob = await Job.findById(jobId);
      }

      const skillsToCheck = targetJob?.requiredSkills || (
        customSkills ? String(customSkills).split(",").map((s) => s.trim()).filter(Boolean) : []
      );

      const descriptionToCheck = targetJob?.description || customDescription || "";

      const matchAnalysis = calculateJobMatch(resumeText, {
        requiredSkills: skillsToCheck,
        description: descriptionToCheck
      });

      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
        uploadedFilePath = null;
      }

      const tips = [];
      if (matchAnalysis.missingSkills.length > 0) {
        tips.push(`Add these keywords to your resume to pass ATS screening: ${matchAnalysis.missingSkills.slice(0, 5).join(", ")}`);
      }
      if ((matchAnalysis.matchScore || 0) >= 75) {
        tips.push("High ATS compatibility! Your resume aligns strongly with core requirements.");
      } else if ((matchAnalysis.matchScore || 0) >= 45) {
        tips.push("Moderate alignment. Emphasize transferable skills, projects, and relevant toolsets.");
      } else {
        tips.push("Lower skill overlap. Consider showcasing self-taught projects or relevant certifications in these missing areas.");
      }

      return res.json({
        success: true,
        jobTitle: targetJob?.title || "Target Role",
        company: targetJob?.company || "",
        matchScore: matchAnalysis.matchScore ?? 0,
        matchedSkills: matchAnalysis.matchedSkills,
        missingSkills: matchAnalysis.missingSkills,
        descriptionScore: matchAnalysis.descriptionScore ?? 0,
        tips,
        resumeWordCount: resumeText.split(/\s+/).filter(Boolean).length
      });
    } catch (error) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }
      console.error("AI preview error:", error.message);
      return res.status(500).json({
        message: "Unable to analyze resume at this time."
      });
    }
  }
);

// Candidate applies for a job
router.post(
  "/:jobId",
  protect,
  authorize("candidate"),
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "Resume must be 5 MB or smaller."
              : err.message
        });
      }
      next();
    });
  },
  async (req, res) => {
    let uploadedFilePath;

    try {
      if (req.file) {
        uploadedFilePath = req.file.path;
      }

      const { jobId } = req.params;
      const coverLetter = (req.body.coverLetter || "").trim();

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload your resume."
        });
      }

      if (coverLetter.length > 5000) {
        return res.status(400).json({
          message: "Cover letter cannot exceed 5000 characters."
        });
      }

      if (!/^[a-f\d]{24}$/i.test(jobId)) {
        return res.status(400).json({ message: "Invalid job ID." });
      }

      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found." });
      }

      if (job.status !== "open") {
        return res.status(400).json({
          message: "This job is no longer accepting applications."
        });
      }

      const application = await Application.create({
        candidate: req.user.id,
        job: job._id,
        resumeUrl: `/uploads/${req.file.filename}`,
        coverLetter
      });

      return res.status(201).json({
        message: "Application submitted successfully.",
        application
      });
    } catch (error) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message: "You have already applied for this job."
        });
      }

      console.error("Application submission error:", error.message);
      return res.status(500).json({
        message: "Unable to submit application right now."
      });
    }
  }
);

// Candidate views their own applications
router.get(
  "/mine",
  protect,
  authorize("candidate"),
  async (req, res) => {
    try {
      const applications = await Application.find({
        candidate: req.user.id
      })
        .populate("job", "title company location employmentType status")
        .sort({ createdAt: -1 });

      res.json({
        count: applications.length,
        applications
      });
    } catch (error) {
      console.error("Fetch applications error:", error.message);
      res.status(500).json({
        message: "Unable to fetch your applications."
      });
    }
  }
);

// Recruiter views applications for their own job
router.get(
  "/job/:jobId",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(req.params.jobId)) {
        return res.status(400).json({ message: "Invalid job ID." });
      }

      const job = await Job.findOne({
        _id: req.params.jobId,
        recruiter: req.user.id
      });

      if (!job) {
        return res.status(404).json({
          message: "Job not found or you do not own this job."
        });
      }

      
const applications = await Application.find({
  job: job._id
})
  .populate("candidate", "name email skills")
  .populate("job", "title company requiredSkills description")
  .sort({ createdAt: -1 });

const applicationsWithMatch = await Promise.all(
  applications.map(async (application) => {
    let resumeMatch = {
      matchScore: null,
      matchedSkills: [],
      missingSkills: job.requiredSkills || [],
      descriptionScore: null,
      matchingMethod: "rule-based",
      message: "Resume could not be analyzed."
    };

    try {
      if (application.resumeUrl) {
        const filename = path.basename(application.resumeUrl);
        const resumePath = path.join(uploadDir, filename);

        if (application.resumeUrl.startsWith("/uploads/") &&
            fs.existsSync(resumePath)) {
          const resumeText = await extractResumeText(resumePath);

          if (resumeText.trim()) {
            resumeMatch = {
              ...calculateJobMatch(resumeText, job),
              message: "Resume analyzed successfully."
            };
          } else {
            resumeMatch.message = "No readable text found in resume.";
          }
        }
      }
    } catch (error) {
      console.error(
        `Resume analysis failed for ${application._id}:`,
        error.message
      );
      resumeMatch.message = "Resume analysis failed.";
    }

    return {
      ...application.toObject(),
      resumeMatch
    };
  })
);

res.json({
  count: applicationsWithMatch.length,
  applications: applicationsWithMatch
});

    } catch (error) {
      console.error("Recruiter applications error:", error.message);
      res.status(500).json({
        message: "Unable to fetch job applicants."
      });
    }
  }
);


/* Recruiter updates an applicant's status */
router.patch(
  "/:applicationId/status",
  protect,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;

      if (!/^[a-f\d]{24}$/i.test(applicationId)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      const allowedStatuses = [
        "pending",
        "reviewing",
        "shortlisted",
        "rejected",
        "accepted"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid application status."
        });
      }

      const application = await Application.findById(applicationId)
        .populate("job", "recruiter title");

      if (!application || !application.job) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      // Recruiters can update applications only for their own jobs.
      if (String(application.job.recruiter) !== String(req.user.id)) {
        return res.status(403).json({
          message: "You cannot update applications for this job."
        });
      }

      if (status) {
        application.status = status;
      }
      if (req.body.recruiterNotes !== undefined) {
        application.recruiterNotes = String(req.body.recruiterNotes).trim();
      }
      if (req.body.interviewDate !== undefined) {
        application.interviewDate = String(req.body.interviewDate).trim();
      }

      await application.save();

      return res.json({
        message: "Application updated successfully.",
        application
      });
    } catch (error) {
      console.error("Update application status error:", error.message);

      return res.status(500).json({
        message: "Unable to update application status."
      });
    }
  }
);


/* Secure resume view/download */
router.get(
  "/:applicationId/resume",
  protect,
  async (req, res) => {
    try {
      const { applicationId } = req.params;

      if (!/^[a-f\d]{24}$/i.test(applicationId)) {
        return res.status(400).json({
          message: "Invalid application ID."
        });
      }

      const application = await Application.findById(applicationId)
        .populate("job", "recruiter title")
        .select("candidate job resumeUrl");

      if (!application || !application.job) {
        return res.status(404).json({
          message: "Application not found."
        });
      }

      const isCandidate =
        String(application.candidate) === String(req.user.id);

      const isRecruiter =
        String(application.job.recruiter) === String(req.user.id);

      if (
        !isCandidate &&
        !(isRecruiter && req.user.role === "recruiter")
      ) {
        return res.status(403).json({
          message: "You are not authorized to access this resume."
        });
      }

      if (!application.resumeUrl) {
        return res.status(404).json({
          message: "Resume not found."
        });
      }

      const filename = path.basename(application.resumeUrl);
      const filePath = path.join(uploadDir, filename);

      if (
        !application.resumeUrl.startsWith("/uploads/") ||
        !fs.existsSync(filePath)
      ) {
        return res.status(404).json({
          message: "Resume file not found."
        });
      }

      const extension = path.extname(filename).toLowerCase();

      const contentTypes = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      };

      res.setHeader(
        "Content-Type",
        contentTypes[extension] || "application/octet-stream"
      );

      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");

      const disposition =
        req.query.download === "1" ? "attachment" : "inline";

      return res.sendFile(
        filePath,
        {
          headers: {
            "Content-Disposition":
              `${disposition}; filename="${filename}"`
          }
        },
        (error) => {
          if (error && !res.headersSent) {
            console.error("Resume delivery error:", error.message);
            res.status(500).json({
              message: "Unable to deliver resume."
            });
          }
        }
      );
    } catch (error) {
      console.error("Secure resume error:", error.message);
      return res.status(500).json({
        message: "Unable to access resume right now."
      });
    }
  }
);

module.exports = router;
