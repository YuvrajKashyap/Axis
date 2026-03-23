import { getSampleDomain } from "../data";
import { Design3 } from "./Design3";
import { notFound } from "next/navigation";

export default async function Design3Page() {
  const domain = await getSampleDomain();
  if (!domain) notFound();
  return <Design3 domain={domain} />;
}
