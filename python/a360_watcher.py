import asyncio
import hashlib
import json
import os
import re
import shutil
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import pandas as pd

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError as e:
    print("[ERROR] Missing dependency: watchdog. Install: pip install watchdog", file=sys.stderr)
    raise

try:
    import websockets
except ImportError as e:
    print("[ERROR] Missing dependency: websockets. Install: pip install websockets", file=sys.stderr)
    raise


# ============================================================
# Utilities
# ============================================================

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_relpath(path: Path, root: Path) -> Optional[str]:
    """Return POSIX-style relative path if possible, else None."""
    try:
        rel = path.resolve().relative_to(root.resolve())
        return rel.as_posix()
    except Exception:
        return None


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    """Streaming SHA-256 for provenance / dedup."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk_size)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def find_config_path() -> Path:
    env = os.getenv("A360_CONFIG_PATH")
    if env:
        return Path(env)

    here = Path(__file__).resolve()
    candidates = [
        here.parent.parent / "a360.config.json",
        Path.cwd() / "a360.config.json",
    ]
    for p in candidates:
        if p.exists():
            return p

    raise FileNotFoundError(
        "Could not find a360.config.json. Set A360_CONFIG_PATH or place a360.config.json in the repo root."
    )


def load_config() -> dict:
    cfg_path = find_config_path()
    return json.loads(cfg_path.read_text(encoding="utf-8"))


def append_jsonl(path: Path, record: Dict[str, Any]) -> None:
    """Append one JSON line (best-effort)."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as e:
        eprint(f"[WARN] Failed to append jsonl: {path}: {e}")


# ============================================================
# Excel helpers
# ============================================================

def load_subject_map(df_subj: pd.DataFrame) -> Dict[str, str]:
    """SubjectID -> Base_Path mapping from Subjects sheet."""
    subject_map: Dict[str, str] = {}
    for _, row in df_subj.iterrows():
        sid = str(row.get("SubjectID", "")).strip()
        base_path = str(row.get("Base_Path", "")).strip()
        if sid and base_path:
            subject_map[sid] = base_path
    return subject_map


def load_subject_meta(df_subj: pd.DataFrame) -> Dict[str, Dict[str, str]]:
    """Lightweight subject metadata lookup for ML labels."""
    meta: Dict[str, Dict[str, str]] = {}
    for _, row in df_subj.iterrows():
        sid = str(row.get("SubjectID", "")).strip()
        if not sid:
            continue
        meta[sid] = {
            "Sex": str(row.get("Sex", "")).strip(),
            "Ethnicity_Group": str(row.get("Ethnicity_Group", "")).strip(),
            "Fitzpatrick_Tone": str(row.get("Fitzpatrick_Tone", "")).strip(),
            "Folder_Name": str(row.get("Folder_Name", "")).strip(),
            "Base_Path": str(row.get("Base_Path", "")).strip(),
        }
    return meta


def choose_template_row(df_img: pd.DataFrame, subject_id: str, timeline_code: str):
    """Pick a template Images row for a given subject."""
    try:
        base = df_img[(df_img["SubjectID"] == subject_id) & (df_img["Timeline"] == timeline_code)]
    except KeyError:
        return None

    if base.empty:
        return None

    # Prefer age 20 row if present
    if "TargetAge" in base.columns:
        anchor20 = base[base["TargetAge"].isin([20])]
        if not anchor20.empty:
            return anchor20.iloc[0]

    return base.iloc[0]


