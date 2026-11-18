// Normalisers for content feeds (shop, news, map). Field names checked against the
// live fortnite-api.com responses on 18 Nov 2026. UI code reads these flat shapes only.

// Shop entry -> { id, name, kind, rarity, price, regularPrice, onSale, image, section, inDate, outDate, items }
export function normalizeShop(data) {
  const entries = data?.entries ?? [];
  return entries.map((e) => {
    const br = e.brItems ?? [];
    const first = br[0] ?? e.tracks?.[0] ?? e.cars?.[0] ?? e.instruments?.[0] ?? e.legoKits?.[0] ?? {};
    const kind =
      e.bundle ? 'Bundle' :
      br.length ? (br[0]?.type?.displayValue ?? 'Item') :
      e.tracks?.length ? 'Jam Track' :
      e.cars?.length ? 'Car' :
      e.instruments?.length ? 'Instrument' :
      e.legoKits?.length ? 'LEGO Kit' : 'Item';
    const image =
      e.newDisplayAsset?.renderImages?.[0]?.image ??
      e.bundle?.image ??
      br[0]?.images?.featured ?? br[0]?.images?.icon ??
      e.tracks?.[0]?.albumArt ??
      e.cars?.[0]?.images?.large ?? e.instruments?.[0]?.images?.large ?? e.legoKits?.[0]?.images?.large ?? null;
    return {
      id: e.offerId ?? e.devName ?? first.id ?? first.name,
      name: e.bundle?.name ?? first.name ?? first.title ?? 'Unknown',
      kind,
      rarity: br[0]?.rarity?.displayValue ?? null,
      price: e.finalPrice ?? null,
      regularPrice: e.regularPrice ?? null,
      onSale: e.finalPrice != null && e.regularPrice != null && e.finalPrice < e.regularPrice,
      image,
      section: e.layout?.name ?? null,
      inDate: e.inDate ?? null,
      outDate: e.outDate ?? null,
      items: br.length + (e.tracks?.length ?? 0) + (e.cars?.length ?? 0) + (e.instruments?.length ?? 0) + (e.legoKits?.length ?? 0),
    };
  });
}

// News (one mode) -> [{ id, title, body, image, tileImage }]
export function normalizeNews(data) {
  const list = data?.motds ?? data?.messages ?? [];
  return list
    .filter((m) => !m.hidden)
    .sort((a, b) => (b.sortingPriority ?? 0) - (a.sortingPriority ?? 0))
    .map((m) => ({ id: m.id ?? m.title, title: m.title ?? m.tabTitle ?? '', body: m.body ?? '', image: m.image ?? null, tileImage: m.tileImage ?? null }));
}

// Map -> { image, imageBlank, pois: [{ id, name, x, y, named }] }
// Note: x/y are Fortnite world units, not image pixels. The image already has POI names drawn.
export function normalizeMap(data) {
  return {
    image: data?.images?.pois ?? null,
    imageBlank: data?.images?.blank ?? null,
    pois: (data?.pois ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      x: p.location?.x ?? 0,
      y: p.location?.y ?? 0,
      named: /\.POI\./i.test(p.id ?? ''), // named POI vs landmark
    })),
  };
}
