import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import "./VisualRenderer.css";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

const Mermaid = ({ chart }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (chart && containerRef.current) {
      mermaid.render("mermaid-svg-" + Math.random().toString(36).substring(7), chart).then((result) => {
        containerRef.current.innerHTML = result.svg;
      }).catch(err => {
        console.error("Mermaid error:", err);
        if (containerRef.current) {
          containerRef.current.innerHTML = "<div class='error'>Failed to render diagram</div>";
        }
      });
    }
  }, [chart]);

  return <div ref={containerRef} className="mermaid-container" />;
};

const VisualRenderer = ({ section }) => {
  if (!section || section.visual_type === "none") {
    return null;
  }

  const { visual_type, visual_data } = section;

  if (!visual_data) {
    return (
      <div className="visual-placeholder">
        Generating {visual_type} visual...
      </div>
    );
  }

  const renderContent = () => {
    switch (visual_type) {
      case "diagram":
        return <Mermaid chart={visual_data.mermaid_code} />;
      
      case "graph":
      case "math":
        if (visual_data.url) {
          return <img src={visual_data.url} alt={`${visual_type} visual`} className="visual-image" />;
        }
        return <div className="error">Failed to load {visual_type} image.</div>;

      case "code":
        return (
          <div className="code-container">
            <div className="code-editor">
              <div className="code-header">Python Snippet</div>
              <pre><code>{visual_data.code}</code></pre>
            </div>
            <div className="code-output">
              <div className="output-header">Execution Output</div>
              <pre>{visual_data.output}</pre>
            </div>
          </div>
        );

      default:
        return <div>Unknown visual type: {visual_type}</div>;
    }
  };

  return (
    <div className="visual-renderer-wrapper">
      {renderContent()}
    </div>
  );
};

export default VisualRenderer;
