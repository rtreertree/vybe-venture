import styles from "@/components/dashboard-components.module.css";

const dashboardStyles = styles as Record<string, string>;

function dashboardClass(...names: string[]) {
  return names.map((name) => dashboardStyles[name] || name).join(" ");
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`} />;
}

function SkeletonHeading() {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <SkeletonBlock className="h-5 w-36" />
      <SkeletonBlock className="h-3 w-64 max-w-full" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className={dashboardClass("dashboard")}>
      <main className={dashboardClass("main")} aria-label="Loading market dashboard">
        <div role="status" aria-label="Loading market dashboard" aria-busy="true" className={dashboardClass("filters")}>
          <SkeletonBlock className="h-4 w-80 max-w-full" />
          <SkeletonBlock className="h-3 w-96 max-w-full" />
        </div>

        <section className={dashboardClass("plain")}>
          <SkeletonHeading />
          <SkeletonBlock className="h-16 w-full" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-24 w-full" />)}
          </div>
        </section>

        <section className={dashboardClass("card")}>
          <SkeletonHeading />
          <SkeletonBlock className="h-44 w-full" />
        </section>

        <section className={dashboardClass("card")}>
          <SkeletonHeading />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => <SkeletonBlock key={index} className="h-16 w-full" />)}
          </div>
        </section>

        <div className={dashboardClass("card")}><SkeletonHeading />{Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} className="h-9 w-full" />)}</div>
        <div className={dashboardClass("card")}><SkeletonHeading />{Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-14 w-full" />)}</div>
        <div className={dashboardClass("card")}><SkeletonHeading /><SkeletonBlock className="h-56 w-full" /></div>
        <div className={dashboardClass("card")}><SkeletonHeading /><SkeletonBlock className="h-40 w-full" /></div>
      </main>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <main role="status" aria-label="Loading page" aria-busy="true" className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex h-10 items-center justify-between border-b border-primary/10 pb-4">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-8 w-24" />
      </div>
      <div className="grid gap-8 py-10 md:grid-cols-[1fr_0.8fr] md:items-center">
        <div className="flex flex-col items-start gap-4">
          <SkeletonBlock className="h-3 w-36" />
          <SkeletonBlock className="h-10 w-full max-w-xl" />
          <SkeletonBlock className="h-10 w-4/5 max-w-lg" />
          <SkeletonBlock className="mt-2 h-4 w-full max-w-md" />
          <SkeletonBlock className="h-4 w-3/4 max-w-sm" />
          <SkeletonBlock className="mt-3 h-11 w-40" />
        </div>
        <SkeletonBlock className="h-64 w-full" />
      </div>
      <div className="grid gap-4 border-t border-primary/10 pt-6 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-32 w-full" />)}
      </div>
    </main>
  );
}