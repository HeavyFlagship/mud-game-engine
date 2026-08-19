/**
 * 游戏数值数据编辑器
 * - 直接读写云端工作区 mud-game-engine/assets/js/data/ 下的 JSON 数据文件与 xxx.schema.json 元数据文件
 * - 单文件，原生 http 模块，无外部依赖，内嵌完整前端 HTML/CSS/JS
 * - 用法: DE_PORT=3100 node data-editor.js
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.DE_PORT || 3100;
// 脚本位于 /workspace/.trae/skills/data-editor/，向上 3 层到 /workspace，再进 mud-game-engine 数据目录
const DATA_DIR = path.resolve(__dirname, '../../../mud-game-engine/assets/js/data');

// ---------------- 通用工具 ----------------

class ApiError extends Error {
  constructor(message, extra) {
    super(message);
    this.extra = extra || null;
  }
}

function safePath(name) {
  if (typeof name !== 'string' || !name) throw new Error('缺少文件名');
  const resolved = path.resolve(DATA_DIR, name);
  if (resolved !== DATA_DIR && !resolved.startsWith(DATA_DIR + path.sep)) throw new Error('路径越权');
  return resolved;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJsonFile(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

// ---------------- Schema 文件序列化 ----------------
// 现有 xxx.schema.json 的约定：原始值数组（如 options）内联单行，对象数组（如 fields）展开
// 为保持 schema 原样保存字节级一致，schema 写回使用此序列化器

function isPrimitiveArray(arr) {
  for (const x of arr) { if (x !== null && typeof x === 'object') return false; }
  return true;
}

function smartStringifyValue(value, indent) {
  const pad = ' '.repeat(indent);
  const padIn = ' '.repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (isPrimitiveArray(value)) return '[' + value.map(v => JSON.stringify(v)).join(', ') + ']';
    return '[\n' + value.map(v => padIn + smartStringifyValue(v, indent + 2)).join(',\n') + '\n' + pad + ']';
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return '{\n' + keys.map(k => padIn + JSON.stringify(k) + ': ' + smartStringifyValue(value[k], indent + 2)).join(',\n') + '\n' + pad + '}';
  }
  return JSON.stringify(value);
}

function writeSchemaFile(filePath, obj) {
  fs.writeFileSync(filePath, smartStringifyValue(obj, 0) + '\n', 'utf-8');
}

// ---------------- Schema 加载 ----------------

/** 扫描 DATA_DIR 下全部 *.schema.json，返回 [{schema, file, path}] */
function loadSchemas() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.schema.json'));
  const list = [];
  for (const f of files) {
    const p = path.join(DATA_DIR, f);
    try {
      const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (s && typeof s === 'object' && s.id) list.push({ schema: s, file: f, path: p });
    } catch (e) { /* 损坏的 schema 文件跳过 */ }
  }
  return list;
}

function buildSchemaIndex(list) {
  const m = new Map();
  for (const it of list) m.set(it.schema.id, it);
  return m;
}

/** map 库特殊：数据文件顶层为 {rooms, _grid, _zoneConfig, areas}，记录在 rooms 内 */
function isMapSchema(s) {
  return !!s && (s.id === 'map' || s.dataFile === 'map.json');
}

function loadDbData(schema) {
  return readJsonFile(safePath(schema.dataFile));
}

/** 取出记录源对象（records 结构为整个顶层对象；map 取 rooms；grouped-array 为顶层本身） */
function getRecordSource(data, schema) {
  return isMapSchema(schema) ? (data.rooms || {}) : data;
}

// ---------------- 记录读取与重组 ----------------

/** 把数据文件展开为记录列表：[{_key, ...字段}]；grouped-array 每组展开为条目并带 _index */
function getRecordsForSchema(schema) {
  const data = loadDbData(schema);
  const out = [];
  if (schema.structure === 'grouped-array') {
    const src = (data && typeof data === 'object') ? data : {};
    for (const gk of Object.keys(src)) {
      const arr = Array.isArray(src[gk]) ? src[gk] : [];
      arr.forEach((entry, i) => {
        const body = (entry && typeof entry === 'object' && !Array.isArray(entry)) ? entry : {};
        out.push(Object.assign({ _key: gk, _index: i }, body));
      });
    }
    return out;
  }
  const src = getRecordSource(data, schema) || {};
  for (const k of Object.keys(src)) {
    const body = (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) ? src[k] : {};
    out.push(Object.assign({ _key: k }, body));
  }
  return out;
}

/** 统计记录数（与 /api/records 返回条数一致：grouped-array 按展开条目计） */
function countRecords(schema) {
  const data = loadDbData(schema);
  const src = getRecordSource(data, schema) || {};
  if (schema.structure === 'grouped-array') {
    let n = 0;
    for (const k of Object.keys(src)) if (Array.isArray(src[k])) n += src[k].length;
    return n;
  }
  return Object.keys(src).length;
}

/** 记录体净化：去掉 _key/_index，保持传入键顺序；array/object 字段的 JSON 字符串还原为真实值 */
function normalizeRecord(schema, r) {
  const fmap = new Map((schema.fields || []).map(f => [f.name, f]));
  const out = {};
  for (const k of Object.keys(r)) {
    if (k === '_key' || k === '_index') continue;
    let v = r[k];
    const f = fmap.get(k);
    if (v !== null && v !== undefined && f && (f.type === 'array' || f.type === 'object') && typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { /* 校验已拦截，保留原值 */ }
    }
    out[k] = v;
  }
  return out;
}

/** 由记录列表重建数据文件对象（保持传入顺序；map 仅替换 rooms 并保留其余顶层键原顺序） */
function buildDataForSave(schema, records) {
  if (schema.structure === 'grouped-array') {
    const out = {};
    for (const r of records) {
      const gk = (r && r._key !== undefined && r._key !== null) ? String(r._key) : '';
      if (!(gk in out)) out[gk] = [];
      out[gk].push(normalizeRecord(schema, r || {}));
    }
    return out;
  }
  const recs = {};
  for (const r of records) {
    const key = (r && r._key !== undefined && r._key !== null) ? String(r._key) : '';
    recs[key] = normalizeRecord(schema, r || {});
  }
  if (isMapSchema(schema)) {
    const orig = loadDbData(schema);
    const merged = {};
    let placed = false;
    for (const k of Object.keys(orig)) {
      if (k === 'rooms') { merged.rooms = recs; placed = true; }
      else merged[k] = orig[k];
    }
    if (!placed) { merged.rooms = recs; }
    return merged;
  }
  return recs;
}

