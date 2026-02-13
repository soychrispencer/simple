import { handleInstagramCardGET } from "@simple/instagram/og";

export const runtime = "edge";

export async function GET(req: Request) {
  return handleInstagramCardGET(req, {
    brandName: "SimplePropiedades",
    domain: "simplepropiedades.app",
  });
}
