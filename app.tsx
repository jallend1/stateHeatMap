import React from "react";
import { createRoot } from "react-dom/client";
import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
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
              const abbr = row["Institution State"]?.trim();
              const state = STATE_ABBR_TO_NAME[abbr] || abbr;
              const filled = parseFloat(row["Requests Filled"]) || 0;
              if (state) counts[state] = (counts[state] || 0) + filled;
            }
            setIntensity(counts);
            console.log("State Intensity:", counts);
          },
        });
      });
  }, [tsvUrl]);

  function getFillColor(feature: any): [number, number, number, number] {
    const state = feature.properties.name;
    const value = intensity[state] || 0;
    if (value === 0) {
      return [0, 0, 0, 180]; // Black for no data
    }
    const max = Math.max(...Object.values(intensity), 1);
    const t = value / max;
    const minRed = 80; // Minimum red for any nonzero value
    // Interpolate from minRed to 255
    const red = Math.round(minRed + (255 - minRed) * t);
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
              html: `<b>${object.properties.name}</b><br/>Requests Filled: ${
                intensity[object.properties.name] || 0
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
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
