import "./Toast.css";

export default function Toast({ message, type = "success", show }) {
  return <div className={`toast ${type} ${show ? "show" : ""}`}>{message}</div>;
}
