function initLightbox() {
  const articleContent = document.getElementsByClassName('article--content')[0];
  const galleries = [];

  articleContent.querySelectorAll('img').forEach((img) => {
    const filename = img.src.split('/').slice(-1)[0];
    if (filename.startsWith('_no-lightbox')) {
      return;
    }
    let parentNode = img.parentNode;
    if (parentNode.tagName === 'PICTURE') {
      parentNode = parentNode.parentNode;
    }
    if (parentNode.tagName === 'A') {
      const previewWidth = 698; // See render-image.html
      const previewWidth2x = previewWidth * 2;
      const setDimensions = () => {
        parentNode.dataset.pswpWidth ||= previewWidth2x;
        parentNode.dataset.pswpHeight ||= Math.trunc(
          img.naturalHeight * (previewWidth2x / img.naturalWidth),
        );
      };
      if (img.complete) {
        setDimensions();
      } else {
        img.addEventListener('load', setDimensions, { once: true });
      }
      galleries.push(parentNode);
    }
  });

  if (!galleries.length) {
    return;
  }

  let isLoading = false;
  const initializeLightbox = async (event) => {
    const gallery = event.target instanceof Element
      ? event.target.closest('a[data-pswp-width]')
      : null;
    if (
      !gallery
      || event.button !== 0
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (isLoading) {
      return;
    }
    isLoading = true;

    let modules;
    try {
      modules = await Promise.all([
        import('photoswipe'),
        import('photoswipe/lightbox'),
        import('photoswipe/style.css'),
      ]);
    } catch {
      window.location.assign(gallery.href);
      return;
    }

    const [
      { default: PhotoSwipe },
      { default: PhotoSwipeLightbox },
    ] = modules;

    const lightbox = new PhotoSwipeLightbox({
      gallery: galleries,
      pswpModule: PhotoSwipe,
    });
    lightbox.init();
    articleContent.removeEventListener('click', initializeLightbox);
    gallery.click();
  };

  articleContent.addEventListener('click', initializeLightbox);
}

initLightbox();
