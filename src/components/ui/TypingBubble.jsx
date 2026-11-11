/** Three blinking dots in a stranger bubble. Pass `label` to announce it. */
const TypingBubble = ({ label, className = "" }) => (
  <span className={`st-typing ${className}`} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
    <span />
    <span />
    <span />
  </span>
);

export default TypingBubble;
