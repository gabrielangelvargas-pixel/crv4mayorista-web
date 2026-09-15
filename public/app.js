const body = document.body
const menu = document.querySelector('#site-menu')
const openButton = document.querySelector('[data-menu-open]')
const closeButtons = document.querySelectorAll('[data-menu-close]')

function setMenuOpen(open) {
  body.classList.toggle('menu-open', open)
  menu?.setAttribute('aria-hidden', String(!open))
  openButton?.setAttribute('aria-expanded', String(open))
}

openButton?.addEventListener('click', () => setMenuOpen(true))
closeButtons.forEach((button) => button.addEventListener('click', () => setMenuOpen(false)))

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuOpen(false)
  }
})
