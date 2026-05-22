import { PlannerApp } from "@/src/app-shell/PlannerApp";

interface WeekPageProps {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
}

export default async function WeekPage({ searchParams }: WeekPageProps) {
  const params = await searchParams;
  return <PlannerApp view="week" initialDate={getSingleParam(params?.date)} />;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
