import { getSampleDomain } from "../data";
import { Design2 } from "./Design2";
import { notFound } from "next/navigation";

export default async function Design2Page() {
  const domain = await getSampleDomain();
  if (!domain) notFound();
  return <Design2 domain={domain} />;
}
