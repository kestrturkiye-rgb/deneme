import type { CustomBlock } from "@/cms/pages";
import SiteImage from "./SiteImage";

export default function ContentBlockView({
  block,
  action,
}: {
  block: CustomBlock;
  action?: React.ReactNode;
}) {
  return (
    <article
      className={
        (block.image ? "source-block has-image" : "source-block") +
        " block-" +
        (block.layout || "image-right")
      }
    >
      <div>
        {block.title && <h2>{block.title}</h2>}
        {block.text && <p>{block.text}</p>}
        {action}
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
  );
}