def build_prompts_df(df_subj: pd.DataFrame, df_img: pd.DataFrame, timeline_code: str) -> pd.DataFrame:
    """Build Prompts_Auto sheet from Subjects + Images."""

    def empty_df():
        return pd.DataFrame(
            columns=[
                "SubjectID",
                "Timeline",
                "TargetAge",
                "PromptType",
                "BaseImageID",
                "OutputImageID",
                "Sex",
                "Ethnicity_Group",
                "Fitzpatrick_Tone",
                "PromptText",
            ]
        )

    if "SubjectID" not in df_img.columns:
        return empty_df()

    subj_meta = {}
    if "SubjectID" in df_subj.columns:
        for _, r in df_subj.iterrows():
            sid = str(r.get("SubjectID", "")).strip()
            if sid:
                subj_meta[sid] = r

    records = []

    for _, row in df_img.iterrows():
        sid = str(row.get("SubjectID", "")).strip()
        if not sid:
            continue
        if str(row.get("Timeline", "")).strip() != timeline_code:
            continue

        age = row.get("TargetAge", None)
        if pd.isna(age):
            continue
        try:
            age_int = int(age)
        except Exception:
            continue

        meta = subj_meta.get(sid)

        sex = str(row.get("Sex", "")).strip()
        if not sex and meta is not None:
            sex = str(meta.get("Sex", "")).strip()

        ethnicity = str(row.get("Ethnicity_Group", "")).strip()
        if not ethnicity and meta is not None:
            ethnicity = str(meta.get("Ethnicity_Group", "")).strip()

        fitz = ""
        if meta is not None:
            fitz = str(meta.get("Fitzpatrick_Tone", "")).strip()

        face_features = ""
        if meta is not None:
            for col in ["Facial_Features", "Face_Features", "FaceNotes", "Notes"]:
                if col in meta.index:
                    face_features = str(meta[col]).strip()
                    if face_features:
                        break

        sex_lower = sex.lower()
        if sex_lower.startswith("m"):
            subj_word = "man"
            pronoun = "his"
        elif sex_lower.startswith("f"):
            subj_word = "woman"
            pronoun = "her"
        else:
            subj_word = "person"
            pronoun = "their"

        ethnicity_phrase = (ethnicity + " ") if ethnicity else ""
        fitz_phrase = f", Fitzpatrick Tone {fitz}" if fitz else ""
        features_phrase = f", {face_features}" if face_features else ""

        if age_int == 20:
            prompt_type = "Base_20"
            base_image_id = row.get("ImageID", None)
            text = (
                "Extreme close-up clinical portrait, hyper-detailed facial features, sharp skin texture, "
                "realistic pores, natural skin shine, high definition lighting, high-resolution 4000 x 4000, "
                "ultra-photorealistic, shallow depth of field, face in perfect focus, "
                f"of a {ethnicity_phrase}{subj_word}, {age_int} years old{fitz_phrase}{features_phrase}, "
                "full head from the clavicle and shoulders up, no clothing cover for medical reference, "
                "no dark shadows, soft white background, "
                f"DO NOT crop off the top of {pronoun} head."
            )
        else:
            base_image_id = f"{sid}_A20_Gem"
            prompt_type = "Age_70_from_20" if age_int == 70 else "Age_from_20"
            text = (
                f"Using the age 20 base clinical portrait of this same {ethnicity_phrase}{subj_word}, "
                f"naturally age {pronoun} to approximately {age_int} years old while fully preserving identity, "
                "facial structure, hairstyle, lighting, camera angle, composition, and the clinical studio aesthetic. "
                "Maintain hyper-detailed skin texture, realistic pores, sharp focus, and a soft white background. "
                f"Add age-appropriate features such as fine and deep wrinkles and realistic changes for a {age_int}-year-old."
            )

        out_image_id = row.get("ImageID", None)

        records.append(
            {
                "SubjectID": sid,
                "Timeline": timeline_code,
                "TargetAge": age_int,
                "PromptType": prompt_type,
                "BaseImageID": base_image_id,
                "OutputImageID": out_image_id,
                "Sex": sex,
                "Ethnicity_Group": ethnicity,
                "Fitzpatrick_Tone": fitz,
                "PromptText": text,
            }
        )

    if not records:
        return empty_df()

    df_prompts = pd.DataFrame(records)
    df_prompts.sort_values(by=["SubjectID", "Timeline", "TargetAge"], inplace=True, kind="mergesort")
    df_prompts.reset_index(drop=True, inplace=True)
    return df_prompts


# ============================================================
# Filename parsing
# ============================================================

