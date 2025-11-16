import './RightSidePanel.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiAPI } from '../../utils/api';

interface Props {
  isOpen?: boolean;
  includeBalanceSheet?: boolean;
}

interface AnalysisCategory {
  title: string;
  insight: string;
  tip: string;
}

// Parse the AI analysis into structured categories with insights and tips
const parseAnalysis = (analysis: any): AnalysisCategory[] => {
  let obj: any = null;
  
  // Parse if it's a string
  if (typeof analysis === 'string') {
    try {
      obj = JSON.parse(analysis);
    } catch {
      return [];
    }
  } else {
    obj = analysis;
  }

  const categories: AnalysisCategory[] = [];
  
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    
    // Split the value into sentences to separate insight and tip
    const sentences = value.split(/(?<=[.!?])\s+/);
    
    // First 1-2 sentences are the insight
    const insight = sentences.slice(0, 2).join(' ');
    
    // Remaining sentences or look for "suggestion", "tip", "try", etc.
    let tip = sentences.slice(2).join(' ');
    
    // If no tip found in remaining sentences, try to extract suggestion from insight
    if (!tip && insight.toLowerCase().includes('suggest')) {
      const parts = insight.split(/suggest(?:ion|ed)?:?\s*/i);
      if (parts.length > 1) {
        tip = parts[1];
      }
    }
    
    // If still no tip, look for action verbs
    if (!tip) {
      const actionMatch = value.match(/(increase|decrease|reduce|improve|consider|try|focus on|aim for)[^.!?]*/i);
      if (actionMatch) {
        tip = actionMatch[0];
      }
    }
    
    categories.push({
      title: key,
      insight: insight || value,
      tip: tip || 'Continue monitoring this category for optimal financial health.'
    });
  }
  
  return categories;
};

// actual assistant content
const SakiAssistant: React.FC<Props> = ({ isOpen = false, includeBalanceSheet = true }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevOpenRef = useRef<boolean>(false);

  const loadAnalysis = useCallback(async () => {
    console.log('SakiAssistant: loadAnalysis called');
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.getFinancialAnalysis(includeBalanceSheet);
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
  }, [includeBalanceSheet]);

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

  const categories = analysis ? parseAnalysis(analysis) : [];

  return (
    <div className="saki-root">
      <div className="saki-header">
        <h2 className="saki-title">Financial Insights</h2>
        <button className="saki-refresh-btn" onClick={loadAnalysis} disabled={loading} aria-label="Refresh analysis">
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {loading && <div className="saki-loading">Analyzing your financial data…</div>}
      {error && <div className="saki-error">Error: {error}</div>}

      {!loading && !error && categories.length > 0 && (
        <div className="saki-content">
          {categories.map((category, index) => (
            <div key={index} className="saki-category">
              <h3 className="saki-category-title">{category.title}</h3>
              <div className="saki-insight">
                <span className="saki-label">💡 Insight:</span>
                <p className="saki-text">{category.insight}</p>
              </div>
              <div className="saki-tip">
                <span className="saki-label">✨ Suggested Action:</span>
                <p className="saki-text">{category.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="saki-empty">No analysis available. Click Refresh to generate insights.</div>
      )}
    </div>
  );
};

export default SakiAssistant;