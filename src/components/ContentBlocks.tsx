import Link from "next/link";
import type { CustomBlock } from "@/cms/pages";
import ContentBlockView from "./ContentBlockView";
import DocumentLink from "./DocumentLink";

export default function ContentBlocks({ blocks }: { blocks: CustomBlock[] }) {
  return (
    <div className="source-content container-site">
      {blocks
        .filter((block) => block.visible !== false)
        .map((block, index) => (
          <ContentBlockView
            key={index}
            block={block}
            action={
              block.buttonLabel &&
              block.buttonHref &&
              (block.buttonHref.toLowerCase().includes(".pdf") ? (
                <DocumentLink href={block.buttonHref} action="↓">
                  {block.buttonLabel}
                </DocumentLink>
              ) : (
                <Link
                  className="btn-outline"
                  href={block.buttonHref}
                  target={
                    block.buttonHref.startsWith("http") ? "_blank" : undefined
                  }
                  rel={
                    block.buttonHref.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                >
                  {block.buttonLabel}
                </Link>
              ))
            }
          />
        ))}
    </div>
  );
}
