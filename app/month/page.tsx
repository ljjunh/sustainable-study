import { PlannerApp } from "@/src/app-shell/PlannerApp";

interface MonthPageProps {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
}

export default async function MonthPage({ searchParams }: MonthPageProps) {
  const params = await searchParams;
  return <PlannerApp view="month" initialDate={getSingleParam(params?.date)} />;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
