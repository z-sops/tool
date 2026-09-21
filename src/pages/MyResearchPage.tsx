import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/layout/ToolLayout';
import {
  getSavedProducts, removeSavedProduct,
  getSavedComparisons, removeSavedComparison,
  getSavedAnalyses, removeSavedAnalysis,
  getSavedListings, removeSavedListing,
  getResearchNotes, removeNote, saveNote,
  formatTimestamp, exportAllData, clearAllData,
} from '../storage';
import type { SavedProduct, SavedComparison, SavedAnalysis, SavedListing, ResearchNote } from '../types';

type Tab = 'products' | 'comparisons' | 'analyses' | 'listings' | 'notes';

const toolRouteMap: Record<string, string> = {
  profit: '/tools/amazon-profit-calculator',
  roi: '/tools/amazon-roi-calculator',
  pricing: '/tools/amazon-pricing-calculator',
  ip: '/tools/amazon-ip-check',
  restriction: '/tools/amazon-restriction-check',
  sourcing: '/tools/sourcing-risk-check',
  listing: '/tools/amazon-listing-analyzer',
  title: '/tools/amazon-title-checker',
  bullet: '/tools/amazon-bullet-checker',
  checklist: '/tools/product-research-checklist',
  niche: '/tools/niche-analysis',
};

export function MyResearchPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const refresh = () => {
    setProducts(getSavedProducts());
    setComparisons(getSavedComparisons());
    setAnalyses(getSavedAnalyses());
    setListings(getSavedListings());
    setNotes(getResearchNotes());
  };

  useEffect(() => { refresh(); }, []);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'products', label: 'Saved Products', count: products.length },
    { key: 'comparisons', label: 'Comparisons', count: comparisons.length },
    { key: 'analyses', label: 'Analyses', count: analyses.length },
    { key: 'listings', label: 'Listings', count: listings.length },
    { key: 'notes', label: 'Notes', count: notes.length },
  ];

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nichescout-research-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL saved research? This cannot be undone.')) {
      clearAllData();
      refresh();
    }
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim()) return;
    saveNote(newNoteTitle, newNoteContent);
    setNewNoteTitle('');
    setNewNoteContent('');
    refresh();
  };

  const totalCount = products.length + comparisons.length + analyses.length + listings.length + notes.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            My Research
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Research</h1>
          <p className="text-gray-600 text-sm">
            {totalCount === 0
              ? 'No saved research yet. Start exploring and analyzing products!'
              : `${totalCount} saved item${totalCount !== 1 ? 's' : ''} in your research library.`}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? 'bg-orange-400' : 'bg-gray-100'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center mb-8">
          {totalCount > 0 && (
            <>
              <button onClick={handleExport} className="text-sm font-medium bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Export All (JSON)
              </button>
              <button onClick={handleClearAll} className="text-sm font-medium bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                Clear All Data
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto">
          {tab === 'products' && (
            <div className="space-y-3">
              {products.length === 0 && <EmptyState message="No saved products. Explore products and save them here." link="/explore" linkText="Explore Products" />}
              {products.map(sp => (
                <div key={sp.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                  <span className="text-2xl">{sp.product.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{sp.product.name}</p>
                    <p className="text-xs text-gray-500">${sp.product.price} · ★ {sp.product.rating} · Saved {formatTimestamp(sp.savedAt)}</p>
                    {sp.notes && <p className="text-xs text-gray-400 mt-1 italic">{sp.notes}</p>}
                  </div>
                  <button onClick={() => { removeSavedProduct(sp.id); refresh(); }} className="text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'comparisons' && (
            <div className="space-y-3">
              {comparisons.length === 0 && <EmptyState message="No saved comparisons. Compare products and save them here." link="/compare" linkText="Compare Products" />}
              {comparisons.map(sc => (
                <div key={sc.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{sc.name}</p>
                    <button onClick={() => { removeSavedComparison(sc.id); refresh(); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{sc.products.length} products · {formatTimestamp(sc.createdAt)}</p>
                  <div className="flex gap-1.5 mt-2">
                    {sc.products.map(p => (
                      <span key={p.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.image} {p.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'analyses' && (
            <div className="space-y-3">
              {analyses.length === 0 && <EmptyState message="No saved analyses. Run a tool and save results here." link="/explore" linkText="Explore Tools" />}
              {analyses.map(sa => (
                <div key={sa.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{sa.type.toUpperCase()} Analysis</p>
                    <p className="text-xs text-gray-500">{sa.productName} · {formatTimestamp(sa.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    {toolRouteMap[sa.type] && (
                      <Link to={toolRouteMap[sa.type]} className="text-xs text-orange-500 hover:text-orange-600 font-medium">Re-run</Link>
                    )}
                    <button onClick={() => { removeSavedAnalysis(sa.id); refresh(); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'listings' && (
            <div className="space-y-3">
              {listings.length === 0 && <EmptyState message="No saved listings. Create a listing and save it here." link="/create" linkText="Create Listing" />}
              {listings.map(sl => (
                <div key={sl.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{sl.productName}</p>
                    <button onClick={() => { removeSavedListing(sl.id); refresh(); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{formatTimestamp(sl.createdAt)}</p>
                  <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 truncate">{sl.listing.title}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-2"
                />
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  placeholder="Note content..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-2"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteTitle.trim()}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
                >
                  Add Note
                </button>
              </div>

              {notes.length === 0 && <EmptyState message="No notes yet. Add your research notes above." />}
              {notes.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <button onClick={() => { removeNote(n.id); refresh(); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{formatTimestamp(n.updatedAt)}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
                  {n.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {n.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, link, linkText }: { message: string; link?: string; linkText?: string }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm text-gray-500 mb-3">{message}</p>
      {link && linkText && (
        <Link to={link} className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600">
          {linkText}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      )}
    </div>
  );
}
