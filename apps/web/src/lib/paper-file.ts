import "server-only";

import path from "node:path";

const supportedExtensions = new Set([".pdf", ".txt", ".md", ".markdown"]);

export type ParsedPaperFile = {
  title: string;
  text: string;
  sourceLabel: string;
};

export function isSupportedPaperFileName(fileName: string) {
  return supportedExtensions.has(path.extname(fileName).toLowerCase());
}

type PdfParseResult = {
  text?: string;
};

type PdfParseModule = {
  default?: (data: Buffer) => Promise<PdfParseResult>;
};

function titleFromFileName(fileName: string) {
  const base = path.basename(fileName, path.extname(fileName));
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function parsePaperFile(file: File): Promise<ParsedPaperFile> {
  const fileName = file.name || "local-paper";
  const extension = path.extname(fileName).toLowerCase();
  if (!isSupportedPaperFileName(fileName)) {
    throw new Error("PDF, TXT, Markdown files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  if (extension === ".pdf") {
    const pdfParseModule = (await import("pdf-parse/lib/pdf-parse.js")) as PdfParseModule;
    const parsePdf = pdfParseModule.default;
    if (!parsePdf) throw new Error("PDF parser is not available.");
    const result = await parsePdf(buffer);
    text = result.text ?? "";
  } else {
    text = buffer.toString("utf8");
  }

  const normalizedText = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalizedText.length < 80) {
    throw new Error("Could not extract enough text from the selected file.");
  }

  return {
    title: titleFromFileName(fileName),
    text: normalizedText,
    sourceLabel: `local:${fileName}`,
  };
}
