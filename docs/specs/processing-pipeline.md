# Processing Pipeline (v1)

This spec serves to outline/define how images are processed after initial ingest, until display/export.

The pipeline will be scene referred then converted display referred at display/export time.

---

## Pipeline Overview


### Pipeline Stages

1. Ingest/Input
2. Preprocessing (technical normalization)
3. Scene-linear adjustments
4. Log adjustments
5. Tone mapping
6. Display transform
7. Output (Display and Export)

At the moment, users wont have the ability to reorder, but this is something that can be reconsidered later.

### Intermediate/Working Image
After ingest and before ouput (the intermediate stage), the image will be processed in a wide gamut color space, in this case ```Linear Rec.2020```. Each channel (RGBA) will use ```Float32``` 

---

## Pipeline Stage Breakdowns

### 1. Ingest/Input

The pipeline should be operate in a way that ingest is agnostic to the image container format.

Input:
- RAW or Raster (JPEG, PNG, etc.) image.

Intermediate:
- Linear Rec.2020 Float32 image

Output:
- sRGB image

---

### 2. Preprocessing

***This step only applies to RAW files***

Here, we do some basic image adjustments to bring the image to a sensible baseline before a use can begin editing.

- Demosaic image (Bayer to RGBA)
- Lens corrections and cropping
- Correct black levels
- Correct white balance (based on camera metadata baseline)
- Color Space Transform (CST)

---

### 3. Scene-Linear Adjustments

Allowed operations:
- Exposure (multiply by 2^stops)
- White balance (channel multipliers)

All operations must remain linear.

---

### 4. Perceptual / Log Adjustments

Allowed:
- Contrast
- Tonal shaping

Operations may temporarily convert to log space to prioritize human perception of the adjustment being made.

---

### 5. Tone Mapping

Purpose:
- Compress scene dynamic range to display range

This step must occur after all scene edits take place, moving us from .

---

### 6. Display Transform

- Convert to sRGB
- Apply gamma encoding

---

### 7. Output

- Display (GPU via wgpu and shaders)
- Export (full resolution)

Both must follow identical pipeline logic based on shared edit recipes.
