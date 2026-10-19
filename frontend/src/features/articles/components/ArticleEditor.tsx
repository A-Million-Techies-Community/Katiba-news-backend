import { sessionFetch } from '../../../auth/session'

import React, { useCallback, useEffect, useMemo, useState } from "react";

interface ArticleEditorProps {
  onBackToDashboard?: () => void;
}

type ArticleStatus = "draft" | "under_review" | "approved" | "rejected" | "published";
type ViewMode = "library" | "editor" | "preview";
type FilterStatus = "all" | ArticleStatus;

interface ArticleForm {
  title: string;
  subtitle: string;
  author: string;
  category: string;
  location: string;
  featuredImage: string;
  opening: string;
  body: string;
  heading: string;
  section: string;
  quote: string;
  source: string;
  takeaway: string;
  tags: string;
  notes: string;
  status: ArticleStatus;
}

interface ArticleRecord {
  id: string | number;
  title: string;
  content: string;
  feedback?: string;
  status?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
  author?: string;
  [key: string]: unknown;
}

const API_URL = "/api/articles/";

const emptyForm: ArticleForm = {
  title: "",
  subtitle: "",
  author: "",
  category: "News",
  location: "",
  featuredImage: "",
  opening: "",
  body: "",
  heading: "",
  section: "",
  quote: "",
  source: "",
  takeaway: "",
  tags: "",
  notes: "",
  status: "draft",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Draft",
  under_review: "Under review",
  published: "Published",
  approved: "Approved",
  rejected: "Needs changes",
};

const statusStyles: Record<ArticleStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-700",
  published: "bg-emerald-100 text-emerald-800",
};

const categories = [
  "News",
  "Politics",
  "Business",
  "Technology",
  "Education",
  "Health",
  "Sports",
  "Entertainment",
  "Opinion",
  "County News",
  "World News",
];

function normalizeStatus(value: unknown): ArticleStatus {
  if (
    value === "under_review" ||
    value === "under review" ||
    value === "review"
  ) {
    return "under_review";
  }

  if (value === "published" || value === "approved" || value === "rejected") return value;

  return "draft";
}

function parseArticleContent(content: unknown): Partial<ArticleForm> {
  if (!content) return {};

  if (typeof content === "object" && content !== null) {
    return content as Partial<ArticleForm>;
  }

  if (typeof content === "string") {
    try {
      const parsed: unknown = JSON.parse(content);

      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Partial<ArticleForm>;
      }

      return { body: content };
    } catch {
      return { body: content };
    }
  }

  return {};
}

function articleToForm(article: ArticleRecord): ArticleForm {
  const content = parseArticleContent(article.content);

  const rawTags = content.tags;

  return {
    ...emptyForm,
    ...content,
    title: article.title || "",
    author:
      content.author ||
      (typeof article.author === "string" ? article.author : ""),
    tags: Array.isArray(rawTags) ? rawTags.join(", ") : String(rawTags || ""),
    status: normalizeStatus(article.status ?? content.status),
  };
}

