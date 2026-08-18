export const FORMER_SITE_NAMES = [
  'Microsoft Product Lifecycle Tracker',
  'Rename Pending',
  'Previously Known As',
  'Name as a Service',
  'Rebrand Pending',
  'Previously Branded As',
  'Brandwidth',
  'Names, Marks & Question Marks',
  'The Product Formerly Known As',
  'What Is It Called Now?',
  'Same Product, New Name',
  'Microsoft Brand Changelog',
  'Microsoft Naming Service',
  'The Great Microsoft Rename',
  'Identity Crisis as a Service',
  'Cloudy with a Chance of Rebrands',
  'Microsoft Name Resolver',
  'Product Name History',
  'Alias Active',
  'Brand Drift',
  'Rebrand Rewind',
  'Name Change Notification Center',
  'Microsoft 365 Name Roulette',
  'Rename, Rebrand, Repeat'
];

export function rotateFormerSiteNames() {
  const label = document.querySelector('#former-site-name');
  if (!label || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let index = 0;
  window.setInterval(() => {
    label.classList.add('is-changing');
    window.setTimeout(() => {
      index = (index + 1) % FORMER_SITE_NAMES.length;
      label.textContent = FORMER_SITE_NAMES[index];
      label.classList.remove('is-changing');
    }, 200);
  }, 2000);
}
