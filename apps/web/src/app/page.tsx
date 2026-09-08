import { FeatureGrid } from "@/components/landing/feature-grid";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { ProductSections } from "@/components/landing/product-sections";
import { backendFetch } from "@/lib/server/backend";
import type { UniSphereHealth } from "@unisphere/api-client";

export const dynamic = "force-dynamic";

async function getHealth(): Promise<UniSphereHealth | null> {
  try {
    const response = await backendFetch("health", {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok ? ((await response.json()) as UniSphereHealth) : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();

  return (
    <>
      <Navbar />
      <main>
        <Hero health={health} />
        <FeatureGrid />
        <ProductSections />
      </main>
      <Footer />
    </>
  );
}
