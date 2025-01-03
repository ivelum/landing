import PhotoSwipeLightbox from '/vendor/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from '/vendor/photoswipe.esm.min.js';

window.addEventListener("load", function () {
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  link.href = '/vendor/photoswipe.css';
  document
    .getElementsByClassName("article--content")[0]
    .querySelectorAll('img')
    .forEach(function (img) {
      let parentNode = img.parentNode;
      if (parentNode.tagName === "PICTURE") {
        parentNode = parentNode.parentNode;
      }
      if (parentNode.tagName === "A") {
        const lightbox = new PhotoSwipeLightbox({
          gallery: parentNode,
          pswpModule: PhotoSwipe
        });
        lightbox.init();
      }
    });
});
