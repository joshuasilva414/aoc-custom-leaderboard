import { useState, useEffect } from 'react';
import './index.css';
import { parseData, calculateLocalScore, calculateStarScore, getLogData } from './utils/aoc-data';
import type { AoCData, Member, LogEntry } from './utils/aoc-data';
import exampleJson from './example.json';

// Components
const Leaderboard = ({ members }: { members: Member[] }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Score</th>
          <th>Stars</th>
          <th>Name</th>
          <th>Last Star</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m, i) => (
          <tr key={m.id}>
            <td className={`rank-${i + 1}`}>{i + 1}</td>
            <td>{m.local_score}</td>
            <td className="star-gold">{m.stars}*</td>
            <td>{m.name || `(anonymous #${m.id})`}</td>
            <td>{m.last_star_ts > 0 ? new Date(m.last_star_ts * 1000).toLocaleString() : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const LogView = ({ logs }: { logs: LogEntry[] }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Challenge</th>
          <th>Time Since Release</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log, i) => (
          <tr key={i}>
            <td>{new Date(log.timestamp * 1000).toLocaleString()}</td>
            <td>{log.memberName}</td>
            <td>Day {log.day} Part {log.part}</td>
            <td className="log-time">{log.timeSinceRelease}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function App() {
  const [data, setData] = useState<AoCData | null>(null);
  const [view, setView] = useState<'leaderboard' | 'log'>('leaderboard');
  const [sortMethod, setSortMethod] = useState<'local' | 'stars'>('local');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const LEADERBOARD_ID = '4598107';
      const CACHE_KEY = `aoc_data_${LEADERBOARD_ID}`;
      const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

      try {
        // Check cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data: cachedData } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('Using cached data');
            setData(parseData(cachedData));
            setLoading(false);
            return;
          }
        }

        console.log('Fetching fresh data...');
        // Fetch via proxy
        const response = await fetch(`/api/2025/leaderboard/private/view/${LEADERBOARD_ID}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        
        // Update cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: json
        }));

        setData(parseData(json));
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to example data if fetch fails (optional, but good for dev)
        console.log('Falling back to example data');
        setData(parseData(exampleJson));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading leaderboard data...</div>;
  if (error && !data) return <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-red)' }}>Error: {error}</div>;
  if (!data) return null;

  const getSortedMembers = () => {
    if (sortMethod === 'local') {
      return calculateLocalScore(data);
    } else {
      return calculateStarScore(data);
    }
  };

  const logs = getLogData(data);

  return (
    <div className="App">
      <div className="header-decoration">
        ~*~ Advent of Code 2025 ~*~
      </div>
      <h1>Custom Leaderboard</h1>
      
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
        <button 
          className={view === 'leaderboard' ? 'active' : ''} 
          onClick={() => setView('leaderboard')}
        >
          Leaderboard
        </button>
        <button 
          className={view === 'log' ? 'active' : ''} 
          onClick={() => setView('log')}
        >
          Log
        </button>
      </div>

      {view === 'leaderboard' && (
        <>
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <span style={{ marginRight: '1rem' }}>Sort By:</span>
            <button 
              className={sortMethod === 'local' ? 'active' : ''} 
              onClick={() => setSortMethod('local')}
            >
              Local Score
            </button>
            <button 
              className={sortMethod === 'stars' ? 'active' : ''} 
              onClick={() => setSortMethod('stars')}
            >
              Stars
            </button>
          </div>
          <Leaderboard members={getSortedMembers()} />
        </>
      )}

      {view === 'log' && (
        <LogView logs={logs} />
      )}
    </div>
  );
}

export default App;
