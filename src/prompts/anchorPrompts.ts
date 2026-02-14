// src/prompts/anchorPrompts.ts

/**
 * ============================================================
 * Anchor Prompt Canonical Templates
 * ============================================================
 *
 * CHANGE POLICY:
 * - These templates are IMMUTABLE once published.
 * - Any change requires a VERSION BUMP.
 * - Old versions must be preserved for dataset traceability.
 */

/* =======================
   A20 — CANONICAL ANCHOR
   ======================= */

export const A20_PROMPT_VERSION = "A20_v1.3";

export function buildA20AnchorPrompt(params: {
  sex: string;
  ethnicity: string;
  fitzpatrick: string;
  faceShape?: string;
  facialFeatures?: string;
  hair?: string;
  markers?: string;
  scarIntensity?: string;
  imperfectionIntensity?: string;
}): string {
  const {
    sex,
    ethnicity,
    fitzpatrick,
    faceShape,
    facialFeatures,
    hair,
    markers,
    scarIntensity,
    imperfectionIntensity,
  } = params;

  return `
STRICT STUDIO CONDITIONS (NON-NEGOTIABLE):

- Plain soft white seamless background only.
- No room, walls, furniture, shadows, textures, gradients, or environmental elements.
- Background must be uniform, clinical, and textureless.
- No interior scene context of any kind.

COMPOSITION & FRAMING (MANDATORY):

- Full head and entire scalp fully visible.
- 5–10% headroom above crown.
- Head vertically centered.
- Eye line positioned at horizontal midline.
- Both clavicles fully visible and clearly defined.
- Entire neck visible from jawline to collarbone.
- Lower frame must sit below clavicle line.
- Do NOT crop at throat.
- Do NOT push subject downward to create headroom.
- Framing must show complete head, full neck, and both collarbones.

Clinical head-and-shoulders portrait, hyper-detailed facial features, sharp skin texture, realistic pores, natural skin shine, high definition lighting, high-resolution 4000 x 4000, ultra-photorealistic, shallow depth of field, face in perfect focus, of a ${ethnicity} ${sex.toLowerCase()}, 20 years old, Fitzpatrick Tone ${fitzpatrick}.

IDENTITY FEATURES (CRITICAL):

- Face shape: ${faceShape || "not specified"}
- Facial structure: ${facialFeatures || "not specified"}
- Hair characteristics: ${hair || "not specified"}
- Scar detail: ${scarIntensity}${markers ? `, located ${markers}` : ""}
- Freckles and skin imperfections: ${imperfectionIntensity}

These identity features must be clearly visible and represented exactly at the specified intensity level.
Do NOT exaggerate beyond the described intensity.
Do NOT reduce below the described intensity.

FAIL CONDITIONS:

- If background is not plain white and seamless, regenerate.
- If head is not centered, regenerate.
- If top of head is cropped, regenerate.
- If clavicles are not fully visible, regenerate.
- If identity features are omitted, regenerate.
`.trim();
}

/* =======================
   A70 — AGED DERIVATIVE
   ======================= */

export const A70_PROMPT_VERSION = "A70_v1.3";

export function buildA70AnchorPrompt(params: {
  fitzpatrick: string;
}): string {
  const { fitzpatrick } = params;

  return `
Age the subject in the provided reference image naturally to approximately 70 years old while fully preserving identity.

REFERENCE PRIORITY (STRICT):
Facial geometry and proportions > identity-defining features > hair pattern and facial planes > skin texture > aging effects.

IDENTITY LOCK (CRITICAL — NON-NEGOTIABLE):
- Preserve exact mouth shape, lip thickness, lip width, and philtrum length.
- Preserve jaw width, jaw angle, and chin shape; do NOT narrow, sharpen, or reshape the jaw.
- Preserve nose width, nostril shape, nasal bridge, and nasal tip exactly.
- Preserve eye shape, eyelid structure, eye spacing, and brow position exactly.
- Preserve overall skull shape and facial proportions without reinterpretation.
- Do NOT alter facial proportions under any circumstances.

HAIR PATTERN & AGE-APPROPRIATE LOSS (FIXED BIOLOGICAL MODEL):

- Preserve the exact hairline shape, parting location, strand direction, and natural lay pattern from the reference image.
- Apply biologically plausible age-related thinning consistent with a typical 70-year-old male.
- Hair density must be visibly reduced compared to the reference image.
- Introduce moderate thinning at the crown and temples.
- Mild, natural hairline recession is allowed but must follow the original hairline geometry.
- Do NOT introduce new bald patterns.
- Do NOT dramatically reshape the hairline.
- Do NOT thicken hair or change strand behavior.
- Introduce uneven, natural greying that follows original strand distribution.
- Hair should appear thinner, slightly sparser, and age-appropriate, but not fully bald unless original pattern suggests it.

AGING APPLICATION (REALISTIC AND CONTROLLED):
Apply age progression appropriate for a 70-year-old subject with Fitzpatrick Tone ${fitzpatrick}, including:
- Natural skin laxity without structural distortion
- Fine and deep wrinkles consistent with age and skin type
- Age-appropriate texture changes and pore visibility
- Realistic deepening of nasolabial folds
- Subtle but visible volume loss beneath the cheekbones and along the jawline
- Mild under-eye hollowing without altering eye shape

MIDFACE PRESERVATION:
- Do NOT flatten or compress facial planes.
- Maintain original cheek projection and philtrum depth.
- Aging should deepen folds without altering structural geometry.

DO NOT APPLY:
- No caricature aging
- No exaggerated sagging
- No facial reshaping
- No cosmetic or artistic stylization
- No changes to expression, pose, or symmetry

COMPOSITION & FRAMING (MUST MATCH REFERENCE IMAGE):
- Maintain identical camera angle, distance, and perspective as the reference image.
- Full head visible, including entire scalp and hairline.
- Head vertically centered.
- Both clavicles fully visible.
- Background must remain plain soft white and seamless.

OUTPUT REQUIREMENTS:
- Photorealistic, high-resolution output matching the reference image quality.
- No smoothing, no beautification, no artistic interpretation.

FAIL CONDITIONS:
- If identity resemblance is reduced, regenerate.
- If hair pattern changes instead of thinning naturally, regenerate.
- If hair density is not visibly reduced compared to the reference, regenerate.
- If framing deviates from the reference image, regenerate.
`.trim();
}
