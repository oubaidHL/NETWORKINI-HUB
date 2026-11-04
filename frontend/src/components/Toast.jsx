const Toast = ({ message }) =>
  message ? <div className="toast" role="status" aria-live="polite">{message}</div> : null;

export default Toast;
