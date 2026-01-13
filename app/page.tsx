'use client';

import { useState, useMemo } from 'react';
import cashflowData from './cashflow.json';

interface Entry {
  date: string;
  type: 'in' | 'out' | 'event';
  description: string;
  amount: number;
  status: 'received' | 'pending' | 'due';
  certainty: 'complete' | 'high' | 'medium' | 'low';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
}

export default function Home() {
  const [showOnlyHighCertainty, setShowOnlyHighCertainty] = useState(false);

  const entries = cashflowData.entries as Entry[];
  const startingBalance = cashflowData.startingBalance;

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!showOnlyHighCertainty) return sortedEntries;
    return sortedEntries.filter(e => e.certainty === 'complete' || e.certainty === 'high');
  }, [sortedEntries, showOnlyHighCertainty]);

  const entriesWithBalance = useMemo(() => {
    let balance = startingBalance;
    return filteredEntries.map(entry => {
      if (entry.type === 'in') balance += entry.amount;
      if (entry.type === 'out') balance -= entry.amount;
      return { ...entry, runningBalance: balance };
    });
  }, [filteredEntries, startingBalance]);

  const stats = useMemo(() => {
    const totalOut = entries
      .filter(e => e.type === 'out')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalInHighCertainty = entries
      .filter(e => e.type === 'in' && (e.certainty === 'complete' || e.certainty === 'high'))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalInAll = entries
      .filter(e => e.type === 'in')
      .reduce((sum, e) => sum + e.amount, 0);

    const nextCritical = entries
      .filter(e => e.type === 'out' && e.status === 'due')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return {
      totalOut,
      totalInHighCertainty,
      totalInAll,
      netPositionHigh: startingBalance + totalInHighCertainty - totalOut,
      netPositionAll: startingBalance + totalInAll - totalOut,
      nextCritical
    };
  }, [entries, startingBalance]);

  const getCertaintyStyle = (certainty: string) => {
    switch (certainty) {
      case 'complete': return 'border-solid';
      case 'high': return 'border-solid';
      case 'medium': return 'border-dashed opacity-80';
      case 'low': return 'border-dotted opacity-60 italic';
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'text-green-400 bg-green-900/30 border-green-700';
      case 'out': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'event': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      default: return '';
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Cash Flow Calendar</h1>
        <p className="text-gray-400 mb-6">Cinder Hill Farm - {new Date().toLocaleDateString()}</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">£{stats.totalOut.toLocaleString()}</div>
            <div className="text-gray-400">Due Out</div>
          </div>
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">£{stats.totalInHighCertainty.toLocaleString()}</div>
            <div className="text-gray-400">Expected In (certain)</div>
          </div>
          <div className={`rounded-lg p-4 ${stats.netPositionHigh >= 0 ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <div className={`text-3xl font-bold ${stats.netPositionHigh >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              £{stats.netPositionHigh.toLocaleString()}
            </div>
            <div className="text-gray-400">Net Position</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            {stats.nextCritical ? (
              <>
                <div className="text-3xl font-bold text-yellow-400">{getDaysLabel(daysUntil(stats.nextCritical.date))}</div>
                <div className="text-gray-400">{stats.nextCritical.description}</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-green-400">Clear</div>
                <div className="text-gray-400">No critical dates</div>
              </>
            )}
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyHighCertainty}
              onChange={(e) => setShowOnlyHighCertainty(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-400">Show only high certainty items</span>
          </label>
        </div>

        {/* Timeline */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Timeline</h2>
          <div className="space-y-3">
            {/* Starting balance */}
            <div className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-24 text-gray-500 text-sm">Today</div>
              <div className="flex-1 text-gray-400">Starting balance</div>
              <div className="w-24 text-right font-mono">£{startingBalance.toLocaleString()}</div>
            </div>

            {entriesWithBalance.map((entry, i) => {
              const days = daysUntil(entry.date);
              const isPast = days < 0;
              const isToday = days === 0;
              const isSoon = days > 0 && days <= 7;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${getTypeColor(entry.type)} ${getCertaintyStyle(entry.certainty)} ${isPast ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-yellow-500' : ''}`}
                >
                  <div className={`w-24 text-sm ${isSoon ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                    {formatDate(entry.date)}
                    <div className="text-xs">{getDaysLabel(days)}</div>
                  </div>
                  <div className="flex-1">
                    <div>{entry.description}</div>
                    <div className="text-xs text-gray-500">
                      {entry.certainty !== 'complete' && `${entry.certainty} certainty`}
                    </div>
                  </div>
                  <div className="w-24 text-right font-mono">
                    {entry.type === 'in' && <span className="text-green-400">+£{entry.amount.toLocaleString()}</span>}
                    {entry.type === 'out' && <span className="text-red-400">-£{entry.amount.toLocaleString()}</span>}
                    {entry.type === 'event' && <span className="text-yellow-400">-</span>}
                  </div>
                  <div className={`w-24 text-right font-mono ${entry.runningBalance >= 0 ? 'text-gray-400' : 'text-red-400'}`}>
                    £{entry.runningBalance.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-900/30 border border-green-700 rounded"></div>
            <span>Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-900/30 border border-red-700 rounded"></div>
            <span>Outgoing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-900/30 border border-yellow-700 rounded"></div>
            <span>Event</span>
          </div>
          <span className="text-gray-600">|</span>
          <span>Solid = certain</span>
          <span>Dashed = medium</span>
          <span>Dotted = low</span>
        </div>
      </div>
    </main>
  );
}
