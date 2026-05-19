"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || `https://yasirirshad-editor-backend.hf.space`;
const LANGUAGES = [
  { label: "None (subtitles only)", value: "" },
  { label: "Urdu", value: "ur" },
  { label: "Arabic", value: "ar" },
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
] as const;

type ProcessResponse = {
  work_id: string;
  file_path: string;
  download_url: string;
  warning?: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState("");
  const [speakerGender, setSpeakerGender] = useState<"male" | "female">(
    "female",
  );
  const [captionPosition, setCaptionPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [workId, setWorkId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const setFile = useCallback((file: File | null) => {
    setVideoFile(file);
    setResultUrl(null);
    setWorkId(null);
    setWarning(null);
    setError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      return;
    }
    setFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError("Please upload a video first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setWarning(null);
    setResultUrl(null);
    setWorkId(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("caption_position", String(captionPosition));
    formData.append("speaker_gender", speakerGender);
    if (targetLang) {
      formData.append("target_lang", targetLang);
    }

    try {
      const res = await fetch(`${API_BASE}/process-video/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail =
          typeof body?.detail === "string"
            ? body.detail
            : Array.isArray(body?.detail)
              ? body.detail.map((d: { msg?: string }) => d.msg).join(", ")
              : `Request failed (${res.status})`;
        throw new Error(detail);
      }

      const data: ProcessResponse = await res.json();
      const downloadUrl = `${API_BASE}${data.download_url}`;
      setWorkId(data.work_id);
      setResultUrl(downloadUrl);
      setWarning(data.warning ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mesh-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 text-center sm:text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium tracking-wide text-violet-300 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse-glow" />
            AI Dubbing Studio
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Dub, translate & caption
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
              your videos in minutes
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Upload a video, choose a target language and voice, adjust caption
            placement, and get a fully dubbed output with styled subtitles.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
                Source video
              </h2>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`upload-zone flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                  isDragging
                    ? "border-violet-400 bg-violet-500/10"
                    : "border-white/15 hover:border-violet-500/50 hover:bg-white/[0.02]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                  <UploadIcon />
                </div>
                <p className="text-sm font-medium text-zinc-200">
                  {videoFile ? videoFile.name : "Drop your video here"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  or click to browse · MP4, MOV, WebM
                </p>
              </div>

              {previewUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-48 w-full bg-black object-contain"
                  />
                </div>
              )}
            </section>

            <section className="glass rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
                Dubbing options
              </h2>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Target language
                </span>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-zinc-100 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                >
                  {LANGUAGES.map((lang) => (
                    <option
                      key={lang.label}
                      value={lang.value}
                      className="bg-zinc-900"
                    >
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Speaker gender
                </span>
                <select
                  value={speakerGender}
                  onChange={(e) =>
                    setSpeakerGender(e.target.value as "male" | "female")
                  }
                  className="glass w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-zinc-100 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="male" className="bg-zinc-900">
                    Male
                  </option>
                  <option value="female" className="bg-zinc-900">
                    Female
                  </option>
                </select>
              </label>

              <label className="block">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-400">
                  <span>Caption position from bottom</span>
                  <span className="font-mono text-violet-300">
                    {captionPosition}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={5}
                  value={captionPosition}
                  onChange={(e) =>
                    setCaptionPosition(Number(e.target.value))
                  }
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
                  <span>Bottom</span>
                  <span>Higher</span>
                </div>
              </label>
            </section>

            {warning && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {warning}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !videoFile}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isProcessing ? (
                  <>
                    <Spinner />
                    Processing video…
                  </>
                ) : (
                  <>
                    <SparkIcon />
                    Start dubbing
                  </>
                )}
              </span>
            </button>
          </form>

          <section className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
              Processed output
            </h2>

            {!resultUrl ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-600">
                  <PlayIcon />
                </div>
                <p className="text-sm text-zinc-500">
                  Your dubbed video will appear here after processing
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <video
                    key={resultUrl}
                    src={resultUrl}
                    controls
                    className="aspect-video w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={resultUrl}
                    download={workId ? `dubbed_${workId}.mp4` : "dubbed.mp4"}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    <DownloadIcon />
                    Download MP4
                  </a>
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
                  >
                    Open in new tab
                  </a>
                </div>
                {workId && (
                  <p className="text-xs text-zinc-600 font-mono">
                    Job ID: {workId}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
