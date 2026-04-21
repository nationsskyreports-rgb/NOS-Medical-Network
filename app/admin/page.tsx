'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, CreditCard as Edit2, Trash2, LogOut, ArrowLeft, Loader as Loader2, CircleCheck as CheckCircle, Circle as XCircle, MapPin, CircleAlert as AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Provider } from '@/lib/database.types';
import AdminLogin from './components/AdminLogin';
import ProviderForm from './components/ProviderForm';

const CARD_BADGE: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700',
  gold: 'bg-yellow-100 text-yellow-700',
  silver: 'bg-slate-100 text-slate-600',
  green: 'bg-green-100 text-green-700',
};

const PAGE_SIZE = 20;

export default function AdminPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ بيشيك على الـ admin من الـ user metadata مباشرة - أبسط وأضمن
  const checkAdmin = useCallback(async () => {
    setAuthLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser?.id) {
      setUser(null);
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    setUser(currentUser as { id: string });

    // بيقرأ is_admin من الـ user_metadata اللي حطيناه في Supabase
    const isAdminUser = currentUser.user_metadata?.is_admin === true;
    setIsAdmin(isAdminUser);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProviders = useCallback(async () => {
    setLoadingData(true);
    try {
      let countQuery = supabase.from('providers').select('id', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (debouncedSearch) {
        const filter = `name_en.ilike.%${debouncedSearch}%,name_ar.ilike.%${debouncedSearch}%,governorate_en.ilike.%${debouncedSearch}%`;
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);
      if (error) throw error;
      setProviders(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (isAdmin) fetchProviders();
  }, [isAdmin, fetchProviders]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const handleSave = async (formData: Omit<Provider, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingProvider) {
        const { error } = await supabase
          .from('providers')
          .update(formData)
          .eq('id', editingProvider.id);
        if (error) throw error;
        showToast('success', 'Provider updated successfully');
      } else {
        const { error } = await supabase.from('providers').insert(formData);
        if (error) throw error;
        showToast('success', 'Provider added successfully');
      }
      setShowForm(false);
      setEditingProvider(undefined);
      fetchProviders();
    } catch (err) {
      console.error(err);
      showToast('error', 'Error saving provider');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('providers').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Provider deleted');
      fetchProviders();
    } catch (err) {
      console.error(err);
      showToast('error', 'Error deleting provider');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={() => checkAdmin()} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm mb-6">Your account does not have admin privileges.</p>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = providers.filter((p) => p.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to App</span>
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Providers', value: total, color: 'text-blue-700' },
            { label: 'Active', value: activeCount, color: 'text-green-700' },
            { label: 'Inactive', value: total - activeCount, color: 'text-gray-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search providers..."
                className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setEditingProvider(undefined); setShowForm(true); }}
              className="flex items-center gap-1.5 h-9 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Add Provider
            </button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-medium">No providers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Provider</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Governorate</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Card</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{provider.name_en}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{provider.type_en}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{provider.governorate_en}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CARD_BADGE[provider.card_type]}`}>
                          {provider.card_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {provider.lat && provider.lng ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <MapPin size={11} /> Geocoded
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No coords</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {provider.is_active ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingProvider(provider); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(provider.id)}
                            disabled={deletingId === provider.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === provider.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {page + 1} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingProvider(undefined); }}
        />
      )}
    </div>
  );
}
