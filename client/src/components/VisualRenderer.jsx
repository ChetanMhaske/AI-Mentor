import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Chart, registerables } from "chart.js";
import "./VisualRenderer.css";

// Register all Chart.js components
Chart.register(...registerables);

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  themeVariables: {
    darkMode: true,
    background: "#1a1a2e",
    primaryColor: "#f5c542",
    primaryTextColor: "#f0e6d3",
    lineColor: "#6b6b80",
  },
});

// --- Mermaid Diagram Component ---
const MermaidDiagram = ({ chart }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (chart && containerRef.current) {
      const id = "mermaid-" + Math.random().toString(36).substring(2, 9);
      mermaid
        .render(id, chart)
        .then((result) => {
          if (containerRef.current) containerRef.current.innerHTML = result.svg;
        })
        .catch((err) => {
          console.error("Mermaid render error:", err);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="visual-error">Failed to render diagram</div>`;
          }
        });
    }
  }, [chart]);

  return <div ref={containerRef} className="mermaid-container" />;
};

// --- Chart.js Graph Component ---
const GraphChart = ({ spec }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !spec?.data) return;

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const dataPoints = spec.data;
    const labels = dataPoints.map((d) => d.x ?? d.label ?? "");
    const values = dataPoints.map((d) => d.y ?? d.value ?? 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: spec.chart_type || "line",
      data: {
        labels,
        datasets: [
          {
            label: spec.title || "Data",
            data: values,
            borderColor: "#f5c542",
            backgroundColor: "rgba(245, 197, 66, 0.15)",
            borderWidth: 2,
            pointBackgroundColor: "#f5c542",
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: !!spec.title,
            labels: { color: "#e8dcc8", font: { family: "'Inter', sans-serif" } },
          },
          title: {
            display: !!spec.title,
            text: spec.title,
            color: "#f0e6d3",
            font: { size: 16, family: "'Inter', sans-serif", weight: "bold" },
          },
        },
        scales: {
          x: {
            title: {
              display: !!spec.x_label,
              text: spec.x_label || "",
              color: "#a09888",
              font: { family: "'Inter', sans-serif" },
            },
            ticks: { color: "#8a8070" },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            title: {
              display: !!spec.y_label,
              text: spec.y_label || "",
              color: "#a09888",
              font: { family: "'Inter', sans-serif" },
            },
            ticks: { color: "#8a8070" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [spec]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
    </div>
  );
};

// --- KaTeX Math Component ---
const MathRenderer = ({ latex }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (latex && containerRef.current) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode: true,
          throwOnError: false,
          output: "html",
        });
      } catch (err) {
        console.error("KaTeX render error:", err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="visual-error">Failed to render math: ${latex}</div>`;
        }
      }
    }
  }, [latex]);

  return <div ref={containerRef} className="math-container" />;
};

// --- Code Snippet Component ---
const CodeBlock = ({ spec }) => {
  const language = spec?.language || "python";
  const code = spec?.code || "";
  const output = spec?.output || spec?.expected_output || "";

  return (
    <div className="code-container">
      <div className="code-editor">
        <div className="code-header">
          <span className="code-lang-badge">{language}</span>
          Code
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
      {output && (
        <div className="code-output">
          <div className="output-header">Expected Output</div>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
};

// --- Main VisualRenderer ---
const VisualRenderer = ({ section }) => {
  if (!section || section.visual_type === "none") {
    return null;
  }

  const { visual_type, visual_spec } = section;

  if (!visual_spec) {
    return (
      <div className="visual-placeholder">
        Generating {visual_type} visual...
      </div>
    );
  }

  const renderContent = () => {
    switch (visual_type) {
      case "diagram":
        if (visual_spec.mermaid_code) {
          return <MermaidDiagram chart={visual_spec.mermaid_code} />;
        }
        return <div className="visual-error">No diagram data provided.</div>;

      case "graph":
        if (visual_spec.data) {
          return <GraphChart spec={visual_spec} />;
        }
        return <div className="visual-error">No graph data provided.</div>;

      case "math":
        if (visual_spec.latex) {
          return <MathRenderer latex={visual_spec.latex} />;
        }
        return <div className="visual-error">No LaTeX expression provided.</div>;

      case "code":
        if (visual_spec.code) {
          return <CodeBlock spec={visual_spec} />;
        }
        return <div className="visual-error">No code provided.</div>;

      default:
        return <div className="visual-error">Unknown visual type: {visual_type}</div>;
    }
  };

  return <div className="visual-renderer-wrapper">{renderContent()}</div>;
};

export default VisualRenderer;
