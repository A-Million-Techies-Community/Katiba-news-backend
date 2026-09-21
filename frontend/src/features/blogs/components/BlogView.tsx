import React, { useState } from 'react';

export const BlogView: React.FC = () => {
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-white border border-slate-100 shadow-sm rounded-xl mt-6">
      {/* Blog Main Article Body */}
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Community Opinion: Enhancing Civic Space
        </h1>
        <p className="text-sm text-slate-500 mt-2">Posted by Community Contributor</p>
        <p className="text-slate-700 mt-4 leading-relaxed">
          The structural dynamics of local public participation require clear, open dialogue channels across decentralized frameworks...
        </p>
      </div>
      
      {/* Interactive Engagement Panel (Likes & Comment Count) */}
      <div className="flex items-center gap-6 py-4 text-sm font-medium border-b border-slate-100">
        <button 
          onClick={() => setLiked(!liked)}
          className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-rose-600' : 'text-slate-600 hover:text-rose-600'}`}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        <div className="text-slate-600 flex items-center gap-1.5">
          <span>💬</span>
          <span>Comments (0)</span>
        </div>
      </div>

      {/* Interactive Input Comment Section */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Join the Dialogue</label>
        <textarea 
          placeholder="Add your respectful thoughts to this civic dialogue..." 
          rows={3}
          className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="mt-3 bg-emerald-600 text-white px-4 py-2 text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition duration-150">
          Post Comment
        </button>
      </div>
    </div>
  );
};
