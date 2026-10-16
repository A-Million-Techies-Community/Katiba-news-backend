
import React, { useCallback, useEffect, useState } from "react";

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  author_username: string;
  created_at: string;
}

interface ArticleContent {
  subtitle?: string;
  author?: string;
  category?: string;
  location?: string;
  featuredImage?: string;
  opening?: string;
  body?: string;
  heading?: string;
  section?: string;
  quote?: string;
  source?: string;
  takeaway?: string;
  tags?: string[];
  readingTime?: number;
}

type ArticleFilter = "all" | "published";

const formatDate = (value: string): string => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getStatusClasses = (status: string): string => {
  switch (status.toLowerCase()) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "under_review":
    case "under review":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
};

const parseArticleContent = (content: string): ArticleContent | null => {
  if (!content) return null;

  try {
    const parsed: unknown = JSON.parse(content);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ArticleContent;
    }

    return null;
  } catch {
    // Older articles may store content as ordinary text.
    return null;
  }
};

export const ArticleReader: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ArticleFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedArticles, setExpandedArticles] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArticles = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/articles/", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You do not have permission to access these articles."
          );
        }

        throw new Error(
          `Unable to retrieve articles. Server returned ${response.status}.`
        );
      }

      const data: unknown = await response.json();

      // Support a direct array response and common paginated API formats.
      let records: unknown[] = [];

      if (Array.isArray(data)) {
        records = data;
      } else if (data && typeof data === "object") {
        const result = data as {
          results?: unknown;
          articles?: unknown;
        };

        if (Array.isArray(result.results)) {
          records = result.results;
        } else if (Array.isArray(result.articles)) {
          records = result.articles;
        }
      }

      const validArticles = records.filter(
        (item): item is Article =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as Article).id === "number" &&
          typeof (item as Article).title === "string"
      );

      setArticles(validArticles);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the article service. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  const toggleExpanded = (articleId: number) => {
    setExpandedArticles((previous) =>
      previous.includes(articleId)
        ? previous.filter((id) => id !== articleId)
        : [...previous, articleId]
    );
  };

  const filteredArticles = articles.filter((article) => {
    const isPublished = article.status?.toLowerCase() === "published";

    if (filter === "published" && !isPublished) {
      return false;
    }

    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const content = parseArticleContent(article.content);

    const searchableText = [
      article.title,
      article.slug,
      article.author_username,
      article.status,
      content?.subtitle,
      content?.category,
      content?.location,
      content?.opening,
      content?.body,
      content?.section,
      content?.tags?.join(" "),
      content ? "" : article.content,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });

  const publishedCount = articles.filter(
    (article) => article.status?.toLowerCase() === "published"
  ).length;

  if (loading) {
    return (
      <div className="mx-auto my-12 max-w-5xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-5 flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />
              <div className="h-3 w-3 rounded-full bg-blue-700" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Loading articles
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Connecting to the Katiba News article service...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto my-12 max-w-5xl px-4 sm:px-6">
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  d="M12 8v5m0 3h.01"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">
                Unable to load articles
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void fetchArticles()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M20 7v5h-5M4 17v-5h5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto my-8 max-w-5xl px-4 font-sans sm:px-6 lg:my-12">
      {/* Header */}
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Katiba Newsroom
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Article library
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Browse newsroom stories, read article details, and find
              published reports.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchArticles(true)}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            >
              <path
                d="M20 7v5h-5M4 17v-5h5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">
              Total articles
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">
              {articles.length}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-medium text-emerald-800">
              Published
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-800">
              {publishedCount}
            </p>
          </div>
        </div>
      </header>

      {/* Search and filters */}
      <section className="mb-8 space-y-4">
        <label htmlFor="article-search" className="sr-only">
          Search articles
        </label>

        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path
              d="m16 16 4 4"
              strokeLinecap="round"
            />
          </svg>

          <input
            id="article-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by headline, author, category, or keyword..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All articles ({articles.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("published")}
            aria-pressed={filter === "published"}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "published"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Published ({publishedCount})
          </button>

          <span className="ml-auto text-xs text-slate-500">
            {filteredArticles.length}{" "}
            {filteredArticles.length === 1 ? "result" : "results"}
          </span>
        </div>
      </section>

      {/* Empty database */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5M8 13h8M8 17h8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            No articles yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            There are currently no article records available from the
            article service.
          </p>

          <button
            type="button"
            onClick={() => void fetchArticles()}
            className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Reload articles
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="font-bold text-slate-900">
            No matching articles
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Try another search term or change the selected filter.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setFilter("all");
            }}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {filteredArticles.map((article) => {
            const content = parseArticleContent(article.content);
            const isExpanded = expandedArticles.includes(article.id);
            const hasStructuredContent = Boolean(
              content &&
                [
                  content.opening,
                  content.body,
                  content.heading,
                  content.section,
                  content.quote,
                  content.takeaway,
                ].some((part) => typeof part === "string" && part.trim())
            );

            const previewText = content
              ? [
                  content.opening,
                  content.body,
                  content.section,
                ]
                  .filter(Boolean)
                  .join("\n\n")
              : article.content;

            const plainPreview = previewText
              .replace(/\s+/g, " ")
              .trim();

            const shouldTruncate = plainPreview.length > 350;

            return (
              <article
                key={article.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
              >
                {/* Featured image */}
                {content?.featuredImage && (
                  <div className="relative max-h-[380px] overflow-hidden bg-slate-100">
                    <img
                      src={content.featuredImage}
                      alt={article.title}
                      loading="lazy"
                      className="max-h-[380px] w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      onLoad={(event) => {
                        event.currentTarget.style.display = "block";
                      }}
                    />
                  </div>
                )}

                <div className="p-5 sm:p-8">
                  {/* Record metadata */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      {content?.category || "News"}
                    </span>

                    <span
                      className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(
                        article.status || ""
                      )}`}
                    >
                      {(article.status || "unknown").replace(/_/g, " ")}
                    </span>

                    <span className="ml-auto text-xs font-medium text-slate-400">
                      Record #{article.id}
                    </span>
                  </div>

                  {/* Article title */}
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                    {article.title}
                  </h2>

                  {content?.subtitle && (
                    <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                      {content.subtitle}
                    </p>
                  )}

                  {/* Byline */}
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 pb-5 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path
                          d="M4.5 21a7.5 7.5 0 0 1 15 0"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="font-semibold text-slate-800">
                        {content?.author ||
                          article.author_username ||
                          "Staff"}
                      </span>
                    </span>

                    <span className="hidden text-slate-300 sm:inline">
                      |
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="5"
                          width="18"
                          height="16"
                          rx="2"
                        />
                        <path
                          d="M16 3v4M8 3v4M3 10h18"
                          strokeLinecap="round"
                        />
                      </svg>
                      {formatDate(article.created_at)}
                    </span>

                    {content?.location && (
                      <>
                        <span className="hidden text-slate-300 sm:inline">
                          |
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-4 w-4 text-slate-400"
                            aria-hidden="true"
                          >
                            <path
                              d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {content.location}
                        </span>
                      </>
                    )}

                    {content?.readingTime && (
                      <span className="text-xs text-slate-400">
                        {content.readingTime} min read
                      </span>
                    )}
                  </div>

                  {/* Article content */}
                  <div className="mt-6">
                    {hasStructuredContent && content ? (
                      <div className="space-y-5">
                        {content.opening && (
                          <p className="whitespace-pre-line text-base font-medium leading-8 text-slate-800 sm:text-lg">
                            {content.opening}
                          </p>
                        )}

                        {content.body && (
                          <div
                            className={`whitespace-pre-line text-base leading-8 text-slate-700 ${
                              !isExpanded && shouldTruncate
                                ? "line-clamp-5"
                                : ""
                            }`}
                          >
                            {content.body}
                          </div>
                        )}

                        {isExpanded && content.heading && (
                          <h3 className="text-xl font-bold text-slate-900">
                            {content.heading}
                          </h3>
                        )}

                        {isExpanded && content.section && (
                          <div className="whitespace-pre-line text-base leading-8 text-slate-700">
                            {content.section}
                          </div>
                        )}

                        {isExpanded && content.quote && (
                          <blockquote className="border-l-4 border-blue-600 bg-blue-50/60 px-5 py-4 text-base italic leading-7 text-slate-800">
                            “{content.quote}”
                            {content.source && (
                              <footer className="mt-3 text-sm font-semibold not-italic text-slate-600">
                                — {content.source}
                              </footer>
                            )}
                          </blockquote>
                        )}

                        {isExpanded && content.takeaway && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                              Key takeaway
                            </p>
                            <p className="mt-2 leading-7 text-slate-700">
                              {content.takeaway}
                            </p>
                          </div>
                        )}

                        {isExpanded &&
                          content.tags &&
                          content.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {content.tags.map((tag, index) => (
                                <span
                                  key={`${tag}-${index}`}
                                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <div
                        className={`whitespace-pre-wrap break-words text-base leading-8 text-slate-700 ${
                          !isExpanded && shouldTruncate
                            ? "line-clamp-6"
                            : ""
                        }`}
                      >
                        {article.content || "No article content available."}
                      </div>
                    )}

                    {(shouldTruncate ||
                      (hasStructuredContent &&
                        Boolean(
                          content?.heading ||
                            content?.section ||
                            content?.quote ||
                            content?.takeaway ||
                            (content?.tags && content.tags.length > 0)
                        ))) && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(article.id)}
                        aria-expanded={isExpanded}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-blue-700 transition hover:text-blue-900"
                      >
                        {isExpanded ? "Show less" : "Read full article"}

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        >
                          <path
                            d="m6 9 6 6 6-6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <footer className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all">
                      Article slug: {article.slug || "Not available"}
                    </span>

                    <span className="inline-flex shrink-0 items-center gap-2 font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Retrieved from article service
                    </span>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Bottom summary */}
      {filteredArticles.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          Showing {filteredArticles.length} of {articles.length} article
          {articles.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
};

export default ArticleReader;
