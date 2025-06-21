import React from "react";
import { createRoot } from "react-dom/client";
import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import type { MapViewState } from "@deck.gl/core";

// Mapping state abbreviations to full names because GeoJSON uses full names
const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const STATES_GEOJSON_URL =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

type StateIntensity = {
  [state: string]: number;
};

export default function App({
  tsvUrl: tsvUrl = "/data/lendingDetail - 0124.tsv",
  mapStyle = MAP_STYLE,
}: {
  tsvUrl: string;
  mapStyle?: string;
}) {
  const [geojson, setGeojson] = useState<any>(null);
  const [intensity, setIntensity] = useState<StateIntensity>({});
  const [ranks, setRanks] = useState<Record<string, number>>({});

  const [fileCount, setFileCount] = useState(1);
  const fileUrls = [
    "/data/lendingDetail-012024.tsv",
    "/data/lendingDetail-022024.tsv",
  ];

  // Load GeoJSON
  useEffect(() => {
    fetch(STATES_GEOJSON_URL)
      .then((res) => res.json())
      .then(setGeojson);
  }, []);

  // Load CSV and calculates state intensity
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
              const abbr = row["Institution State"]?.trim();
              const state = STATE_ABBR_TO_NAME[abbr] || abbr;
              const filled = parseFloat(row["Requests Filled"]) || 0;
              if (state) counts[state] = (counts[state] || 0) + filled;
            }

            // Compute ranks for states with data
            const entries = Object.entries(counts)
              .filter(([state, value]) => value > 0)
              .sort((a, b) => a[1] - b[1]);
            const rankMap: Record<string, number> = {};
            entries.forEach(([state, value], idx) => {
              rankMap[state] = idx;
            });

            setIntensity(counts);
            setRanks(rankMap);
          },
        });
      });
  }, [tsvUrl]);

  function getFillColor(feature: any): [number, number, number, number] {
    const state = feature.properties.name;
    const value = intensity[state] || 0;
    if (value === 0 || ranks[state] === undefined) {
      return [0, 0, 0, 180]; // Black for no data
    }
    // Find min and max values among all states with data
    const values = Object.values(intensity).filter((v) => v > 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // If all values are the same, use max intensity
    if (minValue === maxValue) {
      return [255, 0, 0, 180];
    }
    const minRed = 30;
    const maxRed = 255;
    const logMin = Math.log(minValue);
    const logMax = Math.log(maxValue);
    const logValue = Math.log(value);
    const t = (logValue - logMin) / (logMax - logMin);
    const red = Math.round(minRed + (maxRed - minRed) * t);

    return [red, 0, 0, 180];
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
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          left: 20,
          top: 20,
          background: "#222",
          color: "#fff",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <label>
          Files to include: {fileCount}
          <input
            type="range"
            min={1}
            max={fileUrls.length}
            value={fileCount}
            onChange={(e) => setFileCount(Number(e.target.value))}
          />
        </label>
      </div>
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
        getTooltip={({ object }) =>
          object
            ? {
                html: `<b>${object.properties.name}</b><br/>
         Requests Filled: ${intensity[object.properties.name] || 0}<br/>
         Rank: ${
           ranks[object.properties.name] !== undefined
             ? Object.keys(ranks).length - ranks[object.properties.name]
             : "N/A"
         }`,
                style: {
                  backgroundColor: "rgba(0,0,0,0.8)",
                  color: "white",
                  fontSize: "1em",
                  borderRadius: "4px",
                  padding: "6px",
                },
              }
            : null
        }
      >
        <Map reuseMaps mapStyle={mapStyle} />
      </DeckGL>
    </>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App tsvUrl="/data/lendingDetail - 0124.tsv" />);
}
