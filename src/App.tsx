
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Cloud,
  Gauge,
  Globe2,
  History as HistoryIcon,
  Info,
  Layers3,
  LoaderCircle,
  MapPin,
  Moon,
  Play,
  RefreshCw,
  Server,
  Settings,
  Sun,
  Zap,
} from "lucide-react";
import "./index.css";

const API = "http://localhost:5000";

type Region = {
  id: string;
  code: string;
  name: string;
  location: string;
  x: number;
  y: number;
};

type Result = {
  id?: number;
  region: string;
  latency: number | string;
  status: string;
  tested_at?: string;
};

const REGIONS: Region[] = [
  { id: "ap-south-1", code: "IN", name: "Mumbai", location: "ap-south-1", x: 62, y: 57 },
  { id: "ap-southeast-1", code: "SG", name: "Singapore", location: "ap-southeast-1", x: 67, y: 65 },
  { id: "eu-central-1", code: "DE", name: "Frankfurt", location: "eu-central-1", x: 46, y: 37 },
  { id: "us-east-1", code: "US", name: "US East", location: "us-east-1", x: 27, y: 43 },
];

function App() {
  const [selected, setSelected] = useState<string[]>(REGIONS.map((r) => r.id));
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState("Dashboard");
  const [backendOnline, setBackendOnline] = useState(false);

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/latency`);
      if (!response.ok) throw new Error("Could not load results");

      const data = await response.json();
      setResults(Array.isArray(data.results) ? data.results : []);
      setBackendOnline(true);
      setMessage("");
    } catch {
      setBackendOnline(false);
      setMessage("Could not load history. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function runLatencyTest() {
    if (selected.length === 0) {
      setMessage("Select at least one region first.");
      return;
    }

    setLoading(true);
    setMessage("");
    const newResults: Result[] = [];

    try {
      for (const id of selected) {
        const region = REGIONS.find((r) => r.id === id);
        if (!region) continue;

        const start = performance.now();
        let latency = 0;
        let status = "Online";

        try {
          const response = await fetch(`${API}/`, { cache: "no-store" });
          latency = Number((performance.now() - start).toFixed(2));
          if (!response.ok) status = "Error";
        } catch {
          latency = Number((performance.now() - start).toFixed(2));
          status = "Offline";
        }

        const item: Result = { region: region.name, latency, status };

        if (status === "Online") {
          try {
            const saved = await fetch(`${API}/api/latency`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            if (!saved.ok) {
              setMessage("Test ran, but saving failed. Check the backend.");
            }
          } catch {
            setMessage("Test ran, but the result could not be saved.");
          }
        }

        newResults.push(item);
      }

      await loadHistory();

      if (newResults.some((r) => r.status === "Online")) {
        setBackendOnline(true);
        setMessage(
          "Test complete. These are local backend response times, not actual AWS-region network latency."
        );
      } else {
        setMessage("Backend unavailable. Check the server.");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleRegion(id: string) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  const successfulResults = results.filter((r) => r.status === "Online");
  const bestResult = successfulResults.reduce<Result | null>(
    (best, item) =>
      best === null || Number(item.latency) < Number(best.latency)
        ? item
        : best,
    null
  );
  const average =
    successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + Number(r.latency), 0) /
        successfulResults.length
      : null;

  function resultsTable() {
    if (loading && results.length === 0) {
      return <div className="empty-state">Loading saved results...</div>;
    }

    if (results.length === 0) {
      return (
        <div className="empty-state">
          <CircleHelp size={27} />
          <strong>No saved results found</strong>
          <span>Run a test from the Dashboard, then refresh History.</span>
        </div>
      );
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Response Time</th>
              <th>Status</th>
              <th>Tested At</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => (
              <tr key={`${item.id ?? item.tested_at ?? "result"}-${index}`}>
                <td>
                  <span className="table-region">
                    <Globe2 size={16} /> {item.region}
                  </span>
                </td>
                <td>{Number(item.latency).toFixed(2)} ms</td>
                <td>
                  <span
                    className={`result-status ${
                      item.status === "Online" ? "online" : "error"
                    }`}
                  >
                    <CheckCircle2 size={14} /> {item.status}
                  </span>
                </td>
                <td>
                  {item.tested_at
                    ? new Date(item.tested_at).toLocaleString()
                    : "Time unavailable"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`regionx ${dark ? "dark" : "light"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Globe2 size={27} /></div>
          <div>
            <h2>REGIONX</h2>
            <span>CLOUD LATENCY</span>
          </div>
        </div>

        <p className="nav-label">MAIN</p>

        {[
          { name: "Dashboard", icon: Gauge },
          { name: "History", icon: HistoryIcon },
          { name: "About", icon: Info },
        ].map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={`nav-item ${page === name ? "active" : ""}`}
            onClick={() => {
              setPage(name);
              if (name === "History") void loadHistory();
            }}
          >
            <Icon size={19} />
            <span>{name}</span>
          </button>
        ))}

        <div className="sidebar-bottom">
          <span className={`status-dot ${backendOnline ? "" : "offline"}`} />
          <span>
            {backendOnline ? "Backend Connected" : "Backend Disconnected"}
          </span>
          <small>REGIONX v1.0</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>Cloud Region Latency</strong>
            <p>Compare network performance across cloud regions</p>
          </div>
          <button
            className="icon-button"
            onClick={() => setDark((previous) => !previous)}
            title="Toggle theme"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {page === "Dashboard" ? (
          <>
            <section className="hero">
              <div>
                <div className="eyebrow">
                  <span className="blue-dot" /> GLOBAL NETWORK MONITOR
                </div>
                <h1>Cloud Region Latency</h1>
                <p>Measure backend response times and compare your results.</p>
              </div>
              <button
                className="primary-button"
                onClick={runLatencyTest}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <Play size={19} fill="currentColor" />
                )}
                {loading ? "Testing..." : "Start Latency Test"}
              </button>
            </section>

            {message && (
              <div className="notice">
                <Info size={18} />
                <span>{message}</span>
                <button onClick={() => setMessage("")}>Dismiss</button>
              </div>
            )}

            <section className="panel region-panel">
              <div className="panel-heading">
                <div>
                  <h3>Select Regions</h3>
                  <p>Choose regions to include in the test</p>
                </div>
                <Server size={21} />
              </div>
              <div className="region-grid">
                {REGIONS.map((region) => (
                  <label className="region-option" key={region.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(region.id)}
                      onChange={() => toggleRegion(region.id)}
                    />
                    <span className="region-code">{region.code}</span>
                    <span className="region-name">
                      <strong>{region.name}</strong>
                      <small>{region.location}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <div className="dashboard-grid">
              <section className="panel map-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Global Network Map</h3>
                    <p>Regions monitored by REGIONX</p>
                  </div>
                  <Globe2 size={21} />
                </div>
                <div className="network-map">
                  <svg viewBox="0 0 100 75" role="img" aria-label="Illustrative region map">
                    <rect width="100" height="75" fill="currentColor" fillOpacity=".025" />
                    <g fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".2" strokeWidth=".3">
                      <path d="M7 17 L12 10 21 7 28 12 27 19 22 23 21 30 16 34 12 28 8 25Z" />
                      <path d="M23 35 L31 37 34 45 30 55 27 65 23 58 24 48 20 42Z" />
                      <path d="M39 13 L46 8 52 11 55 17 51 22 47 21 44 28 40 23Z" />
                      <path d="M45 26 L55 23 64 27 69 24 78 27 86 23 94 29 89 37 82 39 77 35 70 39 65 36 61 44 55 41 51 34 46 33Z" />
                      <path d="M52 42 L59 41 65 46 62 57 57 66 53 58 50 49Z" />
                    </g>
                    {REGIONS.filter((r) => selected.includes(r.id)).map((r) => (
                      <g key={r.id}>
                        <circle cx={r.x} cy={r.y} r="3" fill="#28b8ff" fillOpacity=".2" />
                        <circle cx={r.x} cy={r.y} r="1.3" fill="#28b8ff" />
                        <text x={r.x} y={r.y - 2.5} textAnchor="middle" fontSize="2.3" fill="currentColor">
                          {r.name}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="map-caption">
                  <MapPin size={14} /> Illustrative map, not a live AWS network map.
                </p>
              </section>

              <section className="panel best-panel">
                <div className="best-icon"><Zap size={25} /></div>
                <div>
                  <span className="eyebrow">BEST RECENT RESULT</span>
                  <h2>{bestResult?.region ?? "No test yet"}</h2>
                  <p>
                    {bestResult ? "Lowest recorded backend response time" : "Run a test to measure response time"}
                  </p>
                </div>
                <div className="best-value">
                  {bestResult ? Number(bestResult.latency).toFixed(2) : "--"}
                  <small>ms</small>
                </div>
              </section>
            </div>

            <section className="stats-grid">
              <div className="panel stat-card">
                <div className="stat-icon"><Activity size={20} /></div>
                <p>Saved Test Results</p>
                <h2>{results.length}</h2>
              </div>
              <div className="panel stat-card">
                <div className="stat-icon"><Clock3 size={20} /></div>
                <p>Average Response Time</p>
                <h2>{average === null ? "--" : average.toFixed(2)}<small> ms</small></h2>
              </div>
              <div className="panel stat-card">
                <div className="stat-icon"><Cloud size={20} /></div>
                <p>Selected Regions</p>
                <h2>{selected.length}</h2>
              </div>
              <div className="panel stat-card">
                <div className="stat-icon"><Layers3 size={20} /></div>
                <p>Database</p>
                <h2 className="connection-text">{backendOnline ? "Connected" : "Check server"}</h2>
              </div>
            </section>

            <section className="panel history-panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent Test Results</h3>
                  <p>Saved test results</p>
                </div>
                <button className="secondary-button" onClick={() => void loadHistory()} disabled={loading}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
              {resultsTable()}
            </section>
          </>
        ) : page === "History" ? (
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <HistoryIcon size={28} />
                <h1>Test History</h1>
                <p>Your saved results from PostgreSQL</p>
              </div>
              <button className="secondary-button" onClick={() => void loadHistory()} disabled={loading}>
                <RefreshCw size={15} /> {loading ? "Loading..." : "Refresh History"}
              </button>
            </div>
            {message && <div className="notice"><Info size={18} /><span>{message}</span></div>}
            {resultsTable()}
          </section>
        ) : (
          <section className="page-content panel">
            <Settings size={30} />
            <h1>About REGIONX</h1>
            <p>REGIONX is a cloud latency dashboard prototype for selecting regions, measuring local backend response times, and saving results.</p>
            <p>These tests measure your local API, not actual AWS-region network latency.</p>
          </section>
        )}

        <footer className="footer">
          <span>REGIONX · Cloud Latency Monitor</span>
          <span>React · Express · PostgreSQL</span>
        </footer>
      </main>
    </div>
  );
}

export default App;