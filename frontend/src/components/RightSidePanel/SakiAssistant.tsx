import './RightSidePanel.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiAPI } from '../../utils/api';

interface Props {
  isOpen?: boolean;
}

//f format analysis text
const formatAnalysis = (analysis: any): string => {
  let obj: any = null;
  if (typeof analysis === 'string') {
    try { obj = JSON.parse(analysis); } catch { return `analysis:\n  ${analysis.trim()}`; }
  } else { obj = analysis; }

  const lines: string[] = [];
  const writeValue = (val: any): string => {
    if (val == null) return 'null';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return val.map(i => `- ${typeof i === 'object' ? JSON.stringify(i) : String(i)}`).join('\n  ');
    const pretty = JSON.stringify(val, null, 2);
    return pretty.split('\n').map((l, idx) => (idx === 0 ? l : `  ${l}`)).join('\n').replace(/\n/g, '\n  ');
  };

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const formatted = writeValue(value).replace(/\n/g, '\n  ');
    lines.push(`${key}:\n  ${formatted}`);
  }
  return lines.join('\n\n');
};


// actual assistant content
const SakiAssistant: React.FC<Props> = ({ isOpen = false }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevOpenRef = useRef<boolean>(false);

  const loadAnalysis = useCallback(async () => {
    console.log('SakiAssistant: loadAnalysis called');
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.getFinancialAnalysis();
      if (res?.success) {
        setAnalysis(res.data ?? res.analysis ?? res);
      } else {
        setError('No analysis returned');
        setAnalysis(null);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Request failed');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // trigger when panel opens (on mount this will also load if isOpen is true)
  useEffect(() => {
    const prev = prevOpenRef.current;
    if (!prev && isOpen) {
      // transition false -> true
      console.log('SakiAssistant: panel opened, loading analysis');
      loadAnalysis();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, loadAnalysis]);

  // optional: load on mount if visible immediately
  useEffect(() => {
    if (isOpen) {
      // in case parent mounts with isOpen true
      loadAnalysis();
    }
  }, []); // intentionally run once on mount

  const rendered = analysis ? formatAnalysis(analysis) : null;

  return (
    <div className="saki-root">
      <div className="saki-header">
        <button onClick={loadAnalysis} disabled={loading} aria-label="Refresh analysis">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && <p>Loading financial analysis…</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && !error && rendered && (
        <div className="saki-content">
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rendered}</pre>
        </div>
      )}

      {!loading && !error && !rendered && <p>No analysis available.</p>}
    </div>
  );
};

export default SakiAssistant;