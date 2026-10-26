import type { NewsItem } from "@/data/news";
import SiteImage from "./SiteImage";
export default function NewsVisual({
  item,
  label,
}: {
  item: NewsItem;
  label: string;
}) {
  return (
    <div className={"news-visual" + (item.image ? " has-image" : "")}>
      {item.image ? (
        <SiteImage
          src={item.image}
          alt={item.imageAlt || item.title}
          fill
          sizes="(max-width: 750px) 100vw, 50vw"
        />
      ) : (
        <div aria-hidden="true">
          <span>{item.date.slice(0, 4)}</span>
          <strong>
            {item.date.slice(8, 10)}
            <small> / {item.date.slice(5, 7)}</small>
          </strong>
          <i />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
