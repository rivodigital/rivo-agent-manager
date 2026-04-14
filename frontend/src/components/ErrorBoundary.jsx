import { Component } from "react";

const isDev = import.meta.env.DEV;

export default class ErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={styles.title}>Algo deu errado</h2>
          <p style={styles.subtitle}>
            Ocorreu um erro inesperado nesta tela. Os outros dados da aplicação estão intactos.
          </p>

          {isDev && error && (
            <pre style={styles.pre}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}

          <div style={styles.actions}>
            <button onClick={this.handleReset} style={styles.btnSecondary}>
              Tentar novamente
            </button>
            <button onClick={this.handleReload} style={styles.btnPrimary}>
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  overlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    width: "100%",
    padding: "2rem",
    boxSizing: "border-box",
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: "var(--card, #1e1e2e)",
    border: "1px solid var(--border, rgba(255,255,255,0.08))",
    borderRadius: "12px",
    padding: "2rem 2.5rem",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  iconWrap: {
    marginBottom: "1rem",
  },
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--foreground, #e2e8f0)",
  },
  subtitle: {
    margin: "0 0 1.5rem",
    fontSize: "0.875rem",
    color: "var(--muted-foreground, #94a3b8)",
    lineHeight: "1.5",
  },
  pre: {
    textAlign: "left",
    backgroundColor: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "6px",
    padding: "0.75rem 1rem",
    fontSize: "0.75rem",
    color: "#fca5a5",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    marginBottom: "1.5rem",
    maxHeight: "200px",
    overflowY: "auto",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btnPrimary: {
    padding: "0.5rem 1.25rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "var(--primary, #6366f1)",
    color: "#fff",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "0.5rem 1.25rem",
    borderRadius: "6px",
    border: "1px solid var(--border, rgba(255,255,255,0.12))",
    backgroundColor: "transparent",
    color: "var(--foreground, #e2e8f0)",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
};
