import Head from "next/head";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GetServerSideProps } from "next";

import { AddHikeButton } from "@/components/hikes/AddHikeButton";
import { HikeDrawer } from "@/components/hikes/HikeDrawer";
import { HikeListDrawer } from "@/components/hikes/HikeListDrawer";
import { ListHikesButton } from "@/components/hikes/ListHikesButton";
import { MapStyleControl } from "@/components/hikes/MapStyleControl";
import type { Hike } from "@/lib/hikeSchema";
import { listHikes } from "@/lib/hikeStore";
import { useMapStyle } from "@/lib/useMapStyle";

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
  const [listOpen, setListOpen] = useState(false);
  const [focusedHikeId, setFocusedHikeId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const { style, baseStyle, setStyle } = useMapStyle();
  const hikesRef = useRef(hikes);

  useEffect(() => {
    hikesRef.current = hikes;
  }, [hikes]);

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
  const openList = useCallback(() => setListOpen(true), []);
  const closeList = useCallback(() => setListOpen(false), []);

  const handleSelectHike = useCallback((hike: Hike) => {
    setFocusedHikeId(hike.id);
    setToast(`Showing ${hike.name}`);
  }, []);

  const handleRemoveHike = useCallback(
    async (hike: Hike) => {
      const previousHikes = hikesRef.current;
      setRemovingIds((current) => new Set(current).add(hike.id));
      setHikes((current) => current.filter((item) => item.id !== hike.id));
      if (focusedHikeId === hike.id) {
        setFocusedHikeId(null);
      }

      try {
        const response = await fetch(`/api/hikes/${encodeURIComponent(hike.id)}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove hike");
        }

        setToast(`${hike.name} removed`);
      } catch (error) {
        setHikes(previousHikes);
        console.error(error);
        setToast("Could not remove hike");
      } finally {
        setRemovingIds((current) => {
          const next = new Set(current);
          next.delete(hike.id);
          return next;
        });
      }
    },
    [focusedHikeId]
  );

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

        <Map
          hikes={hikes}
          focusHikeId={focusedHikeId}
          mapStyle={style}
          onRemoveHike={handleRemoveHike}
        />

        <MapStyleControl baseStyle={baseStyle} onChange={setStyle} />

        <ListHikesButton onClick={openList} />
        <AddHikeButton onClick={openDrawer} />

        <HikeListDrawer
          open={listOpen}
          hikes={hikes}
          onClose={closeList}
          onSelectHike={handleSelectHike}
          onAddHike={openDrawer}
          onRemoveHike={handleRemoveHike}
          removingIds={removingIds}
        />

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
