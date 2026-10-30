import { getProducts, productHref } from "@/data/catalog";
import { getDivisions } from "@/data/divisions";
import { getDetails } from "@/data/details";
import { getProductMedia } from "@/lib/product-media";
import { productView } from "@/lib/product-view";
import ProductDiscoveryClient from "./ProductDiscoveryClient";
export default async function ProductDiscovery() {
  const products = await getProducts(),
    divisions = await getDivisions(),
    details = await getDetails();
  const items = products.map((product) => {
    const detail = details[product.slug],
      media = getProductMedia(product.slug, product.name);
    const { image, frames } = productView(detail, media);
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
