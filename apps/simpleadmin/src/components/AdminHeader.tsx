import ThemeToggleButton from './ThemeToggleButton';

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 bg-lightbg/80 dark:bg-darkbg/80 backdrop-blur border-b border-lightborder/60 dark:border-darkborder/50">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <div className="font-semibold text-lighttext dark:text-darktext">Simple Admin</div>
        <ThemeToggleButton />
      </div>
    </header>
  );
}
