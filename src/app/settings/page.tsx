'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Save, LogOut } from 'lucide-react';

const inputCls =
  'w-full h-9 rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0]';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6">
      <h2 className="text-sm font-semibold text-[#E8EDF5]">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#5A7A9A]">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <div>
        <p className="text-sm text-[#E8EDF5]">{label}</p>
        <p className="mt-0.5 text-xs text-[#5A7A9A]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${checked ? 'border-[#1565C0] bg-[#1565C0]' : 'border-[#1E3048] bg-[#1E3048]'}`}
      >
        <span
          className={`pointer-events-none mt-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name ?? '');
  const [email] = useState(session?.user?.email ?? '');
  const [defaultClass, setDefaultClass] = useState('person');
  const [defaultConfidence, setDefaultConfidence] = useState(50);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">Settings</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Manage your profile and preferences.
        </p>
      </div>

      <Section title="Profile">
        <Field label="Display name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            readOnly
            className={inputCls + ' cursor-default opacity-60'}
          />
        </Field>
      </Section>

      <Section title="Analysis defaults">
        <Field label="Default detection class">
          <select
            value={defaultClass}
            onChange={(e) => setDefaultClass(e.target.value)}
            className={inputCls}
          >
            {['person', 'car', 'truck', 'bicycle', 'motorcycle'].map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Default confidence threshold: ${defaultConfidence}%`}>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={defaultConfidence}
            onChange={(e) => setDefaultConfidence(Number(e.target.value))}
            className="w-full accent-[#1565C0]"
          />
        </Field>
      </Section>

      <Section title="Notifications">
        <Toggle
          label="Email alerts"
          description="Receive an email when analysis jobs complete or events are detected."
          checked={emailAlerts}
          onChange={() => setEmailAlerts((p) => !p)}
        />
        <Toggle
          label="Weekly digest"
          description="Get a weekly summary of all jobs and flagged events."
          checked={weeklyDigest}
          onChange={() => setWeeklyDigest((p) => !p)}
        />
      </Section>

      <div className="flex items-center justify-between">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <button
          onClick={handleSave}
          className="flex h-9 items-center gap-2 rounded-md bg-[#1565C0] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
