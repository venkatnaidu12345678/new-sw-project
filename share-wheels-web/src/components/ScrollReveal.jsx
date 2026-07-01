import useInView from "../hooks/useInView";

const VARIANTS = {
  up: "reveal",
  down: "reveal-down",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
};

export default function ScrollReveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
  as: Tag = "div",
  threshold = 0.12,
}) {
  const [ref, visible] = useInView({ threshold });
  const animClass = VARIANTS[variant] || VARIANTS.up;

  return (
    <Tag
      ref={ref}
      className={`${animClass} ${visible ? "reveal-visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function ScrollRevealGroup({ children, className = "", stagger = 100 }) {
  const [ref, visible] = useInView({ threshold: 0.08 });

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) =>
            child && typeof child === "object"
              ? {
                  ...child,
                  props: {
                    ...child.props,
                    className: `${child.props?.className || ""} reveal ${visible ? "reveal-visible" : ""}`.trim(),
                    style: { ...child.props?.style, transitionDelay: `${i * stagger}ms` },
                  },
                }
              : child
          )
        : children}
    </div>
  );
}
