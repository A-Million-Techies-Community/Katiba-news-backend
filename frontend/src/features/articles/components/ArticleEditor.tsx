import React, { useState } from 'react';

export const ArticleEditor: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border border-slate-100 shadow-sm rounded-xl mt-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Draft New Constitutional Article</h2>
      
      {/* Title Input Field */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Article Title</label>
        <input 
          type="text" 
          placeholder="e.g., Understanding Chapter Four Amendments" 
          className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Body Content Input Field */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Content Body (Markdown Format)</label>
        <textarea 
          placeholder="Write your article details here using standard Markdown markup rules..." 
          rows={10} 
          className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Action Button */}
      <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition duration-150">
        Submit to Editor Panel
      </button>
    </div>
  );
};
