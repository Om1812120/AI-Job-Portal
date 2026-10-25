
const fs = require("fs/promises");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

async function extractResumeText(filePath) {
  if (!filePath) {
    throw new Error("Resume file path is required.");
  }

  const extension = path.extname(filePath).toLowerCase();

  if (![".pdf", ".doc", ".docx"].includes(extension)) {
    throw new Error("Unsupported resume format.");
  }

  const fileBuffer = await fs.readFile(filePath);

  if (extension === ".pdf") {
    const parser = new pdfParse.PDFParse({ data: fileBuffer });

    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({
      buffer: fileBuffer
    });

    return result.value.trim();
  }

  throw new Error(
    "Legacy .doc files are not supported by this parser yet. Please upload a PDF or DOCX resume."
  );
}

module.exports = { extractResumeText };
