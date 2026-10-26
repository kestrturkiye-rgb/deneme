import { getSection } from "@/cms/server";
import { documentAvailable } from "@/lib/document-availability";

export default async function DocumentLink({
  href,
  children,
  action,
  className,
  actionClassName,
}: {
  href: string;
  children: React.ReactNode;
  action: string;
  className?: string;
  actionClassName?: string;
}) {
  if (!documentAvailable(href)) {
    const cms = await getSection("components-DocumentLink");
    return (
      <div className={"document-unavailable " + (className || "")}>
        {children}
        <span className={actionClassName}>{cms.unavailable}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <span className={actionClassName}>{action}</span>
    </a>
  );
}
