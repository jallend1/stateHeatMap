import React from "react";
import { createRoot } from "react-dom/client";
import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import type { MapViewState } from "@deck.gl/core";

const DATA_URL =
  "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/screen-grid/uber-pickup-locations.json"; // eslint-disable-line

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -73.75,
  latitude: 40.73,
  zoom: 9,
  maxZoom: 16,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

type DataPoint = [longitude: number, latitude: number, count: number];

// US States GeoJSON (public domain source)
const STATES_GEOJSON_URL =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

type StateIntensity = {
  [state: string]: number; // e.g., { "California": 42, ... }
};

export default function App({
  tsvUrl: tsvUrl = "/lendingDetail.tsv", // e.g., '/data.csv'
  mapStyle = MAP_STYLE,
}: {
  tsvUrl: string;
  mapStyle?: string;
}) {
  const [geojson, setGeojson] = useState<any>(null);
  const [intensity, setIntensity] = useState<StateIntensity>({});

  // Load GeoJSON
  useEffect(() => {
    fetch(STATES_GEOJSON_URL)
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  // Load CSV and compute intensity per state
  useEffect(() => {
    if (!tsvUrl) return;
    fetch(tsvUrl)
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          delimiter: "\t", // TSV support
          complete: (results) => {
            const counts: StateIntensity = {};
            for (const row of results.data as any[]) {
              const state = row["Institution State"]?.trim();
              const filled = parseFloat(row["Requests Filled"]) || 0;
              if (state) counts[state] = (counts[state] || 0) + filled;
            }
            setIntensity(counts);
          },
        });
      });
  }, [tsvUrl]);

  function getFillColor(feature: any): [number, number, number, number] {
    const state = feature.properties.name;
    const value = intensity[state] || 0;
    // Map value to color (adjust max as needed)
    const max = Math.max(...Object.values(intensity), 1);
    const t = value / max;
    // Interpolate blue (low) to red (high)
    return [
      Math.round(255 * t), // R
      0,
      Math.round(255 * (1 - t)), // B
      180, // alpha
    ];
  }

  const layers = [
    geojson &&
      new GeoJsonLayer({
        id: "states",
        data: geojson,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor,
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 1,
      }),
  ];

  return (
    <DeckGL
      initialViewState={
        {
          longitude: -98,
          latitude: 39,
          zoom: 3.5,
          maxZoom: 16,
          pitch: 0,
          bearing: 0,
        } as MapViewState
      }
      controller={true}
      layers={layers}
    >
      <Map reuseMaps mapStyle={mapStyle} />
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
