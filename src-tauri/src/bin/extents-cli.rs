use std::ffi::OsString;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

use anyhow::{ensure, Context, Result};
use extents_lib::core::editing::EditRecipe;
use extents_lib::core::sidecar::{load_sidecar, save_sidecar, sidecar_path_for_image};
use extents_lib::renderer::offscreen::OffscreenImage;
use extents_lib::renderer::output::{RenderSettings, RenderSize};

const USAGE: &str = "Usage: extents-cli render <image> --output <new.png> [--recipe <recipe.json>] [--exposure-ev <EV>] [--max-long-edge <pixels> | --full-resolution]
       extents-cli save-recipe <image> [--recipe <recipe.json>] [--exposure-ev <EV>]

Uses the saved sidecar recipe (or defaults) unless --recipe supplies a complete
recipe JSON document. --exposure-ev overrides exposure in the selected recipe.

render writes a new PNG without changing the source image or sidecar. Output is
fitted to a 1600-pixel long edge by default. --full-resolution keeps the source
dimensions; both modes currently return 8-bit sRGB pixels. Prints JSON metadata
and timings to stdout. Existing output files are never overwritten.

save-recipe requires --recipe or --exposure-ev and writes the image's sibling
.exts sidecar using the existing atomic writer. It does not decode or render the
image, produce a PNG, or refresh an already-open desktop image. Prints the saved
recipe and paths as JSON. Neither command opens a desktop window.";

enum Arguments {
    Render(RenderArguments),
    SaveRecipe(RecipeArguments),
}

struct RecipeArguments {
    source: PathBuf,
    recipe: Option<PathBuf>,
    exposure_ev: Option<f32>,
}

struct RenderArguments {
    edits: RecipeArguments,
    output: PathBuf,
    settings: RenderSettings,
}

fn parse_arguments(args: impl IntoIterator<Item = OsString>) -> Result<Option<Arguments>> {
    let mut args = args.into_iter();
    let command = args
        .next()
        .context("missing command; use --help for usage")?;
    if command == "--help" || command == "-h" {
        return Ok(None);
    }
    ensure!(
        command == "render" || command == "save-recipe",
        "unknown command; use --help for usage"
    );
    let render = command == "render";
    let (mut source, mut output, mut recipe, mut exposure_ev) = (None, None, None, None);
    let mut settings = RenderSettings::default();
    let mut explicit_size = false;
    while let Some(arg) = args.next() {
        let name = arg.to_str().unwrap_or("");
        if name == "--help" || name == "-h" {
            return Ok(None);
        }
        if name == "--full-resolution" {
            ensure!(render, "--full-resolution is only supported by render");
            ensure!(
                !explicit_size,
                "choose either --max-long-edge or --full-resolution once"
            );
            settings.size = RenderSize::Full;
            explicit_size = true;
            continue;
        }
        if name.starts_with('-') {
            ensure!(
                matches!(
                    name,
                    "--output" | "--recipe" | "--exposure-ev" | "--max-long-edge"
                ),
                "unknown option: {name}"
            );
            let value = args
                .next()
                .with_context(|| format!("missing value for {name}"))?;
            match name {
                "--output" => {
                    ensure!(render, "--output is only supported by render");
                    ensure!(output.is_none(), "duplicate --output");
                    output = Some(PathBuf::from(value));
                }
                "--recipe" => {
                    ensure!(recipe.is_none(), "duplicate --recipe");
                    recipe = Some(PathBuf::from(value));
                }
                "--exposure-ev" => {
                    ensure!(exposure_ev.is_none(), "duplicate --exposure-ev");
                    let ev: f32 = value
                        .to_str()
                        .context("exposure must be a number")?
                        .parse()
                        .context("invalid exposure")?;
                    EditRecipe { exposure_ev: ev }.validate()?;
                    exposure_ev = Some(ev);
                }
                "--max-long-edge" => {
                    ensure!(render, "--max-long-edge is only supported by render");
                    ensure!(
                        !explicit_size,
                        "choose either --max-long-edge or --full-resolution once"
                    );
                    let max_long_edge = value
                        .to_str()
                        .context("preview size must be an integer")?
                        .parse()
                        .context("invalid preview size")?;
                    ensure!(max_long_edge > 0, "preview size must be greater than zero");
                    settings.size = RenderSize::Fit { max_long_edge };
                    explicit_size = true;
                }
                _ => unreachable!(),
            }
        } else {
            ensure!(source.is_none(), "only one source image is supported");
            source = Some(PathBuf::from(arg));
        }
    }
    let edits = RecipeArguments {
        source: source.context("missing source image; use --help for usage")?,
        recipe,
        exposure_ev,
    };
    if !render {
        ensure!(
            edits.recipe.is_some() || edits.exposure_ev.is_some(),
            "save-recipe requires --recipe or --exposure-ev"
        );
        return Ok(Some(Arguments::SaveRecipe(edits)));
    }
    let output = output.context("missing --output; use --help for usage")?;
    ensure!(
        output
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("png")),
        "output must have a .png extension"
    );
    Ok(Some(Arguments::Render(RenderArguments {
        edits,
        output,
        settings,
    })))
}

