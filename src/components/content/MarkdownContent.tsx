import ReactMarkdown from "react-markdown";

/**
 * Renders editor-written markdown. react-markdown does not render raw HTML (no `rehype-raw`),
 * so content cannot inject scripts; links are restricted to http(s), mailto and relative paths.
 */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown
        components={{
          a: ({ href, children: label }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {label}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
