import { useId, useRef, type KeyboardEvent } from "react";
import { CloudUpload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SUPPORTED_ACCEPT, SUPPORTED_SUMMARY, filesFromDataTransfer } from "@/lib/ingestion/files";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  dragging,
  onDragging,
  onChoose,
  onShowFormats,
}: {
  dragging: boolean;
  onDragging: (value: boolean) => void;
  onChoose: (files: File[]) => void;
  onShowFormats: () => void;
}) {
  const titleId = useId();
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  function take(list: FileList | null) {
    if (list?.length) onChoose(Array.from(list));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      filesRef.current?.click();
    }
  }

  return (
    <Card
      className={cn(
        "border-dashed px-6 py-12 text-center transition-colors duration-150",
        dragging ? "border-[var(--blue-600)] bg-[var(--blue-600)]/5" : "",
      )}
    >
      <div
        tabIndex={0}
        aria-labelledby={titleId}
        className="outline-none"
        onKeyDown={onKey}
        onDragOver={(event) => {
          event.preventDefault();
          onDragging(true);
        }}
        onDragLeave={() => onDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragging(false);
          void filesFromDataTransfer(event.dataTransfer).then((files) => {
            if (files.length) onChoose(files);
          });
        }}
      >
        <CloudUpload className="mx-auto size-9 text-[var(--blue-600)]" aria-hidden="true" />
        <h2 id={titleId} className="mt-3 text-lg font-semibold">
          Drop files or folders here
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{SUPPORTED_SUMMARY}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => filesRef.current?.click()}>
            Choose files
          </Button>
          <Button type="button" variant="outline" onClick={() => folderRef.current?.click()}>
            Choose folder
          </Button>
          <Button type="button" variant="link" onClick={onShowFormats}>
            View supported formats
          </Button>
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Lock className="size-3.5" aria-hidden="true" />
          Files start uploading automatically. Originals remain encrypted and immutable.
        </p>
        <input
          ref={filesRef}
          type="file"
          multiple
          hidden
          accept={SUPPORTED_ACCEPT}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={(element) => {
            folderRef.current = element;
            if (element) {
              element.setAttribute("webkitdirectory", "");
              element.setAttribute("directory", "");
            }
          }}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}