def parse_subject_age_from_filename(path: Path) -> Tuple[Optional[str], Optional[int]]:
    """Parse subject + age from multiple filename patterns."""
    stem = path.stem

    # Preferred: S004_A45_00001_.png / S004_A70.png
    m = re.match(r"(S\d{3})_A(\d{1,3})", stem, re.IGNORECASE)
    if m:
        subject_id = m.group(1).upper()
        age = int(m.group(2))
        return subject_id, age

    # Legacy: subject004_age045_00008_.png
    m_old = re.match(r"subject(\d{3})_age(\d{3})", stem, re.IGNORECASE)
    if m_old:
        digits = m_old.group(1)
        age = int(m_old.group(2))
        return f"S{digits}", age

    return None, None


# ============================================================
# Watcher + WebSocket
# ============================================================

class Broadcaster:
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop
        self.clients = set()
        self._lock = threading.Lock()

    async def handler(self, websocket):
        with self._lock:
            self.clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            with self._lock:
                self.clients.discard(websocket)

    def send(self, event: dict):
        msg = json.dumps(event)
        with self._lock:
            clients = list(self.clients)

        for ws in clients:
            try:
                asyncio.run_coroutine_threadsafe(ws.send(msg), self.loop)
            except Exception:
                pass


def wait_for_stable_file(path: Path, timeout_s: float = 10.0, check_interval_s: float = 0.2) -> bool:
    """Wait for file size to stop changing."""
    start = time.time()
    last_size = -1

    while time.time() - start < timeout_s:
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            time.sleep(check_interval_s)
            continue

        if size == last_size and size > 0:
            return True

        last_size = size
        time.sleep(check_interval_s)

    return False