fn load_recipe(args: &RecipeArguments) -> Result<EditRecipe> {
    let mut recipe: EditRecipe = if let Some(path) = &args.recipe {
        serde_json::from_slice(&std::fs::read(path).context("cannot read recipe JSON")?)
            .context("invalid recipe JSON; expected an EditRecipe such as {\"exposure_ev\": 0.5}")?
    } else {
        load_sidecar(
            args.source
                .to_str()
                .context("source path must be valid UTF-8")?,
        )?
        .recipe()
        .clone()
    };
    if let Some(ev) = args.exposure_ev {
        recipe.exposure_ev = ev;
    }
    recipe.validate()?;
    Ok(recipe)
}

fn render(args: RenderArguments) -> Result<serde_json::Value> {
    ensure!(
        !args.output.try_exists()?,
        "output already exists; choose a new PNG path"
    );
    let recipe = load_recipe(&args.edits)?;
    let mut image = OffscreenImage::open(&args.edits.source)?;
    let rendered = image.render(&recipe, &args.settings)?;
    let start = Instant::now();
    let bytes = rendered.png_bytes()?;
    let png_encode_ms = start.elapsed().as_secs_f64() * 1000.0;
    let start = Instant::now();
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&args.output)
        .context("cannot create output PNG (existing files are not overwritten)")?;
    file.write_all(&bytes)?;
    file.flush()?;
    let png_write_ms = start.elapsed().as_secs_f64() * 1000.0;
    let output = args.output.canonicalize()?;
    Ok(serde_json::json!({
        "render": rendered.metadata,
        "output": {"path": output, "mimeType": "image/png", "bytes": bytes.len()},
        "pngEncodeMs": png_encode_ms,
        "pngWriteMs": png_write_ms,
    }))
}

fn save_recipe(args: RecipeArguments) -> Result<serde_json::Value> {
    let source = args
        .source
        .canonicalize()
        .context("cannot resolve source image")?;
    ensure!(source.is_file(), "source must be an image file");
    let source_path = args
        .source
        .to_str()
        .context("source path must be valid UTF-8")?;
    let sidecar_path = sidecar_path_for_image(source_path)?;
    if sidecar_path.try_exists()? {
        ensure!(
            sidecar_path.canonicalize()? != source,
            "sidecar path must differ from the source image"
        );
    }

    // Always load the current document, including when a complete recipe is
    // supplied, so a malformed existing sidecar cannot be silently replaced.
    let mut sidecar = load_sidecar(source_path)?;
    sidecar.set_recipe(load_recipe(&args)?)?;
    save_sidecar(source_path, &sidecar)?;
    Ok(serde_json::json!({
        "source": {"path": source},
        "recipe": sidecar.recipe(),
        "sidecar": {"path": sidecar_path.canonicalize()?},
        "saved": true,
    }))
}

