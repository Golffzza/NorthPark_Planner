type LoadingSkeletonProps = {
  rows?: number;
  variant?: "card" | "detail";
};

export function LoadingSkeleton({ rows = 3, variant = "card" }: LoadingSkeletonProps) {
  if (variant === "detail") {
    return (
      <div className="space-y-4">
        <div className="glass-panel shimmer h-80 rounded-[34px]" />
        <div className="grid gap-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="soft-card shimmer h-32 rounded-[30px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="soft-card overflow-hidden rounded-[30px]">
          <div className="park-media-placeholder shimmer h-48" />
          <div className="space-y-3 p-5">
            <div className="shimmer h-5 rounded-full bg-white/75" />
            <div className="shimmer h-4 rounded-full bg-white/70" />
            <div className="shimmer h-4 rounded-full bg-white/65" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="shimmer h-14 rounded-[18px] bg-white/70" />
              <div className="shimmer h-14 rounded-[18px] bg-white/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