class AgeImageEventHandler(FileSystemEventHandler):
    def __init__(
        self,
        broadcaster: Broadcaster,
        excel_lock: threading.Lock,
        cfg: dict,
        df_subj: pd.DataFrame,
        subject_map: dict,
        df_img: pd.DataFrame,
    ):
        super().__init__()
        self.b = broadcaster
        self.lock = excel_lock
        self.cfg = cfg

        # Cached copies; will be refreshed before each Excel write to avoid overwriting UI changes
        self.df_subj = df_subj
        self.df_img = df_img
        self.subject_map = subject_map
        self.subject_meta = load_subject_meta(df_subj)

        self.project_root = Path(cfg["projectRoot"])
        self.excel_path = Path(cfg["excelPath"])
        self.timeline_code = str(cfg.get("timelineCode", "A")).strip() or "A"
        self.timeline_folder_name = str(cfg.get("timelineFolderName", "TimelineA")).strip() or "TimelineA"
        self.source_model_tool = str(cfg.get("sourceModelTool", "ComfyUI"))

        # ML-ledger outputs (JSONL)
        self.write_dataset_index = bool(cfg.get("writeDatasetIndex", True))
        self.hash_images = bool(cfg.get("hashImages", True))
        self.dataset_index_path = Path(
            cfg.get("datasetIndexPath") or (self.project_root / "dataset_index.jsonl")
        )

        self.write_event_log = bool(cfg.get("writeEventLog", True))
        self.event_log_path = Path(
            cfg.get("eventLogPath") or (self.project_root / "event_log.jsonl")
        )

    # -------------------------
    # Logging + WS emit
    # -------------------------

    def _emit(self, subject_id: str, age: int, status: str, path: Optional[str] = None, extra: Optional[dict] = None):
        event = {
            "subjectId": subject_id,
            "stage": "COMFY_OUTPUT",
            "image": f"A{age}",
            "status": status,
            "path": path,
            "timestamp": time.time(),
        }
        if extra:
            event.update(extra)

        # Broadcast to UI
        self.b.send(event)

        # Optional append-only event log (debug + auditing)
        if self.write_event_log:
            append_jsonl(
                self.event_log_path,
                {
                    "utc": utc_now_iso(),
                    "type": "WATCHER_EVENT",
                    **event,
                },
            )

    def _refresh_subjects_cache(self) -> None:
        """Refresh Subjects cache so new UI-created subjects are recognized."""
        try:
            df_subj = pd.read_excel(self.excel_path, sheet_name="Subjects")
            self.df_subj = df_subj
            self.subject_map = load_subject_map(df_subj)
            self.subject_meta = load_subject_meta(df_subj)
        except Exception as e:
            eprint(f"[WARN] Failed to refresh Subjects cache: {e}")

    def _get_subject_labels(self, subject_id: str) -> Dict[str, str]:
        return self.subject_meta.get(subject_id, {})

    # -------------------------
    # Watchdog handlers
    # -------------------------

    def on_created(self, event):
        if event.is_directory:
            return
        self._handle(Path(event.src_path))

    def on_moved(self, event):
        if event.is_directory:
            return
        self._handle(Path(event.dest_path))

    # -------------------------
    # Main per-file flow
    # -------------------------

    def _handle(self, src_path: Path):
        if not src_path.is_file() or src_path.suffix.lower() != ".png":
            return

        subject_id, age = parse_subject_age_from_filename(src_path)
        if subject_id is None or age is None:
            return

        self._emit(subject_id, age, "DETECTED", str(src_path))

        base_path_rel = self.subject_map.get(subject_id)
        if not base_path_rel:
            # Likely a new subject created while watcher is running; refresh and retry
            self._refresh_subjects_cache()
            base_path_rel = self.subject_map.get(subject_id)

        if not base_path_rel:
            self._emit(subject_id, age, "ERROR", str(src_path), {"reason": "NO_BASE_PATH"})
            eprint(f"[WARN] No Base_Path in Subjects sheet for {subject_id}; skipping {src_path.name}")
            return

        self._emit(subject_id, age, "VALIDATED", str(src_path))

        if not wait_for_stable_file(src_path):
            self._emit(subject_id, age, "ERROR", str(src_path), {"reason": "UNSTABLE_FILE"})
            eprint(f"[ERROR] File never stabilized: {src_path}")
            return

        subject_folder = self.project_root / Path(base_path_rel)
        timeline_folder = subject_folder / self.timeline_folder_name
        timeline_folder.mkdir(parents=True, exist_ok=True)

        dest_filename = f"{subject_id}_A{age:02d}.png"
        dest_path = timeline_folder / dest_filename

        overwrite = dest_path.exists()
        backup_path_str = None

        # Backup if overwriting
        if overwrite:
            backup_dir = timeline_folder / "_replaced"
            backup_dir.mkdir(parents=True, exist_ok=True)
            ts = time.strftime("%Y%m%d_%H%M%S")
            backup_path = backup_dir / f"{dest_filename}.{ts}.bak"
            try:
                shutil.move(str(dest_path), str(backup_path))
                backup_path_str = str(backup_path)
            except Exception as e:
                eprint(f"[WARN] Could not backup existing file: {dest_path} -> {backup_path}: {e}")

        try:
            shutil.copy2(str(src_path), str(dest_path))
        except Exception as e:
            self._emit(subject_id, age, "ERROR", str(src_path), {"reason": "COPY_FAILED"})
            eprint(f"[ERROR] Failed to copy {src_path} -> {dest_path}: {e}")
            return

        # Hash + size (outside Excel lock to keep ingestion fast)
        file_size = None
        file_hash = None
        try:
            file_size = dest_path.stat().st_size
            if self.hash_images:
                file_hash = sha256_file(dest_path)
        except Exception as e:
            eprint(f"[WARN] Could not compute size/hash for {dest_path}: {e}")

        self._emit(
            subject_id,
            age,
            "STORED",
            str(dest_path),
            {
                "overwrite": overwrite,
                "backupPath": backup_path_str,
                "sha256": file_hash,
                "bytes": file_size,
            },
        )

        # Excel update + dataset index write as one "ledgered" transaction
        with self.lock:
            self._emit(subject_id, age, "INGESTING", str(dest_path))
            try:
                excel_info = self._update_excel_fresh(subject_id, age, base_path_rel, dest_filename)
            except PermissionError:
                self._emit(subject_id, age, "ERROR", str(dest_path), {"reason": "EXCEL_LOCKED"})
                eprint("[ERROR] Permission denied writing Excel. Close the workbook and try again.")
                return
            except Exception as e:
                self._emit(subject_id, age, "ERROR", str(dest_path), {"reason": "EXCEL_UPDATE_FAILED"})
                eprint(f"[ERROR] Excel update failed: {e}")
                return

            # Append dataset index (ML-ready)
            if self.write_dataset_index:
                labels = self._get_subject_labels(subject_id)
                record = {
                    "schema": "A360_dataset_index_v1",
                    "utc": utc_now_iso(),
                    "subjectId": subject_id,
                    "timeline": self.timeline_code,
                    "age": age,
                    "stage": "TimelineImage",
                    "srcPath": str(src_path),
                    "destPath": str(dest_path),
                    "destRel": safe_relpath(dest_path, self.project_root),
                    "basePathRel": base_path_rel.replace("\\", "/"),
                    "timelineFolderName": self.timeline_folder_name,
                    "filename": dest_filename,
                    "imageId": excel_info.get("imageId"),
                    "runId": excel_info.get("runId"),
                    "overwrite": overwrite,
                    "backupPath": backup_path_str,
                    "bytes": file_size,
                    "sha256": file_hash,
                    "labels": {
                        "sex": labels.get("Sex", ""),
                        "ethnicity_group": labels.get("Ethnicity_Group", ""),
                        "fitzpatrick_tone": labels.get("Fitzpatrick_Tone", ""),
                    },
                }
                append_jsonl(self.dataset_index_path, record)

        self._emit(subject_id, age, "INGESTED", str(dest_path))

    # -------------------------
    # Excel update (fresh reload every time)
    # -------------------------

    def _update_excel_fresh(self, subject_id: str, age: int, base_path_rel: str, dest_filename: str) -> Dict[str, Any]:
        """Reload workbook, update Images row, rebuild Prompts_Auto, write back.

        This prevents the watcher from overwriting Subjects/Images edits performed by the UI
        while the watcher is running.
        """
        df_subj = pd.read_excel(self.excel_path, sheet_name="Subjects")
        df_img = pd.read_excel(self.excel_path, sheet_name="Images")

        # Update local caches immediately (so subsequent events have latest subject_map)
        self.df_subj = df_subj
        self.subject_map = load_subject_map(df_subj)
        self.subject_meta = load_subject_meta(df_subj)

        # Ensure required columns exist
        required_cols = ["SubjectID", "Timeline", "TargetAge", "FolderPath", "Filename", "ImageID"]
        for col in required_cols:
            if col not in df_img.columns:
                df_img[col] = pd.NA

        # Build target FolderPath and ImageID
        rel_folder = base_path_rel.rstrip("/\\") + "/" + self.timeline_folder_name
        rel_folder_norm = rel_folder.replace("\\", "/")
        image_id = f"{subject_id}_A{age:02d}_Gem"

        # Locate existing row
        mask = (
            (df_img["SubjectID"].astype(str).str.strip() == subject_id)
            & (df_img["Timeline"].astype(str).str.strip() == self.timeline_code)
            & (pd.to_numeric(df_img["TargetAge"], errors="coerce") == age)
        )

        run_id = f"CUI_{subject_id}_A{age:02d}_{time.strftime('%Y%m%d_%H%M%S')}"

        if mask.any():
            idx = df_img[mask].index[0]
        else:
            template = choose_template_row(df_img, subject_id, self.timeline_code)
            if template is not None:
                new_row = template.to_dict()
            else:
                new_row = {c: pd.NA for c in df_img.columns}
            new_row.update(
                {
                    "SubjectID": subject_id,
                    "Timeline": self.timeline_code,
                    "TargetAge": age,
                    "FolderPath": rel_folder_norm,
                    "Filename": dest_filename,
                    "ImageID": image_id,
                }
            )
            df_img = pd.concat([df_img, pd.DataFrame([new_row])], ignore_index=True)
            idx = df_img.index[-1]

        # Fill core columns
        df_img.at[idx, "SubjectID"] = subject_id
        df_img.at[idx, "Timeline"] = self.timeline_code
        df_img.at[idx, "TargetAge"] = age
        df_img.at[idx, "FolderPath"] = rel_folder_norm
        df_img.at[idx, "Filename"] = dest_filename
        df_img.at[idx, "ImageID"] = image_id

        # Improve metadata for non-anchor ages
        if age not in (20, 70):
            if "GenerationStage" in df_img.columns:
                df_img.at[idx, "GenerationStage"] = "ComfyUI_AgeGen"
            if "SourceModelTool" in df_img.columns:
                df_img.at[idx, "SourceModelTool"] = self.source_model_tool
            if "BaseInput20_ID" in df_img.columns:
                df_img.at[idx, "BaseInput20_ID"] = f"{subject_id}_A20_Gem"
            if "BaseInput70_ID" in df_img.columns:
                df_img.at[idx, "BaseInput70_ID"] = f"{subject_id}_A70_Gem"
            if "RunID" in df_img.columns:
                df_img.at[idx, "RunID"] = run_id

        # Sort + rebuild prompts
        sort_cols = [c for c in ["SubjectID", "Timeline", "TargetAge"] if c in df_img.columns]
        if sort_cols:
            df_img.sort_values(by=sort_cols, inplace=True, kind="mergesort")
            df_img.reset_index(drop=True, inplace=True)

        df_prompts = build_prompts_df(df_subj, df_img, self.timeline_code)

        # Write back
        with pd.ExcelWriter(self.excel_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_img.to_excel(writer, sheet_name="Images", index=False)
            df_prompts.to_excel(writer, sheet_name="Prompts_Auto", index=False)

        # Update cache after write
        self.df_img = df_img

        return {"imageId": image_id, "runId": run_id}


async def main_async():
    cfg = load_config()

    project_root = Path(cfg["projectRoot"])
    excel_path = Path(cfg["excelPath"])
    comfy_output_dir = Path(cfg["comfyOutputDir"])

    ws_host = cfg.get("wsHost", "127.0.0.1")
    ws_port = int(cfg.get("wsPort", 8765))

    if not excel_path.exists():
        raise SystemExit(f"Excel not found: {excel_path}")
    if not comfy_output_dir.exists():
        raise SystemExit(f"Comfy output directory not found: {comfy_output_dir}")
    if not project_root.exists():
        eprint(f"[WARN] projectRoot does not exist yet: {project_root} (folders will be created as needed)")

    # Load workbook (initial caches)
    df_subj = pd.read_excel(excel_path, sheet_name="Subjects")
    df_img = pd.read_excel(excel_path, sheet_name="Images")

    timeline_code = str(cfg.get("timelineCode", "A")).strip() or "A"

    # Sort Images sheet once at startup
    sort_cols = [c for c in ["SubjectID", "Timeline", "TargetAge"] if c in df_img.columns]
    if sort_cols:
        df_img.sort_values(by=sort_cols, inplace=True, kind="mergesort")
        df_img.reset_index(drop=True, inplace=True)

    subject_map = load_subject_map(df_subj)

    # Refresh Prompts_Auto once at startup (best-effort)
    try:
        df_prompts = build_prompts_df(df_subj, df_img, timeline_code)
        with pd.ExcelWriter(excel_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_prompts.to_excel(writer, sheet_name="Prompts_Auto", index=False)
    except PermissionError:
        raise SystemExit("Permission denied writing Excel. Close the workbook and restart the watcher.")

    loop = asyncio.get_running_loop()
    broadcaster = Broadcaster(loop)
    excel_lock = threading.Lock()

    handler = AgeImageEventHandler(
        broadcaster=broadcaster,
        excel_lock=excel_lock,
        cfg=cfg,
        df_subj=df_subj,
        subject_map=subject_map,
        df_img=df_img,
    )

    observer = Observer()
    observer.schedule(handler, str(comfy_output_dir), recursive=False)
    observer.start()

    print(f"[WATCHING] {comfy_output_dir}")
    print(f"[WS] ws://{ws_host}:{ws_port}")
    if handler.write_dataset_index:
        print(f"[INDEX] {handler.dataset_index_path}")
    if handler.write_event_log:
        print(f"[EVENTLOG] {handler.event_log_path}")

    async with websockets.serve(broadcaster.handler, ws_host, ws_port):
        try:
            await asyncio.Future()
        finally:
            observer.stop()
            observer.join()


def main():
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\n[STOP] Watcher stopped.")


if __name__ == "__main__":
    main()
