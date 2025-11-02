import { cn } from "~/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ButtonHoverGradient(props: ButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-md p-0.5 font-bold shadow-lg active:inset-y-px h-10",
        props.className,
      )}
    >
      {/* Background Gradient */}
      <span
        className={cn(
          "absolute h-full w-full bg-gradient-to-br",
          // Mobile-first (hover state)
          "from-[#ff00c6] via-[#ff5478] to-[#ff8a05]",
          // Desktop (default state)
          "sm:from-[#ff8a05] sm:via-[#ff5478] sm:to-[#ff00c6]",
          // Desktop (hover state)
          "sm:group-hover:from-[#ff00c6] sm:group-hover:via-[#ff5478] sm:group-hover:to-[#ff8a05]",
        )}
      />
      {/* Inner Content Area (controls opacity) */}
      <span
        className={cn(
          "duration-400 relative rounded-md bg-white px-6 py-2 w-full transition-all ease-out flex items-center justify-center",
          // Mobile-first (hover state)
          "bg-opacity-0",
          // Desktop (default state)
          "sm:bg-opacity-100",
          // Desktop (hover state)
          "sm:group-hover:bg-opacity-0",
        )}
      >
        {/* Text */}
        <span
          className={cn(
            "relative",
            // Mobile-first (hover state)
            "text-white",
            // Desktop (default state)
            "sm:bg-gradient-to-br sm:from-[#ff8a05] sm:via-[#ff5478] sm:to-[#ff00c6] sm:bg-clip-text sm:text-transparent",
            // Desktop (hover state)
            "sm:group-hover:bg-none sm:group-hover:bg-clip-padding sm:group-hover:text-white",
          )}
        >
          {props.children}
        </span>
      </span>
    </button>
  );
}
