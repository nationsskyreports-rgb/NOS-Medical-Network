'use client';

import { useState } from 'react';
import { X, MapPin, Loader as Loader2, Save } from 'lucide-react';
import type { Provider, CardType, ProviderTypeKey } from '@/lib/database.types';
import { geocodeAddress } from '@/lib/geocode';

type ProviderFormData = Omit<Provider, 'id' | 'created_at' | 'updated_at'>;

interface ProviderFormProps {
  provider?: Provider;
  onSave: (data: ProviderFormData) => Promise<void>;
  onCancel: () => void;
}

const CARD_TYPES: CardType[] = ['orange', 'gold', 'silver', 'green'];
const PROVIDER_TYPES: { key: ProviderTypeKey; label: string }[] = [
  { key: 'hospital', label: 'Hospital' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'radiology', label: 'Radiology Center' },
  { key: 'laboratory', label: 'Laboratory' },
  { key: 'physician', label: 'Physician' },
  { key: 'dentist', label: 'Dentist' },
  { key: 'optics', label: 'Optics Center' },
  { key: 'physiotherapy', label: 'Physiotherapy' },
  { key: 'clinic', label: 'MetLife Clinic' },
  { key: 'other', label: 'Other' },
];

const GOVERNORATES = [
  'Alexandria', 'Aswan', 'Assuit', 'Beheira', 'Dakahlia',
  'Giza', 'Ismailia', 'Luxor', 'Red Sea', 'Cairo', 'Port Said', 'Suez',
];

const DEFAULT_FORM: ProviderFormData = {
  name_en: '', name_ar: '',
  type_en: '', type_ar: '',
  type_key: 'hospital',
  speciality_en: '', speciality_ar: '',
  address_en: '', address_ar: '',
  city_en: '', city_ar: '',
  governorate_en: '', governorate_ar: '',
  card_type: 'orange',
  phone1: '', phone2: '',
  lat: null, lng: null,
  is_active: true,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, dir }: { value: string; onChange: (v: string) => void; placeholder?: string; dir?: 'rtl' | 'ltr' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

export default function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [form, setForm] = useState<ProviderFormData>(
    provider
      ? {
          name_en: provider.name_en, name_ar: provider.name_ar,
          type_en: provider.type_en, type_ar: provider.type_ar,
          type_key: provider.type_key,
          speciality_en: provider.speciality_en, speciality_ar: provider.speciality_ar,
          address_en: provider.address_en, address_ar: provider.address_ar,
          city_en: provider.city_en, city_ar: provider.city_ar,
          governorate_en: provider.governorate_en, governorate_ar: provider.governorate_ar,
          card_type: provider.card_type,
          phone1: provider.phone1, phone2: provider.phone2,
          lat: provider.lat, lng: provider.lng,
          is_active: provider.is_active,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');

  const set = (field: keyof ProviderFormData) => (value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    setGeocodeMsg('');
    const result = await geocodeAddress(form.address_en, form.city_en, form.governorate_en);
    if (result) {
      setForm((prev) => ({ ...prev, lat: result.lat, lng: result.lng }));
      setGeocodeMsg(`Found: ${result.displayName.slice(0, 60)}...`);
    } else {
      setGeocodeMsg('Could not find location. Please enter coordinates manually.');
    }
    setGeocoding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!provider;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Provider' : 'Add Provider'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name (English)">
              <TextInput value={form.name_en} onChange={set('name_en')} placeholder="Provider name in English" />
            </Field>
            <Field label="Name (Arabic)">
              <TextInput value={form.name_ar} onChange={set('name_ar')} placeholder="اسم مقدم الخدمة" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider Category">
              <select
                value={form.type_key}
                onChange={(e) => {
                  const selected = PROVIDER_TYPES.find((t) => t.key === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    type_key: e.target.value as ProviderTypeKey,
                    type_en: selected?.label || '',
                  }));
                }}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Card Type">
              <select
                value={form.card_type}
                onChange={(e) => set('card_type')(e.target.value as CardType)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CARD_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct.charAt(0).toUpperCase() + ct.slice(1)} Card</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type Display (English)">
              <TextInput value={form.type_en} onChange={set('type_en')} placeholder="e.g. Hospital" />
            </Field>
            <Field label="Type Display (Arabic)">
              <TextInput value={form.type_ar} onChange={set('type_ar')} placeholder="مستشفى" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Speciality (English)">
              <TextInput value={form.speciality_en} onChange={set('speciality_en')} placeholder="Cardiology, Surgery..." />
            </Field>
            <Field label="Speciality (Arabic)">
              <TextInput value={form.speciality_ar} onChange={set('speciality_ar')} placeholder="طب القلب، جراحة..." dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Address (English)">
              <TextInput value={form.address_en} onChange={set('address_en')} placeholder="Street address" />
            </Field>
            <Field label="Address (Arabic)">
              <TextInput value={form.address_ar} onChange={set('address_ar')} placeholder="العنوان" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City (English)">
              <TextInput value={form.city_en} onChange={set('city_en')} placeholder="City / Area" />
            </Field>
            <Field label="City (Arabic)">
              <TextInput value={form.city_ar} onChange={set('city_ar')} placeholder="المدينة" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Governorate (English)">
              <select
                value={form.governorate_en}
                onChange={(e) => set('governorate_en')(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Governorate</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Governorate (Arabic)">
              <TextInput value={form.governorate_ar} onChange={set('governorate_ar')} placeholder="المحافظة" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone 1">
              <TextInput value={form.phone1} onChange={set('phone1')} placeholder="+20 1234567890" />
            </Field>
            <Field label="Phone 2">
              <TextInput value={form.phone2} onChange={set('phone2')} placeholder="Optional" />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Coordinates</span>
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !form.address_en}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {geocoding ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                {geocoding ? 'Geocoding...' : 'Auto-Geocode from Address'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude">
                <input
                  type="number"
                  step="0.0000001"
                  value={form.lat ?? ''}
                  onChange={(e) => set('lat')(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 30.0131"
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
              <Field label="Longitude">
                <input
                  type="number"
                  step="0.0000001"
                  value={form.lng ?? ''}
                  onChange={(e) => set('lng')(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="e.g. 31.2089"
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>
            {geocodeMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                geocodeMsg.startsWith('Found')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {geocodeMsg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active')(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${form.is_active ? 'translate-x-5.5 ms-[22px]' : 'ms-0.5'}`} />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
            </label>
          </div>
        </form>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name_en}
            className="flex-1 h-10 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : isEdit ? 'Update Provider' : 'Add Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}
