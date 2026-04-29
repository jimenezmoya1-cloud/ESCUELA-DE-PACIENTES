"use client"

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  color: string;
}

const SectionTitle: React.FC<Props> = ({ icon: Icon, title, color }) => (
    <h2 className={`text-xl font-extrabold text-slate-700 uppercase tracking-widest mb-4 pb-2 border-b-2 flex items-center gap-2 font-sans`} style={{ borderColor: color === 'slate' ? '#cbd5e1' : undefined, borderBottomColor: color !== 'slate' ? `var(--tw-${color}-100)` : undefined }}>
      <Icon className={`w-6 h-6 text-${color}-600`} style={{ color: color === 'slate' ? '#475569' : undefined }} />
      {title}
    </h2>
);

export default SectionTitle;