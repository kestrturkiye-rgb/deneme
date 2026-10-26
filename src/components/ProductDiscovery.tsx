import { getProducts, productHref } from "@/data/catalog";
import { getDivisions } from "@/data/divisions";
import { getDetails } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { frameUrls } from "@/lib/spin";
import ProductDiscoveryClient from "./ProductDiscoveryClient";
export default async function ProductDiscovery() {
  const products = await getProducts(),
    divisions = await getDivisions(),
    details = await getDetails();
  const items = products.map((product) => {
    const detail = details[product.slug],
      media = getProductMedia(product.slug, product.name);
    const variant = detail?.variants?.[0];
    const spin =
      detail?.spin ||
      variant?.spin ||
      detail?.colors?.[0]?.spin ||
      variant?.colors?.[0]?.spin ||
      media.spin;
    let frames: string[] = [];
    try {
      if (spin) frames = frameUrls(spin);
    } catch {}
    const image =
      (detail?.images || variant?.images || media.images)[0]?.src || frames[0];
    return {
      ...product,
      href: productHref(product),
      image,
      hasSpin: frames.length >= 2,
    };
  });
  return (
    <ProductDiscoveryClient
      items={items}
      divisions={divisions.map((d) => ({ slug: d.slug, title: d.title }))}
    />
  );
}
