import Image, { type ImageProps } from "next/image";

/** Local images and CMS uploads are resized on demand; external CMS URLs stay usable. */
export default function SiteImage({
  src,
  ...props
}: Omit<ImageProps, "src"> & { src: string }) {
  const local = src.startsWith("/") && !src.startsWith("//");
  const managedRemote =
    Boolean(process.env.NEXT_PUBLIC_MEDIA_HOST) &&
    src.startsWith(
      "https://" +
        process.env.NEXT_PUBLIC_MEDIA_HOST +
        "/storage/v1/object/public/",
    );
  return (
    <Image
      {...props}
      src={src}
      unoptimized={(!local && !managedRemote) || /\.svg(?:\?|$)/i.test(src)}
    />
  );
}
