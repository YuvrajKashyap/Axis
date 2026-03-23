import { getSampleDomain } from "../data";
import { Design5 } from "./Design5";
import { notFound } from "next/navigation";

export default async function Design5Page() {
  const domain = await getSampleDomain();
  if (!domain) notFound();
  return <Design5 domain={domain} />;
}
