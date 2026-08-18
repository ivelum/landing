export default function talkToUs() {
  window.talk.scrollIntoView({ behavior: 'smooth' });
  document.querySelector('.form-control--textarea')?.focus(
    { preventScroll: true },
  );
}
