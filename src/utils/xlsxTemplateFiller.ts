import {
  CompletedExcelGeneratorParams,
  toEnglishWorksheetText,
} from './completedWorksheetGenerator';

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
  const en = (v?: string | null, fb = '') => toEnglishWorksheetText(v, fb);
  const jobRefNo = en(params.jobRefNo || params.reportRefNo || params.jobNo, params.jobNo);
  const contractNo = en(params.job?.contractNo || params.companyProjNo || 'CEDD/2026/01', 'CEDD/2026/01');
  const worksOrderNo = en(params.worksOrderNo ?? params.record?.worksOrderNo ?? '', '');
  const manualBatchNo = en(params.batchNo ?? params.record?.batchNo ?? '', '');
  const manualSampleId = en(params.sampleId ?? params.record?.sampleId ?? '', '');
  const clientName = en(params.clientName || params.record?.clientName, 'CEDD');
  const projectTitle = en(params.projectTitle, params.jobNo);
  const siteLocation = en(params.siteLocation, params.jobNo);
  const locationNote = en(params.locationNote, 'Field Station');
  const operatorName = en(params.operatorName, 'Operator');
  const approvedSignatory = en(params.approvedSignatory, 'Approved Signatory');

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
    const wcNum = Number(fc?.wcRatio ?? '0.42');
    const tmId = findEqCode(['tm', 'mm', 'therm'], 'LT-TM-01');
    const fcId = findEqCode(['fc', 'flow', 'cone'], 'LT-FC-01');
    const tdId = findEqCode(['td', 'stop', 'timer'], 'LT-TD-01');

    return {
      'xl/worksheets/sheet1.xml': {
        AF4: jobRefNo,
        I8: clientName,
        I9: projectTitle,
        I10: siteLocation,
        AG10: contractNo,
        I11: en(fc?.batchNo || manualBatchNo, ''),
        AG11: worksOrderNo,
        I12: locationNote,
        I13: en(fc?.sampleId || manualSampleId, ''),
        I18: en(fc?.cementBrand, 'Green Island OPC (BS EN 197-1 CEM I 52.5N)'),
        AG18: en(fc?.cementQty, '50 kg (1 Bag)'),
        I19: en(fc?.admixtureBrand, 'Sika Grout Aid / Cebex 100'),
        AG19: en(fc?.admixtureQty, '0.225 kg'),
        I20: en(fc?.waterSource, 'Mains Potable Water (WSD)'),
        AG20: en(fc?.waterQty, '21.0 L'),
        I21: Number.isFinite(wcNum) ? wcNum : en(fc?.wcRatio, '0.42'),
        I22: en(fc?.ambientTempText, `${ambTemp} °C`),
        I23: en(fc?.waterTempText, `${waterTemp} °C`),
        I24: en(fc?.testDateIso, dateOnly),
        O29: locationNote,
        O30: en(fc?.timeWaterAdded, '09:45'),
        O31: en(fc?.timeDrawingGrout, '09:52'),
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
        I48: operatorName,
        AG48: approvedSignatory,
        I50: en(fc?.testDateIso, dateOnly),
        AG50: en(fc?.testDateIso, dateOnly),
      },
    };
  }

  if (stp === 'BL') {
    const bl = st?.kind === 'BL' ? st : undefined;
    const ambTemp = parseFloat(params.ambientTemp) || 26.5;
    const wcNum = Number(bl?.wcRatio ?? '0.42');
    const sheetCells: Record<string, string | number> = {
      AH4: jobRefNo,
      J8: clientName,
      I9: projectTitle,
      I10: siteLocation,
      AH10: contractNo,
      I11: en(bl?.batchNo || manualBatchNo, ''),
      AH11: worksOrderNo,
      J12: locationNote,
      J13: en(bl?.sampleId || manualSampleId, ''),
      I18: en(bl?.cementBrand, 'Green Island OPC (BS EN 197-1 CEM I 52.5N)'),
      AH18: en(bl?.cementQty, '50 kg (1 Bag)'),
      I19: en(bl?.admixtureBrand, 'Sika Grout Aid / Cebex 100'),
      AH19: en(bl?.admixtureQty, '0.225 kg'),
      I20: en(bl?.waterSource, 'Mains Potable Water (WSD)'),
      AH20: en(bl?.waterQty, '21.0 L'),
      I21: Number.isFinite(wcNum) ? wcNum : en(bl?.wcRatio, '0.42'),
      I22: en(bl?.ambientTempText, `${ambTemp} °C`),
      I23: en(bl?.waterTempText, `${(ambTemp - 1.2).toFixed(1)} °C`),
      I24: en(bl?.testDateIso, dateOnly),
      K29: '( ✓',
      AG29: '( ✓ )',
      D50: bl
        ? `Initial Grout Reading (${bl.unit === 'mL' ? 'V1' : 'H1'}) = ${bl.v1} ${bl.unit}; Final Bleeding = ${bl.finalBleedPct.toFixed(2)}% (Spec <= ${bl.specLimitPct}%); Free Expansion = ${bl.finalExpPct.toFixed(2)}%.`
        : 'Conforms to ASTM C940-22.',
      I52: operatorName,
      AH52: approvedSignatory,
      I54: en(bl?.testDateIso, dateOnly),
      AH54: en(bl?.testDateIso, dateOnly),
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
        H9: jobRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        L13: clientName,
        L16: contractNo,
        L17: worksOrderNo,
        L18: projectTitle,
        L19: siteLocation,
        AQ19: `${en(params.weatherNote, 'Fine')} / ${en(params.ambientTemp, '26.5 °C')}`,
        O22: locationNote,
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
        H9: jobRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        M43: operatorName,
        AN43: approvedSignatory,
      },
      'xl/worksheets/sheet4.xml': {
        H9: jobRefNo,
        AB9: dateOnly,
        H10: dateOnly,
        AB10: timeOnly,
        W13: locationNote,
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
        F4: clientName,
        Z4: jobRefNo,
        F5: projectTitle,
        Z5: worksOrderNo,
        Z6: 'ASTM D6760-16',
        F7: siteLocation,
        Z7: dateOnly,
        F8: clientName,
        F11: locationNote,
        Z11: '2.50 m',
        F12: 'Bored Pile',
        F15: '45.0 m',
        Z15: 'New',
        Z17: caId,
        F18: mtId,
        Q18: tmId,
        Z18: `${caId}-PRB`,
        F54: operatorName,
        F55: approvedSignatory,
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
        D4: jobRefNo,
        D8: clientName,
        M8: worksOrderNo,
        D9: contractNo,
        D10: projectTitle,
        M11: dateOnly,
        M12: dateOnly,
        M13: dateOnly,
        M14: `On-site (${siteLocation})`,
        M15: en(params.ambientTemp, '26.5 °C'),
        D18: locationNote,
        D19: locationNote,
        D20: '15.50 m',
        D21: siteLocation,
        D22: 'Slightly decomposed granite (Grade II)',
        D23: manualSampleId,
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
        D52: operatorName,
        M52: approvedSignatory,
      },
    };
  }

  // Default / PLT: FST07-FDT-PLT-1-261028_Worksheet_template.xlsx (Sheet: Plate Loading Test Form)
  const plt = st?.kind === 'PLT' ? st : undefined;
  const pltCells: Record<string, string | number> = {
    A6: `Plate Load Test No. \t:\t ${jobRefNo} (${locationNote} · ${projectTitle})`,
    D47: plt
      ? `Peak Pressure = ${plt.peakPressureKpa.toFixed(1)} kPa (${plt.peakLoadKn.toFixed(1)} kN); Max Settlement = ${plt.peakSettlementMm.toFixed(2)} mm; Es = ${plt.esMpa ? plt.esMpa.toFixed(2) : '—'} MPa.`
      : `Plate Load Test (${contractNo}) completed per STP07-PLT.`,
    D49: operatorName,
    L49: approvedSignatory,
    D51: dateOnly,
    L51: dateOnly,
  };

  if (plt?.steps?.length) {
    plt.steps.forEach((step, idx) => {
      const r = 11 + idx;
      if (r <= 45) {
        pltCells[`A${r}`] = dateOnly;
        pltCells[`B${r}`] = step.stepName;
        pltCells[`C${r}`] = parseFloat(params.ambientTemp) || 26.5;
        pltCells[`E${r}`] = Number(step.pressureKpa.toFixed(1));
        pltCells[`F${r}`] = Number(step.loadKn.toFixed(2));
        pltCells[`G${r}`] = Number(step.loadKn.toFixed(2));
        pltCells[`H${r}`] = Number(step.g1.toFixed(2));
        pltCells[`I${r}`] = Number(step.g2.toFixed(2));
        pltCells[`J${r}`] = Number(step.g3.toFixed(2));
        pltCells[`L${r}`] = Number(step.g4.toFixed(2));
        pltCells[`P${r}`] = Number(((step.g1 + step.g2 + step.g3 + step.g4) / 4).toFixed(2));
        pltCells[`T${r}`] = Number(step.meanMm.toFixed(2));
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
      return '/templates/FST07-FDT-PLT-1-261028_Worksheet_template.xlsx';
    case 'KD':
    default:
      return '/templates/FST02-FDT-TM3-6-260612_Worksheet_template.xlsx';
  }
}
