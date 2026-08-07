/**
 * Header navigation: anchor scrolling, the mobile menu, and hiding the
 * floating WhatsApp button while the explorer sheet owns the bottom of the
 * screen.
 */

import { prefersReducedMotion } from './state.js';

function scrollToSection(target) {
  if (!target) return;
  // scroll-margin-top on the section handles the fixed-header offset, so this
  // no longer needs the hardcoded 100px that the old easing loop carried.
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

function initAnchors() {
  const links = [
    ['nosotrosBtn', 'about'],
    ['portfolioBtn', 'explorer'],
    ['nav-nosotros', 'about'],
    ['nav-portfolio', 'explorer'],
  ];

  for (const [linkId, targetId] of links) {
    document.getElementById(linkId)?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSection(document.getElementById(targetId));
      closeMobileMenu();
    });
  }
}

let menu, menuBtn;

function closeMobileMenu() {
  if (!menu) return;
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
}

function initMobileMenu() {
  menu = document.getElementById('mobile-menu');
  menuBtn = document.getElementById('menu-toggle');
  if (!menu || !menuBtn) return;

  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

/** The sheet carries its own Contacto CTA, and the FAB would sit on top of it. */
function initFab() {
  const fab = document.getElementById('whatsapp-fab');
  const explorer = document.getElementById('explorer');
  if (!fab || !explorer) return;

  // .fab-hidden only has an effect below the md breakpoint (see the <style> block).
  const observer = new IntersectionObserver(
    ([entry]) => fab.classList.toggle('fab-hidden', entry.isIntersecting),
    { threshold: 0.25 }
  );
  observer.observe(explorer);
}

export function initNav() {
  initAnchors();
  initMobileMenu();
  initFab();
}