// ---------------- 数据校验 ----------------

/**
 * 校验记录列表，返回 {errors, warnings}
 * errors：主键缺失/为空、主键重复（grouped-array 分组键为空）、required 缺失或空串、
 *         number 非数字、boolean 非 true/false、enum 越界、array/object JSON 非法
 * warnings：ref 引用值在目标库不存在（目标库读不到则跳过）、未知字段
 */
function validateRecords(schema, records, schemaIndex) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(records)) { errors.push('records 必须为数组'); return { errors, warnings }; }
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const fmap = new Map(fields.map(f => [f.name, f]));
  const grouped = schema.structure === 'grouped-array';
  const seen = new Map(); // records 结构：主键 -> 首次出现下标
  const refKeyCache = new Map(); // refDatabase id -> Set<key> | null(读不到)

  const refKeySet = (dbId) => {
    if (refKeyCache.has(dbId)) return refKeyCache.get(dbId);
    let set = null;
    try {
      const entry = schemaIndex.get(dbId);
      if (entry) {
        const data = loadDbData(entry.schema);
        set = new Set(Object.keys(getRecordSource(data, entry.schema) || {}));
      }
    } catch (e) { set = null; }
    refKeyCache.set(dbId, set);
    return set;
  };

  records.forEach((r, i) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      errors.push('第' + (i + 1) + '条记录必须是对象');
      return;
    }
    const rawKey = r._key;
    const hasKey = rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '';
    const keyLabel = hasKey ? '「' + String(rawKey) + '」' : '（第' + (i + 1) + '条）';
    if (!hasKey) {
      errors.push('第' + (i + 1) + '条记录：' + (grouped ? '分组键' : '主键') + '为空');
    } else if (!grouped) {
      const ks = String(rawKey);
      if (seen.has(ks)) errors.push('主键「' + ks + '」重复（第' + (seen.get(ks) + 1) + '条与第' + (i + 1) + '条）');
      else seen.set(ks, i);
    }
    for (const f of fields) {
      const v = r[f.name];
      const fname = f.nameZh || f.name;
      const loc = '记录' + keyLabel + '字段「' + fname + '」';
      // 规范：required 检查"缺失或为空字符串"；null 是合法存储值（如 startupReq 默认 null 表示无需求）
      const missingRequired = v === undefined || v === '';
      if (f.required && missingRequired) { errors.push(loc + '：必填字段缺失或为空'); continue; }
      if (v === undefined || v === null || v === '') continue; // 未设置值跳过类型检查
      if (f.type === 'number') {
        if (typeof v !== 'number' || !isFinite(v)) errors.push(loc + '：值 ' + JSON.stringify(v) + ' 不是数字');
      } else if (f.type === 'boolean') {
        if (v !== true && v !== false) errors.push(loc + '：值必须为 true/false');
      } else if (f.type === 'enum') {
        const opts = Array.isArray(f.options) ? f.options : [];
        if (opts.indexOf(v) < 0) errors.push(loc + '：值 ' + JSON.stringify(v) + ' 不在选项 [' + opts.join('/') + '] 中');
      } else if (f.type === 'array' || f.type === 'object') {
        if (typeof v === 'string') {
          try { JSON.parse(v); } catch (e) { errors.push(loc + '：JSON 非法（' + e.message + '）'); }
        }
      } else if (f.type === 'ref' && f.refDatabase) {
        const set = refKeySet(f.refDatabase);
        if (set && !set.has(String(v))) {
          const entry = schemaIndex.get(f.refDatabase);
          warnings.push('记录' + keyLabel + '字段「' + fname + '」：引用值 ' + JSON.stringify(v) + ' 在目标库「' + (entry ? entry.schema.nameZh : f.refDatabase) + '」中不存在');
        }
      }
    }
    for (const k of Object.keys(r)) {
      if (k === '_key' || k === '_index') continue;
      if (!fmap.has(k)) warnings.push('记录' + keyLabel + '：存在未在元数据中定义的字段 "' + k + '"');
    }
  });
  return { errors, warnings };
}

/** 校验 schema 结构，返回错误列表（中文） */
function validateSchema(sch, dbId) {
  const errors = [];
  if (!sch || typeof sch !== 'object' || Array.isArray(sch)) return ['schema 必须是对象'];
  const topKeys = ['id', 'nameZh', 'description', 'globalVar', 'dataFile', 'primaryKey', 'recordNameZh', 'structure', 'fields'];
  for (const k of topKeys) if (!(k in sch)) errors.push('缺少顶层属性 "' + k + '"');
  if (typeof sch.id !== 'string' || !sch.id) errors.push('顶层属性 id 必须为非空字符串');
  else if (dbId !== undefined && sch.id !== dbId) errors.push('schema.id（' + sch.id + '）与 dbId（' + dbId + '）不一致');
  if (typeof sch.dataFile !== 'string' || !sch.dataFile) errors.push('顶层属性 dataFile 必须为非空字符串');
  if (sch.structure !== 'records' && sch.structure !== 'grouped-array') errors.push('structure 必须为 "records" 或 "grouped-array"');
  if (!Array.isArray(sch.fields)) { errors.push('fields 必须为数组'); return errors; }

  const props = ['name', 'nameZh', 'comment', 'type', 'required', 'default', 'options', 'refDatabase', 'scope'];
  const types = ['string', 'number', 'boolean', 'enum', 'ref', 'array', 'object'];
  const names = [];
  sch.fields.forEach((f, i) => {
    const label = (f && typeof f === 'object' && f.name) ? '「' + f.name + '」' : '（第' + (i + 1) + '个）';
    if (!f || typeof f !== 'object' || Array.isArray(f)) { errors.push('第' + (i + 1) + '个字段必须是对象'); return; }
    for (const p of props) if (!(p in f)) errors.push('字段' + label + '缺少属性 "' + p + '"');
    if (!f.name || typeof f.name !== 'string') errors.push('字段' + label + '的 name 必须为非空字符串');
    else names.push(f.name);
    if (types.indexOf(f.type) < 0) errors.push('字段' + label + '的类型 "' + f.type + '" 不合法（允许：' + types.join('/') + '）');
    if (f.type === 'enum' && (!Array.isArray(f.options) || f.options.length === 0)) errors.push('字段' + label + '为 enum 类型，必须提供非空 options');
    if (f.type === 'ref' && (typeof f.refDatabase !== 'string' || !f.refDatabase)) errors.push('字段' + label + '为 ref 类型，必须提供 refDatabase');
    if (typeof f.required !== 'boolean') errors.push('字段' + label + '的 required 必须为布尔值');
  });
  const dups = [];
  const nameSet = new Set();
  for (const n of names) { if (nameSet.has(n)) dups.push(n); nameSet.add(n); }
  if (dups.length) errors.push('字段名重复：' + Array.from(new Set(dups)).join('、'));
  if (sch.primaryKey !== null && sch.primaryKey !== undefined) {
    if (!nameSet.has(sch.primaryKey)) errors.push('primaryKey "' + sch.primaryKey + '" 未在 fields 中定义');
  }
  return errors;
}

