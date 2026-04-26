import Link from 'next/link';

const NAV = [
  { label: 'ISSUES',      href: '/issues' },
  { label: 'SUGGESTIONS', href: '/suggestions' },
  { label: 'DASHBOARD',   href: '/dashboard' },
  { label: 'LOG IN',      href: '/login' },
];

export default function TopNav() {
  return (
    <nav className="absolute top-8 right-12 z-40 flex gap-12 text-white text-base font-medium tracking-wide">
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className="hover:text-[#FFE374]"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
