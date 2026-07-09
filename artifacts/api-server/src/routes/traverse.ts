import { Router, type IRouter } from "express";
import * as XLSX from "xlsx";
import { buildTraverseWorkbook, type TraverseStation } from "../lib/traverseXlsx";

const router: IRouter = Router();

router.post("/traverse/generate", (req, res) => {
  const body = req.body as { stations?: unknown };
  const rawStations = body?.stations;

  if (!Array.isArray(rawStations) || rawStations.length < 2) {
    res.status(400).json({ error: "At least 2 stations are required." });
    return;
  }

  const stations: TraverseStation[] = [];
  for (const [i, s] of rawStations.entries()) {
    const st = s as Record<string, unknown>;
    const name = typeof st?.name === "string" ? st.name.trim() : "";
    const northing = st?.northing;
    const easting = st?.easting;
    const northingOk = typeof northing === "number" && Number.isFinite(northing);
    const eastingOk = typeof easting === "number" && Number.isFinite(easting);
    if (!name || !northingOk || !eastingOk) {
      res.status(400).json({
        error: `Station ${i + 1} is invalid. Each station needs a name, northing, and easting.`,
      });
      return;
    }
    stations.push({ name, northing, easting });
  }

  try {
    const wb = buildTraverseWorkbook(stations);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="traverse-field-notes.xlsx"');
    res.send(buffer);
  } catch (err) {
    req.log?.error({ err }, "Failed to generate traverse workbook");
    res.status(500).json({ error: "Failed to generate the workbook. Please check the station data and try again." });
  }
});

export default router;
