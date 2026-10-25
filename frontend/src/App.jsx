import { useEffect, useState, useMemo } from "react";
import {
  Search,
  BriefcaseBusiness,
  Users,
  BrainCircuit,
  ArrowRight,
  LogOut,
  UserRound,
  MapPin,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  Plus,
  RefreshCw,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  TrendingUp,
  Filter,
  Check,
  Award,
  Building2,
  UploadCloud,
  Sliders,
  Send,
  HelpCircle,
  Calendar,
  MessageSquare,
  BarChart3,
  FileCode2,
  ChevronRight,
  Zap
} from "lucide-react";
import api from "./api";
import "./styles.css";

const TOKEN_KEY = "ai_job_portal_token";

const COMMON_SKILLS = [
  "React",
  "Node.js",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "SQL",
  "MongoDB",
  "Docker",
  "AWS",
  "Git",
  "GraphQL",
  "REST APIs",
  "Next.js",
  "Tailwind CSS",
  "Machine Learning"
];

function App() {
  const [page, setPage] = useState("home"); // home | auth | dashboard
  const [dashboardTab, setDashboardTab] = useState("recommended");
  const [authMode, setAuthMode] = useState("login");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Analytics Metrics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterLocation, setFilterLocation] = useState("");

  // Jobs data
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsRefresh, setJobsRefresh] = useState(0);

  // Candidate Data
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [appFilterStatus, setAppFilterStatus] = useState("all");

  // Recruiter Applicants Viewer
  const [selectedApplicantsJob, setSelectedApplicantsJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantFilterStatus, setApplicantFilterStatus] = useState("all");
  const [applicantSort, setApplicantSort] = useState("match");
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [recruiterNoteInputs, setRecruiterNoteInputs] = useState({});

  // Application Modal (Candidate applying)
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [applicationNotice, setApplicationNotice] = useState("");
  const [applicationError, setApplicationError] = useState("");

  // AI Mock Interview Modal
  const [interviewPrepJob, setInterviewPrepJob] = useState(null);

  // Post Job Form
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    requiredSkills: "",
    employmentType: "Full-time",
    salaryMin: "",
    salaryMax: ""
  });

  // Auth Form
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "candidate"
  });

  // Profile Editor Form
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    headline: "",
    bio: "",
    skills: []
  });
  const [newSkillInput, setNewSkillInput] = useState("");

  // AI Resume Analyzer tool state
  const [aiJobId, setAiJobId] = useState("");
  const [aiResumeFile, setAiResumeFile] = useState(null);
  const [aiResumeText, setAiResumeText] = useState("");
  const [aiCustomSkills, setAiCustomSkills] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const isLoggedIn = Boolean(token && user);

  // Auto-dismiss notice
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // Load user profile on startup
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let active = true;
    api.get("/auth/me")
      .then((res) => {
        if (active) {
          const userData = res.data.user;
          setUser(userData);
          setProfileForm({
            name: userData.name || "",
            headline: userData.headline || "",
            bio: userData.bio || "",
            skills: Array.isArray(userData.skills) ? userData.skills : []
          });
        }
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Fetch KPI Analytics
  useEffect(() => {
    if (!isLoggedIn) return;

    let active = true;
    setAnalyticsLoading(true);

    api.get("/jobs/analytics/summary")
      .then((res) => {
        if (active) setAnalytics(res.data.metrics || null);
      })
      .catch((err) => console.error("Analytics fetch error:", err))
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn, user?.role, jobsRefresh]);

  // Load jobs
  useEffect(() => {
    if (page !== "dashboard" && page !== "home") return;

    let active = true;
    setJobsLoading(true);

    const isRecruiter = isLoggedIn && user?.role === "recruiter";
    let endpoint = isRecruiter ? "/jobs/mine/posted" : "/jobs";

    if (!isRecruiter) {
      const params = new URLSearchParams();
      if (jobSearch.trim()) params.append("search", jobSearch.trim());
      if (filterType !== "All") params.append("employmentType", filterType);
      if (filterLocation.trim()) params.append("location", filterLocation.trim());
      const query = params.toString();
      if (query) endpoint += `?${query}`;
    }

    api.get(endpoint)
      .then((res) => {
        if (active) setJobs(res.data.jobs || []);
      })
      .catch((err) => console.error("Jobs error:", err))
      .finally(() => {
        if (active) setJobsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, isLoggedIn, user, jobSearch, filterType, filterLocation, jobsRefresh]);

  // Load recommendations
  useEffect(() => {
    if (page !== "dashboard" || !isLoggedIn || user?.role !== "candidate") {
      setRecommendations([]);
      return;
    }

    let active = true;
    setRecommendationsLoading(true);

    api.get("/jobs/recommended")
      .then((res) => {
        if (active) setRecommendations(res.data.recommendations || []);
      })
      .catch((err) => console.error("Recommendations error:", err))
      .finally(() => {
        if (active) setRecommendationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, isLoggedIn, user, jobsRefresh]);

  // Load applications
  useEffect(() => {
    if (page !== "dashboard" || !isLoggedIn || user?.role !== "candidate") {
      setMyApplications([]);
      return;
    }
    loadMyApplications();
  }, [page, isLoggedIn, user]);

  async function loadMyApplications() {
    setApplicationsLoading(true);
    try {
      const res = await api.get("/applications/mine");
      setMyApplications(res.data.applications || []);
    } catch (err) {
      console.error("Fetch applications error:", err);
    } finally {
      setApplicationsLoading(false);
    }
  }

  // Dashboard initial tab
  useEffect(() => {
    if (user?.role === "recruiter") {
      setDashboardTab("posted");
    } else if (user?.role === "candidate") {
      setDashboardTab("recommended");
    }
  }, [user?.role]);

  function updateForm(event) {
    setForm((curr) => ({ ...curr, [event.target.name]: event.target.value }));
  }

  function updateJobForm(event) {
    setJobForm((curr) => ({ ...curr, [event.target.name]: event.target.value }));
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setPage("auth");
    setError("");
    setNotice("");
    setMobileMenu(false);
  }

  function goHome() {
    setPage("home");
    setMobileMenu(false);
    setError("");
    setSelectedApplicantsJob(null);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setPage("home");
    setNotice("You have logged out.");
    setError("");
    setJobs([]);
    setRecommendations([]);
    setMyApplications([]);
    setSelectedApplicantsJob(null);
    setSelectedJob(null);
    setAiResult(null);
    setInterviewPrepJob(null);
  }

  // One-Click Demo Credentials
  function fillDemo(role) {
    if (role === "candidate") {
      setForm({
        name: "Alex Johnson",
        email: "demo.candidate@hireai.com",
        password: "password123",
        role: "candidate"
      });
    } else {
      setForm({
        name: "Sarah Connor",
        email: "demo.recruiter@hireai.com",
        password: "password123",
        role: "recruiter"
      });
    }
    setNotice(`Loaded verified ${role} demo credentials.`);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        authMode === "register"
          ? form
          : { email: form.email, password: form.password };

      const res = await api.post(endpoint, payload);
      const receivedToken = res.data.token;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setToken(receivedToken);
      setUser(res.data.user);
      setNotice(res.data.message || "Welcome to HireAI!");
      setPage("dashboard");
      setForm({ name: "", email: "", password: "", role: "candidate" });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Authentication failed. Please verify credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  // Recruiter: Post Job
  async function submitJob(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setJobSubmitting(true);

    try {
      const payload = {
        ...jobForm,
        requiredSkills: jobForm.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        salaryMin: jobForm.salaryMin === "" ? undefined : Number(jobForm.salaryMin),
        salaryMax: jobForm.salaryMax === "" ? undefined : Number(jobForm.salaryMax)
      };

      const res = await api.post("/jobs", payload);
      setNotice(res.data.message || "Job published successfully!");
      setJobForm({
        title: "",
        company: "",
        location: "",
        description: "",
        requiredSkills: "",
        employmentType: "Full-time",
        salaryMin: "",
        salaryMax: ""
      });
      setDashboardTab("posted");
      setJobsRefresh((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish job opening.");
    } finally {
      setJobSubmitting(false);
    }
  }

  // Recruiter: Toggle job status
  async function toggleJobStatus(job) {
    const newStatus = job.status === "open" ? "closed" : "open";
    try {
      await api.patch(`/jobs/${job._id}/status`, { status: newStatus });
      setNotice(`Job status updated to ${newStatus}.`);
      setJobsRefresh((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update status.");
    }
  }

  // Recruiter: Delete job
  async function deleteJob(jobId, jobTitle) {
    if (!window.confirm(`Delete "${jobTitle}" and all its candidate records?`)) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setNotice("Job deleted successfully.");
      if (selectedApplicantsJob?._id === jobId) {
        setSelectedApplicantsJob(null);
      }
      setJobsRefresh((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete job.");
    }
  }

  // Recruiter: Open Applicants Manager
  async function openApplicants(job) {
    setSelectedApplicantsJob(job);
    setApplicants([]);
    setApplicantsLoading(true);
    setApplicantFilterStatus("all");
    setError("");

    try {
      const res = await api.get(`/applications/job/${job._id}`);
      setApplicants(res.data.applications || []);
      // Initialize notes state
      const notes = {};
      (res.data.applications || []).forEach((app) => {
        notes[app._id] = app.recruiterNotes || "";
      });
      setRecruiterNoteInputs(notes);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load applicants.");
    } finally {
      setApplicantsLoading(false);
    }
  }

  // Recruiter: Update applicant status & notes
  async function updateApplicantStatus(applicationId, newStatus, customNotes) {
    setStatusUpdatingId(applicationId);
    setError("");

    try {
      const payload = {};
      if (newStatus) payload.status = newStatus;
      if (customNotes !== undefined) payload.recruiterNotes = customNotes;

      const res = await api.patch(`/applications/${applicationId}/status`, payload);

      setApplicants((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, ...res.data.application } : app
        )
      );
      setNotice("Candidate review updated successfully.");
      setJobsRefresh((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update applicant review.");
    } finally {
      setStatusUpdatingId("");
    }
  }

  // Secure resume download / open
  async function openResume(application, download = false) {
    setError("");
    try {
      const res = await api.get(
        `/applications/${application._id}/resume${download ? "?download=1" : ""}`,
        { responseType: "blob" }
      );

      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = download ? "_self" : "_blank";

      if (download) {
        const ext = application.resumeUrl?.split(".").pop()?.toLowerCase() || "pdf";
        link.download = `resume-${application.candidate?.name || application._id}.${ext}`;
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "You are not authorized to view this resume."
          : "Could not open resume file."
      );
    }
  }

  // Candidate: Apply for job
  async function submitApplication(event) {
    event.preventDefault();
    setApplicationNotice("");
    setApplicationError("");

    if (!selectedJob) return;

    if (!resumeFile) {
      setApplicationError("Please select a resume file (PDF or DOCX).");
      return;
    }

    const data = new FormData();
    data.append("resume", resumeFile);
    data.append("coverLetter", coverLetter);

    setApplicationSubmitting(true);

    try {
      const res = await api.post(`/applications/${selectedJob._id}`, data);
      setApplicationNotice(res.data.message || "Application submitted successfully!");
      setResumeFile(null);
      setCoverLetter("");
      await loadMyApplications();
      setJobsRefresh((v) => v + 1);
      setTimeout(() => {
        setSelectedJob(null);
        setNotice("Application submitted! Track status in My Applications.");
      }, 1400);
    } catch (err) {
      const statusCode = err.response?.status;
      const msg = err.response?.data?.message;

      if (statusCode === 409) {
        setApplicationError("You have already applied for this opening.");
        await loadMyApplications();
      } else {
        setApplicationError(msg || "Failed to submit application.");
      }
    } finally {
      setApplicationSubmitting(false);
    }
  }

  // Candidate: Update Profile
  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await api.put("/auth/profile", {
        name: profileForm.name,
        headline: profileForm.headline,
        bio: profileForm.bio,
        skills: profileForm.skills
      });

      setUser(res.data.user);
      setNotice("Profile & skills updated! Recommendations recalculated.");
      setJobsRefresh((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function addSkill(skillToAdd) {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (profileForm.skills.includes(trimmed)) return;

    setProfileForm((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed]
    }));
    setNewSkillInput("");
  }

  function removeSkill(skillToRemove) {
    setProfileForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  }

  // AI Resume Analyzer preview
  async function runAiAnalysis(event) {
    event.preventDefault();
    setAiError("");
    setAiResult(null);

    if (!aiResumeFile && !aiResumeText.trim()) {
      setAiError("Please provide a resume file or paste resume text.");
      return;
    }

    setAiAnalyzing(true);
    const data = new FormData();
    if (aiResumeFile) data.append("resume", aiResumeFile);
    if (aiResumeText.trim()) data.append("resumeText", aiResumeText.trim());
    if (aiJobId) data.append("jobId", aiJobId);
    if (aiCustomSkills.trim()) data.append("customSkills", aiCustomSkills.trim());

    try {
      const res = await api.post("/applications/ai-match-preview", data);
      setAiResult(res.data);
    } catch (err) {
      setAiError(err.response?.data?.message || "Failed to analyze resume.");
    } finally {
      setAiAnalyzing(false);
    }
  }

  const appliedJobIds = useMemo(() => {
    return new Set(
      myApplications.map((app) => app.job?._id || app.job).filter(Boolean)
    );
  }, [myApplications]);

  const filteredApplicants = useMemo(() => {
    let list = [...applicants];
    if (applicantFilterStatus !== "all") {
      list = list.filter((a) => a.status === applicantFilterStatus);
    }
    if (applicantSort === "match") {
      list.sort((a, b) => (b.resumeMatch?.matchScore ?? 0) - (a.resumeMatch?.matchScore ?? 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [applicants, applicantFilterStatus, applicantSort]);

  const filteredMyApplications = useMemo(() => {
    if (appFilterStatus === "all") return myApplications;
    return myApplications.filter(
      (app) => (app.status || "pending").toLowerCase() === appFilterStatus
    );
  }, [myApplications, appFilterStatus]);

  function renderSalary(job) {
    if (job.salaryMin == null && job.salaryMax == null) {
      return <span className="meta-salary">Negotiable</span>;
    }
    return (
      <span className="meta-salary">
        ₹{Number(job.salaryMin || 0).toLocaleString("en-IN")}
        {" – "}
        ₹{Number(job.salaryMax || 0).toLocaleString("en-IN")}
        <small> / yr</small>
      </span>
    );
  }

  function renderSkillTags(skills, matchedSkills = []) {
    if (!Array.isArray(skills) || skills.length === 0) return null;
    return (
      <div className="job-skill-tags">
        {skills.map((skill, idx) => {
          const isMatched = matchedSkills.includes(skill);
          return (
            <span
              key={`${skill}-${idx}`}
              className={`skill-tag ${isMatched ? "matched-tag" : ""}`}
            >
              {isMatched && <Check size={11} className="inline-check" />}
              {skill}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="navbar">
        <button className="brand" onClick={goHome}>
          <span className="brand-icon">
            <BrainCircuit size={22} />
          </span>
          <span>
            Hire<span className="brand-accent">AI</span>
          </span>
          <span className="platform-tag">Enterprise ATS</span>
        </button>

        <button
          className="mobile-toggle"
          onClick={() => setMobileMenu((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <button onClick={goHome}>Home</button>

          {isLoggedIn ? (
            <>
              <button
                className={page === "dashboard" ? "nav-active" : ""}
                onClick={() => {
                  setPage("dashboard");
                  setMobileMenu(false);
                }}
              >
                Dashboard
              </button>

              <div className="user-nav-badge">
                <span className="user-initial">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </span>
                <span className="user-name-text">{user.name}</span>
                <span className={`role-badge ${user.role}`}>
                  {user.role === "recruiter" ? "Recruiter" : "Candidate"}
                </span>
              </div>

              <button className="nav-logout" onClick={logout}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAuth("login")}>Sign In</button>
              <button className="nav-cta" onClick={() => openAuth("register")}>
                Get Started <ArrowRight size={16} />
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Global Toast Alerts */}
      {notice && (
        <div className="notice-toast" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="error-toast" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ================= LANDING PAGE ================= */}
      {page === "home" && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={15} /> AI ATS & RECRUITMENT SUITE
              </div>

              <h1>
                Intelligent Career & Hiring Suite,
                <span> powered by Multi-Vector ATS Matching.</span>
              </h1>

              <p className="hero-description">
                Engineered with multi-factor resume parsing, contextual keyword scoring, live candidate pipelines, and automated AI technical interview preparation.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-btn"
                  onClick={() => openAuth("register")}
                >
                  Explore Opportunities <ArrowRight size={17} />
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => openAuth("register")}
                >
                  <Building2 size={16} /> Recruiter Pipeline
                </button>
              </div>

              <div className="trust-note">
                <ShieldCheck size={17} />
                Multi-Vector ATS Algorithm · Automated Mock Interview Engine · Secure Resume Vault
              </div>
            </div>

            <div className="hero-art">
              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>

              <div className="ai-core">
                <BrainCircuit size={68} strokeWidth={1.4} />
                <span>AI MATCH</span>
              </div>

              <div className="float-card float-top">
                <span className="float-icon purple">
                  <Zap size={18} />
                </span>
                <div>
                  <strong>Multi-Factor ATS</strong>
                  <small>Hard Skills + Domain Context</small>
                </div>
              </div>

              <div className="float-card float-bottom">
                <span className="float-icon green">
                  <HelpCircle size={18} />
                </span>
                <div>
                  <strong>AI Interview Coach</strong>
                  <small>Automated tailored questions</small>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Search on Home */}
          <section className="search-section">
            <div className="search-heading">
              <div>
                <span className="section-kicker">TALENT MARKETPLACE</span>
                <h2>Find openings matching your technical stack</h2>
              </div>
            </div>

            <form
              className="search-box"
              onSubmit={(e) => {
                e.preventDefault();
                openAuth("register");
              }}
            >
              <Search size={20} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role, programming language, cloud platform, or company..."
                aria-label="Search jobs"
              />
              <button className="primary-btn" type="submit">
                Find Roles <ArrowRight size={16} />
              </button>
            </form>
          </section>

          {/* Feature Highlights */}
          <section className="features-section" id="features">
            <div className="section-heading">
              <span className="section-kicker">ENGINEERED FOR EXCELLENCE</span>
              <h2>Comprehensive AI Architecture</h2>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="feature-icon lavender">
                  <BrainCircuit size={24} />
                </span>
                <h3>Multi-Factor ATS Compatibility</h3>
                <p>
                  Combines strict technical skill matching with contextual NLP semantic analysis, generating quantifiable compatibility metrics and keyword gap analysis.
                </p>
              </article>

              <article className="feature-card">
                <span className="feature-icon mint">
                  <HelpCircle size={24} />
                </span>
                <h3>AI Mock Interview Generator</h3>
                <p>
                  Automatically formulates technical architecture, scenario-based, and behavioral interview questions tailored to each candidate's skill profile and target role.
                </p>
              </article>

              <article className="feature-card">
                <span className="feature-icon peach">
                  <BarChart3 size={24} />
                </span>
                <h3>Recruiter Analytics & Pipeline</h3>
                <p>
                  Candidate leaderboard ranked by ATS compatibility, review workflows, internal recruiter notes, and real-time conversion metrics.
                </p>
              </article>
            </div>
          </section>
        </main>
      )}

      {/* ================= AUTHENTICATION MODAL ================= */}
      {page === "auth" && (
        <main className="auth-layout">
          <section className="auth-aside">
            <div className="auth-aside-icon">
              <BrainCircuit size={38} />
            </div>

            <span className="section-kicker">WELCOME TO HIREAI</span>
            <h1>
              {authMode === "login" ? "Access your" : "Create your"}
              <span> intelligent workspace.</span>
            </h1>

            <p>
              Select an account role to explore real-time ATS candidate ranking or personalized skill matching.
            </p>

            <div className="demo-credentials-box">
              <span className="demo-title">⚡ Instant Showcase Logins:</span>
              <p className="demo-subtext">Click below to auto-fill verified showcase credentials for project evaluation:</p>
              <div className="demo-btns">
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => fillDemo("candidate")}
                >
                  <UserRound size={15} /> Candidate Demo (Alex)
                </button>
                <button
                  type="button"
                  className="demo-pill recruiter-demo"
                  onClick={() => fillDemo("recruiter")}
                >
                  <Building2 size={15} /> Recruiter Demo (Sarah)
                </button>
              </div>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
              >
                Sign In
              </button>

              <button
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                }}
              >
                Create Account
              </button>
            </div>

            <h2>
              {authMode === "login" ? "Welcome back" : "Create an Account"}
            </h2>

            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === "register" && (
                <>
                  <label htmlFor="auth-name">Full Name *</label>
                  <input
                    id="auth-name"
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    placeholder="e.g. Alex Johnson"
                    minLength={2}
                    maxLength={80}
                    required
                  />

                  <label htmlFor="auth-role">Account Role *</label>
                  <select
                    id="auth-role"
                    name="role"
                    value={form.role}
                    onChange={updateForm}
                  >
                    <option value="candidate">Job Candidate (Seeker)</option>
                    <option value="recruiter">Recruiter / Employer</option>
                  </select>
                </>
              )}

              <label htmlFor="auth-email">Email Address *</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                value={form.email}
                onChange={updateForm}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <label htmlFor="auth-password">Password *</label>
              <input
                id="auth-password"
                type="password"
                name="password"
                value={form.password}
                onChange={updateForm}
                placeholder="Enter password (min 8 chars)"
                minLength={8}
                maxLength={72}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
              />

              <button className="primary-btn auth-submit" type="submit" disabled={loading}>
                {loading
                  ? "Verifying Session..."
                  : authMode === "login"
                  ? "Sign in to Dashboard"
                  : "Register Workspace"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="switch-auth">
              {authMode === "login" ? "New to HireAI?" : "Already registered?"}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setError("");
                }}
              >
                {authMode === "login" ? "Create an account" : "Sign in here"}
              </button>
            </p>
          </section>
        </main>
      )}

      {/* ================= DASHBOARD CONTAINER ================= */}
      {page === "dashboard" && (
        <main className="dashboard-container">
          {!isLoggedIn ? (
            <div className="empty-state">
              <UserRound size={44} />
              <h2>Verifying session credentials...</h2>
              <button className="primary-btn" onClick={() => openAuth("login")}>
                Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Executive Header Card */}
              <div className="dashboard-header-card">
                <div className="profile-hero">
                  <div className="profile-avatar-lg">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-meta">
                    <div className="profile-title-row">
                      <h1>{user.name}</h1>
                      <span className={`role-pill ${user.role}`}>
                        {user.role === "recruiter" ? "Recruiter Suite" : "Candidate Suite"}
                      </span>
                    </div>
                    <p className="profile-headline">
                      {user.headline || (user.role === "recruiter" ? "Senior Technical Talent Partner" : "Full Stack Software Engineer")}
                    </p>
                    <p className="profile-email">{user.email}</p>
                  </div>
                </div>

                {/* Candidate Skill Pills */}
                {user.role === "candidate" && (
                  <div className="header-skills-preview">
                    <div className="header-skills-label">
                      <Sparkles size={14} /> Profile Skill Tags:
                    </div>
                    {user.skills?.length > 0 ? (
                      <div className="header-skill-tags">
                        {user.skills.map((skill) => (
                          <span key={skill} className="header-skill-pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="link-btn"
                        onClick={() => setDashboardTab("profile")}
                      >
                        + Add technical skills to enable AI recommendations
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* KPI Analytics Metric Cards Bar */}
              {analytics && (
                <div className="kpi-metrics-grid">
                  {user.role === "candidate" ? (
                    <>
                      <div className="kpi-card">
                        <div className="kpi-icon-wrap violet">
                          <Award size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.profileScore}%</span>
                          <span className="kpi-label">Profile Strength</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap blue">
                          <Clock size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.totalApplications}</span>
                          <span className="kpi-label">Active Applications</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap emerald">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.shortlisted}</span>
                          <span className="kpi-label">Shortlisted / Offers</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap amber">
                          <BriefcaseBusiness size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.totalOpenJobs}</span>
                          <span className="kpi-label">Market Roles Open</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="kpi-card">
                        <div className="kpi-icon-wrap violet">
                          <BriefcaseBusiness size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.totalJobs}</span>
                          <span className="kpi-label">Openings Published</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap blue">
                          <Users size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.totalApplications}</span>
                          <span className="kpi-label">Total Applicants</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap emerald">
                          <Award size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.shortlistedCount}</span>
                          <span className="kpi-label">Shortlisted Talents</span>
                        </div>
                      </div>

                      <div className="kpi-card">
                        <div className="kpi-icon-wrap amber">
                          <TrendingUp size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-value">{analytics.conversionRate}%</span>
                          <span className="kpi-label">Shortlist Ratio</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Workspace Navigation Tabs */}
              <div className="workspace-tabs-bar">
                {user.role === "candidate" ? (
                  <>
                    <button
                      className={`tab-btn ${dashboardTab === "recommended" ? "active" : ""}`}
                      onClick={() => setDashboardTab("recommended")}
                    >
                      <Sparkles size={16} /> AI Recommended Jobs
                      {recommendations.length > 0 && (
                        <span className="tab-count">{recommendations.length}</span>
                      )}
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "jobs" ? "active" : ""}`}
                      onClick={() => setDashboardTab("jobs")}
                    >
                      <BriefcaseBusiness size={16} /> Explore All Openings
                      {jobs.length > 0 && (
                        <span className="tab-count">{jobs.length}</span>
                      )}
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "applications" ? "active" : ""}`}
                      onClick={() => setDashboardTab("applications")}
                    >
                      <Clock size={16} /> Application Tracker
                      {myApplications.length > 0 && (
                        <span className="tab-count">{myApplications.length}</span>
                      )}
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "ai-analyzer" ? "active" : ""}`}
                      onClick={() => setDashboardTab("ai-analyzer")}
                    >
                      <BrainCircuit size={16} /> AI Resume ATS Analyzer
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "profile" ? "active" : ""}`}
                      onClick={() => setDashboardTab("profile")}
                    >
                      <UserRound size={16} /> Profile & Skills Matrix
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`tab-btn ${dashboardTab === "posted" ? "active" : ""}`}
                      onClick={() => setDashboardTab("posted")}
                    >
                      <BriefcaseBusiness size={16} /> My Posted Openings
                      {jobs.length > 0 && (
                        <span className="tab-count">{jobs.length}</span>
                      )}
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "post-job" ? "active" : ""}`}
                      onClick={() => setDashboardTab("post-job")}
                    >
                      <Plus size={16} /> Post New Opening
                    </button>

                    <button
                      className={`tab-btn ${dashboardTab === "profile" ? "active" : ""}`}
                      onClick={() => setDashboardTab("profile")}
                    >
                      <UserRound size={16} /> Organization Profile
                    </button>
                  </>
                )}
              </div>

              {/* ================= RECRUITER VIEWS ================= */}
              {user.role === "recruiter" && (
                <div className="recruiter-dashboard">
                  {/* TAB: POSTED JOBS */}
                  {dashboardTab === "posted" && (
                    <section className="dashboard-content-section">
                      <div className="section-toolbar">
                        <div>
                          <h2>Active Job Requisitions</h2>
                          <p>Monitor candidate pipelines and review multi-vector ATS scores.</p>
                        </div>
                        <div className="toolbar-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setJobsRefresh((v) => v + 1)}
                            disabled={jobsLoading}
                          >
                            <RefreshCw size={15} /> Refresh Data
                          </button>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => setDashboardTab("post-job")}
                          >
                            <Plus size={16} /> Publish New Role
                          </button>
                        </div>
                      </div>

                      {jobsLoading ? (
                        <div className="jobs-empty-state">
                          <RefreshCw className="spin" size={24} />
                          <p>Loading requisitions and candidate counts...</p>
                        </div>
                      ) : jobs.length === 0 ? (
                        <div className="jobs-empty-state">
                          <BriefcaseBusiness size={38} />
                          <h3>No job postings yet</h3>
                          <p>Publish an opening to start receiving scored applications.</p>
                          <button
                            className="primary-btn"
                            onClick={() => setDashboardTab("post-job")}
                          >
                            <Plus size={16} /> Post your first opening
                          </button>
                        </div>
                      ) : (
                        <div className="job-cards-grid">
                          {jobs.map((job) => (
                            <article className="recruiter-job-card" key={job._id}>
                              <div className="job-card-header">
                                <div>
                                  <h3>{job.title}</h3>
                                  <div className="job-card-subtitle">
                                    <Building2 size={14} /> {job.company} ·{" "}
                                    <MapPin size={14} /> {job.location || "Remote"}
                                  </div>
                                </div>
                                <span className={`job-status-badge ${job.status}`}>
                                  {job.status === "open" ? "Active" : "Closed"}
                                </span>
                              </div>

                              <p className="job-card-desc">{job.description}</p>

                              {job.requiredSkills?.length > 0 && (
                                <div className="job-skills-wrapper">
                                  <span className="skills-subheading">Required Competencies:</span>
                                  {renderSkillTags(job.requiredSkills)}
                                </div>
                              )}

                              <div className="job-card-footer">
                                <div className="job-meta-details">
                                  <span className="meta-badge">{job.employmentType}</span>
                                  {renderSalary(job)}
                                </div>

                                <div className="recruiter-card-actions">
                                  <button
                                    type="button"
                                    className="primary-btn btn-sm"
                                    onClick={() => openApplicants(job)}
                                  >
                                    <Users size={15} /> Review Candidates
                                    <span className="applicant-count-pill">
                                      {job.applicantCount || 0}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="secondary-btn btn-sm"
                                    title="Toggle job status"
                                    onClick={() => toggleJobStatus(job)}
                                  >
                                    {job.status === "open" ? "Close" : "Re-open"}
                                  </button>

                                  <button
                                    type="button"
                                    className="icon-danger-btn"
                                    title="Delete job opening"
                                    onClick={() => deleteJob(job._id, job.title)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* TAB: POST A JOB */}
                  {dashboardTab === "post-job" && (
                    <section className="dashboard-content-section max-w-750">
                      <div className="section-toolbar">
                        <div>
                          <h2>Publish Requisition</h2>
                          <p>Define required competencies for automated ATS evaluation.</p>
                        </div>
                      </div>

                      <form className="job-post-form" onSubmit={submitJob}>
                        <div className="form-row-2">
                          <div className="field-group">
                            <label htmlFor="p-title">Role Title *</label>
                            <input
                              id="p-title"
                              name="title"
                              value={jobForm.title}
                              onChange={updateJobForm}
                              placeholder="e.g. Senior Backend Cloud Engineer"
                              required
                              maxLength={120}
                            />
                          </div>

                          <div className="field-group">
                            <label htmlFor="p-company">Hiring Organization *</label>
                            <input
                              id="p-company"
                              name="company"
                              value={jobForm.company}
                              onChange={updateJobForm}
                              placeholder="e.g. NextGen AI Labs"
                              required
                              maxLength={120}
                            />
                          </div>
                        </div>

                        <div className="form-row-2">
                          <div className="field-group">
                            <label htmlFor="p-location">Location / Work Mode</label>
                            <input
                              id="p-location"
                              name="location"
                              value={jobForm.location}
                              onChange={updateJobForm}
                              placeholder="e.g. Bengaluru / Hybrid / Remote"
                            />
                          </div>

                          <div className="field-group">
                            <label htmlFor="p-type">Employment Arrangement</label>
                            <select
                              id="p-type"
                              name="employmentType"
                              value={jobForm.employmentType}
                              onChange={updateJobForm}
                            >
                              <option>Full-time</option>
                              <option>Part-time</option>
                              <option>Contract</option>
                              <option>Internship</option>
                            </select>
                          </div>
                        </div>

                        <div className="field-group">
                          <label htmlFor="p-skills">
                            Required Technical Competencies * (comma-separated)
                          </label>
                          <input
                            id="p-skills"
                            name="requiredSkills"
                            value={jobForm.requiredSkills}
                            onChange={updateJobForm}
                            placeholder="e.g. React, Node.js, TypeScript, Docker, AWS, PostgreSQL"
                            required
                          />
                          <small className="field-hint">
                            Multi-factor ATS weights hard skills at 65% of the candidate's compatibility score.
                          </small>
                        </div>

                        <div className="field-group">
                          <label htmlFor="p-desc">Position Description & Deliverables *</label>
                          <textarea
                            id="p-desc"
                            name="description"
                            value={jobForm.description}
                            onChange={updateJobForm}
                            placeholder="Detail core responsibilities, team architecture, deliverables, and requirements..."
                            rows={6}
                            required
                          />
                        </div>

                        <div className="form-row-2">
                          <div className="field-group">
                            <label htmlFor="p-sal-min">Min Annual Compensation (₹)</label>
                            <input
                              id="p-sal-min"
                              type="number"
                              name="salaryMin"
                              value={jobForm.salaryMin}
                              onChange={updateJobForm}
                              placeholder="e.g. 1500000"
                              min="0"
                            />
                          </div>

                          <div className="field-group">
                            <label htmlFor="p-sal-max">Max Annual Compensation (₹)</label>
                            <input
                              id="p-sal-max"
                              type="number"
                              name="salaryMax"
                              value={jobForm.salaryMax}
                              onChange={updateJobForm}
                              placeholder="e.g. 2600000"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="form-actions-right">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setDashboardTab("posted")}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="primary-btn"
                            disabled={jobSubmitting}
                          >
                            {jobSubmitting ? "Publishing Requisition..." : "Publish Job Opening"}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </form>
                    </section>
                  )}
                </div>
              )}

              {/* ================= CANDIDATE VIEWS ================= */}
              {user.role === "candidate" && (
                <div className="candidate-dashboard">
                  {/* TAB: RECOMMENDED JOBS */}
                  {dashboardTab === "recommended" && (
                    <section className="dashboard-content-section">
                      <div className="section-toolbar">
                        <div>
                          <h2>
                            <Sparkles size={20} className="accent-sparkle" /> AI Recommended Openings
                          </h2>
                          <p>
                            Ranks opportunities dynamically based on your profile skill matrix and contextual job requirements.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setJobsRefresh((v) => v + 1)}
                          disabled={recommendationsLoading}
                        >
                          <RefreshCw size={14} /> Refresh AI Matches
                        </button>
                      </div>

                      {recommendationsLoading ? (
                        <div className="jobs-empty-state">
                          <RefreshCw className="spin" size={24} />
                          <p>Calculating multi-factor ATS match scores...</p>
                        </div>
                      ) : recommendations.length === 0 ? (
                        <div className="jobs-empty-state">
                          <Sparkles size={38} />
                          <h3>No matching roles found</h3>
                          <p>Add your technical skills in your Profile Matrix to unlock personalized recommendations.</p>
                          <button
                            className="primary-btn"
                            onClick={() => setDashboardTab("profile")}
                          >
                            Manage Profile Skills
                          </button>
                        </div>
                      ) : (
                        <div className="job-cards-grid">
                          {recommendations.map((job) => {
                            const score = job.recommendationScore ?? 0;
                            const isApplied = appliedJobIds.has(job._id);

                            return (
                              <article className="candidate-job-card recommended" key={job._id}>
                                <div className="job-card-header">
                                  <div>
                                    <h3>{job.title}</h3>
                                    <div className="job-card-subtitle">
                                      <Building2 size={14} /> {job.company} ·{" "}
                                      <MapPin size={14} /> {job.location || "Remote"}
                                    </div>
                                  </div>

                                  <div className="match-score-badge">
                                    <Sparkles size={13} />
                                    <span>{score}% Match</span>
                                  </div>
                                </div>

                                <p className="job-card-desc">{job.description}</p>

                                {/* Matching skills */}
                                {job.matchedSkills?.length > 0 && (
                                  <div className="skill-section">
                                    <span className="skill-label green">
                                      <CheckCircle2 size={12} /> Matching Competencies:
                                    </span>
                                    <div className="job-skill-tags">
                                      {job.matchedSkills.map((s) => (
                                        <span key={s} className="skill-tag matched-tag">
                                          ✓ {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Missing skills */}
                                {job.missingSkills?.length > 0 && (
                                  <div className="skill-section">
                                    <span className="skill-label muted">Skills to Acquire:</span>
                                    <div className="job-skill-tags">
                                      {job.missingSkills.map((s) => (
                                        <span key={s} className="skill-tag missing-tag">
                                          + {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="job-card-footer">
                                  <div className="job-meta-details">
                                    <span className="meta-badge">{job.employmentType}</span>
                                    {renderSalary(job)}
                                  </div>

                                  <div className="card-btn-group">
                                    {/* AI Mock Interview Prep Button */}
                                    <button
                                      type="button"
                                      className="secondary-btn btn-sm"
                                      title="AI Interview Questions Prep"
                                      onClick={() => setInterviewPrepJob(job)}
                                    >
                                      <HelpCircle size={14} /> Interview Prep
                                    </button>

                                    {isApplied ? (
                                      <span className="already-applied-pill">
                                        <Check size={14} /> Applied
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="primary-btn btn-sm"
                                        onClick={() => {
                                          setSelectedJob(job);
                                          setApplicationNotice("");
                                          setApplicationError("");
                                        }}
                                      >
                                        Apply Now <ArrowRight size={15} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {/* TAB: EXPLORE ALL JOBS */}
                  {dashboardTab === "jobs" && (
                    <section className="dashboard-content-section">
                      <div className="section-toolbar">
                        <div>
                          <h2>Marketplace Openings</h2>
                          <p>Explore verified roles across industry sectors.</p>
                        </div>
                      </div>

                      {/* Search & Filter Bar */}
                      <div className="filters-bar">
                        <div className="search-input-wrap">
                          <Search size={18} />
                          <input
                            value={jobSearch}
                            onChange={(e) => setJobSearch(e.target.value)}
                            placeholder="Search by keywords, technical stack, or employer..."
                          />
                          {jobSearch && (
                            <button
                              type="button"
                              className="clear-search-btn"
                              onClick={() => setJobSearch("")}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="filter-select-wrap">
                          <Sliders size={16} />
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="All">All Types</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </div>

                        <div className="location-input-wrap">
                          <MapPin size={16} />
                          <input
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            placeholder="Location / Remote"
                          />
                        </div>
                      </div>

                      {jobsLoading ? (
                        <div className="jobs-empty-state">
                          <RefreshCw className="spin" size={24} />
                          <p>Fetching active marketplace listings...</p>
                        </div>
                      ) : jobs.length === 0 ? (
                        <div className="jobs-empty-state">
                          <Search size={38} />
                          <h3>No roles match your search filters</h3>
                          <button
                            className="secondary-btn"
                            onClick={() => {
                              setJobSearch("");
                              setFilterType("All");
                              setFilterLocation("");
                            }}
                          >
                            Reset Filters
                          </button>
                        </div>
                      ) : (
                        <div className="job-cards-grid">
                          {jobs.map((job) => {
                            const isApplied = appliedJobIds.has(job._id);

                            return (
                              <article className="candidate-job-card" key={job._id}>
                                <div className="job-card-header">
                                  <div>
                                    <h3>{job.title}</h3>
                                    <div className="job-card-subtitle">
                                      <Building2 size={14} /> {job.company} ·{" "}
                                      <MapPin size={14} /> {job.location || "Remote"}
                                    </div>
                                  </div>
                                </div>

                                <p className="job-card-desc">{job.description}</p>

                                {job.requiredSkills?.length > 0 && (
                                  <div className="job-skills-wrapper">
                                    <span className="skills-subheading">Competencies:</span>
                                    {renderSkillTags(job.requiredSkills)}
                                  </div>
                                )}

                                <div className="job-card-footer">
                                  <div className="job-meta-details">
                                    <span className="meta-badge">{job.employmentType}</span>
                                    {renderSalary(job)}
                                  </div>

                                  <div className="card-btn-group">
                                    <button
                                      type="button"
                                      className="secondary-btn btn-sm"
                                      title="AI Interview Questions Prep"
                                      onClick={() => setInterviewPrepJob(job)}
                                    >
                                      <HelpCircle size={14} /> Interview Prep
                                    </button>

                                    {isApplied ? (
                                      <span className="already-applied-pill">
                                        <Check size={14} /> Applied
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="primary-btn btn-sm"
                                        onClick={() => {
                                          setSelectedJob(job);
                                          setApplicationNotice("");
                                          setApplicationError("");
                                        }}
                                      >
                                        Apply Now <ArrowRight size={15} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {/* TAB: MY APPLICATIONS */}
                  {dashboardTab === "applications" && (
                    <section className="dashboard-content-section">
                      <div className="section-toolbar">
                        <div>
                          <h2>Application Status & Timeline Tracker</h2>
                          <p>Real-time lifecycle monitoring of your submitted applications.</p>
                        </div>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={loadMyApplications}
                          disabled={applicationsLoading}
                        >
                          <RefreshCw size={14} /> Refresh Pipeline
                        </button>
                      </div>

                      {/* Status Filter Tabs */}
                      <div className="app-status-filters">
                        {["all", "pending", "reviewing", "shortlisted", "accepted", "rejected"].map(
                          (status) => (
                            <button
                              key={status}
                              className={`status-filter-btn ${appFilterStatus === status ? "active" : ""}`}
                              onClick={() => setAppFilterStatus(status)}
                            >
                              {status === "all" ? "All Stages" : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          )
                        )}
                      </div>

                      {applicationsLoading ? (
                        <div className="jobs-empty-state">
                          <RefreshCw className="spin" size={24} />
                          <p>Syncing application records...</p>
                        </div>
                      ) : filteredMyApplications.length === 0 ? (
                        <div className="jobs-empty-state">
                          <Clock size={38} />
                          <h3>No applications in this category</h3>
                          <p>Apply for roles in the marketplace to monitor status progression here.</p>
                          <button
                            className="primary-btn"
                            onClick={() => setDashboardTab("recommended")}
                          >
                            Explore AI Matches
                          </button>
                        </div>
                      ) : (
                        <div className="applications-table-card">
                          {filteredMyApplications.map((app) => {
                            const job = app.job;
                            const status = (app.status || "pending").toLowerCase();

                            return (
                              <article className="app-history-row" key={app._id}>
                                <div className="app-history-main">
                                  <h4>{job?.title || "Role Requisition"}</h4>
                                  <div className="app-history-meta">
                                    <span>
                                      <Building2 size={13} /> {job?.company || "Organization"}
                                    </span>
                                    <span>
                                      <MapPin size={13} /> {job?.location || "Location"}
                                    </span>
                                    <span>
                                      Applied on{" "}
                                      {app.createdAt
                                        ? new Date(app.createdAt).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                          })
                                        : "N/A"}
                                    </span>
                                  </div>

                                  {/* Recruiter feedback / notes */}
                                  {app.recruiterNotes && (
                                    <div className="candidate-notes-pill">
                                      <MessageSquare size={13} />
                                      <span><strong>Employer Note:</strong> {app.recruiterNotes}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="app-history-actions">
                                  <span className={`status-pill ${status}`}>
                                    {status === "accepted" && <CheckCircle2 size={13} />}
                                    {status === "shortlisted" && <Award size={13} />}
                                    {status === "reviewing" && <Eye size={13} />}
                                    {status === "pending" && <Clock size={13} />}
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>

                                  {app.resumeUrl && (
                                    <button
                                      type="button"
                                      className="secondary-btn btn-sm"
                                      onClick={() => openResume(app, false)}
                                    >
                                      <FileText size={14} /> My Resume
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {/* TAB: AI RESUME ANALYZER */}
                  {dashboardTab === "ai-analyzer" && (
                    <section className="dashboard-content-section max-w-850">
                      <div className="section-toolbar">
                        <div>
                          <h2>
                            <BrainCircuit size={22} className="accent-sparkle" /> Multi-Factor ATS Resume Inspector
                          </h2>
                          <p>
                            Evaluate keyword density, hard skill alignment, and format compliance against any requisition before submitting.
                          </p>
                        </div>
                      </div>

                      <div className="ai-analyzer-grid">
                        <form className="ai-analyzer-form" onSubmit={runAiAnalysis}>
                          <div className="field-group">
                            <label htmlFor="ai-job-select">Target Requisition</label>
                            <select
                              id="ai-job-select"
                              value={aiJobId}
                              onChange={(e) => setAiJobId(e.target.value)}
                            >
                              <option value="">-- Choose from active openings --</option>
                              {jobs.map((j) => (
                                <option key={j._id} value={j._id}>
                                  {j.title} · {j.company}
                                </option>
                              ))}
                            </select>
                          </div>

                          {!aiJobId && (
                            <div className="field-group">
                              <label htmlFor="ai-custom-skills">
                                Or Custom Skills (comma-separated)
                              </label>
                              <input
                                id="ai-custom-skills"
                                value={aiCustomSkills}
                                onChange={(e) => setAiCustomSkills(e.target.value)}
                                placeholder="e.g. React, Node.js, TypeScript, SQL, Docker"
                              />
                            </div>
                          )}

                          <div className="field-group">
                            <label htmlFor="ai-resume-file">Resume Document (PDF / DOCX)</label>
                            <input
                              id="ai-resume-file"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => setAiResumeFile(e.target.files?.[0] || null)}
                            />
                          </div>

                          <div className="field-group">
                            <label htmlFor="ai-resume-text">Or Paste Resume Raw Text</label>
                            <textarea
                              id="ai-resume-text"
                              value={aiResumeText}
                              onChange={(e) => setAiResumeText(e.target.value)}
                              placeholder="Paste text from your resume here..."
                              rows={5}
                            />
                          </div>

                          {aiError && (
                            <div className="field-error-msg">{aiError}</div>
                          )}

                          <button
                            type="submit"
                            className="primary-btn w-full"
                            disabled={aiAnalyzing}
                          >
                            {aiAnalyzing ? (
                              <>
                                <RefreshCw className="spin" size={16} /> Parsing ATS Vectors...
                              </>
                            ) : (
                              <>
                                <BrainCircuit size={16} /> Execute ATS Compliance Analysis
                              </>
                            )}
                          </button>
                        </form>

                        {/* Analysis Output Panel */}
                        <div className="ai-results-panel">
                          {aiResult ? (
                            <div className="ai-result-card">
                              <div className="ai-score-gauge">
                                <div className="score-circle">
                                  <span className="score-number">{aiResult.matchScore}%</span>
                                  <span className="score-label">ATS Score</span>
                                </div>
                                <div>
                                  <h3>{aiResult.jobTitle}</h3>
                                  {aiResult.company && <p>{aiResult.company}</p>}
                                  <span className="word-count-note">
                                    {aiResult.resumeWordCount} words parsed from resume document
                                  </span>
                                </div>
                              </div>

                              {/* Multi-Vector Sub-Scores */}
                              <div className="multi-score-breakdown">
                                <div className="sub-score-item">
                                  <div className="sub-score-head">
                                    <span>Technical Skills (65%)</span>
                                    <strong>{aiResult.hardSkillScore || aiResult.matchScore}%</strong>
                                  </div>
                                  <div className="score-bar-track">
                                    <div
                                      className="score-bar-fill emerald"
                                      style={{ width: `${aiResult.hardSkillScore || aiResult.matchScore}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="sub-score-item">
                                  <div className="sub-score-head">
                                    <span>Domain Context (25%)</span>
                                    <strong>{aiResult.descriptionScore}%</strong>
                                  </div>
                                  <div className="score-bar-track">
                                    <div
                                      className="score-bar-fill violet"
                                      style={{ width: `${aiResult.descriptionScore}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="ai-skills-breakdown">
                                <h4>Matched Keywords ({aiResult.matchedSkills?.length || 0})</h4>
                                <div className="job-skill-tags">
                                  {aiResult.matchedSkills?.length > 0 ? (
                                    aiResult.matchedSkills.map((s) => (
                                      <span key={s} className="skill-tag matched-tag">
                                        ✓ {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted">No key competencies found.</span>
                                  )}
                                </div>

                                <h4>Missing Competencies / Keyword Gaps ({aiResult.missingSkills?.length || 0})</h4>
                                <div className="job-skill-tags">
                                  {aiResult.missingSkills?.length > 0 ? (
                                    aiResult.missingSkills.map((s) => (
                                      <span key={s} className="skill-tag missing-tag">
                                        + {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted">100% competencies satisfied!</span>
                                  )}
                                </div>
                              </div>

                              {aiResult.tips?.length > 0 && (
                                <div className="ai-tips-box">
                                  <span className="tips-heading">
                                    <Sparkles size={14} /> Optimization Strategy:
                                  </span>
                                  <ul>
                                    {aiResult.tips.map((tip, idx) => (
                                      <li key={idx}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="ai-placeholder-card">
                              <BrainCircuit size={48} />
                              <h3>Multi-Vector ATS Analyzer</h3>
                              <p>
                                Upload your resume document or paste raw text to inspect keyword distribution, missing competencies, and formatting scores.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* SHARED TAB: PROFILE & SKILLS SETTINGS */}
              {dashboardTab === "profile" && (
                <section className="dashboard-content-section max-w-750">
                  <div className="section-toolbar">
                    <div>
                      <h2>{user.role === "recruiter" ? "Recruiter Organization Profile" : "Candidate Profile & Skills Matrix"}</h2>
                      <p>
                        Manage your headline, technical stack tags, and biographical summary.
                      </p>
                    </div>
                  </div>

                  <form className="profile-form-card" onSubmit={saveProfile}>
                    <div className="form-row-2">
                      <div className="field-group">
                        <label htmlFor="pr-name">Full Name *</label>
                        <input
                          id="pr-name"
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, name: e.target.value })
                          }
                          required
                          minLength={2}
                          maxLength={80}
                        />
                      </div>

                      <div className="field-group">
                        <label htmlFor="pr-email">Email Address</label>
                        <input id="pr-email" value={user.email} disabled />
                        <small className="field-hint">Primary account identity.</small>
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor="pr-headline">
                        {user.role === "recruiter" ? "Organization Title / Role" : "Professional Technical Headline"}
                      </label>
                      <input
                        id="pr-headline"
                        value={profileForm.headline}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, headline: e.target.value })
                        }
                        placeholder={
                          user.role === "recruiter"
                            ? "e.g. Lead Technical Recruiter at NextGen AI Labs"
                            : "e.g. Senior Full Stack Engineer (React, Node.js, TypeScript)"
                        }
                        maxLength={120}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor="pr-bio">Biographical Summary</label>
                      <textarea
                        id="pr-bio"
                        value={profileForm.bio}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, bio: e.target.value })
                        }
                        placeholder="Detail your engineering background, core competencies, and career focus..."
                        rows={4}
                        maxLength={1000}
                      />
                    </div>

                    {/* Skills Manager for Candidate */}
                    {user.role === "candidate" && (
                      <div className="field-group">
                        <label>Technical Skills Matrix (powers AI matching algorithm)</label>
                        <div className="skill-input-row">
                          <input
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                addSkill(newSkillInput);
                              }
                            }}
                            placeholder="Type a skill and press Enter (e.g. React, Docker, Python)..."
                          />
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => addSkill(newSkillInput)}
                          >
                            Add Tag
                          </button>
                        </div>

                        {/* Interactive Skills Chip Container */}
                        <div className="interactive-chips-box">
                          {profileForm.skills.length > 0 ? (
                            profileForm.skills.map((skill) => (
                              <span key={skill} className="editable-chip">
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill)}
                                  aria-label={`Remove ${skill}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="no-skills-msg">
                              No skill tags added yet. Choose from suggestions below or enter custom skills.
                            </span>
                          )}
                        </div>

                        {/* Quick-add Common Skills */}
                        <div className="quick-add-skills">
                          <span className="quick-add-label">Quick Suggestions:</span>
                          <div className="quick-tags">
                            {COMMON_SKILLS.filter(
                              (s) => !profileForm.skills.includes(s)
                            ).map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="quick-tag-pill"
                                onClick={() => addSkill(s)}
                              >
                                + {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-actions-right">
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={profileSaving}
                      >
                        {profileSaving ? "Saving..." : "Save Profile Matrix"}
                        <Check size={16} />
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </main>
      )}

      {/* ================= MODAL: CANDIDATE APPLICATION ================= */}
      {selectedJob && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !applicationSubmitting) {
              setSelectedJob(null);
            }
          }}
        >
          <div className="modal-card">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedJob(null)}
              disabled={applicationSubmitting}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <span className="section-kicker">SUBMIT APPLICATION</span>
            <h2>{selectedJob.title}</h2>
            <p className="modal-subtitle">
              <Building2 size={15} /> {selectedJob.company} · <MapPin size={15} />{" "}
              {selectedJob.location || "Remote"}
            </p>

            <form onSubmit={submitApplication}>
              <div className="field-group">
                <label htmlFor="app-resume">Resume Document (PDF / DOCX) *</label>
                <div className="file-upload-box">
                  <UploadCloud size={28} />
                  <input
                    id="app-resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    required
                    disabled={applicationSubmitting}
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  <span>
                    {resumeFile ? resumeFile.name : "Select or drag your PDF / DOCX resume (max 5 MB)"}
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="app-cover">Cover Note / Value Proposition (Optional)</label>
                <textarea
                  id="app-cover"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="Summarize your technical alignment and notable achievements..."
                  disabled={applicationSubmitting}
                />
              </div>

              {applicationError && (
                <div className="field-error-msg">{applicationError}</div>
              )}

              {applicationNotice && (
                <div className="field-success-msg">{applicationNotice}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSelectedJob(null)}
                  disabled={applicationSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={applicationSubmitting}
                >
                  {applicationSubmitting ? "Uploading & Analyzing..." : "Submit Application"}
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AI MOCK INTERVIEW PREP ================= */}
      {interviewPrepJob && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInterviewPrepJob(null);
          }}
        >
          <div className="modal-card modal-lg">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setInterviewPrepJob(null)}
              aria-label="Close interview prep"
            >
              <X size={20} />
            </button>

            <div className="interview-prep-header">
              <span className="section-kicker">
                <HelpCircle size={14} className="accent-sparkle" /> AI TECHNICAL INTERVIEW COACH
              </span>
              <h2>Interview Questions Prep: {interviewPrepJob.title}</h2>
              <p className="modal-subtitle">
                <Building2 size={15} /> {interviewPrepJob.company} · Tailored to job competencies
              </p>
            </div>

            <div className="interview-questions-list">
              <div className="interview-q-card">
                <span className="q-badge technical">Technical Deep-Dive</span>
                <h4>
                  {interviewPrepJob.requiredSkills?.[0]
                    ? `How have you implemented ${interviewPrepJob.requiredSkills[0]} to solve concurrency, caching, or latency bottlenecks in production?`
                    : "Describe the most complex architectural challenge you navigated in your recent project."}
                </h4>
                <p className="q-framework">
                  <strong>Evaluator Rubric:</strong> Examiners look for trade-off analysis, edge-case mitigation, and quantifiable latency/memory benchmarks.
                </p>
              </div>

              {interviewPrepJob.requiredSkills?.[1] && (
                <div className="interview-q-card">
                  <span className="q-badge architecture">Integration & Architecture</span>
                  <h4>
                    How do you structure data validation, contract testing, and error handling between{" "}
                    {interviewPrepJob.requiredSkills[0]} and {interviewPrepJob.requiredSkills[1]}?
                  </h4>
                  <p className="q-framework">
                    <strong>Evaluator Rubric:</strong> Focus on fault-tolerance, circuit-breaker patterns, and graceful degradation.
                  </p>
                </div>
              )}

              <div className="interview-q-card">
                <span className="q-badge system">System Design & High Availability</span>
                <h4>
                  Design a fault-tolerant microservice for {interviewPrepJob.title} handling sudden 10x traffic spikes. What database and caching layer do you choose?
                </h4>
                <p className="q-framework">
                  <strong>Evaluator Rubric:</strong> Clarify constraints, sharding strategy, idempotency, and asynchronous event queues (Kafka / RabbitMQ).
                </p>
              </div>

              <div className="interview-q-card">
                <span className="q-badge behavioral">Behavioral & Technical Trade-offs</span>
                <h4>
                  Describe a scenario where you negotiated technical debt vs. delivering a high-priority business feature. How was the decision documented?
                </h4>
                <p className="q-framework">
                  <strong>Evaluator Rubric:</strong> Demonstrate cross-functional communication, risk prioritization, and structured retrospective logs.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => setInterviewPrepJob(null)}
              >
                Close Preparation View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECRUITER APPLICANTS MANAGER ================= */}
      {selectedApplicantsJob && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedApplicantsJob(null);
          }}
        >
          <div className="modal-card modal-lg">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedApplicantsJob(null)}
              aria-label="Close applicant manager"
            >
              <X size={20} />
            </button>

            <div className="applicants-header">
              <div>
                <span className="section-kicker">TALENT PIPELINE MANAGEMENT</span>
                <h2>Candidates: {selectedApplicantsJob.title}</h2>
                <p className="modal-subtitle">
                  <Building2 size={15} /> {selectedApplicantsJob.company} · {applicants.length}{" "}
                  total candidate records
                </p>
              </div>

              {/* Filter and Sort controls */}
              <div className="applicant-controls">
                <div className="select-pill-wrap">
                  <Filter size={14} />
                  <select
                    value={applicantFilterStatus}
                    onChange={(e) => setApplicantFilterStatus(e.target.value)}
                  >
                    <option value="all">All Stages</option>
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="select-pill-wrap">
                  <TrendingUp size={14} />
                  <select
                    value={applicantSort}
                    onChange={(e) => setApplicantSort(e.target.value)}
                  >
                    <option value="match">Rank: ATS Compatibility</option>
                    <option value="date">Sort: Application Date</option>
                  </select>
                </div>
              </div>
            </div>

            {applicantsLoading ? (
              <div className="jobs-empty-state">
                <RefreshCw className="spin" size={28} />
                <p>Parsing candidate resumes and executing ATS scoring algorithm...</p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="jobs-empty-state">
                <Users size={38} />
                <h3>No candidates in this stage</h3>
                <p>
                  {applicants.length === 0
                    ? "No candidates have applied for this position yet."
                    : "No applicants match the selected stage filter."}
                </p>
              </div>
            ) : (
              <div className="applicants-list">
                {filteredApplicants.map((app, index) => {
                  const candidate = app.candidate;
                  const match = app.resumeMatch || {};
                  const score = match.matchScore ?? 0;

                  return (
                    <article className="applicant-card" key={app._id}>
                      <div className="applicant-card-top">
                        <div className="applicant-info">
                          <div className="applicant-avatar">
                            {(candidate?.name || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="applicant-name-row">
                              <h4>{candidate?.name || "Candidate Name"}</h4>
                              <span className="rank-tag">#{index + 1} Ranked</span>
                            </div>
                            <p className="applicant-email">{candidate?.email || "No email"}</p>
                            <span className="applicant-date">
                              Applied on{" "}
                              {app.createdAt
                                ? new Date(app.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  })
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* AI Match Gauge */}
                        <div className="applicant-match-badge">
                          <div className={`score-badge ${score >= 70 ? "high" : score >= 40 ? "med" : "low"}`}>
                            <Sparkles size={13} />
                            <span>{score}% Multi-Vector ATS Match</span>
                          </div>
                        </div>
                      </div>

                      {/* Multi-Vector Sub-Scores for Recruiter */}
                      {match.hardSkillScore !== undefined && (
                        <div className="recruiter-sub-metrics">
                          <span className="sub-metric-pill">
                            Hard Skills Fit: <strong>{match.hardSkillScore}%</strong>
                          </span>
                          <span className="sub-metric-pill">
                            Domain Term Fit: <strong>{match.descriptionScore}%</strong>
                          </span>
                          <span className="sub-metric-pill">
                            Format Readability: <strong>{match.formatScore || 90}%</strong>
                          </span>
                        </div>
                      )}

                      {/* Competencies */}
                      <div className="applicant-ai-details">
                        {match.matchedSkills?.length > 0 && (
                          <div className="ai-skill-row">
                            <span className="ai-sublabel text-green">
                              <CheckCircle2 size={12} /> Matched Skills:
                            </span>
                            <div className="job-skill-tags">
                              {match.matchedSkills.map((s) => (
                                <span key={s} className="skill-tag matched-tag">
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {match.missingSkills?.length > 0 && (
                          <div className="ai-skill-row">
                            <span className="ai-sublabel text-orange">Missing Skills:</span>
                            <div className="job-skill-tags">
                              {match.missingSkills.map((s) => (
                                <span key={s} className="skill-tag missing-tag">
                                  + {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {app.coverLetter && (
                        <div className="applicant-cover-note">
                          <strong>Candidate Cover Letter:</strong>
                          <p>{app.coverLetter}</p>
                        </div>
                      )}

                      {/* Recruiter Evaluation Notes Input */}
                      <div className="recruiter-note-box">
                        <label htmlFor={`note-${app._id}`}>
                          <MessageSquare size={13} /> Recruiter Interview Notes & Feedback:
                        </label>
                        <div className="note-input-row">
                          <input
                            id={`note-${app._id}`}
                            value={recruiterNoteInputs[app._id] ?? (app.recruiterNotes || "")}
                            onChange={(e) =>
                              setRecruiterNoteInputs({
                                ...recruiterNoteInputs,
                                [app._id]: e.target.value
                              })
                            }
                            placeholder="Add evaluation remarks or interview feedback..."
                          />
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            disabled={statusUpdatingId === app._id}
                            onClick={() =>
                              updateApplicantStatus(
                                app._id,
                                app.status,
                                recruiterNoteInputs[app._id] || ""
                              )
                            }
                          >
                            Save Note
                          </button>
                        </div>
                      </div>

                      <div className="applicant-card-actions">
                        {/* Resume view/download */}
                        <div className="resume-btns-group">
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            onClick={() => openResume(app, false)}
                          >
                            <FileText size={14} /> View Resume
                          </button>
                          <button
                            type="button"
                            className="secondary-btn btn-sm"
                            onClick={() => openResume(app, true)}
                            title="Download candidate resume"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>

                        {/* Status update selector */}
                        <div className="status-updater-wrap">
                          <label htmlFor={`st-${app._id}`}>Application Stage:</label>
                          <select
                            id={`st-${app._id}`}
                            value={app.status || "pending"}
                            disabled={statusUpdatingId === app._id}
                            onChange={(e) => updateApplicantStatus(app._id, e.target.value)}
                            className={`status-select ${app.status || "pending"}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <button className="brand footer-brand" onClick={goHome}>
          <span className="brand-icon">
            <BrainCircuit size={18} />
          </span>
          <span>
            Hire<span className="brand-accent">AI</span>
          </span>
        </button>

        <p>Multi-Vector AI ATS Engine & Recruitment Pipeline</p>
        <span>© {new Date().getFullYear()} HireAI Platform</span>
      </footer>
    </div>
  );
}

export default App;
