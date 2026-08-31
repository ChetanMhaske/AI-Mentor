"""
Visual Service — Renders graphs, math equations, and executes code.
"""

import os
import uuid
import subprocess
import logging
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static", "visuals")
os.makedirs(STATIC_DIR, exist_ok=True)


def generate_visual(visual_type: str, visual_spec: dict) -> dict | None:
    """
    Renders visual based on type and returns visual_data.
    """
    if not visual_spec:
        return None

    try:
        if visual_type == "graph":
            return _render_graph(visual_spec)
        elif visual_type == "math":
            return _render_math(visual_spec)
        elif visual_type == "code":
            return _execute_code(visual_spec)
        elif visual_type == "diagram":
            # Pass mermaid text directly to frontend
            return {"mermaid_code": visual_spec.get("mermaid_code", "")}
    except Exception as exc:
        logger.exception(f"Failed to generate visual of type {visual_type}")
        return {"error": str(exc)}
    return None


def _render_graph(spec: dict) -> dict:
    title = spec.get("title", "Graph")
    x_label = spec.get("x_label", "X")
    y_label = spec.get("y_label", "Y")
    data = spec.get("data", [])
    
    x_vals = [d.get("x", 0) for d in data]
    y_vals = [d.get("y", 0) for d in data]

    plt.figure(figsize=(6, 4))
    plt.plot(x_vals, y_vals, marker='o', linestyle='-', color='b')
    plt.title(title)
    plt.xlabel(x_label)
    plt.ylabel(y_label)
    plt.grid(True)
    plt.tight_layout()
    
    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(STATIC_DIR, filename)
    plt.savefig(filepath)
    plt.close()
    
    return {"url": f"http://localhost:8000/static/visuals/{filename}"}


def _render_math(spec: dict) -> dict:
    latex = spec.get("latex", "")
    if not latex:
        return {"error": "No latex string provided"}

    # Use matplotlib to render text as an image
    fig = plt.figure(figsize=(6, 2))
    fig.text(0.5, 0.5, f"${latex}$", size=20, ha='center', va='center')
    plt.axis('off')
    
    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(STATIC_DIR, filename)
    plt.savefig(filepath, bbox_inches='tight', pad_inches=0.1)
    plt.close()
    
    return {"url": f"http://localhost:8000/static/visuals/{filename}"}


def _execute_code(spec: dict) -> dict:
    code = spec.get("code", "")
    language = spec.get("language", "python").lower()
    
    if language != "python":
        return {"code": code, "output": f"Execution for {language} is not supported in MVP."}

    # Execute safely with a timeout
    try:
        result = subprocess.run(
            ["python", "-c", code],
            capture_output=True,
            text=True,
            timeout=2.0
        )
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr
        return {"code": code, "output": output.strip() or "(No output)"}
    except subprocess.TimeoutExpired:
        return {"code": code, "output": "Execution timed out."}
    except Exception as e:
        return {"code": code, "output": f"Execution error: {str(e)}"}
