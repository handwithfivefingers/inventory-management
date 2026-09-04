import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";

interface Props {
  items: Item[];
}
interface Item {
  title: React.ReactNode;
  description: React.ReactNode;
  date: number;
  variant?: "success" | "danger" | "warning" | "info";
}
export const TMTimeline = (props: Props) => {
  const items = props.items.sort((a, b) => (dayjs(b.date).unix() - dayjs(a.date).unix() > 0 ? 1 : -1));
  return (
    <div
      className="group/timeline flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col w-full max-w-md"
      data-orientation="vertical"
      data-slot="timeline"
    >
      {items.map((item, i) => (
        <TimelineItem {...item} key={item.date + i} />
      ))}
    </div>
  );
};

const TimelineItem = (props: Item) => {
  return (
    <div
      className={cn(
        `flex flex-1 flex-col gap-0.5 relative ms-32`,
        `group/timeline-item relative flex flex-1 flex-col gap-0.5 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:not-last:pb-6 sm:group-data-[orientation=vertical]/timeline:ms-32`,
      )}
      data-completed="true"
      data-slot="timeline-item"
    >
      <div className="" data-slot="timeline-header">
        <time
          className="mb-1 block font-medium text-muted-foreground text-xs group-data-[orientation=vertical]/timeline:max-sm:h-4 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-32 sm:group-data-[orientation=vertical]/timeline:w-20 sm:group-data-[orientation=vertical]/timeline:text-right"
          data-slot="timeline-date"
        >
          {dayjs(props.date).format("DD/MM/YYYY HH:mm")}
        </time>
        <h3 className="font-medium text-sm" data-slot="timeline-title">
          {props.title}
        </h3>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "border-2 border-primary/20",
          "group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2 absolute size-4 rounded-full  group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=horizontal]/timeline:left-0",
          {
            ["border-green-600"]: props.variant === "success",
            ["border-red-500"]: props.variant === "danger",
            ["border-amber-400"]: props.variant === "warning",
            ["border-blue-500"]: props.variant === "info",
          },
        )}
        data-slot="timeline-indicator"
      />

      <div
        aria-hidden="true"
        className={cn(
          "group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2 absolute self-start bg-primary/10 group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem-0.25rem)] group-data-[orientation=horizontal]/timeline:w-[calc(100%-1rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=horizontal]/timeline:translate-x-4.5 group-data-[orientation=vertical]/timeline:translate-y-4.5",
          {
            ["bg-green-600"]: props.variant === "success",
            ["bg-red-500"]: props.variant === "danger",
            ["bg-amber-400"]: props.variant === "warning",
            ["bg-blue-500"]: props.variant === "info",
          },
        )}
        data-slot="timeline-separator"
        // style={{ backgroundColor: props.color }}
      />
      <div className="text-muted-foreground text-sm" data-slot="timeline-content">
        {props.description}
      </div>
    </div>
  );
};
