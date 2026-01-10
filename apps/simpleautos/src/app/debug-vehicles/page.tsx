import { notFound } from "next/navigation";

import DebugVehiclesClient from "./DebugVehiclesClient";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DebugVehiclesClient />;
}







