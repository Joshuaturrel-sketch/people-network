import { CATEGORY_COLORS } from "./config.js";
import { countBy } from "./data-utils.js";

export let charts = [];

function clearCharts() {
  charts.forEach(chart => chart.destroy());
  charts = [];
}

const axisColor = "#e5e7eb";
const gridColor = "rgba(255,255,255,0.08)";

const JOBS_INDUSTRY_COLOR_MAP = {
  "Forex": "#4f8df7",
  "Other Financial Instruments": "#27c36a",
  "Broker": "#9b5cff",
  "Communications": "#d49461",
  "Marketing": "#ef4d4d",
  "Public Servant": "#edb81f",
  "Other": "#9aa3b2",
  "Politics": "#ef6aa8",
  "Retiree": "#f28a2d",
  "Unemployed": "#7d776e",
  "Self/Employed": "#74cfa8"
};

export function renderStats(people) {
  clearCharts();
  renderKPIs(people);

  const categoryCounts = countBy(people, p => p.category || []);
  const jobsIndustryCounts = countBy(people, p => p.industry || []);
  const layerCounts = countBy(people, p => [p.layer || "Unknown"]);
  const clientStatusCounts = countBy(people, p => [p.clientStatus || "Unknown"]);
  const cityCounts = countBy(
    people.filter(p => p.cityCountry?.trim()),
    p => [p.cityCountry.split(",")[0].trim()]
  );

  const strengthBuckets = { "1–2": 0, "3–4": 0, "5–6": 0, "7–8": 0, "9–10": 0 };
  people.forEach(p => {
    const v = p.relationshipStrength || 0;
    if (v >= 1 && v <= 2) strengthBuckets["1–2"]++;
    else if (v <= 4) strengthBuckets["3–4"]++;
    else if (v <= 6) strengthBuckets["5–6"]++;
    else if (v <= 8) strengthBuckets["7–8"]++;
    else if (v <= 10) strengthBuckets["9–10"]++;
  });

  const probabilityBuckets = { "0–25%": 0, "25–50%": 0, "50–75%": 0, "75–100%": 0 };
  people.forEach(p => {
    if 
