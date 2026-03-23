import { getSampleDomain } from "../data";
import { Design4 } from "./Design4";
import { notFound } from "next/navigation";

export default async function Design4Page() {
  const domain = await getSampleDomain();
  if (!domain) notFound();
  return <Design4 domain={domain} />;
}
