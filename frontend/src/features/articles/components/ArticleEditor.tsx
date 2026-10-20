import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ArticleEditorProps {
  onBackToDashboard?: () => void;
}

type ArticleStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "rejected"
  | "published";

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
  content: string | Record<string, unknown>;
  feedback?: string;
  status?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
  author?: string;
  featured_image?: string | null;
  image?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}

interface SessionData {
  username?: string;
  access?: string;
}

const API_URL = "/api/articles/";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

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

// Modernized Form Classes
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Draft",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Needs changes",
  published: "Published",
};

const statusStyles: Record<ArticleStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  published: "bg-blue-50 text-blue-700 border-blue-200",
};

const statusAccents: Record<FilterStatus, string> = {
  all: "bg-slate-800",
  draft: "bg-slate-400",
  under_review: "bg-amber-400",
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
  published: "bg-blue-500",
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

function readSession(): SessionData {
  try {
    return JSON.parse(sessionStorage.getItem("katibaUserSession") || "{}") as SessionData;
  } catch {
    return {};
  }
}

function normalizeStatus(value: unknown): ArticleStatus {
  if (value === "under_review" || value === "under review" || value === "review") return "under_review";
  if (value === "published" || value === "approved" || value === "rejected") return value as ArticleStatus;
  return "draft";
}

function parseArticleContent(content: unknown): Partial<ArticleForm> {
  if (!content) return {};
  if (typeof content === "object" && content !== null) return content as Partial<ArticleForm>;
  if (typeof content === "string") {
    try {
      const parsed: unknown = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null) return parsed as Partial<ArticleForm>;
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
  const serverImage = article.featured_image || article.image_url || article.image;
  const contentImage = typeof content.featuredImage === "string" ? content.featuredImage : "";

  return {
    ...emptyForm,
    ...content,
    title: article.title || "",
    author: typeof content.author === "string" && content.author ? content.author : typeof article.author === "string" ? article.author : "",
    featuredImage: typeof serverImage === "string" && serverImage ? serverImage : contentImage,
    tags: Array.isArray(rawTags) ? rawTags.join(", ") : String(rawTags || ""),
    status: normalizeStatus(article.status ?? content.status),
  };
}

function getArticleIdentifier(article: ArticleRecord): string {
  return String(article.slug || article.id || "");
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;
    if (typeof object.detail === "string") return object.detail;
    if (typeof object.message === "string") return object.message;
    const firstValue = Object.values(object)[0];
    if (typeof firstValue === "string") return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0];
  }
  return fallback;
}

