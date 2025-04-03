'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [emails, setEmails] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [streamActive, setStreamActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Triggering automation...');
    setLogs([]);
    setStreamActive(true);

    const res = await fetch('/api/trigger-scraper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetUrl,
        emails: emails.split(',').map(email => email.trim()),
      }),
    });

    const data = await res.json();
    setStatus(data.message || '✅ Done');
  };

  useEffect(() => {
    if (!streamActive) return;

    const eventSource = new EventSource('/api/log-stream');

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    eventSource.onerror = () => {
      setLogs((prev) => [...prev, '❌ Log stream disconnected.']);
      eventSource.close();
      setStreamActive(false);
    };

    return () => eventSource.close();
  }, [streamActive]);

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-6 flex flex-col items-center justify-start">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-zinc-800 border border-zinc-700 p-6 rounded-xl shadow-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-white mb-2">GCP Cost Estimator Automation</h1>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Google Sheet Link</label>
          <input
            type="url"
            required
            className="w-full mt-1 p-2 rounded border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring focus:ring-blue-500"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Email IDs (comma separated)</label>
          <textarea
            required
            className="w-full mt-1 p-2 rounded border border-zinc-600 bg-zinc-700 text-white focus:outline-none focus:ring focus:ring-blue-500"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow"
        >
          Start Automation
        </button>

        {status && <p className="text-sm text-zinc-400 mt-2">{status}</p>}
      </form>

      {logs.length > 0 && (
        <div className="w-full max-w-4xl mt-8 bg-zinc-950 border border-zinc-700 rounded-lg p-4 h-[400px] overflow-auto font-mono text-green-400 text-sm shadow-inner">
          <h2 className="text-lg font-semibold mb-2 text-white">📜 Logs</h2>
          {logs.map((log, idx) => (
            <div key={idx}>{log}</div>
          ))}
        </div>
      )}
    </main>
  );
}
