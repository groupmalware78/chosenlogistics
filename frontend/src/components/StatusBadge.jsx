import React from 'react';

const STATUS_STYLES = {
  'Received':            'bg-teal-100 text-teal-800',
  'In Transit':          'bg-blue-100 text-blue-800',
  'Delivered':           'bg-green-100 text-green-800',
  'Pending':             'bg-yellow-100 text-yellow-800',
  'Exception':           'bg-red-100 text-red-800',
  'Damaged':             'bg-orange-100 text-orange-800',
  'Returned to Sender':  'bg-purple-100 text-purple-800',
  'Opened':              'bg-amber-100 text-amber-800',
  'Empty':               'bg-zinc-100 text-zinc-800',
  'Liquid':              'bg-cyan-100 text-cyan-800',
};

export const STATUS_OPTIONS = [
  'Received', 'In Transit', 'Delivered', 'Pending', 'Exception',
  'Damaged', 'Returned to Sender', 'Opened', 'Empty', 'Liquid',
];

export default function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  return <span className={`badge ${cls}`}>{status}</span>;
}
