import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Search, RefreshCw, Trash2, FileText, Database, CloudUpload } from 'lucide-react';
import { api } from '../services/api';

const STATUS_BADGE = {
  ready: 'badge-emerald',
  processing: 'badge-amber',
  error: 'badge-red',
};

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('product');
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['knowledge-docs'],
    queryFn: async () => (await api.get('/knowledge')).data.data,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name);
      fd.append('category', category);
      return api.post('/knowledge/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setTitle('');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['knowledge-docs'] });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id) => api.post(`/knowledge/${id}/reindex`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-docs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/knowledge/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-docs'] }),
  });

  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const res = await api.get(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchResults(res.data.data || []);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Knowledge Base (RAG)</h1>
        <p className="section-subtitle">
          Upload PDF, DOCX, or TXT files. Documents are chunked, embedded, and isolated to your organization.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (file) uploadMutation.mutate();
          }}
          className="card p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <CloudUpload className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Upload Document</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Document Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="product">Product Info</option>
              <option value="pricing">Pricing</option>
              <option value="faq">FAQs</option>
              <option value="policy">Company Policy</option>
              <option value="sales_guide">Sales Guide</option>
            </select>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${dragActive ? 'text-indigo-500' : 'text-slate-300'}`} />
            <p className="text-sm text-slate-600">
              {file ? (
                <span className="font-medium text-indigo-600">{file.name}</span>
              ) : (
                <>Drag & drop or <span className="text-indigo-600 font-medium">browse</span></>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT files</p>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="btn-primary w-full"
          >
            <Upload className="h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading & Indexing...' : 'Upload & Index'}
          </button>
        </form>

        {/* Semantic Search Test */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Database className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Semantic Search Tester</h2>
          </div>
          <form onSubmit={handleSemanticSearch} className="flex gap-2">
            <input
              className="input-field"
              placeholder="Ask a question to test RAG retrieval..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-secondary shrink-0">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Search results will appear here.</p>
            ) : (
              searchResults.map((r) => (
                <div key={r._id} className="p-3.5 rounded-xl bg-gradient-to-r from-violet-50/50 to-indigo-50/30 border border-violet-200/40 text-xs animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-indigo-700">{r.documentTitle}</span>
                    <span className="badge-indigo text-[10px]">Score: {Number(r.score || 0).toFixed(3)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{r.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Chunks</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!isLoading &&
              docs.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="font-medium text-slate-900">{doc.title}</span>
                  </td>
                  <td className="px-4 py-3.5 capitalize text-slate-600">{doc.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3.5">
                    <span className="badge-slate text-[10px]">{doc.chunkCount} chunks</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`${STATUS_BADGE[doc.status] || 'badge-slate'} text-[10px] capitalize`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => reindexMutation.mutate(doc._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Re-index"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(doc._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
