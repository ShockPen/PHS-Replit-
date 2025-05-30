import { cn } from "@/app/lib/utils";
import {
  IconCalendarCheck,
  IconCloud,
  IconCurrencyDollar,
  IconApple,
  IconHeart,
  IconHelp,
  IconSchool,
  IconTerminal2,
  IconClock,
} from "@tabler/icons-react";

export function FeaturesSectionDemo() {
  const features = [
    {
      title: "Ease of use",
      description:
        "Our schedules are incredibly easy to setup and configure in the admin dashboard. No headaches needed!",
      icon: <IconClock />,
    },
    {
      title: "Built by students, for students",
      description:
        "Students know best what tools are helpful. We've built SchoolNest with that in mind.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "100% Uptime guarantee",
      description: "SchoolNest is deployed on robust infrastructure that ensures 100% uptime.",
      icon: <IconCloud />,
    },
    {
      title: "Flawless event management",
      description:
        "Need to advertise a bake sale? Have an important club meeting? We've got you covered.",
      icon: <IconCalendarCheck />,
    },
    {
      title: "Integration for clubs",
      description: "Foster a stronger community through SchoolNest's club management features.",
      icon: <IconApple />,
    },
    {
      title: "Integration for teachers",
      description:
        "We have plans to create features that aid teachers in their day-to-day classroom tasks. More info on this coming soon...",
      icon: <IconSchool />,
    },
    {
      title: "Built for developers",
      description:
        "We have plans to make it easier to teach computer science classes! More info on this coming soon...",
      icon: <IconTerminal2 />,
    },
    {
      title: "And everything else",
      description: "We're white-listed on MCPS networks! We've gone through the (long and tedious) review process.",
      icon: <IconHeart />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-[#4e84ba] dark:group-hover/feature:bg-[#062056] transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