// ---------------- API 路由 ----------------

async function handleAPI(req, res, u) {
  if (req.method !== 'POST') throw new Error('仅支持 POST 请求');
  const a = u.pathname.replace('/api/', '');
  const raw = await readBody(req);
  let b = {};
  if (raw && raw.trim() !== '') {
    try { b = JSON.parse(raw); } catch (e) { throw new Error('请求体不是合法 JSON'); }
  }
  if (!b || typeof b !== 'object') throw new Error('请求体必须是 JSON 对象');

  const schemaList = loadSchemas();
  const schemaIndex = buildSchemaIndex(schemaList);
  const findEntry = (dbId) => {
    if (!dbId) throw new Error('缺少 dbId 参数');
    const entry = schemaIndex.get(dbId);
    if (!entry) throw new Error('未找到数据库：' + dbId);
    return entry;
  };

  // 1. 库列表
  if (a === 'databases') {
    const list = [];
    for (const it of schemaList) {
      const s = it.schema;
      let count = -1;
      try { count = countRecords(s); } catch (e) { count = -1; }
      list.push({ id: s.id, nameZh: s.nameZh, description: s.description, recordCount: count, structure: s.structure, primaryKey: (s.primaryKey === undefined ? null : s.primaryKey) });
    }
    list.sort((x, y) => String(x.nameZh || x.id).localeCompare(String(y.nameZh || y.id), 'zh'));
    return { success: true, data: list };
  }

  // 2. 读取记录
  if (a === 'records') {
    const entry = findEntry(b.dbId);
    return { success: true, data: { schema: entry.schema, records: getRecordsForSchema(entry.schema) } };
  }

  // 3. 保存记录（先校验）
  if (a === 'records/save') {
    const entry = findEntry(b.dbId);
    if (!Array.isArray(b.records)) throw new Error('records 必须为数组');
    const { errors, warnings } = validateRecords(entry.schema, b.records, schemaIndex);
    if (errors.length) throw new ApiError('校验失败：存在 ' + errors.length + ' 处错误，未保存', { errors, warnings });
    const data = buildDataForSave(entry.schema, b.records);
    writeJsonFile(safePath(entry.schema.dataFile), data);
    return { success: true, data: { saved: b.records.length, warnings } };
  }

  // 4. 读取 schema
  if (a === 'schema') {
    const entry = findEntry(b.dbId);
    return { success: true, data: entry.schema };
  }

  // 5. 保存 schema（先校验）
  if (a === 'schema/save') {
    const entry = findEntry(b.dbId);
    const errors = validateSchema(b.schema, b.dbId);
    if (errors.length) throw new ApiError('元数据校验失败：存在 ' + errors.length + ' 处错误，未保存', { errors });
    writeSchemaFile(entry.path, b.schema);
    return { success: true, data: { saved: (Array.isArray(b.schema.fields) ? b.schema.fields.length : 0) } };
  }

  // 6. 仅校验
  if (a === 'validate') {
    const entry = findEntry(b.dbId);
    if (!Array.isArray(b.records)) throw new Error('records 必须为数组');
    const { errors, warnings } = validateRecords(entry.schema, b.records, schemaIndex);
    return { success: true, data: { errors, warnings } };
  }

  throw new Error('未知操作：' + a);
}