function getImageUrl(url: string): string {
  if (!url) return "";
  return url.startsWith('http') || url.startsWith('data:') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ onBackToDashboard }) => {
  const [form, setForm] = useState<ArticleForm>(() => ({
    ...emptyForm,
    author: readSession().username || "",
  }));

  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("library");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedImage = selectedImage
    ? imagePreviewUrl
    : imageRemoved
      ? ""
      : getImageUrl(form.featuredImage);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const wordCount = useMemo(() => {
    const text = `${form.opening} ${form.body} ${form.section}`.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [form.opening, form.body, form.section]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    // Auto clear success messages
    if (type === 'success') {
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const getHeaders = useCallback((): HeadersInit => {
    const session = readSession();
    if (!session.access) throw new Error("Your session has expired. Please sign in again.");
    return { Authorization: `Bearer ${session.access}` };
  }, []);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      const authHeaders = getHeaders();
      new Headers(authHeaders).forEach((value, key) => headers.set(key, value));
      return fetch(url, { ...options, headers });
    },
    [getHeaders]
  );

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}?mine=true`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data, "Unable to load articles."));
      }
      const data: unknown = await response.json();
      const records = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)
          ? (data as { results: unknown[] }).results
          : null;

      if (!records) throw new Error("The articles API returned an unexpected response.");

      setArticles(
        records.filter((item): item is ArticleRecord =>
          Boolean(item && typeof item === "object" && "id" in item && "title" in item)
        ).sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to load articles.", "error");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    const session = readSession();
    if (session.username) {
      setForm((previous) => ({ ...previous, author: session.username || previous.author }));
    }
    void loadArticles();
  }, [loadArticles]);

  const updateField = <K extends keyof ArticleForm>(fieldName: K, value: ArticleForm[K]) => {
    setForm((previous) => ({ ...previous, [fieldName]: value }));
  };

  const validateImage = (file: File): boolean => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showMessage("Unsupported image type. Upload JPG, PNG, WebP, or GIF.", "error");
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showMessage("The image must be 5 MB or smaller.", "error");
      return false;
    }
    setMessage("");
    return true;
  };

  const handleImageSelection = (file?: File) => {
    if (!file) return;
    if (!validateImage(file)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedImage(file);
    setImageRemoved(false);
    updateField("featuredImage", "");
  };

  const removeFeaturedImage = () => {
    setSelectedImage(null);
    setImageRemoved(true);
    updateField("featuredImage", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setForm({ ...emptyForm, author: readSession().username || "" });
    setSelectedImage(null);
    setImageRemoved(false);
    setView("editor");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const editArticle = (article: ArticleRecord) => {
    setEditingId(getArticleIdentifier(article));
    setForm(articleToForm(article));
    setSelectedImage(null);
    setImageRemoved(false);
    setView("editor");
    setMessage("");
    window.scrollTo(0, 0);
  };

  const previewArticle = (article: ArticleRecord) => {
    setEditingId(getArticleIdentifier(article));
    setForm(articleToForm(article));
    setSelectedImage(null);
    setImageRemoved(false);
    setView("preview");
    setMessage("");
    window.scrollTo(0, 0);
  };

  const saveArticle = async (event: React.FormEvent<HTMLFormElement>) => {
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
        featuredImage: selectedImage || imageRemoved ? "" : form.featuredImage,
        opening: form.opening,
        body: form.body,
        heading: form.heading,
        section: form.section,
        quote: form.quote,
        source: form.source,
        takeaway: form.takeaway,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        notes: form.notes,
        readingTime,
        status: form.status,
      };

      const isEditing = editingId !== null;
      const url = isEditing ? `${API_URL}${encodeURIComponent(editingId)}/` : API_URL;

      const payload = {
        title: form.title.trim(),
        content: JSON.stringify(content),
        status: form.status,
      };

      let requestBody: BodyInit;
      const requestHeaders: HeadersInit = { Accept: "application/json" };

      if (selectedImage || imageRemoved) {
        const formData = new FormData();
        formData.append("title", payload.title);
        formData.append("content", payload.content);
        formData.append("status", payload.status);
        if (selectedImage) formData.append("featured_image", selectedImage);
        else if (imageRemoved) formData.append("featured_image", "");
        requestBody = formData;
      } else {
        requestBody = JSON.stringify(payload);
        Object.assign(requestHeaders, { "Content-Type": "application/json" });
      }

      const response = await authenticatedFetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: requestHeaders,
        body: requestBody,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data, isEditing ? "Unable to update this article." : "Unable to create this article."));
      }

      const saved = (await response.json().catch(() => null)) as ArticleRecord | null;
      if (saved?.id != null) setEditingId(getArticleIdentifier(saved));

      setSelectedImage(null);
      setImageRemoved(false);
      showMessage(isEditing ? "Article updated successfully." : "Article created successfully.");
      
      await loadArticles();
      setView("library");
      window.scrollTo(0, 0);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Something went wrong while saving.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: ArticleRecord) => {
    const identifier = getArticleIdentifier(article);
    if (!identifier) return showMessage("This article has no usable ID.", "error");
    if (!window.confirm(`Delete "${article.title}" permanently? This action cannot be undone.`)) return;

    setDeletingId(identifier);
    setMessage("");

    try {
      const response = await authenticatedFetch(`${API_URL}${encodeURIComponent(identifier)}/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data, "Unable to delete this article."));
      }

      setArticles((prev) => prev.filter((item) => getArticleIdentifier(item) !== identifier));
      if (editingId === identifier) {
        setEditingId(null);
        setForm({ ...emptyForm, author: readSession().username || "" });
        setView("library");
      }
      showMessage("Article deleted successfully.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to delete this article.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const changeStatus = async (article: ArticleRecord, nextStatus: ArticleStatus) => {
    const identifier = getArticleIdentifier(article);
    if (!identifier) return showMessage("This article has no usable ID.", "error");
    if (normalizeStatus(article.status) === nextStatus) return;

    const confirmationText =
      nextStatus === "published" ? "Publish this article? Ensure it has completed editorial review."
        : nextStatus === "under_review" ? "Submit this article for editorial review?"
        : "Move this article back to drafts?";

    if (!window.confirm(confirmationText)) return;
    setMessage("");

    try {
      const response = await authenticatedFetch(`${API_URL}${encodeURIComponent(identifier)}/`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(getErrorMessage(data, "Unable to change article status."));
      }

      await loadArticles();
      showMessage(`Article status changed to ${statusLabels[nextStatus]}.`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to change article status.", "error");
    }
  };

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return articles.filter((article) => {
      const status = normalizeStatus(article.status);
      const content = parseArticleContent(article.content);
      const matchesStatus = filter === "all" || status === filter;
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        String(article.author || content.author || "").toLowerCase().includes(query) ||
        String(content.category || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [articles, filter, search]);

  const counts = useMemo(() => ({
    all: articles.length,
    approved: articles.filter((a) => normalizeStatus(a.status) === "approved").length,
    rejected: articles.filter((a) => normalizeStatus(a.status) === "rejected").length,
    draft: articles.filter((a) => normalizeStatus(a.status) === "draft").length,
    under_review: articles.filter((a) => normalizeStatus(a.status) === "under_review").length,
    published: articles.filter((a) => normalizeStatus(a.status) === "published").length,
  }), [articles]);

  const statusBadge = (status: ArticleStatus) => (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );

  const field = (
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void,
    options?: { placeholder?: string; rows?: number; required?: boolean; maxLength?: number; type?: string; description?: string }
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {options?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {options?.description && <p className="text-xs text-slate-500 mb-2">{options.description}</p>}
      {options?.rows ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={options.placeholder}
          rows={options.rows}
          required={options.required}
          maxLength={options.maxLength}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type={options?.type || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={options?.placeholder}
          required={options?.required}
          maxLength={options?.maxLength}
          className={inputClass}
        />
      )}
    </div>
  );

  const renderStory = () => (
    <div className="prose prose-slate max-w-none mt-8 prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-600">
      {form.opening && <p className="text-xl font-medium leading-relaxed text-slate-800 mb-8">{form.opening}</p>}
      {form.body && <div className="whitespace-pre-line text-slate-700 leading-loose">{form.body}</div>}
      
      {form.heading && <h3 className="text-2xl font-bold mt-12 mb-6 text-slate-900">{form.heading}</h3>}
      {form.section && <div className="whitespace-pre-line text-slate-700 leading-loose">{form.section}</div>}
      
      {form.quote && (
        <blockquote className="my-10 border-l-4 border-slate-900 bg-slate-50 p-6 sm:p-8 rounded-r-xl">
          <p className="text-xl italic leading-relaxed text-slate-800 mb-4">"{form.quote}"</p>
          {form.source && <footer className="text-sm font-semibold text-slate-500">— {form.source}</footer>}
        </blockquote>
      )}
      
      {form.takeaway && (
        <div className="mt-12 rounded-2xl bg-blue-50/50 border border-blue-100 p-6 sm:p-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Key Takeaway
          </h4>
          <p className="text-slate-700 leading-relaxed m-0">{form.takeaway}</p>
        </div>
      )}
      
      {form.tags.trim() && (
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
          {form.tags.split(",").map(t => t.trim()).filter(Boolean).map((tag, i) => (
            <span key={i} className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={view === "library" ? goBack : () => setView("library")}
              className="group flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors">
                <path d="M19 12H5m7 7-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-tight">Editorial Desk</span>
              <span className="text-xs font-medium text-slate-500">{view === "library" ? "Manage Content" : view === "editor" ? "Article Editor" : "Live Preview"}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {view === "library" && (
              <button onClick={startNewArticle} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Article
              </button>
            )}
            {view === "preview" && (
              <button onClick={() => setView("editor")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                Back to Editor
              </button>
            )}
            {view === "editor" && (
              <>
                <button type="button" onClick={() => setView("preview")} className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                  Preview
                </button>
                <button type="submit" form="article-editor-form" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all disabled:opacity-70 flex items-center gap-2">
                  {saving ? (
                    <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</>
                  ) : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        
        {/* Alerts */}
        <div className={`fixed top-20 right-4 z-50 transition-all duration-300 transform ${message ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
          <div className={`flex items-center gap-3 rounded-lg border p-4 shadow-lg min-w-[300px] ${messageType === "success" ? "bg-white border-emerald-100" : "bg-white border-red-100"}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${messageType === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {messageType === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <p className={`text-sm font-medium ${messageType === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>{message}</p>
          </div>
        </div>

        {/* LIBRARY VIEW */}
        {view === "library" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Content Library</h1>
                <p className="mt-2 text-sm text-slate-500 max-w-2xl">Manage your articles, review drafts, and monitor published content.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <button onClick={() => void loadArticles()} disabled={loading} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors" title="Refresh list">
                  <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {(Object.entries(counts) as [FilterStatus, number][]).filter(([k]) => k !== 'rejected').map(([key, count]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-200 ${
                    filter === key ? "bg-white border-slate-300 shadow-md ring-1 ring-slate-200" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${statusAccents[key] || 'bg-slate-200'}`} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{key === 'all' ? 'Total' : statusLabels[key as ArticleStatus]}</p>
                  <p className="text-3xl font-bold text-slate-900">{count}</p>
                </button>
              ))}
            </div>

            {/* Empty States & Loading */}
            {loading && articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 border-dashed bg-white">
                <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-slate-500 font-medium">Loading your workspace...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 border-dashed bg-white">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{articles.length === 0 ? "No articles yet" : "No results found"}</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                  {articles.length === 0 ? "Get started by creating your first piece of content." : "We couldn't find anything matching your search and filter criteria."}
                </p>
                {articles.length === 0 && (
                  <button onClick={startNewArticle} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                    Write Article
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredArticles.map((article) => {
                  const articleForm = articleToForm(article);
                  const status = normalizeStatus(article.status);
                  const articleId = getArticleIdentifier(article);
                  const image = getImageUrl(articleForm.featuredImage);

                  return (
                    <div key={articleId} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Image Area */}
                      <div className="relative h-48 bg-slate-100 overflow-hidden border-b border-slate-100">
                        {image ? (
                          <img src={image} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {statusBadge(status)}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex flex-col flex-1 p-5">
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500">
                          <span className="text-blue-600">{articleForm.category}</span>
                          <span>•</span>
                          <span>{articleForm.author || 'Author'}</span>
                          <span>•</span>
                          <span>{new Date(article.updated_at || article.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title || "Untitled Draft"}
                        </h3>
                        
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                          {articleForm.subtitle || articleForm.opening || "No description provided."}
                        </p>

                        {/* Actions Footer */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                          <div className="flex gap-2">
                            <button onClick={() => previewArticle(article)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" title="Preview">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {(status === 'draft' || status === 'rejected') && (
                              <button onClick={() => editArticle(article)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {(status === 'draft' || status === 'rejected') && (
                              <button onClick={() => void deleteArticle(article)} disabled={deletingId === articleId} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50" title="Delete">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>

                          {(status === 'draft' || status === 'rejected') && (
                            <button onClick={() => void changeStatus(article, "under_review")} className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-md transition-colors">
                              Submit
                            </button>
                          )}
                          {status === 'published' && (
                            <button onClick={() => void changeStatus(article, "draft")} className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
                              Unpublish
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === "editor" && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <form id="article-editor-form" onSubmit={saveArticle} className="space-y-8">
              
              {/* Header Info */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{editingId ? "Edit Article" : "Create New Article"}</h1>
                <p className="mt-2 text-sm text-slate-500">Draft your story below. It will automatically be saved as a draft until you submit it for review.</p>
              </div>

              {/* Title & Meta Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900">Core Details</h2>
                </div>
                
                <div className="space-y-6">
                  {field("Headline", "article-title", form.title, (v) => updateField("title", v), { placeholder: "E.g., Local Council Approves New Tech Hub...", required: true, maxLength: 200, description: "Keep it punchy and engaging. Max 200 characters." })}
                  {field("Subtitle / Summary", "article-subtitle", form.subtitle, (v) => updateField("subtitle", v), { placeholder: "A brief 1-2 sentence summary of the story...", rows: 2 })}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label htmlFor="article-category" className={labelClass}>Category</label>
                      <select id="article-category" value={form.category} onChange={(e) => updateField("category", e.target.value)} className={inputClass}>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {field("Location", "article-location", form.location, (v) => updateField("location", v), { placeholder: "E.g., Nairobi, Kenya" })}
                    {field("Author Byline", "article-author", form.author, (v) => updateField("author", v), { placeholder: "Jane Doe" })}
                    <div>
                      <label htmlFor="article-status" className={labelClass}>Initial Status</label>
                      <select id="article-status" value={form.status} onChange={(e) => updateField("status", e.target.value as ArticleStatus)} className={inputClass}>
                        <option value="draft">Draft</option>
                        <option value="under_review">Submit for Review</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900">Featured Media</h2>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingImage(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDraggingImage(false); }}
                  onDrop={(e) => { e.preventDefault(); setDraggingImage(false); handleImageSelection(e.dataTransfer.files[0]); }}
                  className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
                    draggingImage ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => handleImageSelection(e.target.files?.[0])} />
                  
                  {!displayedImage ? (
                    <div className="px-6 py-12 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Upload a cover image</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">PNG, JPG, WEBP up to 5MB</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img src={displayedImage} alt="Cover preview" className="w-full h-64 object-cover" />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={removeFeaturedImage} className="rounded-lg bg-white/10 backdrop-blur border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!selectedImage && !imageRemoved && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    {field("Or use an external image URL", "article-image-url", form.featuredImage, (v) => { setSelectedImage(null); setImageRemoved(false); updateField("featuredImage", v); if(fileInputRef.current) fileInputRef.current.value = ""; }, { placeholder: "https://example.com/image.jpg", type: "url" })}
                  </div>
                )}
              </div>

              {/* Story Content Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
                    <h2 className="text-lg font-bold text-slate-900">Story Content</h2>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{wordCount} words</span>
                </div>

                <div className="space-y-6">
                  {field("The Lead (Opening Paragraph)", "article-opening", form.opening, (v) => updateField("opening", v), { placeholder: "Hook the reader in the first few sentences...", rows: 4 })}
                  {field("Main Body", "article-body", form.body, (v) => updateField("body", v), { placeholder: "Develop your story here...", rows: 12 })}
                  
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mt-6 space-y-6">
                    <h3 className="text-sm font-bold text-slate-700">Add a Section</h3>
                    {field("Section Heading", "article-heading", form.heading, (v) => updateField("heading", v), { placeholder: "E.g., The Community Impact" })}
                    {field("Section Content", "article-section", form.section, (v) => updateField("section", v), { placeholder: "Expand on this specific section...", rows: 6 })}
                  </div>
                </div>
              </div>

              {/* Highlights Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900">Highlights & Extras</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      {field("Pull Quote", "article-quote", form.quote, (v) => updateField("quote", v), { placeholder: "A powerful quote to highlight...", rows: 3 })}
                      {field("Quote Source", "article-source", form.source, (v) => updateField("source", v), { placeholder: "Name, Title" })}
                    </div>
                    {field("Key Takeaway", "article-takeaway", form.takeaway, (v) => updateField("takeaway", v), { placeholder: "One sentence summarizing the impact...", rows: 5 })}
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    {field("Tags / Keywords", "article-tags", form.tags, (v) => updateField("tags", v), { placeholder: "politics, nairobi, infrastructure", description: "Comma separated values." })}
                  </div>
                  {field("Editorial Notes (Private)", "article-notes", form.notes, (v) => updateField("notes", v), { placeholder: "Notes for the editor reviewing this piece...", rows: 3 })}
                </div>
              </div>

            </form>
          </div>
        )}

        {/* PREVIEW VIEW */}
        {view === "preview" && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {displayedImage && (
                <div className="w-full h-[400px] sm:h-[500px] relative">
                  <img src={displayedImage} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 w-full p-8 sm:p-12">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{form.category}</span>
                      {form.location && <span className="text-white/80 text-sm font-medium">{form.location}</span>}
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">{form.title || "Untitled Article"}</h1>
                    {form.subtitle && <p className="text-xl text-white/90 leading-relaxed max-w-3xl">{form.subtitle}</p>}
                  </div>
                </div>
              )}

              <div className="p-8 sm:p-12">
                {!displayedImage && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="bg-slate-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{form.category}</span>
                      {form.location && <span className="text-slate-500 text-sm font-medium">{form.location}</span>}
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">{form.title || "Untitled Article"}</h1>
                    {form.subtitle && <p className="text-xl text-slate-600 leading-relaxed">{form.subtitle}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between py-6 border-y border-slate-100 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                      {(form.author || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{form.author || "Anonymous"}</p>
                      <p className="text-sm text-slate-500">Katiba News Contributor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})}</p>
                    <p className="text-sm text-slate-500">{readingTime} min read</p>
                  </div>
                </div>

                <div className="max-w-3xl mx-auto">
                  {renderStory()}
                </div>
              </div>
            </article>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArticleEditor;