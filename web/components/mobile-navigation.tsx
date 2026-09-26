'use client';
import { useEffect, useState } from 'react';
import { Menu, ArrowUpRight, Download, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DemoVideoLink } from './demo-video';
import { siteNavigation } from './site-navigation';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1001px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="mobile-nav-trigger"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu size={22} />
      </DialogTrigger>
      <DialogContent className="mobile-nav-panel">
        <DialogTitle className="mobile-nav-title">
          Explore UnSui <span lang="ja">(雲水)</span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          Project navigation and app links.
        </DialogDescription>
        <nav aria-label="Mobile navigation">
          {siteNavigation.map((item) => (
            item.href === '/#film' ? (
              <DemoVideoLink key={item.href} onOpen={() => setOpen(false)}>
                {item.label}<ArrowRight size={17} />
              </DemoVideoLink>
            ) : <a
              key={item.href}
              href={item.href}
              aria-current={
                !item.href.includes('#') && pathname === item.href
                  ? 'page'
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
              <ArrowRight size={17} />
            </a>
          ))}
        </nav>
        <div className="mobile-nav-actions">
          <a
            className="button dark"
            href="/demo"
            onClick={() => setOpen(false)}
          >
            Try the demo <ArrowUpRight size={18} />
          </a>
          <a
            className="button get-app-button"
            href="/downloads/unsui-1.0-arm64.apk"
            download
            onClick={() => setOpen(false)}
          >
            Get the app <Download size={18} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
