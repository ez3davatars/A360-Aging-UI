import argparse
import json
import os
import re
import sys
from pathlib import Path

import pandas as pd


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def find_config_path() -> Path:
    env = os.getenv("A360_CONFIG_PATH")
    if env:
        return Path(env)

    # repo root (expected): <repo>/python/a360_subject_cli.py
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


def sanitize_folder_name(text: str) -> str:
    # Keep letters/numbers/underscores, collapse repeats, trim
    s = text.strip()
    s = re.sub(r"\(.*?\)", "", s)  # remove parentheses content
    s = re.sub(r"[^A-Za-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s)
    s = s.strip("_")
    return s[:64] if len(s) > 64 else s


def next_subject_id(df_subj: pd.DataFrame) -> str:
    if "SubjectID" not in df_subj.columns or df_subj.empty:
        return "S001"

    max_n = 0
    for sid in df_subj["SubjectID"].astype(str).tolist():
        m = re.match(r"S(\d+)$", sid.strip(), re.IGNORECASE)
        if not m:
            continue
        max_n = max(max_n, int(m.group(1)))

    return f"S{max_n + 1:03d}"


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


def create_subject(args: argparse.Namespace) -> int:
    cfg = load_config()

    project_root = Path(cfg["projectRoot"])
    excel_path = Path(cfg["excelPath"])
    timeline_code = str(cfg.get("timelineCode", "A")).strip() or "A"
    timeline_folder_name = str(cfg.get("timelineFolderName", "TimelineA")).strip() or "TimelineA"

    base_generator = str(cfg.get("baseGenerator", "Gemini Flash 2.5 (NanoBanana Pro)"))
    default_workflow = str(cfg.get("defaultWorkflow", "A360_Aging_Progression_v1"))

    if not excel_path.exists():
        eprint(f"[ERROR] Excel not found: {excel_path}")
        return 2

    df_subj = pd.read_excel(excel_path, sheet_name="Subjects")
    df_img = pd.read_excel(excel_path, sheet_name="Images")

    sid = next_subject_id(df_subj)

    if (df_subj.get("SubjectID") == sid).any():
        eprint(f"[ERROR] Subject already exists in Excel: {sid}")
        return 2

    sex = args.sex.strip()
    ethnicity = args.ethnicity.strip()
    fitz = args.fitz.strip()
    notes = args.notes.strip()

    if not ethnicity:
        eprint("[ERROR] --ethnicity is required")
        return 2

    sex_folder = "Male" if sex.lower().startswith("m") else "Female" if sex.lower().startswith("f") else "Other"

    folder_name = args.folder_name.strip() if args.folder_name else sanitize_folder_name(ethnicity)
    if not folder_name:
        folder_name = f"Group_{sid}"

    subject_digits = sid[1:]
    subject_folder_name = f"subject{subject_digits}"

    base_path_rel = f"Aging/{sex_folder}/{folder_name}/{subject_folder_name}"

    subject_folder_abs = project_root / Path(base_path_rel)
    timeline_folder_abs = subject_folder_abs / timeline_folder_name

    if not args.dry_run:
        timeline_folder_abs.mkdir(parents=True, exist_ok=True)
        # Write a lightweight subject manifest (useful for ML pipelines that don't want to parse Excel)
        manifest = {
            "subjectId": sid,
            "sex": sex,
            "ethnicity": ethnicity,
            "fitzpatrickTone": fitz,
            "notes": notes,
            "folderName": folder_name,
            "basePathRel": base_path_rel,
            "timelineFolderName": timeline_folder_name,
            "timelineCode": timeline_code,
            "createdAt": pd.Timestamp.utcnow().isoformat(),
        }
        (subject_folder_abs / "subject_meta.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )


    # ---------------- Subjects row ----------------
    subj_row = {
        "SubjectID": sid,
        "Sex": sex,
        "Ethnicity_Group": ethnicity,
        "Folder_Name": folder_name,
        "Base_Path": base_path_rel,
        "Fitzpatrick_Tone": fitz,
        "Notes": notes,
        "Base_Generator": base_generator,
        "Default_Workflow": default_workflow,
        "Anchor_Ages": "20,70",
        "Image_Set_Status": "New - Awaiting anchors",
    }

    # Ensure all expected columns exist
    for col in subj_row.keys():
        if col not in df_subj.columns:
            df_subj[col] = pd.NA

    df_subj = pd.concat([df_subj, pd.DataFrame([subj_row])], ignore_index=True)

    # ---------------- Anchor Images rows ----------------
    def anchor_row(age: int):
        prompt_id = "NBP_BASE_20" if age == 20 else "NBP_BASE_70"
        run_id = f"GEM_{sid}_A{age:02d}"

        return {
            "ImageID": f"{sid}_A{age:02d}_Gem",
            "SubjectID": sid,
            "Sex": sex,
            "Ethnicity_Group": ethnicity,
            "Timeline": timeline_code,
            "TargetAge": age,
            "GenerationStage": "Gemini_Base",
            "SourceModelTool": base_generator,
            "WorkflowID": pd.NA,
            "BaseInput20_ID": pd.NA,
            "BaseInput70_ID": pd.NA,
            "PromptID": prompt_id,
            "RunID": run_id,
            "FolderPath": f"{base_path_rel}/{timeline_folder_name}",
            "Filename": f"{sid}_A{age:02d}.png",
            "LoRA_Settings": pd.NA,
            "Notes": f"Age {age} anchor generated with {base_generator}",
        }

    # Ensure all expected columns exist
    for col in df_img.columns:
        pass
    for col in [
        "ImageID",
        "SubjectID",
        "Sex",
        "Ethnicity_Group",
        "Timeline",
        "TargetAge",
        "GenerationStage",
        "SourceModelTool",
        "WorkflowID",
        "BaseInput20_ID",
        "BaseInput70_ID",
        "PromptID",
        "RunID",
        "FolderPath",
        "Filename",
        "LoRA_Settings",
        "Notes",
    ]:
        if col not in df_img.columns:
            df_img[col] = pd.NA

    # Do not create duplicates if someone re-runs with same sid
    df_img = pd.concat([df_img, pd.DataFrame([anchor_row(20), anchor_row(70)])], ignore_index=True)

    # Sort Images sheet
    df_img.sort_values(by=["SubjectID", "Timeline", "TargetAge"], inplace=True, kind="mergesort")
    df_img.reset_index(drop=True, inplace=True)

    df_prompts = build_prompts_df(df_subj, df_img, timeline_code)

    if args.dry_run:
        result = {
            "subjectId": sid,
            "sex": sex,
            "ethnicity": ethnicity,
            "fitzpatrickTone": fitz,
            "notes": notes,
            "basePathRel": base_path_rel,
            "subjectFolderAbs": str(subject_folder_abs),
            "timelineFolderAbs": str(timeline_folder_abs),
            "timelineFolderRel": f"{base_path_rel}/{timeline_folder_name}",
        }
        print(json.dumps(result, ensure_ascii=False))
        return 0

    # Write back (replace only those sheets)
    try:
        with pd.ExcelWriter(excel_path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df_subj.to_excel(writer, sheet_name="Subjects", index=False)
            df_img.to_excel(writer, sheet_name="Images", index=False)
            df_prompts.to_excel(writer, sheet_name="Prompts_Auto", index=False)
    except PermissionError:
        eprint("[ERROR] Permission denied writing Excel. Close the workbook and try again.")
        return 3

    result = {
        "subjectId": sid,
        "sex": sex,
        "ethnicity": ethnicity,
        "fitzpatrickTone": fitz,
        "notes": notes,
        "basePathRel": base_path_rel,
        "subjectFolderAbs": str(subject_folder_abs),
        "timelineFolderAbs": str(timeline_folder_abs),
        "timelineFolderRel": f"{base_path_rel}/{timeline_folder_name}",
    }

    print(json.dumps(result, ensure_ascii=False))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="A360 subject CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create-subject", help="Create a new subject (Excel + folders)")
    p_create.add_argument("--sex", required=True, help="Male or Female")
    p_create.add_argument("--ethnicity", required=True, help="Ethnicity_Group value")
    p_create.add_argument("--fitz", default="", help="Fitzpatrick_Tone")
    p_create.add_argument("--notes", default="", help="Notes")
    p_create.add_argument("--folder-name", default="", help="Override Folder_Name (optional)")
    p_create.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.cmd == "create-subject":
        return create_subject(args)

    eprint("Unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
