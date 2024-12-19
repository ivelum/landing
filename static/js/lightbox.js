window.addEventListener("load", function () {
  document.querySelectorAll('img').forEach(function (img) {
    if (img.parentNode.tagName === "A") {
      img.parentNode.setAttribute("data-pswp-width", img.naturalWidth);
      img.parentNode.setAttribute("data-pswp-height", img.naturalHeight);
    }
  });

  const options = {
    gallery: '.narrow-container a',
    pswpModule: PhotoSwipe
  };
  const lightbox = new PhotoSwipeLightbox(options);
  lightbox.init();
});
