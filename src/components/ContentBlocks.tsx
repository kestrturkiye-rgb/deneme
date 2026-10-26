import Link from "next/link";
import type { CustomBlock } from "@/cms/pages";
import SiteImage from "./SiteImage";
import DocumentLink from "./DocumentLink";

export default function ContentBlocks({ blocks }: { blocks: CustomBlock[] }) {
  return (
    <div className="source-content container-site">
      {blocks.map((block, index) => (
        <article
          className={block.image ? "source-block has-image" : "source-block"}
          key={index}
        >
          <div>
            {block.title && <h2>{block.title}</h2>}
            {block.text && <p>{block.text}</p>}
            {block.buttonLabel &&
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
              ))}
          </div>
          {block.image && (
            <SiteImage
              src={block.image}
              alt={block.alt}
              width={1200}
              height={900}
              sizes="(max-width: 750px) 100vw, 65vw"
              className="source-block-image"
            />
          )}
        </article>
      ))}
    </div>
  );
}
