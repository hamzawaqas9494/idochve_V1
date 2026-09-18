import type { FileKind } from "./types";

/** Only formats the OCR gateway can actually read today. */
export const SUPPORTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "tif", "tiff", "webp", "gif", "bmp"];

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/tif",
  "image/webp",
  "image/gif",
  "image/bmp",
];

export const SUPPORTED_ACCEPT = [
  ...SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
  ...SUPPORTED_MIME_TYPES,
].join(",");

export const SUPPORTED_SUMMARY = "Scanned PDFs and images (PNG, JPEG, TIFF, WebP, GIF, BMP)";

const MAX_FILES_PER_DROP = 500;

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isSupportedFile(file: File) {
  return SUPPORTED_EXTENSIONS.includes(extensionOf(file.name)) || SUPPORTED_MIME_TYPES.includes(file.type);
}

export function fileKindOf(name: string, mimeType = ""): FileKind {
  const ext = extensionOf(name);
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (SUPPORTED_EXTENSIONS.includes(ext) || mimeType.startsWith("image/")) return "image";
  if (["xls", "xlsx", "doc", "docx", "ppt", "pptx"].includes(ext)) return "office";
  if (["zip", "7z"].includes(ext)) return "archive";
  if (["eml", "msg"].includes(ext)) return "email";
  return "other";
}

export function typeBadgeOf(kind: FileKind) {
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "Image";
  if (kind === "office") return "Office";
  if (kind === "archive") return "Archive";
  if (kind === "email") return "Email";
  return "File";
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Walks dropped folders so a directory drop yields the same files as Choose folder. */
export async function filesFromDataTransfer(transfer: DataTransfer): Promise<File[]> {
  const entries: FileSystemEntry[] = [];
  const loose: File[] = [];

  for (const item of Array.from(transfer.items ?? [])) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      entries.push(entry);
      continue;
    }
    const file = item.getAsFile();
    if (file) loose.push(file);
  }

  if (!entries.length) {
    return loose.length ? loose : Array.from(transfer.files ?? []);
  }

  const collected = [...loose];
  for (const entry of entries) {
    await collectEntry(entry, collected);
  }
  return collected;
}

async function collectEntry(entry: FileSystemEntry, collected: File[], depth = 0) {
  if (collected.length >= MAX_FILES_PER_DROP || depth > 8) return;

  if (entry.isFile) {
    const file = await readFile(entry as FileSystemFileEntry);
    if (file) collected.push(file);
    return;
  }

  if (entry.isDirectory) {
    for (const child of await readDirectory(entry as FileSystemDirectoryEntry)) {
      await collectEntry(child, collected, depth + 1);
    }
  }
}

function readFile(entry: FileSystemFileEntry) {
  return new Promise<File | null>((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null),
    );
  });
}

async function readDirectory(entry: FileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const all: FileSystemEntry[] = [];

  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(
        (items) => resolve(items),
        () => resolve([]),
      );
    });
    if (!batch.length) break;
    all.push(...batch);
    if (all.length >= MAX_FILES_PER_DROP) break;
  }

  return all;
}