function getArticleIdentifier(article: ArticleRecord): string {
  return String(article.id ?? article.slug ?? "");
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    if (typeof object.detail === "string") return object.detail;
    if (typeof object.message === "string") return object.message;

    const firstValue = Object.values(object)[0];

    if (typeof firstValue === "string") return firstValue;

    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
  }

  return fallback;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  onBackToDashboard,
}) => {
  const [form, setForm] = useState<ArticleForm>(() => {
    try { return { ...emptyForm, author: JSON.parse(sessionStorage.getItem('katibaUserSession') || '{}').username || '' } }
    catch { return emptyForm }
  });
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("library");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const wordCount = useMemo(() => {
    const text = `${form.opening} ${form.body} ${form.section}`.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [form.opening, form.body, form.section]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const getHeaders = useCallback((): HeadersInit => {
    const rawSession = sessionStorage.getItem("katibaUserSession");

    if (!rawSession) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const session = JSON.parse(rawSession);

    if (!session.access) {
      throw new Error("Authentication token not found. Please sign in again.");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access}`,
    };
  }, []);

  const showMessage = (
    text: string,
    type: "success" | "error" = "success"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await sessionFetch(`${API_URL}?mine=true`, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          getErrorMessage(data, "Unable to load articles.")
        );
      }

      const data: unknown = await response.json();

      const records = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            Array.isArray((data as { results?: unknown }).results)
          ? (data as { results: unknown[] }).results
          : null;

      if (!records) {
        throw new Error(
          "The articles API returned an unexpected response. Expected an article list."
        );
      }

      setArticles(
        records.filter(
          (item): item is ArticleRecord =>
            Boolean(
              item &&
                typeof item === "object" &&
                "id" in item &&
                "title" in item
            )
        )
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to load articles.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadArticles(); });
    return () => { active = false; };
  }, [loadArticles]);

  const updateField = <K extends keyof ArticleForm>(
    field: K,
    value: ArticleForm[K]
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setMessage("");
  };

  const goBack = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
      return;
    }

    window.location.href = "/author/dashboard";
  };

  const startNewArticle = () => {
    setEditingId(null);

    let author = "";

    try {
      const session = JSON.parse(
        sessionStorage.getItem("katibaUserSession") || "{}"
      );
      author = session.username || "";
    } catch {
      // Keep the default author empty.
    }

    setForm({ ...emptyForm, author });
    setView("editor");
    setMessage("");
  };

  const editArticle = (article: ArticleRecord) => {
    setEditingId(getArticleIdentifier(article));
    setForm(articleToForm(article));
    setView("editor");
    setMessage("");
  };

  const previewArticle = (article: ArticleRecord) => {
    setEditingId(getArticleIdentifier(article));
    setForm(articleToForm(article));
    setView("preview");
    setMessage("");
  };

  const saveArticle = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setMessage("");

    if (!form.title.trim()) {
      showMessage("Please enter an article headline.", "error");
      return;
    }

    if (!form.opening.trim() && !form.body.trim() && !form.section.trim()) {
      showMessage("Please add an introduction or article content.", "error");
      return;
    }

    setSaving(true);

    try {
      const content = {
        subtitle: form.subtitle,
        author: form.author,
        category: form.category,
        location: form.location,
        featuredImage: form.featuredImage,
        opening: form.opening,
        body: form.body,
        heading: form.heading,
        section: form.section,
        quote: form.quote,
        source: form.source,
        takeaway: form.takeaway,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: form.notes,
        readingTime,
        status: form.status,
      };

      const payload = {
        title: form.title.trim(),
        content: JSON.stringify(content),
        status: form.status,
      };

      const isEditing = editingId !== null;

      const url = isEditing
        ? `${API_URL}${encodeURIComponent(editingId)}/`
        : API_URL;

      const response = await sessionFetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          getErrorMessage(
            data,
            isEditing
              ? "Unable to update this article."
              : "Unable to create this article."
          )
        );
      }

      const saved = (await response.json().catch(() => null)) as
        | ArticleRecord
        | null;

      showMessage(
        isEditing
          ? "Article updated successfully."
          : "Article created successfully."
      );

      if (saved && typeof saved === "object" && saved.id != null) {
        setEditingId(getArticleIdentifier(saved));
      }

      await loadArticles();
      setView("library");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: ArticleRecord) => {
    const identifier = getArticleIdentifier(article);

    if (!identifier) {
      showMessage("This article has no usable ID.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${article.title}" permanently? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(identifier);
    setMessage("");

    try {
      const response = await sessionFetch(
        `${API_URL}${encodeURIComponent(identifier)}/`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          getErrorMessage(data, "Unable to delete this article.")
        );
      }

      setArticles((previous) =>
        previous.filter(
          (item) => getArticleIdentifier(item) !== identifier
        )
      );

      if (editingId === identifier) {
        setEditingId(null);
        setForm(emptyForm);
        setView("library");
      }

      showMessage("Article deleted successfully.");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete this article.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const changeStatus = async (
    article: ArticleRecord,
    nextStatus: ArticleStatus
  ) => {
    const identifier = getArticleIdentifier(article);

    if (!identifier) {
      showMessage("This article has no usable ID.", "error");
      return;
    }

    const currentStatus = normalizeStatus(article.status);

    if (currentStatus === nextStatus) return;

    const confirmationText =
      nextStatus === "published"
        ? "Publish this article? Ensure it has completed editorial review."
        : nextStatus === "under_review"
          ? "Submit this article for editorial review?"
          : "Move this article back to drafts?";

    if (!window.confirm(confirmationText)) return;

    setMessage("");

    try {
      const response = await sessionFetch(
        `${API_URL}${encodeURIComponent(identifier)}/`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          getErrorMessage(data, "Unable to change article status.")
        );
      }

      await loadArticles();
      showMessage(`Article status changed to ${statusLabels[nextStatus]}.`);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to change article status.",
        "error"
      );
    }
  };

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return articles.filter((article) => {
      const status = normalizeStatus(article.status);
      const matchesStatus = filter === "all" || status === filter;
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        String(article.author || "").toLowerCase().includes(query) ||
        parseArticleContent(article.content)
          .category?.toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [articles, filter, search]);

  const counts = useMemo(
    () => ({
      all: articles.length,
      approved: articles.filter(a => a.status === 'approved').length,
      rejected: articles.filter(a => a.status === 'rejected').length,
      draft: articles.filter(
        (article) => normalizeStatus(article.status) === "draft"
      ).length,
      under_review: articles.filter(
        (article) => normalizeStatus(article.status) === "under_review"
      ).length,
      published: articles.filter(
        (article) => normalizeStatus(article.status) === "published"
      ).length,
    }),
    [articles]
  );

  const statusBadge = (status: ArticleStatus) => (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );

  const field = (
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void,
    options?: {
      placeholder?: string;
      rows?: number;
      required?: boolean;
      maxLength?: number;
      type?: string;
    }
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {options?.required && <span className="text-red-500"> *</span>}
      </label>

      {options?.rows ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={options.placeholder}
          rows={options.rows}
          required={options.required}
          maxLength={options.maxLength}
          className={`${inputClass} resize-y leading-7`}
        />
      ) : (
        <input
          id={id}
          type={options?.type || "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={options?.placeholder}
          required={options?.required}
          maxLength={options?.maxLength}
          className={inputClass}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={view === "library" ? goBack : () => setView("library")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label={view === "library" ? "Back to dashboard" : "Back to articles"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5m7 7-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div>
              <p className="font-bold tracking-tight">Katiba News</p>
              <p className="text-xs text-slate-500">
                {view === "library"
                  ? "Article management"
                  : view === "preview"
                    ? "Article preview"
                    : editingId
                      ? "Edit article"
                      : "New article"}
              </p>
            </div>
          </div>

          {view === "library" ? (
            <button
              type="button"
              onClick={startNewArticle}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              + New article
            </button>
          ) : view === "preview" ? (
            <button
              type="button"
              onClick={() => setView("editor")}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Edit article
            </button>
          ) : (
            <button
              type="submit"
              form="article-editor-form"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save article"}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {view === "library" && (
          <>
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  Newsroom
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Your articles
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Create stories, manage drafts, review submissions, and
                  maintain your published articles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadArticles()}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh articles"}
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  ["all", "All articles"],
                  ["draft", "Drafts"],
                  ["under_review", "Under review"],
                  ["published", "Published"],
                ] as [FilterStatus, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    filter === key
                      ? "border-blue-300 bg-blue-50 ring-2 ring-blue-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts[key]}
                  </p>
                </button>
              ))}
            </div>

            <div className="mb-5">
              <input
                aria-label="Search articles"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by headline, author, or category..."
                className={inputClass}
              />
            </div>

            {loading && articles.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Loading your articles...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-7 w-7"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                      strokeLinejoin="round"
                    />
                    <path d="M14 3v5h5M9 13h6M9 17h6" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-bold">
                  {articles.length === 0
                    ? "No articles yet"
                    : "No matching articles"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {articles.length === 0
                    ? "Create your first story. Saved articles will appear here so you can edit, preview, and manage them."
                    : "Try another search or choose a different publication status."}
                </p>

                {articles.length === 0 && (
                  <button
                    type="button"
                    onClick={startNewArticle}
                    className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Create first article
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article) => {
                  const articleForm = articleToForm(article);
                  const status = normalizeStatus(article.status);

                  return (
                    <article
                      key={getArticleIdentifier(article)}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
                        {articleForm.featuredImage && (
                          <img
                            src={articleForm.featuredImage}
                            alt=""
                            className="h-36 w-full rounded-xl object-cover sm:w-48"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {statusBadge(status)}
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {articleForm.category}
                            </span>
                            {articleForm.location && (
                              <span className="text-xs text-slate-500">
                                {articleForm.location}
                              </span>
                            )}
                          </div>

                          <h2 className="text-xl font-bold leading-snug text-slate-900">
                            {article.title}
                          </h2>

                          {articleForm.subtitle && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                              {articleForm.subtitle}
                            </p>
                          )}

                          <p className="mt-3 text-xs text-slate-500">
                            By {articleForm.author || "Unknown author"}
                            {" · "}
                            {articleForm.opening || articleForm.body
                              ? Math.max(
                                  1,
                                  Math.ceil(
                                    `${articleForm.opening} ${articleForm.body} ${articleForm.section}`
                                      .trim()
                                      .split(/\s+/).filter(Boolean).length / 200
                                  )
                                )
                              : 1}{" "}
                            min read
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => previewArticle(article)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                            >
                              Preview
                            </button>

                            {(status === "draft" || status === "rejected") && <button
                              type="button"
                              onClick={() => editArticle(article)}
                              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                              Edit
                            </button>}

                            {(status === "draft" || status === "rejected") && (
                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(article, "under_review")
                                }
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                              >
                                Submit for review
                              </button>
                            )}

                            {(status === 'draft' || status === 'rejected') && <button disabled={deletingId === getArticleIdentifier(article)} onClick={() => void deleteArticle(article)} className="text-red-700">Delete draft</button>}
                            {article.feedback && <p className="text-slate-600">Editor feedback: {article.feedback}</p>}
                            {status === 'under_review' && <span className="text-sm text-slate-500">Awaiting editor review</span>}
                            {status === 'approved' && <span className="text-sm text-slate-500">Approved · awaiting publication</span>}

                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "editor" && (
          <>
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Newsroom
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {editingId ? "Edit article" : "Write a new article"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Your changes will be saved to the articles API.
              </p>
              <div className="mt-4">{statusBadge(form.status)}</div>
            </div>

            <form
              id="article-editor-form"
              onSubmit={saveArticle}
              className="space-y-6"
            >
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 className="mb-5 font-bold">Headline and summary</h2>

                <div className="space-y-5">
                  {field(
                    "Headline",
                    "article-title",
                    form.title,
                    (value) => updateField("title", value),
                    {
                      placeholder: "Write your article headline...",
                      required: true,
                      maxLength: 200,
                    }
                  )}

                  <p className="-mt-3 text-right text-xs text-slate-400">
                    {form.title.length}/200 characters
                  </p>

                  {field(
                    "Summary / subtitle",
                    "article-subtitle",
                    form.subtitle,
                    (value) => updateField("subtitle", value),
                    {
                      placeholder: "Briefly explain the main point of your story...",
                      rows: 3,
                    }
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 className="mb-5 font-bold">Publication information</h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="article-author" className={labelClass}>
                      Author name
                    </label>
                    <input
                      id="article-author"
                      value={form.author}
                      onChange={(event) =>
                        updateField("author", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Author name"
                    />
                  </div>

                  <div>
                    <label htmlFor="article-category" className={labelClass}>
                      Category
                    </label>
                    <select
                      id="article-category"
                      value={form.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                      className={inputClass}
                    >
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="article-location" className={labelClass}>
                      Location
                    </label>
                    <input
                      id="article-location"
                      value={form.location}
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                      placeholder="e.g. Marsabit, Kenya"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="article-status" className={labelClass}>
                      Publication status
                    </label>
                    <select
                      id="article-status"
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target.value as ArticleStatus
                        )
                      }
                      className={inputClass}
                    >
                      <option value="draft">Draft</option>
                      <option value="under_review">Under review</option>

                    </select>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 className="mb-2 font-bold">Featured image</h2>
                <p className="mb-5 text-sm text-slate-500">
                  Add an image URL to illustrate your story.
                </p>

                {field(
                  "Featured image URL",
                  "article-image",
                  form.featuredImage,
                  (value) => updateField("featuredImage", value),
                  {
                    placeholder: "https://example.com/image.jpg",
                    type: "url",
                  }
                )}

                {form.featuredImage && (
                  <img
                    src={form.featuredImage}
                    alt="Featured image preview"
                    className="mt-4 max-h-80 w-full rounded-xl object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.display = "block";
                    }}
                  />
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold">Story content</h2>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    {wordCount} words · {readingTime} min read
                  </span>
                </div>

                <div className="space-y-5">
                  {field(
                    "Introduction / lead",
                    "article-opening",
                    form.opening,
                    (value) => updateField("opening", value),
                    {
                      placeholder: "Introduce the most important information...",
                      rows: 5,
                    }
                  )}

                  {field(
                    "Main article",
                    "article-body",
                    form.body,
                    (value) => updateField("body", value),
                    {
                      placeholder:
                        "Write the main story. Separate paragraphs with a blank line.",
                      rows: 12,
                    }
                  )}

                  {field(
                    "Section heading",
                    "article-heading",
                    form.heading,
                    (value) => updateField("heading", value),
                    { placeholder: "Add a section heading" }
                  )}

                  {field(
                    "Additional section content",
                    "article-section",
                    form.section,
                    (value) => updateField("section", value),
                    {
                      placeholder: "Write supporting information...",
                      rows: 6,
                    }
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 className="mb-5 font-bold">Quote and key takeaway</h2>

                <div className="space-y-5">
                  {field(
                    "Featured quote",
                    "article-quote",
                    form.quote,
                    (value) => updateField("quote", value),
                    { placeholder: "Enter an accurate quotation...", rows: 3 }
                  )}

                  {field(
                    "Quote source",
                    "article-source",
                    form.source,
                    (value) => updateField("source", value),
                    { placeholder: "Name and title of the source" }
                  )}

                  {field(
                    "Key takeaway",
                    "article-takeaway",
                    form.takeaway,
                    (value) => updateField("takeaway", value),
                    {
                      placeholder: "What should readers remember?",
                      rows: 3,
                    }
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 className="mb-5 font-bold">Tags and editorial notes</h2>

                <div className="space-y-5">
                  {field(
                    "Tags",
                    "article-tags",
                    form.tags,
                    (value) => updateField("tags", value),
                    { placeholder: "Marsabit, governance, education" }
                  )}

                  <p className="-mt-3 text-xs text-slate-400">
                    Separate each tag with a comma.
                  </p>

                  {field(
                    "Editorial notes",
                    "article-notes",
                    form.notes,
                    (value) => updateField("notes", value),
                    {
                      placeholder: "Internal notes for your newsroom...",
                      rows: 4,
                    }
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
                  <h2 className="font-bold">Live article preview</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preview how your story will read.
                  </p>
                </div>

                <div className="mx-auto max-w-3xl p-5 sm:p-8">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                    <span>{form.category}</span>
                    {form.location && (
                      <span className="text-slate-500">
                        · {form.location}
                      </span>
                    )}
                    {statusBadge(form.status)}
                  </div>

                  <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                    {form.title || "Your article headline"}
                  </h2>

                  {form.subtitle && (
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                      {form.subtitle}
                    </p>
                  )}

                  <p className="mt-5 border-b border-slate-100 pb-5 text-sm text-slate-500">
                    By {form.author || "Author name"} · {readingTime} min read
                  </p>

                  {form.featuredImage && (
                    <img
                      src={form.featuredImage}
                      alt="Article cover"
                      className="mt-6 max-h-[420px] w-full rounded-xl object-cover"
                    />
                  )}

                  {form.opening && (
                    <p className="mt-6 whitespace-pre-line text-lg font-medium leading-8 text-slate-800">
                      {form.opening}
                    </p>
                  )}

                  {form.body && (
                    <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700">
                      {form.body}
                    </div>
                  )}

                  {form.heading && (
                    <h3 className="mt-8 text-2xl font-bold">
                      {form.heading}
                    </h3>
                  )}

                  {form.section && (
                    <div className="mt-3 whitespace-pre-line leading-8 text-slate-700">
                      {form.section}
                    </div>
                  )}

                  {form.quote && (
                    <blockquote className="mt-8 border-l-4 border-blue-700 bg-blue-50 p-5 text-lg italic leading-8">
                      “{form.quote}”
                      {form.source && (
                        <footer className="mt-3 text-sm font-semibold not-italic text-slate-600">
                          — {form.source}
                        </footer>
                      )}
                    </blockquote>
                  )}

                  {form.takeaway && (
                    <div className="mt-6 rounded-xl bg-emerald-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Key takeaway
                      </p>
                      <p className="mt-2 leading-7 text-slate-700">
                        {form.takeaway}
                      </p>
                    </div>
                  )}

                  {form.tags.trim() && (
                    <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                      {form.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setView("library")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => updateField("status", "draft")}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-100"
                  >
                    Save as draft
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update article"
                        : "Save article"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {view === "preview" && (
          <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {form.featuredImage && (
              <img
                src={form.featuredImage}
                alt="Article cover"
                className="max-h-[440px] w-full object-cover"
              />
            )}

            <div className="p-6 sm:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {statusBadge(form.status)}
                <span className="text-sm font-semibold text-blue-700">
                  {form.category}
                </span>
                {form.location && (
                  <span className="text-sm text-slate-500">
                    · {form.location}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
                {form.title}
              </h1>

              {form.subtitle && (
                <p className="mt-4 text-xl leading-8 text-slate-600">
                  {form.subtitle}
                </p>
              )}

              <p className="mt-5 border-b border-slate-100 pb-5 text-sm text-slate-500">
                By {form.author || "Author name"} · {readingTime} min read
              </p>

              <div className="mt-7 whitespace-pre-line text-lg font-medium leading-9 text-slate-800">
                {form.opening}
              </div>

              <div className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">
                {form.body}
              </div>

              {form.heading && (
                <h2 className="mt-8 text-2xl font-bold">{form.heading}</h2>
              )}

              <div className="mt-4 whitespace-pre-line leading-8 text-slate-700">
                {form.section}
              </div>

              {form.quote && (
                <blockquote className="mt-8 border-l-4 border-blue-700 bg-blue-50 p-5 text-lg italic leading-8">
                  “{form.quote}”
                  {form.source && (
                    <footer className="mt-3 text-sm font-semibold not-italic text-slate-600">
                      — {form.source}
                    </footer>
                  )}
                </blockquote>
              )}

              {form.takeaway && (
                <div className="mt-6 rounded-xl bg-emerald-50 p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Key takeaway
                  </h2>
                  <p className="mt-2 leading-7">{form.takeaway}</p>
                </div>
              )}

              {form.tags.trim() && (
                <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                  {form.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={() => setView("library")}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Back to articles
                </button>

                {(form.status === 'draft' || form.status === 'rejected') && <button
                  type="button"
                  onClick={() => setView("editor")}
                  className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Edit article
                </button>}

                {editingId && (form.status === 'draft' || form.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => {
                      const article = articles.find(
                        (item) => getArticleIdentifier(item) === editingId
                      );

                      if (article) void deleteArticle(article);
                    }}
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Delete article
                  </button>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default ArticleEditor;
