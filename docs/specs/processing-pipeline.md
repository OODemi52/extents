# Processing Pipeline

This spec defines how images are processed from ingest through to display and export.

The pipeline operates in a **scene-referred workflow**, where image data is kept in a linear, high-dynamic-range representation for as long as possible. Conversion to display-referred output occurs only at the final stages.

---

## Pipeline Overview

### Pipeline Stages

1. Ingest / Input
2. Preprocessing (technical normalization)
3. Scene-linear adjustments
4. Perceptual (log-domain) adjustments
5. Tone mapping
6. Display transform
7. Output (Display and Export)

At present, pipeline stages are fixed in order and cannot be reordered by the user. This may be revisited in future versions.

---

### Working Image (Intermediate Representation)

After ingest and normalization, all images must conform to a single internal representation:

- Color space: **Linear Rec.2020**
- Data type: **Float32 per channel**
- Channels: **RGB (alpha optional, not required for core processing)**

This representation is referred to as the **working image** and is the input to all pipeline stages after ingest.

---

## Pipeline Stage Breakdowns

---

### 1. Ingest / Input

The ingest stage is responsible for decoding image files and converting them into the working image format.

This stage must be **agnostic to container format**.

#### Input:
- RAW (e.g. CR2, NEF, ARW)
- Raster (JPEG, PNG, TIFF, etc.)

#### Responsibilities:
- Decode file data into an intermediate buffer (e.g. RGBA8, RGBA16, or RAW sensor data)
- Convert decoded data into:
  - **Linear light**
  - **Rec.2020 color space**
  - **Float32 representation**

#### Output:
- Working image (Linear Rec.2020, Float32)

> Note:
> The pipeline *begins* after this stage. All subsequent processing assumes a valid working image.

---

### 2. Preprocessing (Technical Normalization)

This stage applies required technical corrections before user-driven edits.

#### Applies to:
- **RAW images (required)**
- Raster images (minimal or no-op, depending on metadata availability)

#### Responsibilities (RAW):
- Demosaicing (Bayer → RGB)
- Black level correction
- White balance (camera metadata baseline)
- Camera color transform (camera space → working space)
- Optional lens corrections (distortion, vignetting, CA)
- Orientation and crop normalization

#### Output:
- Normalized working image in Linear Rec.2020 (Float32)

> Note:
> This stage is not considered "creative editing". It establishes a physically meaningful baseline.

---

### 3. Scene-Linear Adjustments

This stage performs operations that must remain physically correct in linear light.

#### Allowed operations:
- Exposure (multiplication by powers of 2)
- White balance refinement (channel scaling)

#### Constraints:
- All operations must operate in **linear space**
- No gamma or perceptual transforms allowed

---

### 4. Perceptual (Log-Domain) Adjustments

This stage handles adjustments that are better expressed in perceptual space.

#### Allowed operations:
- Contrast
- Tonal shaping
- Global tone adjustments

#### Behavior:
- Operations may internally convert to a **logarithmic or perceptual domain**
- Processing must return to linear space before exiting the stage

> Note:
> This enables more intuitive controls without breaking the scene-referred pipeline.

---

### 5. Tone Mapping

This stage compresses scene-referred dynamic range into a displayable range.

#### Purpose:
- Map high dynamic range scene data → limited display range

#### Constraints:
- Must occur **after all scene-referred edits**
- Produces a display-referred intermediate (still in working color space)

---

### 6. Display Transform

This stage converts the image into the target display color space.

#### Responsibilities:
- Convert from Linear Rec.2020 → target display space (e.g. sRGB / Rec.709)
- Apply gamma / transfer function (e.g. sRGB EOTF)

#### Output:
- Display-referred image ready for presentation or encoding

---

### 7. Output

This stage handles final rendering and export.

#### Display:
- GPU-based rendering (e.g. via wgpu)
- May use reduced resolution or cached representations

#### Export:
- Full-resolution render
- User-selectable output format (JPEG, PNG, TIFF, etc.)
- User-selectable color space (initially sRGB)

#### Constraint:
- Display and export must follow **identical pipeline logic** using the same edit recipe

---

## Key Principles

- The pipeline operates on a **single canonical working image**
- All creative edits occur in **scene-referred space**
- Precision loss must be avoided before tone mapping
- Display conversion is **strictly a final-stage operation**
- The pipeline is **deterministic and ordered**
