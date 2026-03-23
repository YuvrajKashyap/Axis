import { getSampleDomain } from "../data";
import { Design1 } from "./Design1";
import { notFound } from "next/navigation";

export default async function Design1Page() {
  const domain = await getSampleDomain();
  if (!domain) notFound();
  return <Design1 domain={domain} />;
}
