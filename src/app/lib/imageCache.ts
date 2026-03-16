const preloaded = new Set<string>();

export const preloadImage = (url?: string | null) => {
  if (!url || preloaded.has(url)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  preloaded.add(url);
};

export const preloadImages = (urls: Array<string | null | undefined>) => {
  urls.forEach((url) => preloadImage(url));
};
