import Head from "next/head";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { GetServerSideProps } from "next";

import { AddHikeButton } from "@/components/hikes/AddHikeButton";
import { HikeDrawer } from "@/components/hikes/HikeDrawer";
import type { Hike } from "@/lib/hikeSchema";
import { listHikes } from "@/lib/hikeStore";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Props = {
  hikes: Hike[];
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    return { props: { hikes: await listHikes() } };
  } catch (error) {
    console.error("Failed to load hikes", error);
    return { props: { hikes: [] } };
  }
};

export default function Home({ hikes: initialHikes }: Props) {
  const [hikes, setHikes] = useState(initialHikes);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedHikeId, setFocusedHikeId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleCreated = useCallback((hike: Hike) => {
    setHikes((current) => [...current, hike]);
    setFocusedHikeId(hike.id);
    setDrawerOpen(false);
    setToast(`${hike.name} added to the map`);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <Head>
        <title>DirndlTrails</title>
        <meta name="description" content="Hiking trails in Bavaria" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="relative h-[100dvh] w-full overflow-hidden">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-[900] flex justify-center">
          <h1 className="pointer-events-auto mt-4 rounded-full border border-white/60 bg-white/90 px-5 py-2 text-lg font-semibold text-slate-800 shadow-md backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-100">
            DirndlTrails
          </h1>
        </header>

        <Map hikes={hikes} focusHikeId={focusedHikeId} />

        <AddHikeButton onClick={openDrawer} />

        <HikeDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          onCreated={handleCreated}
        />

        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            {toast}
          </div>
        ) : null}
      </main>
    </>
  );
}
