import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

window.addEventListener("load", function () {
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
