import { statusColor } from "../../lib/utils.js";

export default function Badge({ children, status }) {
  return <span className={`badge ${statusColor(status || children)}`}>{children}</span>;
}