fn run() -> Result<()> {
    let Some(args) = parse_arguments(std::env::args_os().skip(1))? else {
        println!("{USAGE}");
        return Ok(());
    };
    let result = match args {
        Arguments::Render(args) => render(args)?,
        Arguments::SaveRecipe(args) => save_recipe(args)?,
    };
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("warn")).init();
    if let Err(error) = run() {
        eprintln!("extents-cli: {error:#}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn parse(args: &[&str]) -> Result<Option<Arguments>> {
        parse_arguments(args.iter().map(OsString::from))
    }

    fn parse_render(args: &[&str]) -> Result<RenderArguments> {
        match parse(args)? {
            Some(Arguments::Render(args)) => Ok(args),
            _ => anyhow::bail!("expected render arguments"),
        }
    }

    #[test]
    fn accepts_negative_exposure_and_explicit_preview_size() -> Result<()> {
        let args = parse_render(&[
            "render",
            "photo.ARW",
            "--output",
            "new.png",
            "--exposure-ev",
            "-1.25",
            "--max-long-edge",
            "800",
        ])?;
        assert_eq!(args.edits.exposure_ev, Some(-1.25));
        assert_eq!(args.settings.size, RenderSize::Fit { max_long_edge: 800 });
        Ok(())
    }

    #[test]
    fn rejects_invalid_requests_before_rendering() {
        for tail in [
            vec!["--exposure-ev", "NaN"],
            vec!["--exposure-ev", "1000"],
            vec!["--max-long-edge", "0"],
            vec!["--unknown", "x"],
            vec!["--output", "other.png"],
            vec!["--full-resolution", "--max-long-edge", "800"],
            vec!["--max-long-edge", "800", "--full-resolution"],
        ] {
            let mut args = vec!["render", "photo.ARW", "--output", "new.png"];
            args.extend(tail);
            assert!(parse(&args).is_err());
        }
        assert!(parse(&["render", "photo.ARW"]).is_err());
        assert!(parse(&["render", "photo.ARW", "--output", "source.ARW"]).is_err());
        assert!(parse(&["inspect", "photo.ARW"]).is_err());
        assert!(parse(&["--help"]).unwrap().is_none());
        assert!(parse(&["render", "--help"]).unwrap().is_none());
    }

    #[test]
    fn supports_full_resolution_and_default_fitted_size() -> Result<()> {
        let full = parse_render(&[
            "render",
            "photo.ARW",
            "--output",
            "new.png",
            "--full-resolution",
        ])?;
        assert_eq!(full.settings.size, RenderSize::Full);
        let default = parse_render(&["render", "photo.ARW", "--output", "new.png"])?;
        assert_eq!(default.settings, RenderSettings::default());
        Ok(())
    }

    #[test]
    fn save_requires_edits_and_rejects_render_options() -> Result<()> {
        assert!(matches!(
            parse(&["save-recipe", "photo.CR3", "--recipe", "recipe.json"])?,
            Some(Arguments::SaveRecipe(_))
        ));
        for tail in [
            vec![],
            vec!["--exposure-ev", "NaN"],
            vec!["--exposure-ev", "1000"],
            vec!["--exposure-ev", "-1000"],
            vec!["--exposure-ev", "0", "--output", "new.png"],
            vec!["--exposure-ev", "0", "--max-long-edge", "800"],
            vec!["--exposure-ev", "0", "--full-resolution"],
        ] {
            let mut args = vec!["save-recipe", "photo.CR3"];
            args.extend(tail);
            assert!(parse(&args).is_err());
        }
        assert!(parse(&["save-recipe", "--help"])?.is_none());
        Ok(())
    }

    struct Fixture(PathBuf);

    impl Fixture {
        fn new() -> Result<Self> {
            let unique = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
            let directory = std::env::temp_dir()
                .join(format!("extents-recipe-{}-{unique}", std::process::id()));
            std::fs::create_dir(&directory)?;
            Ok(Self(directory))
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn save(source: &Path, options: &[&str]) -> Result<serde_json::Value> {
        let args = [OsString::from("save-recipe"), source.as_os_str().to_owned()]
            .into_iter()
            .chain(options.iter().map(OsString::from));
        match parse_arguments(args)? {
            Some(Arguments::SaveRecipe(args)) => save_recipe(args),
            _ => anyhow::bail!("expected save-recipe arguments"),
        }
    }

    #[test]
    fn saved_recipe_round_trips_without_decoding_or_rendering() -> Result<()> {
        let fixture = Fixture::new()?;
        let source = fixture.0.join("source.CR3");
        // Deliberately not a decodable RAW: persistence must not invoke decoding.
        let original = b"source bytes must remain untouched";
        std::fs::write(&source, original)?;
        let recipe_json = fixture.0.join("selected.json");
        std::fs::write(&recipe_json, br#"{"exposure_ev": -0.75}"#)?;
        let result = save(&source, &["--recipe", recipe_json.to_str().unwrap()])?;
        let sidecar_path = source.with_extension("exts");
        assert_eq!(result["saved"], true);
        assert_eq!(result["recipe"]["exposure_ev"], -0.75);
        assert_eq!(
            result["source"]["path"],
            source.canonicalize()?.to_str().unwrap()
        );
        assert_eq!(
            result["sidecar"]["path"],
            sidecar_path.canonicalize()?.to_str().unwrap()
        );
        let loaded = load_sidecar(source.to_str().unwrap())?;
        assert_eq!(loaded.recipe().exposure_ev, -0.75);

        // The same recipe-selection path used by a fresh render picks up the save.
        let render = parse_render(&["render", source.to_str().unwrap(), "--output", "unused.png"])?;
        assert_eq!(load_recipe(&render.edits)?.exposure_ev, -0.75);
        for _ in 0..2 {
            save(&source, &["--exposure-ev", "0.5"])?;
            assert_eq!(
                load_sidecar(source.to_str().unwrap())?.recipe().exposure_ev,
                0.5
            );
        }
        assert_eq!(std::fs::read(&source)?, original);
        assert_eq!(std::fs::read(&recipe_json)?, br#"{"exposure_ev": -0.75}"#);
        // Only the source, supplied recipe and sidecar exist; no PNG or temp file.
        assert_eq!(std::fs::read_dir(&fixture.0)?.count(), 3);
        Ok(())
    }

    #[test]
    fn invalid_saves_preserve_existing_sidecars_and_source() -> Result<()> {
        let fixture = Fixture::new()?;
        let source = fixture.0.join("source.CR3");
        let original = b"source bytes";
        std::fs::write(&source, original)?;
        save(&source, &["--exposure-ev", "-0.75"])?;
        let sidecar_path = source.with_extension("exts");
        let saved = std::fs::read(&sidecar_path)?;
        let recipe_json = fixture.0.join("invalid.json");
        for contents in [
            "not JSON",
            "{}",
            r#"{"exposure_ev": 1000}"#,
            r#"{"exposure_ev": -1000}"#,
        ] {
            std::fs::write(&recipe_json, contents)?;
            assert!(save(&source, &["--recipe", recipe_json.to_str().unwrap()]).is_err());
            assert_eq!(std::fs::read(&sidecar_path)?, saved);
        }
        assert!(save(&fixture.0.join("missing.CR3"), &["--exposure-ev", "0"]).is_err());
        assert!(save(&fixture.0, &["--exposure-ev", "0"]).is_err());
        assert!(save(&sidecar_path, &["--exposure-ev", "0"]).is_err());
        assert_eq!(std::fs::read(&sidecar_path)?, saved);

        std::fs::write(&sidecar_path, b"malformed sidecar")?;
        std::fs::write(&recipe_json, r#"{"exposure_ev": 0.5}"#)?;
        assert!(save(&source, &["--recipe", recipe_json.to_str().unwrap()]).is_err());
        assert_eq!(std::fs::read(&sidecar_path)?, b"malformed sidecar");
        assert_eq!(std::fs::read(&source)?, original);
        Ok(())
    }
}
