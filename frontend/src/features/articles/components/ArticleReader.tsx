import React from 'react';

export const ArticleReader: React.FC = () => {
  return (
    <article className="max-w-3xl mx-auto px-4 py-8 bg-white border border-slate-100 rounded-xl mt-6 shadow-sm">
      {/* Article Title */}
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight md:text-4xl mb-4">
        Constitutional Framework Update
      </h1>

      {/* Article Metadata (Author & Date placeholders) */}
      <div className="flex items-center text-sm text-slate-500 gap-2 mb-6 border-b border-slate-100 pb-4">
        <span className="font-semibold text-slate-700">By Katiba-News Team</span>
        <span>•</span>
        <span>September 19, 2026</span>
      </div>

      {/* Article Text Content Body */}
      <div className="text-slate-800 leading-relaxed text-base space-y-4">
        <p>
          Loading the latest civic updates and legal article data from the system backend...
        </p>
      </div>
    </article>
  );
};
