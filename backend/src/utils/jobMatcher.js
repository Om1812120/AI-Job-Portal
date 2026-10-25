function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/\.net/g, " dotnet ")
    .replace(/node\.js/g, " nodejs ")
    .replace(/react\.js/g, " react ")
    .replace(/vue\.js/g, " vue ")
    .replace(/next\.js/g, " nextjs ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

function skillExists(text, skill) {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedSkill = ` ${normalizeText(skill)} `;

  return (
    normalizedSkill.trim().length > 0 &&
    normalizedText.includes(normalizedSkill)
  );
}

// Generate tailored AI interview prep questions based on job title, matched & missing skills
function generateInterviewQuestions(jobTitle = "Software Engineer", matchedSkills = [], missingSkills = []) {
  const questions = [];

  if (matchedSkills.length > 0) {
    const primarySkill = matchedSkills[0];
    questions.push({
      category: "Technical Deep-Dive",
      skill: primarySkill,
      question: `How have you designed and optimized production workflows using ${primarySkill}? Describe a specific technical challenge you resolved.`
    });

    if (matchedSkills.length > 1) {
      const secondarySkill = matchedSkills[1];
      questions.push({
        category: "Integration & Architecture",
        skill: secondarySkill,
        question: `In a full-scale ${jobTitle} role, how do you handle state management, caching, or data consistency when connecting ${primarySkill} with ${secondarySkill}?`
      });
    }
  }

  if (missingSkills.length > 0) {
    const targetSkill = missingSkills[0];
    questions.push({
      category: "Growth & Adaptability",
      skill: targetSkill,
      question: `This role requires proficiency in ${targetSkill}. How would you leverage your existing technical foundation to rapidly onboard and deliver features using ${targetSkill}?`
    });
  }

  questions.push({
    category: "System Design & Scalability",
    skill: "System Design",
    question: `Walk through the end-to-end architecture you would propose for a high-availability microservice supporting ${jobTitle} responsibilities.`
  });

  questions.push({
    category: "Behavioral & Leadership",
    skill: "Collaboration",
    question: "Describe a situation where you had to push back on a requirement or compromise on technical debt to meet a strict deadline. What was the outcome?"
  });

  return questions;
}

function calculateJobMatch(resumeText = "", job = {}) {
  const skills = Array.isArray(job.requiredSkills)
    ? [...new Set(job.requiredSkills.map((s) => String(s).trim()).filter(Boolean))]
    : [];

  const matchedSkills = skills.filter((skill) => skillExists(resumeText, skill));
  const missingSkills = skills.filter((skill) => !skillExists(resumeText, skill));

  const hardSkillScore = skills.length
    ? Math.round((matchedSkills.length / skills.length) * 100)
    : 100;

  // Contextual job description keyword extraction
  const descriptionWords = [
    ...new Set(
      normalizeText(job.description || "")
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !["with", "from", "that", "this", "have", "will", "your"].includes(word))
    )
  ];

  const resumeDescriptionMatches = descriptionWords.filter((word) =>
    skillExists(resumeText, word)
  );

  const descriptionScore = descriptionWords.length
    ? Math.round((resumeDescriptionMatches.length / descriptionWords.length) * 100)
    : 100;

  // Format & Length Metric (standard ATS favors resumes with 200 - 1500 words)
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  let formatScore = 80;
  if (wordCount >= 150 && wordCount <= 1200) {
    formatScore = 95;
  } else if (wordCount > 1200) {
    formatScore = 85;
  } else if (wordCount > 0) {
    formatScore = 65;
  }

  // Multi-Factor Composite Weighted ATS Score:
  // 65% Hard Technical Skills + 25% Domain Context + 10% ATS Format Metric
  const compositeScore = Math.min(
    100,
    Math.round(hardSkillScore * 0.65 + descriptionScore * 0.25 + formatScore * 0.1)
  );

  // Generate ATS tips
  const tips = [];
  if (missingSkills.length > 0) {
    tips.push(`ATS Keyword Gap: Incorporate ${missingSkills.slice(0, 3).join(", ")} directly into your skills or projects section.`);
  }
  if (descriptionScore < 45) {
    tips.push("Echo job description terminology: Align project bullet points with the specific action verbs from the posting.");
  }
  if (hardSkillScore >= 80) {
    tips.push("Strong keyword parity! Ensure quantifiable metrics (e.g. '% speedup', 'X users') back up each skill claim.");
  } else {
    tips.push("Highlight relevant coursework, personal open-source projects, or certifications covering the missing requirements.");
  }

  // Generate tailored interview questions
  const interviewQuestions = generateInterviewQuestions(
    job.title || "Software Engineer",
    matchedSkills,
    missingSkills
  );

  return {
    matchScore: compositeScore,
    hardSkillScore,
    descriptionScore,
    formatScore,
    matchedSkills,
    missingSkills,
    tips,
    interviewQuestions,
    matchingMethod: "multi-factor-nlp-scoring"
  };
}

module.exports = { calculateJobMatch, generateInterviewQuestions };
