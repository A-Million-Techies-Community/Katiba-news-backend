import React, { useEffect, useState } from 'react';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  author_username: string;
  created_at: string;
}

export const ArticleReader: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchArticles() {
      try {
        const response = await fetch('/api/articles/');
        if (!response.ok) {
          throw new Error('Failed to retrieve system archival records.');
        }
        const data = await response.json();
        setArticles(data);
      } catch (err: any) {
        setError(err.message || 'System connection failure.');
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4 font-sans text-center">
        <div className="inline-block text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse font-mono">
          Synchronizing verified ledger streams...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4 sm:px-6 font-sans">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
          Archival Node Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-12 px-4 sm:px-6 font-sans">
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
          Official Constitutional Ledger / Live Database Grid
        </div>
        <div className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
          Active Records: {articles.length}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200/60 rounded-2xl">
          <p className="text-sm font-serif text-slate-400 italic">
            No published articles found inside the live database ledger.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {articles.map((article) => (
            <article 
              key={article.id} 
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs hover:border-slate-300 transition duration-150"
            >
              <div className="inline-block px-2.5 py-0.5 rounded-sm bg-slate-50 border border-slate-200 text-slate-600 text-[9px] font-bold tracking-wider uppercase mb-4 font-mono">
                Verified Document · Record ID #{article.id}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                {article.title}
              </h2>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Author</span>
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm text-[11px]">
                    {article.author_username || 'Staff'}
                  </span>
                </div>
                <span className="text-slate-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Timeline</span>
                  <span className="font-medium text-slate-700">
                    {new Date(article.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <span className="text-slate-200">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Status</span>
                  <span className="font-bold text-emerald-700 uppercase tracking-wide text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-xs">
                    {article.status}
                  </span>
                </div>
              </div>

              <div className="text-slate-800 leading-relaxed text-base sm:text-lg font-serif max-w-none whitespace-pre-wrap">
                {article.content}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Slug: {article.slug}</span>
                <span className="text-emerald-500 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Node Synced
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
