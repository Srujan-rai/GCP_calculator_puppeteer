'use client';

import { useEffect, useState } from 'react';
// 1. Import the Next.js Image component
import Image from 'next/image';
// Optional: Import an icon library like react-icons
import { FiLoader, FiTerminal, FiCheckCircle, FiXCircle, FiLink, FiMail } from 'react-icons/fi';

// Define a type for structured logs
type LogEntry = {
  id: number; // Use a unique ID for keys
  type: 'info' | 'error' | 'success';
  message: string;
  timestamp: string; // Add timestamp for clarity
};

export default function HomePage() {
  const [sheetUrl, setSheetUrl] = useState('');
  const [emails, setEmails] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamActive, setStreamActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  let logCounter = 0; // Simple counter for unique log IDs

  const formatTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: logCounter++, type, message, timestamp: formatTimestamp() },
    ]);
     // Optional: Auto-scroll to bottom - consider performance for very high log rates
     const logContainer = document.getElementById('log-container');
     if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setStatus('🚀 Triggering automation...');
    setLogs([]); // Clear previous logs
    setSubmissionStatus('idle');
    setStreamActive(true); // Start listening for logs *before* the request potentially finishes fast

    try {
      addLog('info', 'Attempting to trigger automation...');
      const res = await fetch('/api/trigger-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl,
          emails: emails.split(',').map(email => email.trim()).filter(email => email), // Filter out empty strings
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(data.message || '✅ Automation Triggered Successfully!');
        setSubmissionStatus('success');
        addLog('success', `Server Response: ${data.message || 'Trigger successful.'}`);
      } else {
        throw new Error(data.message || 'Failed to trigger automation.');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setSubmissionStatus('error');
      addLog('error', `Failed to trigger automation: ${error.message}`);
      setStreamActive(false); // Stop listening if trigger failed immediately
    } finally {
      setIsLoading(false);
      // Keep status message for a bit before clearing or changing
      // setTimeout(() => setStatus(''), 5000); // Optional: clear status after 5s
    }
  };

  useEffect(() => {
    if (!streamActive) return;

    // Add initial log stream connection message
    addLog('info', 'Attempting to connect to log stream...');

    const eventSource = new EventSource('/api/log-stream');
    let isConnected = false; // Flag to track connection status

    eventSource.onopen = () => {
        isConnected = true;
        addLog('success', '🔌 Log stream connected.');
        // Optionally update overall status if needed
        // setStatus('Log stream active...');
    }

    eventSource.onmessage = (event) => {
      // Simple check for "END_OF_STREAM" or similar signal if your backend sends one
      if (event.data === "END_OF_STREAM") {
          addLog('success', '🏁 Automation process finished.');
          setStatus('✅ Done');
          setSubmissionStatus('success');
          eventSource.close();
          setStreamActive(false);
          return;
      }
      addLog('info', event.data);
    };

    eventSource.onerror = () => {
      // Only log error if we were previously connected or haven't connected yet
      if (isConnected || logs.length <= 1) { // Check logs length to avoid duplicate initial errors
          addLog('error', '❌ Log stream connection lost or failed to connect.');
      }
      setStatus('⚠️ Log stream disconnected.');
      eventSource.close();
      setStreamActive(false);
      // Don't necessarily set submission status to error here,
      // as the trigger might have succeeded but logs failed later.
    };

    // Cleanup function
    return () => {
      // Check if eventSource exists and readyState is not CLOSED before closing
      if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
           addLog('info', 'Closing log stream connection.');
           eventSource.close();
      }
      // Explicitly set streamActive to false on cleanup if component unmounts
      // setStreamActive(false); // Consider if needed based on your app logic
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamActive]); // Rerun effect when streamActive changes


  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <FiCheckCircle className="text-green-400" />;
      case 'error': return <FiXCircle className="text-red-400" />;
      case 'info':
      default: return <FiTerminal className="text-blue-400" />;
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-300';
      case 'error': return 'text-red-300';
      case 'info':
      default: return 'text-gray-300';
    }
  }


  return (
    // Adjusted padding top (`pt-12`) if needed, or rely on margin below image
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white p-4 sm:p-8 flex flex-col items-center justify-start font-sans">

      {/* === ADDED IMAGE SECTION === */}
      <div className="mb-8"> {/* Adjust margin-bottom as needed */}
        <Image
          src="/image.png"        // Make sure image.png is in /public folder
          alt="Top Banner Image"  // *** CHANGE THIS ALT TEXT ***
          width={200}             // *** ADJUST WIDTH ***
          height={100}            // *** ADJUST HEIGHT ***
          priority                // Load image sooner
          className="h-auto"      // Maintain aspect ratio (optional)
        />
      </div>
      {/* === END IMAGE SECTION === */}


      {/* Form Container */}
      <div className="w-full max-w-2xl mb-8">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/70 backdrop-blur-sm border border-blue-800/30 p-6 sm:p-8 rounded-2xl shadow-xl shadow-blue-900/20 space-y-6 transition-all duration-300"
        >
          <h1 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            GCP Cost Estimator Automation
          </h1>

          {/* Input Group: Sheet URL */}
          <div>
            <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-300 mb-1.5">
              Google Sheet Link
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLink className="text-gray-400" />
              </span>
              <input
                id="sheetUrl"
                type="url"
                required
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-600 bg-gray-700/60 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Input Group: Emails */}
          <div>
            <label htmlFor="emails" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email IDs (comma separated)
            </label>
            <div className="relative">
               <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <FiMail className="text-gray-400 mt-0.5" />
              </span>
              <textarea
                id="emails"
                required
                rows={3}
                placeholder="user1@example.com, user2@example.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-600 bg-gray-700/60 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out resize-none" // Added resize-none
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full inline-flex items-center justify-center py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:from-blue-500`}
          >
            {isLoading ? (
              <>
                <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </>
            ) : (
              'Start Automation'
            )}
          </button>

          {/* Status Message Area */}
          {status && (
             <div className={`mt-4 text-center text-sm p-2 rounded-md ${
                submissionStatus === 'success' ? 'bg-green-900/50 text-green-300' :
                submissionStatus === 'error' ? 'bg-red-900/50 text-red-300' :
                'bg-gray-700/50 text-gray-300' // Default/loading status
             }`}>
                {status}
             </div>
          )}
        </form>
      </div>

      {/* Log Display Area */}
      {(logs.length > 0 || streamActive) && ( // Show container even if logs are empty but stream is active
        <div className="w-full max-w-4xl mt-6 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg h-[450px] flex flex-col">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center space-x-2">
             <FiTerminal className="text-cyan-400"/>
             <h2 className="text-lg font-semibold text-gray-200">Automation Logs</h2>
             {streamActive && <div className="animate-pulse text-xs text-green-400">(Streaming...)</div>}
          </div>
          <div
            id="log-container" // ID for potential scrolling
            className="flex-grow p-5 overflow-y-auto font-mono text-sm space-y-1.5 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" // Tailwind scrollbar utilities (install if needed: npm i -D tailwind-scrollbar)
          >
            {logs.map((log) => (
               <div key={log.id} className="flex items-start space-x-2 group">
                    <span className="mt-0.5">{getLogIcon(log.type)}</span>
                    <span className="text-gray-500 font-medium tabular-nums">{log.timestamp}</span>
                    <span className={`flex-1 ${getLogColor(log.type)} break-words group-hover:text-white transition-colors duration-150`}>
                        {log.message}
                    </span>
               </div>
            ))}
             {isLoading && logs.length === 0 && ( // Show placeholder when loading but no logs yet
                <div className="text-gray-500 italic">Waiting for logs...</div>
             )}
          </div>
        </div>
      )}
    </main>
  );
}