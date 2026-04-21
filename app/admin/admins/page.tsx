'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader as Loader2, ShieldCheck, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

export default function ManageAdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.user_metadata?.is_admin !== true) {
        router.replace('/admin');
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      // بنجيب كل الـ users اللي عندهم is_admin = true
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) fetchAdmins();
  }, [authChecked, fetchAdmins]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    try {
      const { error } = await supabase.rpc('set_admin_by_email', {
        target_email: newEmail.trim().toLowerCase(),
        admin_value: true,
      });
      if (error) throw error;
      showToast('success', `${newEmail} is now an admin ✅`);
      setNewEmail('');
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'User not found or error occurred';
      showToast('error', message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!confirm(`Remove admin privileges from ${admin.email}?`)) return;
    setRemovingId(admin.id);
    try {
      const { error } = await supabase.rpc('set_admin_by_email', {
        target_email: admin.email,
        admin_value: false,
      });
      if (error) throw error;
      showToast('success', `${admin.email} removed from admins`);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to remove admin');
    } finally {
      setRemovingId(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <ArrowLeft size={16} />
            Back to Admin
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-700" />
            <h1 className="text-base font-bold text-gray-900">Manage Admins</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Add Admin */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add New Admin</h2>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@nationsofsky.com"
              required
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={adding}
              className="h-10 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">⚠️ المستخدم لازم يكون مسجل في التطبيق الأول</p>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Current Admins</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ShieldCheck size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No admins found</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <li key={admin.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{admin.email}</p>
                    <p className="text-xs text-gray-400">
                      Added {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(admin)}
                    disabled={removingId === admin.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Remove admin"
                  >
                    {removingId === admin.id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Trash2 size={15} />
                    }
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