// ---------------- 内嵌前端 ----------------

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>数值数据编辑器</title>
<style>
:root{--bg:#0f1117;--surface:#1a1d27;--surface2:#232734;--border:#2d3142;--text:#e4e6eb;--muted:#8b8fa3;--brand:#7c6ef0;--brand-hover:#9485f5;--brand-soft:rgba(124,110,240,0.12);--danger:#f0556b;--warn:#ffb547;--ok:#3dd68c;--radius:8px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"SF Pro Text","PingFang SC",system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden}
.topbar{display:flex;align-items:center;gap:12px;padding:12px 20px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
.topbar h1{font-size:16px;font-weight:600;white-space:nowrap}
.dbname{font-size:13px;color:var(--brand);background:var(--brand-soft);padding:4px 12px;border-radius:12px;white-space:nowrap}
.dirtyWrap{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--border);display:inline-block}
.dot.on{background:var(--warn);box-shadow:0 0 6px rgba(255,181,71,.7)}
.dirtyText{color:var(--warn)}
.actions{margin-left:auto;display:flex;gap:8px}
.btn{padding:6px 14px;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:var(--radius);font-size:13px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.btn:hover{border-color:var(--brand);color:var(--brand)}
.btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-hover);color:#fff}
.main{display:flex;flex:1;overflow:hidden}
.panel{width:220px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface)}
.list{list-style:none}
.item{display:flex;align-items:center;gap:8px;padding:10px 16px;cursor:pointer;border-bottom:1px solid rgba(45,49,66,.5);transition:background .1s}
.item:hover{background:var(--surface2)}
.item.active{background:var(--brand-soft);border-left:3px solid var(--brand);padding-left:13px}
.item .name{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .count{font-size:12px;color:var(--muted);flex-shrink:0}
.empty{text-align:center;padding:40px 16px;color:var(--muted);font-size:13px}
.content{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tabs{display:flex;align-items:center;gap:4px;padding:8px 16px 0;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
.tab{padding:8px 18px;border:none;background:transparent;color:var(--muted);font-size:14px;cursor:pointer;border-radius:8px 8px 0 0;border-bottom:2px solid transparent}
.tab:hover{color:var(--text)}
.tab.active{color:var(--brand);border-bottom-color:var(--brand);background:var(--brand-soft)}
.tabhint{margin-left:auto;font-size:12px;color:var(--muted);padding-right:8px}
.tabpane{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.toolbar .count{font-size:13px;color:var(--muted)}
.toolbar .spacer{flex:1}
.tableWrap{flex:1;overflow:auto}
table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:13px}
th,td{border-bottom:1px solid var(--border);padding:4px 8px;white-space:nowrap;text-align:left;vertical-align:middle}
th{position:sticky;top:0;background:var(--surface2);z-index:2;font-weight:600;font-size:12px;color:var(--muted)}
th .req{color:var(--danger);margin-left:2px}
th.keyth{position:sticky;left:0;top:0;z-index:4;min-width:140px}
td.keycell{position:sticky;left:0;z-index:1;background:var(--bg);min-width:140px;box-shadow:1px 0 0 var(--border)}
td.optcell,th.opth{width:44px;text-align:center}
tr:hover td{background:rgba(124,110,240,.04)}
tr:hover td.keycell{background:var(--surface2)}
.cell{width:100%;min-width:100px;background:var(--bg);border:1px solid transparent;border-radius:4px;color:var(--text);padding:3px 6px;font-size:13px;outline:none;font-family:inherit}
.cell.string{min-width:160px}
.cell:hover{border-color:var(--border)}
.cell:focus{border-color:var(--brand)}
select.cell{cursor:pointer}
td.center{text-align:center}
.jsonBtn{padding:3px 10px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);border-radius:4px;font-size:12px;cursor:pointer}
.jsonBtn:hover{border-color:var(--brand);color:var(--brand)}
.delBtn{padding:3px 8px;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:4px;cursor:pointer;font-size:13px}
.delBtn:hover{color:var(--danger);border-color:var(--danger)}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.chip{display:flex;gap:6px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;max-width:100%}
.chip .k{color:var(--muted);flex-shrink:0}
.chip .v{color:var(--text);word-break:break-all}
.mf{width:100%;min-width:70px;background:var(--bg);border:1px solid transparent;border-radius:4px;color:var(--text);padding:3px 6px;font-size:13px;outline:none;font-family:inherit}
.mf:hover{border-color:var(--border)}
.mf:focus{border-color:var(--brand)}
.mf.wide{min-width:160px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:100}
.modal-overlay.active{display:flex}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;min-width:400px;max-width:560px}
.modal.wide{min-width:560px;max-width:760px}
.modal h2{font-size:16px;margin-bottom:16px}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
#jsonText{width:100%;height:280px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:12px;font-family:"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;font-size:13px;line-height:1.6;resize:vertical;outline:none;white-space:pre;tab-size:2}
#jsonText:focus{border-color:var(--brand)}
.jsonStat{margin-top:8px;font-size:12px}
.jsonStat.ok{color:var(--ok)}
.jsonStat.bad{color:var(--danger)}
#errList{list-style:none;max-height:320px;overflow-y:auto;font-size:13px;line-height:1.8}
#errList .err{color:var(--danger)}
#errList .warn{color:var(--warn)}
.toast{position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:var(--radius);font-size:14px;z-index:200;opacity:0;transform:translateY(10px);transition:all .25s;pointer-events:none}
.toast.show{opacity:1;transform:translateY(0)}
.toast.ok{background:var(--ok);color:#fff}
.toast.err{background:var(--danger);color:#fff}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
</style>
</head>
<body>
<div class="topbar"><span>🎮</span><h1>数值数据编辑器</h1><span class="dbname" id="curDbName">未选择数据库</span><span class="dirtyWrap"><span class="dot" id="dirtyDot"></span><span class="dirtyText" id="dirtyText"></span></span><div class="actions"><button class="btn btn-primary" id="btnSave">💾 保存</button></div></div>
<div class="main">
  <aside class="panel"><ul class="list" id="dbList"></ul></aside>
  <section class="content">
    <div class="tabs"><button class="tab active" data-tab="data">📊 数据</button><button class="tab" data-tab="meta">🧩 元数据</button><span class="tabhint">Ctrl+S 保存当前 Tab</span></div>
    <div class="tabpane" id="tabData">
      <div class="toolbar"><span class="count" id="recCount"></span><span class="spacer"></span><button class="btn" id="btnAddGroup">＋ 新增分组</button><button class="btn" id="btnAdd">＋ 新增记录</button></div>
      <div class="tableWrap"><table id="dataTable"><thead id="dth"></thead><tbody id="dtb"></tbody></table></div>
    </div>
    <div class="tabpane" id="tabMeta" style="display:none">
      <div class="chips" id="metaInfo"></div>
      <div class="toolbar"><span class="count" id="fieldCount"></span><span class="spacer"></span><button class="btn" id="btnAddField">＋ 新增字段</button></div>
      <div class="tableWrap"><table id="metaTable"><thead><tr><th>字段名</th><th>中文名</th><th>注释</th><th>类型</th><th>必填</th><th>默认值</th><th>enum 选项</th><th>引用库</th><th>作用域</th><th>操作</th></tr></thead><tbody id="mtb"></tbody></table></div>
    </div>
  </section>
</div>
<div class="modal-overlay" id="mJson"><div class="modal wide"><h2 id="jsonTitle">编辑 JSON</h2><textarea id="jsonText" spellcheck="false"></textarea><div class="jsonStat" id="jsonStat"></div><div class="modal-actions"><button class="btn" id="btnFmt">格式化</button><button class="btn" onclick="closeM('mJson')">取消</button><button class="btn btn-primary" id="jsonOk">确定</button></div></div></div>
<div class="modal-overlay" id="mErrors"><div class="modal wide"><h2 id="errTitle">校验未通过</h2><ul id="errList"></ul><div class="modal-actions"><button class="btn btn-primary" onclick="closeM('mErrors')">关闭</button></div></div></div>
<div class="toast" id="toast"></div>
<script>
var dbs=[],curDb=null,schema=null,records=[],metaFields=[],activeTab='data',dirtyData=false,dirtySchema=false;
var refCache={},refPending={},jsonEdit=null;

async function api(a,b){
  var j;
  try{
    var r=await fetch('/api/'+a,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});
    j=await r.json();
  }catch(e){throw new Error('网络请求失败');}
  if(!j.success){var err=new Error(j.error||'操作失败');err.data=j;throw err;}
  return j;
}
function esc(s){return String(s===null||s===undefined?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function isGrouped(){return !!schema&&schema.structure==='grouped-array'}
function pkField(){if(!schema||!schema.primaryKey)return null;for(var i=0;i<schema.fields.length;i++){if(schema.fields[i].name===schema.primaryKey)return schema.fields[i]}return null}
function toast(msg,t){var e=document.getElementById('toast');e.textContent=msg;e.className='toast show '+(t||'');setTimeout(function(){e.classList.remove('show')},2500)}
function closeM(id){document.getElementById(id).classList.remove('active')}

// ---------- 库列表 ----------
async function loadDbs(){
  var r=await api('databases');
  dbs=r.data||[];
  renderDbList();
}
function renderDbList(){
  var h='';
  for(var i=0;i<dbs.length;i++){
    var d=dbs[i];
    h+='<li class="item'+(d.id===curDb?' active':'')+'" data-id="'+esc(d.id)+'" title="'+esc(d.description||'')+'"><span class="name">'+esc(d.nameZh||d.id)+'</span><span class="count">'+(d.recordCount>=0?d.recordCount+' 条':'-')+'</span></li>';
  }
  document.getElementById('dbList').innerHTML=h||'<div class="empty">未发现数据库</div>';
}
async function selectDb(id){
  if(curDb===id)return;
  if((dirtyData||dirtySchema)&&!confirm('当前库有未保存的修改，切换后将丢失。确定切换？'))return;
  curDb=id;dirtyData=false;dirtySchema=false;
  try{
    var r=await api('records',{dbId:id});
    schema=r.data.schema;records=r.data.records||[];
    metaFields=(schema.fields||[]).map(function(f){return Object.assign({},f)});
    renderDbList();renderTable();renderMeta();ensureRefLists();updateStatus();
  }catch(e){toast(e.message,'err')}
}
async function reloadCurrent(){
  var r=await api('records',{dbId:curDb});
  schema=r.data.schema;records=r.data.records||[];
  metaFields=(schema.fields||[]).map(function(f){return Object.assign({},f)});
  renderTable();renderMeta();ensureRefLists();updateStatus();
}

// ---------- 数据 Tab：表格渲染 ----------
function renderTable(){
  renderTableHead();renderTableBody();
  document.getElementById('btnAddGroup').style.display=isGrouped()?'':'none';
  document.getElementById('btnAdd').textContent=isGrouped()?'＋ 新增条目':'＋ 新增记录';
}
function renderTableHead(){
  var pk=isGrouped()?'分组键':((pkField()?pkField().nameZh:'_key')+'（主键）');
  var h='<tr><th class="keyth">'+esc(pk)+'</th>';
  for(var i=0;i<schema.fields.length;i++){
    var f=schema.fields[i];
    var tip=f.name+(f.comment?' | '+f.comment:'')+(f.scope?' | '+f.scope:'');
    h+='<th title="'+esc(tip)+'">'+esc(f.nameZh||f.name)+(f.required?'<span class="req">*</span>':'')+'</th>';
  }
  h+='<th class="opth">操作</th></tr>';
  document.getElementById('dth').innerHTML=h;
}
function jsonLabel(v){
  if(v===null)return 'null';
  if(v===undefined)return '空';
  if(typeof v==='string'){
    if(v.trim()==='')return '空';
    try{return jsonLabel(JSON.parse(v))}catch(e){return '文本'}
  }
  if(Array.isArray(v))return '['+v.length+' 项]';
  if(typeof v==='object'){return '{'+Object.keys(v).length+' 键}'}
  return String(v);
}
function cellHtml(r,f,i){
  var v=r[f.name];
  var d='data-i="'+i+'" data-f="'+esc(f.name)+'"';
  if(f.type==='number')return '<td><input class="cell" '+d+' type="number" step="any" value="'+(v===null||v===undefined?'':esc(v))+'"></td>';
  if(f.type==='boolean')return '<td class="center"><input '+d+' type="checkbox"'+(v===true?' checked':'')+'></td>';
  if(f.type==='enum'){
    var h='<td><select class="cell" '+d+'><option value="">未设置</option>';
    var opts=f.options||[];
    for(var j=0;j<opts.length;j++){
      var sel=(v!==null&&v!==undefined&&v!==''&&String(v)===String(opts[j]))?' selected':'';
      h+='<option value="'+esc(opts[j])+'"'+sel+'>'+esc(opts[j])+'</option>';
    }
    return h+'</select></td>';
  }
  if(f.type==='ref')return '<td><input class="cell" '+d+' type="text" list="dl-'+esc(f.refDatabase)+'" value="'+(v===null||v===undefined?'':esc(v))+'"></td>';
  if(f.type==='array'||f.type==='object')return '<td><button type="button" class="jsonBtn" '+d+'>'+jsonLabel(v)+'</button></td>';
  return '<td><input class="cell string" '+d+' type="text" value="'+(v===null||v===undefined?'':esc(v))+'"></td>';
}
function renderTableBody(){
  var h='';
  for(var i=0;i<records.length;i++){
    var r=records[i]||{};
    h+='<tr><td class="keycell"><input class="cell cell-key" data-i="'+i+'" type="text" value="'+esc(r._key)+'" placeholder="'+(isGrouped()?'请输入分组键':'请输入主键')+'"></td>';
    for(var j=0;j<schema.fields.length;j++)h+=cellHtml(r,schema.fields[j],i);
    h+='<td class="optcell"><button type="button" class="delBtn" data-i="'+i+'" title="删除该记录">✕</button></td></tr>';
  }
  document.getElementById('dtb').innerHTML=h;
  document.getElementById('recCount').textContent='共 '+records.length+' 条'+(isGrouped()?'条目':'记录');
}

// ---------- 数据 Tab：单元格事件 ----------
function onCellInput(e){
  var t=e.target;
  var i=t.getAttribute('data-i');
  if(i===null||i===undefined)return;
  var idx=+i;
  var r=records[idx];if(!r)return;
  if(t.classList.contains('cell-key')){
    r._key=t.value;
    if(!isGrouped()&&schema.primaryKey){
      r[schema.primaryKey]=t.value;
      var pkEl=document.querySelector('#dtb .cell[data-i="'+idx+'"][data-f="'+schema.primaryKey+'"]');
      if(pkEl&&pkEl.tagName!=='BUTTON')pkEl.value=t.value;
    }
    markDataDirty();return;
  }
  var f=t.getAttribute('data-f');if(!f)return;
  var fd=null;
  for(var k=0;k<schema.fields.length;k++){if(schema.fields[k].name===f){fd=schema.fields[k];break}}
  if(!fd)return;
  if(fd.type==='number'){r[f]=(t.value==='')?null:Number(t.value)}
  else if(fd.type==='boolean'){r[f]=t.checked}
  else if(fd.type==='enum'){r[f]=(t.value==='')?null:t.value}
  else{r[f]=t.value}
  if(!isGrouped()&&f===schema.primaryKey){
    r._key=t.value;
    var keyEl=document.querySelector('#dtb .cell-key[data-i="'+idx+'"]');
    if(keyEl)keyEl.value=t.value;
  }
  markDataDirty();
}
function onCellClick(e){
  var t=e.target.closest('button');
  if(!t)return;
  var i=t.getAttribute('data-i');
  if(i===null||i===undefined)return;
  if(t.classList.contains('jsonBtn')){
    openJson(+i,t.getAttribute('data-f'));
  }else if(t.classList.contains('delBtn')){
    if(confirm('确定删除该记录？')){
      records.splice(+i,1);renderTableBody();markDataDirty();
    }
  }
}

// ---------- 数据 Tab：新增 ----------
function prefillRecord(key){
  var nr={_key:key};
  for(var i=0;i<schema.fields.length;i++){
    var f=schema.fields[i],d=f.default;
    if(f.required){nr[f.name]=(d===undefined?null:d);continue}
    if(d===null||d===undefined||d==='')continue;
    if(Array.isArray(d)&&d.length===0)continue;
    if(typeof d==='object'&&Object.keys(d).length===0)continue;
    nr[f.name]=d;
  }
  return nr;
}
function addRecord(){
  if(!schema)return;
  var key=isGrouped()?(records.length?records[records.length-1]._key:''):'';
  records.push(prefillRecord(key));
  renderTableBody();markDataDirty();scrollBottom();
}
function addGroup(){
  if(!schema)return;
  records.push(prefillRecord(''));
  renderTableBody();markDataDirty();scrollBottom();
}
function scrollBottom(){
  var w=document.querySelector('#tabData .tableWrap');
  if(w)w.scrollTop=w.scrollHeight;
}

// ---------- ref 目标库懒加载 ----------
function ensureRefLists(){
  if(!schema)return;
  var targets={};
  for(var i=0;i<schema.fields.length;i++){
    var f=schema.fields[i];
    if(f.type==='ref'&&f.refDatabase)targets[f.refDatabase]=1;
  }
  for(var t in targets)ensureRefList(t);
}
function ensureRefList(dbId){
  if(refCache[dbId]){buildDatalist(dbId);return Promise.resolve()}
  if(refPending[dbId])return refPending[dbId].then(function(){buildDatalist(dbId)});
  refPending[dbId]=api('records',{dbId:dbId}).then(function(r){
    refCache[dbId]={records:r.data.records||[]};
  }).catch(function(){
    refCache[dbId]={records:[]};
  });
  return refPending[dbId].then(function(){buildDatalist(dbId)});
}
function buildDatalist(dbId){
  var dl=document.getElementById('dl-'+dbId);
  if(dl)return;
  var info=refCache[dbId];if(!info)return;
  dl=document.createElement('datalist');dl.id='dl-'+dbId;
  var h='';
  for(var i=0;i<info.records.length;i++){
    var r=info.records[i];
    var nm=r.name||r.nameZh||'';
    h+='<option value="'+esc(r._key)+'">'+esc(r._key+(nm?' · '+nm:''))+'</option>';
  }
  dl.innerHTML=h;document.body.appendChild(dl);
}
function refreshRefCache(){
  refCache={};refPending={};
  var dls=document.querySelectorAll('datalist[id^="dl-"]');
  for(var i=0;i<dls.length;i++){if(dls[i].parentNode)dls[i].parentNode.removeChild(dls[i])}
  if(schema)ensureRefLists();
}

// ---------- JSON 编辑弹窗 ----------
function openJson(i,f){
  jsonEdit={i:i,f:f};
  var fd=null;
  for(var k=0;k<schema.fields.length;k++){if(schema.fields[k].name===f){fd=schema.fields[k];break}}
  document.getElementById('jsonTitle').textContent='编辑 JSON - '+(fd?(fd.nameZh||fd.name):f);
  var v=records[i][f];
  var txt=(v===null||v===undefined)?'':(typeof v==='string'?v:JSON.stringify(v,null,2));
  document.getElementById('jsonText').value=txt;
  jsonCheck();
  document.getElementById('mJson').classList.add('active');
  document.getElementById('jsonText').focus();
}
function jsonCheck(){
  var t=document.getElementById('jsonText').value;
  var st=document.getElementById('jsonStat');
  var ok=document.getElementById('jsonOk');
  if(t.trim()===''){st.textContent='空（保存为 null）';st.className='jsonStat ok';ok.disabled=false;return true}
  try{JSON.parse(t);st.textContent='✓ JSON 合法';st.className='jsonStat ok';ok.disabled=false;return true}
  catch(e){st.textContent='✗ JSON 非法：'+e.message;st.className='jsonStat bad';ok.disabled=true;return false}
}
function formatJson(){
  var t=document.getElementById('jsonText').value;
  if(t.trim()==='')return;
  try{document.getElementById('jsonText').value=JSON.stringify(JSON.parse(t),null,2)}
  catch(e){toast('JSON 非法，无法格式化','err');return}
  jsonCheck();
}
function confirmJson(){
  if(!jsonEdit)return;
  var t=document.getElementById('jsonText').value;
  var val=null;
  if(t.trim()!==''){try{val=JSON.parse(t)}catch(e){return}}
  records[jsonEdit.i][jsonEdit.f]=val;
  var btn=document.querySelector('#dtb .jsonBtn[data-i="'+jsonEdit.i+'"][data-f="'+jsonEdit.f+'"]');
  if(btn)btn.textContent=jsonLabel(val);
  markDataDirty();
  closeM('mJson');jsonEdit=null;
}

// ---------- 数据 Tab：校验与保存 ----------
function showErrors(errors,warnings){
  var h='';
  for(var i=0;i<errors.length;i++)h+='<li class="err">⛔ '+esc(errors[i])+'</li>';
  for(var j=0;j<warnings.length;j++)h+='<li class="warn">⚠️ '+esc(warnings[j])+'</li>';
  if(!h)h='<li>无</li>';
  document.getElementById('errList').innerHTML=h;
  document.getElementById('errTitle').textContent='校验未通过（'+errors.length+' 处错误 / '+warnings.length+' 处警告）';
  document.getElementById('mErrors').classList.add('active');
}
async function saveData(){
  if(!curDb){toast('请先选择数据库','err');return}
  var v;
  try{v=await api('validate',{dbId:curDb,records:records})}
  catch(e){if(e.data&&e.data.errors)showErrors(e.data.errors,e.data.warnings||[]);else toast(e.message,'err');return}
  var errs=(v.data&&v.data.errors)||[],warns=(v.data&&v.data.warnings)||[];
  if(errs.length){showErrors(errs,warns);return}
  if(warns.length){
    var msg='存在 '+warns.length+' 条警告：\\n'+warns.slice(0,5).join('\\n');
    if(warns.length>5)msg+='\\n（其余 '+(warns.length-5)+' 条略）';
    if(!confirm(msg+'\\n\\n仍要保存吗？'))return;
  }
  try{
    await api('records/save',{dbId:curDb,records:records});
    dirtyData=false;updateStatus();toast('保存成功','ok');
    refreshRefCache();loadDbs().catch(function(){});
  }catch(e){
    if(e.data&&e.data.errors)showErrors(e.data.errors,e.data.warnings||[]);
    else toast(e.message,'err');
  }
}

// ---------- 元数据 Tab ----------
function renderMeta(){
  var s=schema;
  var info=[['库 ID',s.id],['中文名',s.nameZh],['说明',s.description],['全局变量',s.globalVar],['数据文件',s.dataFile],['主键',(s.primaryKey===null||s.primaryKey===undefined)?'无（分组数组）':s.primaryKey],['记录名',s.recordNameZh],['结构',s.structure]];
  var h='';
  for(var i=0;i<info.length;i++)h+='<div class="chip"><span class="k">'+esc(info[i][0])+'</span><span class="v">'+esc(info[i][1])+'</span></div>';
  document.getElementById('metaInfo').innerHTML=h;
  renderMetaBody();
}
function typeOptions(cur){
  var ts=['string','number','boolean','enum','ref','array','object'];
  var h='';
  for(var i=0;i<ts.length;i++)h+='<option value="'+ts[i]+'"'+(ts[i]===cur?' selected':'')+'>'+ts[i]+'</option>';
  return h;
}
function refDbOptions(cur){
  var h='<option value="">（无）</option>';
  for(var i=0;i<dbs.length;i++)h+='<option value="'+esc(dbs[i].id)+'"'+(dbs[i].id===cur?' selected':'')+'>'+esc(dbs[i].id)+' · '+esc(dbs[i].nameZh)+'</option>';
  return h;
}
function defaultCell(f,i){
  var d='class="mf" data-i="'+i+'" data-p="default"';
  var v=f.default;
  if(f.type==='number')return '<input '+d+' type="number" step="any" value="'+(v===null||v===undefined?'':esc(v))+'">';
  if(f.type==='boolean'){
    var sel=(v===true)?'true':((v===false)?'false':'');
    return '<select '+d+'><option value=""'+(sel===''?' selected':'')+'>未设置</option><option value="true"'+(sel==='true'?' selected':'')+'>true</option><option value="false"'+(sel==='false'?' selected':'')+'>false</option></select>';
  }
  if(f.type==='array'||f.type==='object'){
    var t=(v===null||v===undefined)?'':(typeof v==='string'?v:JSON.stringify(v));
    return '<input '+d+' type="text" value="'+esc(t)+'" placeholder="JSON">';
  }
  return '<input '+d+' type="text" value="'+(v===null||v===undefined?'':esc(v))+'">';
}
function renderMetaBody(){
  var h='';
  for(var i=0;i<metaFields.length;i++){
    var f=metaFields[i];
    h+='<tr>'
      +'<td><input class="mf" data-i="'+i+'" data-p="name" type="text" value="'+esc(f.name)+'"></td>'
      +'<td><input class="mf" data-i="'+i+'" data-p="nameZh" type="text" value="'+esc(f.nameZh)+'"></td>'
      +'<td><input class="mf wide" data-i="'+i+'" data-p="comment" type="text" value="'+esc(f.comment||'')+'"></td>'
      +'<td><select class="mf" data-i="'+i+'" data-p="type">'+typeOptions(f.type)+'</select></td>'
      +'<td class="center"><input class="mf" data-i="'+i+'" data-p="required" type="checkbox"'+(f.required?' checked':'')+'></td>'
      +'<td>'+defaultCell(f,i)+'</td>'
      +'<td><input class="mf" data-i="'+i+'" data-p="options" type="text" value="'+esc((f.options||[]).join(','))+'" placeholder="逗号分隔"'+(f.type==='enum'?'':' disabled')+'></td>'
      +'<td><select class="mf" data-i="'+i+'" data-p="refDatabase">'+refDbOptions(f.refDatabase)+'</select></td>'
      +'<td><input class="mf" data-i="'+i+'" data-p="scope" type="text" value="'+esc(f.scope||'')+'"></td>'
      +'<td class="optcell"><button type="button" class="delBtn" data-i="'+i+'" title="删除该字段">✕</button></td>'
      +'</tr>';
  }
  document.getElementById('mtb').innerHTML=h;
  document.getElementById('fieldCount').textContent='共 '+metaFields.length+' 个字段';
}
function onMetaInput(e){
  var t=e.target;
  var i=t.getAttribute('data-i');
  if(i===null||i===undefined)return;
  var f=metaFields[+i];if(!f)return;
  var p=t.getAttribute('data-p');if(!p)return;
  if(p==='required'){f.required=t.checked}
  else if(p==='type'){f.type=t.value;renderMetaBody();markSchemaDirty();return}
  else if(p==='options'){f.options=t.value.split(',').map(function(s){return s.trim()}).filter(function(s){return s!==''})}
  else if(p==='refDatabase'){f.refDatabase=(t.value==='')?null:t.value}
  else if(p==='default'){
    if(f.type==='number')f.default=(t.value==='')?null:Number(t.value);
    else if(f.type==='boolean')f.default=(t.value==='')?null:(t.value==='true');
    else f.default=t.value;
  }
  else{f[p]=t.value}
  markSchemaDirty();
}
function onMetaClick(e){
  var t=e.target.closest('button');
  if(!t)return;
  var i=t.getAttribute('data-i');
  if(i===null||i===undefined)return;
  if(t.classList.contains('delBtn')){
    var f=metaFields[+i];
    if(confirm('确定删除字段「'+((f&&(f.nameZh||f.name))||'')+'」？')){
      metaFields.splice(+i,1);renderMetaBody();markSchemaDirty();
    }
  }
}
function addField(){
  if(!schema)return;
  metaFields.push({name:'',nameZh:'',comment:'',type:'string',required:false,default:'',options:[],refDatabase:null,scope:null});
  renderMetaBody();markSchemaDirty();
}
function buildSchemaForSave(){
  var fields=metaFields.map(function(f){
    var nf={name:f.name,nameZh:f.nameZh,comment:f.comment,type:f.type,required:f.required,default:f.default,options:(f.options||[]),refDatabase:(f.refDatabase||null),scope:(f.scope||null)};
    if((nf.type==='array'||nf.type==='object')&&typeof nf.default==='string'){
      var t=nf.default.trim();
      if(t===''){nf.default=null}
      else{try{nf.default=JSON.parse(t)}catch(e){}}
    }
    return nf;
  });
  return Object.assign({},schema,{fields:fields});
}
async function saveSchemaMeta(){
  if(!curDb){toast('请先选择数据库','err');return}
  if(dirtyData&&!confirm('数据 Tab 有未保存修改，保存元数据后将重新加载记录，未保存的数据修改将丢失。继续？'))return;
  var sch=buildSchemaForSave();
  try{
    await api('schema/save',{dbId:curDb,schema:sch});
    dirtySchema=false;updateStatus();toast('元数据已保存','ok');
    await reloadCurrent();
  }catch(e){
    if(e.data&&e.data.errors)showErrors(e.data.errors,[]);
    else toast(e.data&&e.data.error?e.data.error:e.message,'err');
  }
}

// ---------- Tab / 状态 / 快捷键 ----------
function setTab(t){
  if(t===activeTab)return;
  var curDirty=(activeTab==='data')?dirtyData:dirtySchema;
  if(curDirty&&!confirm('当前 Tab 有未保存修改，确定切换？'))return;
  activeTab=t;
  var tabs=document.querySelectorAll('.tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-tab')===t);
  document.getElementById('tabData').style.display=(t==='data')?'flex':'none';
  document.getElementById('tabMeta').style.display=(t==='meta')?'flex':'none';
  updateStatus();
}
function markDataDirty(){if(!dirtyData){dirtyData=true;updateStatus()}}
function markSchemaDirty(){if(!dirtySchema){dirtySchema=true;updateStatus()}}
function updateStatus(){
  document.getElementById('curDbName').textContent=schema?(schema.nameZh||curDb):(curDb||'未选择数据库');
  var dirty=(activeTab==='data')?dirtyData:dirtySchema;
  document.getElementById('dirtyDot').className='dot'+(dirty?' on':'');
  document.getElementById('dirtyText').textContent=dirty?'未保存':'';
}
function saveActive(){if(activeTab==='data')saveData();else saveSchemaMeta()}

// ---------- 事件绑定与启动 ----------
function bindEvents(){
  document.getElementById('dbList').addEventListener('click',function(e){
    var li=e.target.closest('li.item');
    if(li)selectDb(li.getAttribute('data-id'));
  });
  var dtb=document.getElementById('dtb');
  dtb.addEventListener('input',onCellInput);
  dtb.addEventListener('change',onCellInput);
  dtb.addEventListener('click',onCellClick);
  var mtb=document.getElementById('mtb');
  mtb.addEventListener('input',onMetaInput);
  mtb.addEventListener('change',onMetaInput);
  mtb.addEventListener('click',onMetaClick);
  var tabs=document.querySelectorAll('.tab');
  for(var i=0;i<tabs.length;i++){(function(btn){btn.addEventListener('click',function(){setTab(btn.getAttribute('data-tab'))})})(tabs[i])}
  document.getElementById('btnSave').addEventListener('click',saveActive);
  document.getElementById('btnAdd').addEventListener('click',addRecord);
  document.getElementById('btnAddGroup').addEventListener('click',addGroup);
  document.getElementById('btnAddField').addEventListener('click',addField);
  document.getElementById('jsonOk').addEventListener('click',confirmJson);
  document.getElementById('btnFmt').addEventListener('click',formatJson);
  document.getElementById('jsonText').addEventListener('input',jsonCheck);
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){e.preventDefault();saveActive()}
  });
  var overlays=document.querySelectorAll('.modal-overlay');
  for(var j=0;j<overlays.length;j++){(function(m){m.addEventListener('click',function(e){if(e.target===m)m.classList.remove('active')})})(overlays[j])}
}
async function init(){
  bindEvents();
  try{
    await loadDbs();
    if(dbs.length)await selectDb(dbs[0].id);
  }catch(e){toast(e.message,'err')}
}
init();
</script></body></html>`;

// ---------------- 服务器 ----------------

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname === '/' || u.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML);
      return;
    }
    if (u.pathname.startsWith('/api/')) {
      const result = await handleAPI(req, res, u);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    const body = (err instanceof ApiError)
      ? Object.assign({ success: false, error: err.message }, err.extra || {})
      : { success: false, error: err.message };
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`数值数据编辑器已启动: http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
