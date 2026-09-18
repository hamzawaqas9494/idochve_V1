import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QueueCounts, QueueTab } from "@/lib/ingestion/types";

export function ProcessingTabs({
  tab,
  counts,
  onChange,
}: {
  tab: QueueTab;
  counts: QueueCounts;
  onChange: (tab: QueueTab) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={(value) => onChange(value as QueueTab)}>
      <TabsList aria-label="Job filters">
        <TabsTrigger value="all">All {counts.all}</TabsTrigger>
        <TabsTrigger value="active">Active {counts.active}</TabsTrigger>
        <TabsTrigger value="review">Needs review {counts.review}</TabsTrigger>
        <TabsTrigger value="ready">Ready {counts.ready}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
