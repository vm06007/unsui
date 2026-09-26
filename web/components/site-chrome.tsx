import { MobileNavigation } from './mobile-navigation';
import { siteNavigation } from './site-navigation';
import { ThemeToggle } from './theme-toggle';
import { ArrowUpRight, Download } from 'lucide-react';

export function SiteWordmark() {
  return (
    <a className="wordmark" href="/" aria-label="UnSui home">
      <img
        className="unsui-mark"
        src="/unsui-mark.svg?v=monk-5"
        width="34"
        height="34"
        alt=""
      />
      un<span>sui</span>
      <small className="wordmark-kanji" lang="ja">
        (雲水)
      </small>
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="site-nav">
      <SiteWordmark />
      <nav aria-label="Main navigation">
        {siteNavigation.slice(1).map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <MobileNavigation />
        <a className="button small get-app-button" href="/#download">
          Get the app <Download size={17} />
        </a>
        <a className="button small dark" href="/demo">
          Try the demo <ArrowUpRight size={17} />
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <SiteWordmark />
      <p>
        <a href="/ideology">Clouds &amp; water · Our ideology</a>
      </p>
      <span>ETHGlobal Tokyo 2026 · Independent prototype</span>
    </footer>
  );
}
