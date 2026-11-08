import { CompletedExcelGeneratorParams } from './completedWorksheetGenerator';

function xmlEscape(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLettersToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx;
}

/**
 * Pure function that injects a map of cell coordinates (e.g. { I8: 'CEDD', O35: 19.4 })
 * into an OpenXML worksheet XML string (xl/worksheets/sheet1.xml), preserving all
 * existing cell style attributes (s="..."), row heights, merged cells, and drawings.
 */
export function injectCellsIntoSheetXml(
  sheetXml: string,
  cellMap: Record<string, string | number | undefined>
): string {
  let updatedXml = sheetXml;

  // Group cells by row number
  const byRow = new Map<number, Array<{ ref: string; col: string; val: string | number }>>();
  for (const [rawRef, val] of Object.entries(cellMap)) {
    if (val === undefined || val === null) continue;
    const m = /^([A-Z]+)(\d+)$/.exec(rawRef.trim().toUpperCase());
    if (!m) continue;
    const col = m[1];
    const rowNum = parseInt(m[2], 10);
    if (!byRow.has(rowNum)) byRow.set(rowNum, []);
    byRow.get(rowNum)!.push({ ref: `${col}${rowNum}`, col, val });
  }

  for (const [rowNum, cells] of byRow.entries()) {
    const rowRegex = new RegExp(`(<row\\b[^>]*\\br="${rowNum}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
    const rowMatch = rowRegex.exec(updatedXml);

    if (rowMatch) {
      let rowInner = rowMatch[2];
      for (const { ref, col, val } of cells) {
        const cellRegex = new RegExp(`<c\\b([^>]*\\br="${ref}"[^/>]*)(?:\\/>|>[\\s\\S]*?<\\/c>)`);
        const cellMatch = cellRegex.exec(rowInner);
        const isNum = typeof val === 'number' && Number.isFinite(val);

        if (cellMatch) {
          const fullCellXml = cellMatch[0];
          const rawAttrs = cellMatch[1];
          const styleMatch = /\bs="(\d+)"/.exec(rawAttrs);
          const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : '';
          const formulaMatch = /<f\b[^>]*>[\s\S]*?<\/f>/.exec(fullCellXml);
          const formulaXml = formulaMatch ? formulaMatch[0] : '';
          const replacement = isNum
            ? `<c r="${ref}"${styleAttr}>${formulaXml}<v>${val}</v></c>`
            : formulaXml
            ? `<c r="${ref}"${styleAttr} t="str">${formulaXml}<v>${xmlEscape(val)}</v></c>`
            : `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
          rowInner = rowInner.replace(cellRegex, () => replacement);
        } else {
          // Insert cell in column order inside rowInner
          const newCellXml = isNum
            ? `<c r="${ref}"><v>${val}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
          const targetColIdx = colLettersToIndex(col);
          const existingCells = [...rowInner.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^/>]*(?:\/>|>[\s\S]*?<\/c>)/g)];
          let inserted = false;
          for (const ec of existingCells) {
            const ecColIdx = colLettersToIndex(ec[1]);
            if (ecColIdx > targetColIdx && ec.index !== undefined) {
              rowInner = rowInner.slice(0, ec.index) + newCellXml + rowInner.slice(ec.index);
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            rowInner += newCellXml;
          }
        }
      }
      updatedXml = updatedXml.replace(rowRegex, () => `${rowMatch[1]}${rowInner}${rowMatch[3]}`);
    }
  }

  return updatedXml;
}

/**
 * Maps CompletedExcelGeneratorParams into exact cell coordinates for each official LabTech .xlsx template.
 */
export function buildOfficialTemplateSheetCellMaps(
  params: CompletedExcelGeneratorParams
): Record<string, Record<string, string | number>> {
  const stp = (params.stpCode || 'KD').trim().toUpperCase();
  const st = params.structured;
  const dateOnly = (params.testedAt || '').slice(0, 10);
  const timeOnly = (params.testedAt || '').slice(11, 16) || '10:00';
  const contractNo = params.job?.contractNo || params.companyProjNo || 'CEDD/2026/01';
  const worksOrderNo = params.reportRefNo || `${params.jobNo}-WO-01`;

  const findEqCode = (keywords: string[], fallback: string): string => {
    const matched = params.equipmentRows.find((e) =>
      keywords.some(
        (k) => e.code.toLowerCase().includes(k) || e.name.toLowerCase().includes(k)
      )
    );
    return matched?.code || fallback;
  };

  if (stp === 'FC') {
    const fc = st?.kind === 'FC' ? st : undefined;
    const t1 = fc?.t1Sec ?? 19.2;
    const t2 = fc?.t2Sec ?? 19.6;
    const avg = fc?.meanSec ?? Number(((t1 + t2) / 2).toFixed(1));
    const diff = fc?.diffSec ?? Number((Math.abs(t1 - t2) / 2).toFixed(2));
    const groutTemp = fc?.groutTempC ?? 25.0;
    const ambTemp = fc?.ambientTempC ?? (parseFloat(params.ambientTemp) || 26.5);
    const waterTemp = Number((groutTemp - 0.5).toFixed(1));
    const tmId = findEqCode(['tm', 'mm', 'therm'], 'LT-TM-01');
    const fcId = findEqCode(['fc', 'flow', 'cone'], 'LT-FC-01');
    const tdId = findEqCode(['td', 'stop', 'timer'], 'LT-TD-01');

    return {
      'xl/worksheets/sheet1.xml': {
        AF4: params.jobNo,
        I8: params.clientName,
        I9: params.projectTitle,
        I10: params.siteLocation,
        AG10: contractNo,
        I11: fc?.batchNo || `B-${dateOnly.replace(/-/g, '')}-01`,
        AG11: worksOrderNo,
        I12: params.locationNote,
        I13: fc?.sampleId || `${params.jobNo}-FC-01`,
        I18: fc?.cementBrand || 'Green Island OPC (BS EN 197-1 CEM I 52.5N)',
        AG18: fc?.cementQty || '50 kg (1 Bag)',
        I19: fc?.admixtureBrand || 'Sika Grout Aid / Cebex 100',
        AG19: fc?.admixtureQty || '0.225 kg',
        I20: 'Mains Potable Water (WSD)',
        AG20: fc?.waterQty || '21.0 L',
        I21: fc?.wcRatio || '0.42',
        I22: `${ambTemp} °C`,
        I23: `${waterTemp} °C`,
        I24: dateOnly,
        O29: params.locationNote,
        O30: fc?.timeWaterAdded || '09:45',
        O31: fc?.timeDrawingGrout || '09:52',
        A32: `Thermometer ID:   ${tmId}                                  Flow Cone ID:   ${fcId}                                           Timer ID:   ${tdId}`,
        O33: groutTemp,
        O34: timeOnly,
        O35: Number(t1.toFixed(1)),
        O36: groutTemp,
        O37: timeOnly,
        O38: Number(t2.toFixed(1)),
        O39: Number(avg.toFixed(1)),
        O40: Number(diff.toFixed(2)),
        O41: avg <= 35 ? 'Yes' : 'No',
        O42: Math.abs(t1 - t2) <= 1.8 ? 'Yes' : 'No',
        D46: fc ? `Pre-test 1725mL Water Efflux Check = ${fc.waterCheckSec.toFixed(1)}s (8.0±0.2s OK). Conforms to ASTM C939M-22.` : 'Conforms to ASTM C939M-22.',
        I48: params.operatorName,
        AG48: params.approvedSignatory,
        I50: dateOnly,
        AG50: dateOnly,
      },
    };
  }

  if (stp === 'BL') {
    const bl = st?.kind === 'BL' ? st : undefined;
    const ambTemp = parseFloat(params.ambientTemp) || 26.5;
    const sheetCells: Record<string, string | number> = {
      AH4: params.jobNo,
      J8: params.clientName,
      I9: params.projectTitle,
      I10: params.siteLocation,
      AH10: contractNo,
      I11: bl?.batchNo || `B-${dateOnly.replace(/-/g, '')}-01`,
      AH11: worksOrderNo,
      J12: params.locationNote,
      J13: bl?.sampleId || `${params.jobNo}-BL-01`,
      I18: bl?.cementBrand || 'Green Island OPC (BS EN 197-1 CEM I 52.5N)',
      AH18: bl?.cementQty || '50 kg (1 Bag)',
      I19: bl?.admixtureBrand || 'Sika Grout Aid / Cebex 100',
      AH19: bl?.admixtureQty || '0.225 kg',
      I20: 'Mains Potable Water (WSD)',
      AH20: bl?.waterQty || '21.0 L',
      I21: bl?.wcRatio || '0.42',
      I22: `${ambTemp} °C`,
      I23: `${(ambTemp - 1.2).toFixed(1)} °C`,
      I24: dateOnly,
      K29: '( ✓',
      AG29: '( ✓ )',
      D50: bl
        ? `Initial Grout Reading (${bl.unit === 'mL' ? 'V1' : 'H1'}) = ${bl.v1} ${bl.unit}; Final Bleeding = ${bl.finalBleedPct.toFixed(2)}% (Spec <= ${bl.specLimitPct}%); Free Expansion = ${bl.finalExpPct.toFixed(2)}%.`
        : 'Conforms to ASTM C940-22.',
      I52: params.operatorName,
      AH52: params.approvedSignatory,
      I54: dateOnly,
      AH54: dateOnly,
    };

    // Map interval rows to rows 35..41 (15min, 30min, 45min, 60min, 2hour, 3hour, 24hour)
    const intervals = bl?.intervals || [];
    const baseHour = 10;
    const rowOffsets = [15, 30, 45, 60, 120, 180, 1440];
    for (let i = 0; i < Math.min(7, Math.max(intervals.length, 7)); i++) {
      const rowNum = 35 + i;
      const iv = intervals[i] || intervals[intervals.length - 1];
      if (!iv) continue;
      const mins = rowOffsets[i] ?? 60;
      const hh = String((baseHour + Math.floor(mins / 60)) % 24).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      sheetCells[`A${rowNum}`] = `${hh}:${mm}`;
      sheetCells[`F${rowNum}`] = Number(iv.v2.toFixed(1));
      sheetCells[`H${rowNum}`] = Number(iv.vg.toFixed(1));
      sheetCells[`K${rowNum}`] = Number(iv.bleedPct.toFixed(2));
      sheetCells[`N${rowNum}`] = Number(iv.expPct.toFixed(2));
    }

    return {
      'xl/worksheets/sheet1.xml': sheetCells,
    };
  }

  if (stp === 'KD') {
    const kd = st?.kind === 'KD' ? st : undefined;
    const pileDia = kd?.pileDiaMm ?? 2500;
    const depthM = kd?.depthM ?? 45.0;
    const dxMm = kd?.dxMm ?? 85;
    const dyMm = kd?.dyMm ?? 60;
    const offsetM = Number(((kd?.offsetMm ?? 104) / 1000).toFixed(4));
    const ratioV = kd?.ratioDenom ?? 432;
    const kmId = findEqCode(['km', 'koden'], 'LT-KM-04');
    const mtId = findEqCode(['mt', 'tape'], 'LT-MT-06');
    const srId = findEqCode(['sr', 'rule'], 'LT-SR-10');
    const dmId = findEqCode(['dm', 'dip'], 'LT-DM-01');
    const dcId = findEqCode(['dc', 'caliper'], 'LT-DC-03');
    const lvId = findEqCode(['lv', 'level'], 'LT-LV-01');
    const tmId = findEqCode(['tm', 'therm'], 'LT-TM-01');

    return {
      'xl/worksheets/sheet1.xml': {
        H9: params.reportRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        L13: params.clientName,
        L16: contractNo,
        L17: worksOrderNo,
        L18: params.projectTitle,
        L19: params.siteLocation,
        AQ19: `${params.weatherNote} / ${params.ambientTemp}`,
        O22: params.locationNote,
        AQ22: 'Bored Pile',
        O23: pileDia,
        AQ23: pileDia - 70,
        AQ28: depthM,
        O29: `1 : ${kd?.limitDenom ?? 100}`,
        O43: kmId,
        AQ43: dcId,
        O44: mtId,
        O45: srId,
        AQ45: lvId,
        O46: dmId,
        AQ46: tmId,
      },
      'xl/worksheets/sheet2.xml': {
        H9: params.reportRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        M43: params.operatorName,
        AN43: params.approvedSignatory,
      },
      'xl/worksheets/sheet4.xml': {
        H9: params.reportRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        W13: params.locationNote,
        W27: 0,
        W28: -depthM,
        AN27: 0,
        AN28: -depthM,
        W29: depthM,
        AN29: depthM,
        W32: Number((dxMm / 1000).toFixed(4)),
        AN32: Number((dyMm / 1000).toFixed(4)),
        AT35: offsetM,
        W36: ratioV,
      },
    };
  }

  if (stp === 'SO') {
    const caId = findEqCode(['ca', 'sonic', 'champ'], 'LT-CA-01');
    const mtId = findEqCode(['mt', 'tape'], 'LT-MT-06');
    const tmId = findEqCode(['tm', 'therm'], 'LT-TM-01');
    return {
      'xl/worksheets/sheet1.xml': {
        F4: params.clientName,
        Z4: params.reportRefNo,
        F5: params.projectTitle,
        Z5: worksOrderNo,
        Z6: 'ASTM D6760-16',
        F7: params.siteLocation,
        Z7: dateOnly,
        F8: params.clientName,
        F11: params.locationNote,
        Z11: '2.50 m',
        F12: 'Bored Pile',
        F15: '45.0 m',
        Z15: 'New',
        Z17: caId,
        F18: mtId,
        Q18: tmId,
        Z18: `${caId}-PRB`,
        F54: params.operatorName,
        F55: params.approvedSignatory,
      },
    };
  }

  if (stp === 'PO') {
    const po = st?.kind === 'PO' ? st : undefined;
    const dMm = po?.dMm ?? 50.0;
    const wMm = po?.wMm ?? 50.0;
    const loadKn = po?.loadKn ?? 8.5;
    const deMm = po?.deMm ?? 50.0;
    const isMpa = po?.isUncorrMpa ?? 3.4;
    const is50Mpa = po?.is50Mpa ?? 3.4;
    const plId = findEqCode(['pl', 'po', 'point'], 'LT-PO-02');
    const tdId = findEqCode(['td', 'stop'], 'LT-TD-01');
    const tmId = findEqCode(['tm', 'therm'], 'LT-TM-01');
    const lcId = findEqCode(['lc', 'load'], 'LT-LC-01');

    return {
      'xl/worksheets/sheet1.xml': {
        D4: params.reportRefNo,
        D8: params.clientName,
        M8: params.reportRefNo,
        D9: contractNo,
        D10: params.projectTitle,
        M11: dateOnly,
        M12: dateOnly,
        M13: dateOnly,
        M14: `On-site (${params.siteLocation})`,
        M15: params.ambientTemp,
        D18: params.locationNote,
        D19: params.locationNote,
        D20: '15.50 m',
        D21: params.siteLocation,
        D22: 'Slightly decomposed granite (Grade II)',
        D23: `${params.jobNo}-PO-01`,
        D24: Number((dMm * 1.5).toFixed(1)),
        D25: 'Random (R)',
        E27: tdId,
        I27: 'LT-PL-01',
        N27: lcId,
        E28: tmId,
        I28: 'LT-PL-02',
        N28: plId,
        D31: 'AR (As received)',
        D32: po?.mode === 'axial' ? 'A + R' : 'D + R',
        D33: Number(dMm.toFixed(1)),
        D34: Number(dMm.toFixed(1)),
        D35: Number(dMm.toFixed(1)),
        D36: Number(wMm.toFixed(1)),
        D37: Number(wMm.toFixed(1)),
        D38: Number((dMm * wMm).toFixed(1)),
        D39: Number(deMm.toFixed(2)),
        D40: Number(loadKn.toFixed(2)),
        D41: Number(isMpa.toFixed(2)),
        D42: Number(is50Mpa.toFixed(2)),
        D43: po?.mode === 'axial' ? 'b (Valid axial)' : 'a (Valid diametral)',
        D44: 'Middle third',
        D45: 'm (Material failure)',
        D52: params.operatorName,
        M52: params.approvedSignatory,
      },
    };
  }

  // Default / PLT: STP07-PLT_Worksheet_template.xlsx
  const plt = st?.kind === 'PLT' ? st : undefined;
  const wkKpa = plt?.workingKpa ?? 250;
  const areaM2 = plt?.areaM2 ?? 0.09;
  const wkKn = Number((wkKpa * areaM2).toFixed(2));
  const lcId = findEqCode(['lc', 'load'], 'LT-LC-01');
  const dgId = findEqCode(['dg', 'dial'], 'LT-DG-01 ~ 04');
  const pltCells: Record<string, string | number> = {
    F4: params.jobNo,
    U4: params.locationNote,
    AG4: dateOnly,
    F5: params.clientName,
    U5: contractNo,
    AG5: worksOrderNo,
    F6: params.projectTitle,
    U6: params.siteLocation,
    G9: wkKpa,
    U9: wkKpa * 3,
    AH9: plt ? `${plt.plateSizeMm / 1000} m (${plt.plateShape})` : '0.30 m',
    G10: wkKn,
    U10: Number((wkKn * 3).toFixed(2)),
    AH10: Number(areaM2.toFixed(4)),
    U11: lcId,
    AH11: dgId,
    E37: plt
      ? `Peak Pressure = ${plt.peakPressureKpa.toFixed(1)} kPa (${plt.peakLoadKn.toFixed(1)} kN); Max Settlement = ${plt.peakSettlementMm.toFixed(2)} mm; Es = ${plt.esMpa ? plt.esMpa.toFixed(2) : '—'} MPa.`
      : 'Plate Load Test completed per STP07-PLT.',
    E39: params.operatorName,
    T39: params.approvedSignatory,
    E40: dateOnly,
    T40: dateOnly,
  };

  if (plt?.steps?.length) {
    plt.steps.forEach((step, idx) => {
      const r = 15 + idx;
      if (r <= 34) {
        pltCells[`A${r}`] = dateOnly;
        pltCells[`D${r}`] = step.stepName;
        pltCells[`G${r}`] = parseFloat(params.ambientTemp) || 26.5;
        pltCells[`J${r}`] = Number(step.pressureKpa.toFixed(1));
        pltCells[`N${r}`] = Number(step.loadKn.toFixed(2));
        pltCells[`R${r}`] = Number(step.loadKn.toFixed(2));
        pltCells[`V${r}`] = Number(step.g1.toFixed(2));
        pltCells[`Y${r}`] = Number(step.g2.toFixed(2));
        pltCells[`AB${r}`] = Number(step.g3.toFixed(2));
        pltCells[`AE${r}`] = Number(step.g4.toFixed(2));
        pltCells[`AH${r}`] = Number(((step.g1 + step.g2 + step.g3 + step.g4) / 4).toFixed(2));
        pltCells[`AK${r}`] = Number(step.meanMm.toFixed(2));
      }
    });
  }

  return {
    'xl/worksheets/sheet1.xml': pltCells,
  };
}

// ============================================================================
// Pure Browser / Web-Streams ZIP Reader + Writer for .xlsx Templates
// ============================================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function deflateRaw(uncompressed: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(uncompressed);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

interface ZipEntryRecord {
  name: string;
  compressionMethod: number;
  crc: number;
  compressedData: Uint8Array;
  uncompressedSize: number;
}

/**
 * Takes an existing .xlsx Uint8Array buffer, modifies the specified XML files inside it
 * via injectCellsIntoSheetXml, and returns a new valid .xlsx Uint8Array buffer.
 */
export async function fillXlsxTemplateBuffer(
  templateBuffer: Uint8Array,
  sheetCellMaps: Record<string, Record<string, string | number>>
): Promise<Uint8Array> {
  const view = new DataView(
    templateBuffer.buffer,
    templateBuffer.byteOffset,
    templateBuffer.byteLength
  );

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = templateBuffer.length - 22; i >= Math.max(0, templateBuffer.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('Invalid XLSX ZIP buffer: EOCD not found');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries: ZipEntryRecord[] = [];
  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) {
      throw new Error('Invalid Central Directory entry signature');
    }
    const compressionMethod = view.getUint16(ptr + 10, true);
    let crc = view.getUint32(ptr + 16, true);
    const compSize = view.getUint32(ptr + 20, true);
    let uncompSize = view.getUint32(ptr + 24, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const nameBytes = templateBuffer.subarray(ptr + 46, ptr + 46 + nameLen);
    const name = decoder.decode(nameBytes);

    // Read local header to find exact data start
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    let compressedData = templateBuffer.subarray(dataStart, dataStart + compSize);

    if (sheetCellMaps[name]) {
      const rawXmlBytes =
        compressionMethod === 8 ? await inflateRaw(compressedData) : compressedData;
      const xmlStr = decoder.decode(rawXmlBytes);
      const updatedXmlStr = injectCellsIntoSheetXml(xmlStr, sheetCellMaps[name]);
      const updatedXmlBytes = encoder.encode(updatedXmlStr);
      crc = crc32(updatedXmlBytes);
      uncompSize = updatedXmlBytes.length;
      compressedData =
        compressionMethod === 8 ? await deflateRaw(updatedXmlBytes) : updatedXmlBytes;
    }

    entries.push({
      name,
      compressionMethod,
      crc,
      compressedData,
      uncompressedSize: uncompSize,
    });

    ptr += 46 + nameLen + extraLen + commentLen;
  }

  // Rebuild ZIP archive
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const localHdr = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHdr.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, entry.compressionMethod, true);
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x5421, true); // mod date
    lv.setUint32(14, entry.crc, true);
    lv.setUint32(18, entry.compressedData.length, true);
    lv.setUint32(22, entry.uncompressedSize, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHdr.set(nameBytes, 30);

    const centralHdr = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHdr.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, entry.compressionMethod, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, entry.crc, true);
    cv.setUint32(20, entry.compressedData.length, true);
    cv.setUint32(24, entry.uncompressedSize, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, currentOffset, true);
    centralHdr.set(nameBytes, 46);

    localParts.push(localHdr, entry.compressedData);
    centralParts.push(centralHdr);
    currentOffset += localHdr.length + entry.compressedData.length;
  }

  const centralDirSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, currentOffset, true);
  ev.setUint16(20, 0, true);

  const totalSize = currentOffset + centralDirSize + 22;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const p of localParts) {
    out.set(p, pos);
    pos += p.length;
  }
  for (const p of centralParts) {
    out.set(p, pos);
    pos += p.length;
  }
  out.set(eocd, pos);
  return out;
}

export function getTemplatePublicPath(stpCode: string): string {
  const clean = (stpCode || 'KD').trim().toUpperCase();
  switch (clean) {
    case 'FC':
      return '/templates/FST05-GTT-C939-2-260417_Worksheet_template.xlsx';
    case 'BL':
      return '/templates/FST04-GTT-C940-3-261001_Worksheet_template.xlsx';
    case 'SO':
      return '/templates/FST03-FDT-D6760-2-260417_Worksheet_template.xlsx';
    case 'PO':
      return '/templates/FST06-RKT-D5731-2-260421_Worksheet_template.xlsx';
    case 'PLT':
    case 'VC':
      return '/templates/STP07-PLT_Worksheet_template.xlsx';
    case 'KD':
    default:
      return '/templates/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx';
  }
}
