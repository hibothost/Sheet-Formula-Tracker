import * as XLSX from "xlsx";

export interface TraverseStation {
  name: string;
  northing: number;
  easting: number;
}

/**
 * Builds a traverse-computation workbook (TRVS + Field notes sheets) from a
 * plain list of stations with known coordinates, following the same booking
 * conventions used in the project's reference field-notes workbook:
 *   - TRVS: bearing + distance computed between consecutive stations.
 *   - Field notes: a foresight/"AT"/backsight block per leg, pulling its
 *     angle (I/J/K) and distance (M) straight from TRVS via formulas.
 *
 * Angle-closure "check" readings and correction terms from the original
 * paper field book don't exist here (these coordinates are already final),
 * so those columns are intentionally omitted rather than fabricated.
 */
export function buildTraverseWorkbook(stations: TraverseStation[]): XLSX.WorkBook {
  if (stations.length < 2) {
    throw new Error("At least 2 stations are required.");
  }

  const wb = XLSX.utils.book_new();

  // ---------------- TRVS sheet ----------------
  const trvsHeaderRow = 1; // 1-indexed
  const trvsFirstDataRow = 2;
  const trvsCells: Record<string, XLSX.CellObject> = {};

  const setF = (addr: string, formula: string) => {
    trvsCells[addr] = { t: "n", v: 0, f: formula };
  };
  const setS = (addr: string, value: string) => {
    trvsCells[addr] = { t: "s", v: value };
  };
  const setN = (addr: string, value: number) => {
    trvsCells[addr] = { t: "n", v: value };
  };

  ["Stn", "Bearing (dms)", "Distance (m)", "Northing", "Easting"].forEach((h, i) => {
    setS(XLSX.utils.encode_cell({ r: trvsHeaderRow - 1, c: i }), h);
  });
  // deg/min/sec sub-headers over columns B/C/D
  setS("B" + (trvsHeaderRow), "deg");
  setS("C" + (trvsHeaderRow), "min");
  setS("D" + (trvsHeaderRow), "sec");

  stations.forEach((st, i) => {
    const row = trvsFirstDataRow + i;
    setS(`A${row}`, st.name);
    setN(`F${row}`, st.northing);
    setN(`G${row}`, st.easting);
    if (i === 0) {
      // Anchor station -- no incoming leg to compute.
      return;
    }
    const prevRow = row - 1;
    setF(`H${row}`, `F${row}-F${prevRow}`); // delta northing
    setF(`I${row}`, `G${row}-G${prevRow}`); // delta easting
    // Excel's ATAN2(x_num, y_num) returns the same angle as the standard
    // atan2(y, x): passing (deltaNorthing, deltaEasting) yields the angle
    // measured from north toward east -- i.e. the compass bearing directly
    // (0=north, 90=east, 180=south, 270=west).
    setF(`J${row}`, `MOD(ATAN2(H${row},I${row})/PI()*180,360)+IF(ATAN2(H${row},I${row})<0,360,0)`);
    // Round to whole seconds first, then derive deg/min/sec by integer
    // division with carries, so no field ever shows 60 sec or 60 min.
    setF(`P${row}`, `MOD(ROUND(J${row}*3600,0),1296000)`); // total bearing-seconds, wrapped to 0-360deg
    setF(`B${row}`, `TRUNC(P${row}/3600,0)`);
    setF(`C${row}`, `TRUNC(MOD(P${row},3600)/60,0)`);
    setF(`D${row}`, `MOD(P${row},60)`);
    setF(`E${row}`, `ROUND(SQRT(H${row}^2+I${row}^2),3)`); // distance
  });

  const trvsLastRow = trvsFirstDataRow + stations.length - 1;
  const trvsWs: XLSX.WorkSheet = {
    "!ref": XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: trvsLastRow - 1, c: 15 } }),
  };
  Object.entries(trvsCells).forEach(([addr, cell]) => (trvsWs[addr] = cell));
  trvsWs["!cols"] = [
    { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, trvsWs, "TRVS");

  // ---------------- Field notes sheet ----------------
  // Layout mirrors the reference workbook's booking convention:
  //   Row N   : foresight  -- Stn, angle (I/J/K from TRVS), Dist (M from TRVS)
  //   Row N+1 : "AT"       -- instrument moves to the station just sighted
  //   Row N+2 : backsight  -- reverse angle back to the previous station
  //   Row N+3 : blank separator
  const fn: Record<string, XLSX.CellObject> = {};
  const fset = (addr: string, val: string | number, formula?: string) => {
    if (formula) {
      fn[addr] = { t: "n", v: 0, f: formula };
    } else if (typeof val === "number") {
      fn[addr] = { t: "n", v: val };
    } else {
      fn[addr] = { t: "s", v: val };
    }
  };

  const headers = ["Stn", "Deg", "Min", "Sec", "", "", "", "", "Deg", "Min", "Sec", "AT", "Dist (M)", "Stn", "Meas Dist"];
  headers.forEach((h, i) => fset(XLSX.utils.encode_cell({ r: 0, c: i }), h));
  fset("A2", "Field notes generated from station coordinates. Angles/distances are computed from the TRVS sheet -- no independent field-book readings exist for this data set.");

  let row = 4;
  for (let i = 1; i < stations.length; i++) {
    const trvsRow = trvsFirstDataRow + i;
    const N = row;
    fset(`A${N}`, undefined as unknown as string, `TRVS!A${trvsRow}`);
    fset(`I${N}`, undefined as unknown as string, `TRVS!B${trvsRow}`);
    fset(`J${N}`, undefined as unknown as string, `TRVS!C${trvsRow}`);
    fset(`K${N}`, undefined as unknown as string, `TRVS!D${trvsRow}`);
    fset(`M${N}`, undefined as unknown as string, `TRVS!E${trvsRow}`);
    fset(`N${N}`, undefined as unknown as string, `A${N}`);

    fset(`L${N + 1}`, "AT");
    fset(`A${N + 1}`, undefined as unknown as string, `A${N}`);

    fset(`A${N + 2}`, undefined as unknown as string, `TRVS!A${trvsRow - 1}`);
    fset(`I${N + 2}`, undefined as unknown as string, `IF(I${N}<180,I${N}+180,I${N}-180)`);
    fset(`J${N + 2}`, undefined as unknown as string, `J${N}`);
    fset(`K${N + 2}`, undefined as unknown as string, `K${N}`);

    row += 4;
  }

  const fnLastRow = row;
  const fnWs: XLSX.WorkSheet = {
    "!ref": XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: fnLastRow, c: 14 } }),
  };
  Object.entries(fn).forEach(([addr, cell]) => (fnWs[addr] = cell));
  fnWs["!cols"] = Array.from({ length: 15 }, () => ({ wch: 10 }));
  fnWs["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }];
  XLSX.utils.book_append_sheet(wb, fnWs, "Field notes");

  if (!wb.Workbook) wb.Workbook = {};
  wb.Workbook.WBProps = {
    ...(wb.Workbook.WBProps ?? {}),
    fullCalcOnLoad: true,
  } as XLSX.WorkbookProperties;

  return wb;
}
